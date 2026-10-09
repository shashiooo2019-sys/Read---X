import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';
import { fetchPasswordFromFirestore } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid work email address.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1] || '';
    const isWorkDomain = domain === 'dlh.de' || domain === 'swiss.com';
    const isApprovedPrivate = serverAuthStore.isPrivateEmailApproved(cleanEmail);

    let user = serverAuthStore.findUserByEmail(cleanEmail);

    // Authorization check
    if (!isWorkDomain && !isApprovedPrivate && !user) {
      serverAuthStore.addAuditLog({
        action: 'login_success',
        performedBy: cleanEmail,
        targetEmail: cleanEmail,
        details: `Unauthorized login attempt from work email ${cleanEmail} (not a work domain or approved private user)`,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED_EMAIL',
          message: `Email address (${cleanEmail}) is not authorized. Only @dlh.de, @swiss.com work emails and pre-approved private email addresses are permitted.`,
        },
        { status: 403 }
      );
    }

    // Auto-create user if not in store yet but domain/approval is valid
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

    // Check if password setup is needed (First sign-in via work email)
    if (!user.passwordHash) {
      return NextResponse.json({
        success: true,
        needsPasswordSetup: true,
        email: user.email,
        message: 'First sign-in via work email. Please create and save a password to access the application.',
      });
    }

    // If password is required and not provided
    if (!password) {
      return NextResponse.json({
        success: true,
        needsPassword: true,
        email: user.email,
        message: 'Please enter your password to sign in.',
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

    const sessionId = serverAuthStore.createSession(user.id, cleanEmail, clientIp, userAgent);

    serverAuthStore.addAuditLog({
      action: 'login_success',
      userId: user.id,
      performedBy: cleanEmail,
      targetEmail: cleanEmail,
      details: `Successful sign-in with work email and password for ${cleanEmail}`,
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
