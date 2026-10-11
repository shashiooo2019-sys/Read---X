import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';
import { fetchPasswordFromFirestore, fetchUsersFromFirestore } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid work email address or U-number.' },
        { status: 400 }
      );
    }

    const cleanInput = email.trim();
    const cleanEmail = cleanInput.toLowerCase();

    // 1. Try finding user in memory store (checks email, loginEmail, workEmail, U-number)
    let user = serverAuthStore.findUserByEmail(cleanEmail);

    // 2. If not found in memory, query Firestore users collection to ensure live sync with DB roster
    if (!user) {
      try {
        const firestoreUsers = await fetchUsersFromFirestore();
        if (firestoreUsers && firestoreUsers.length > 0) {
          serverAuthStore.syncRosterUsers(firestoreUsers);
          user = serverAuthStore.findUserByEmail(cleanEmail);
        }
      } catch (dbErr) {
        console.warn('Firestore live roster sync notice:', dbErr);
      }
    }

    const domain = cleanEmail.includes('@') ? cleanEmail.split('@')[1] : '';
    const isWorkDomain = domain === 'dlh.de' || domain === 'swiss.com' || domain === 'lhgroup.de';
    const isApprovedPrivate = serverAuthStore.isPrivateEmailApproved(cleanEmail);
    const isRosterUser = Boolean(user);

    // Authorization check: User must be in the staff roster, from an authorized work domain, or an approved private user
    if (!isRosterUser && !isWorkDomain && !isApprovedPrivate) {
      serverAuthStore.addAuditLog({
        action: 'login_success',
        performedBy: cleanEmail,
        targetEmail: cleanEmail,
        details: `Unauthorized login attempt from email ${cleanEmail} (not in staff roster, authorized domain, or approved private user)`,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED_EMAIL',
          message: `Email address "${cleanEmail}" is not in the staff roster. Please enter your registered email from the staff roster (@dlh.de, @swiss.com, @lhgroup.de) or select your profile from the directory.`,
        },
        { status: 403 }
      );
    }

    // Auto-create user only if from valid work domain and not already found in roster
    if (!user) {
      const rawName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      const name = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      user = serverAuthStore.createUser({
        email: cleanEmail,
        name,
        department: isWorkDomain ? 'Lufthansa / Swiss Operations' : 'External Operations',
        title: isWorkDomain ? 'Station Operations Specialist' : 'Approved Contractor',
      });
      serverAuthStore.addAuditLog({
        action: 'user_created',
        userId: user.id,
        performedBy: cleanEmail,
        targetEmail: cleanEmail,
        details: `Created user account for work email ${cleanEmail}`,
      });
    }

    // Check if password exists in Firebase Firestore if not in memory
    if (!user.passwordHash) {
      try {
        const saved = await fetchPasswordFromFirestore(user.id);
        if (saved && saved.passwordHash) {
          user.passwordHash = saved.passwordHash;
          serverAuthStore.updateUser(user.id, { passwordHash: saved.passwordHash });
        }
      } catch (err) {
        console.warn('Firebase password lookup error:', err);
      }
    }

    // Canonical sign-in email matching roster
    const canonicalEmail = user.email || cleanEmail;

    // Check if password setup is needed (First sign-in via work email)
    if (!user.passwordHash) {
      return NextResponse.json({
        success: true,
        needsPasswordSetup: true,
        email: canonicalEmail,
        userName: user.name,
        uNumber: user.uNumber,
        message: `Welcome ${user.name} (${user.uNumber})! First sign-in. Please create and save a password to access the application.`,
      });
    }

    // If password is required and not provided
    if (!password) {
      return NextResponse.json({
        success: true,
        needsPassword: true,
        email: canonicalEmail,
        userName: user.name,
        uNumber: user.uNumber,
        message: `Please enter your password for ${user.name} (${canonicalEmail}) to sign in.`,
      });
    }

    // Verify password
    const isValid = serverAuthStore.verifyPassword(user.id, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid password. Please check your password or contact admin to reset.' },
        { status: 401 }
      );
    }

    // Session creation
    const userAgent = req.headers.get('user-agent') || 'unknown-device';
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const sessionId = serverAuthStore.createSession(user.id, canonicalEmail, clientIp, userAgent);

    serverAuthStore.addAuditLog({
      action: 'login_success',
      userId: user.id,
      performedBy: canonicalEmail,
      targetEmail: canonicalEmail,
      details: `Successful sign-in with work email and password for ${canonicalEmail} (${user.name})`,
      ipAddress: clientIp,
    });

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set({
      name: 'read_and_sign_session',
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Work email login error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error processing sign-in.', error: err.message },
      { status: 500 }
    );
  }
}
