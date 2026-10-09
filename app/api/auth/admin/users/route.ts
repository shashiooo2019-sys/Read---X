import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';
import { deletePasswordFromFirestore } from '@/lib/firebase';

function getAuthenticatedAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const sessionId = req.cookies.get('read_and_sign_session')?.value || tokenFromHeader;

  if (!sessionId) return null;
  const session = serverAuthStore.getSession(sessionId);
  if (!session) return null;

  const user = serverAuthStore.findUserById(session.userId);
  if (!user || !user.isAdmin) return null;

  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(req);
    // If not authenticated or not admin, return 401
    if (!admin) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Administrator credentials required.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      users: serverAuthStore.getUsers(),
      approvedPrivateUsers: serverAuthStore.getApprovedPrivateUsers(),
      auditLogs: serverAuthStore.getAuditLogs(),
    });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Administrator credentials required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // 1. CHANGE REGISTERED EMAIL (Requirement 9 & 11)
    if (action === 'change_email') {
      const { userId, newEmail, updateDeviceLock } = body;
      if (!userId || !newEmail || !newEmail.includes('@')) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'User ID and valid new email required.' },
          { status: 400 }
        );
      }

      const user = serverAuthStore.findUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, { status: 404 });
      }

      const oldEmail = user.email;
      const cleanNewEmail = newEmail.trim().toLowerCase();

      // Check if new email already belongs to another user
      const existingUserWithNewEmail = serverAuthStore.findUserByEmail(cleanNewEmail);
      if (existingUserWithNewEmail && existingUserWithNewEmail.id !== userId) {
        return NextResponse.json(
          { error: 'EMAIL_IN_USE', message: `Email ${cleanNewEmail} is already assigned to ${existingUserWithNewEmail.name}.` },
          { status: 400 }
        );
      }

      // 1. Invalidate all existing sessions for this user
      serverAuthStore.invalidateAllSessionsForUser(userId);

      // 2. Invalidate existing magic links
      serverAuthStore.invalidateAllTokensForEmail(oldEmail);

      // 3. Update device locks associated with old email
      if (updateDeviceLock !== false) {
        serverAuthStore.updateDeviceLockEmail(oldEmail, cleanNewEmail);
      }

      // 4. Update the user's permanent registered email
      const newDomain = cleanNewEmail.split('@')[1];
      const updatedUser = serverAuthStore.updateUser(userId, {
        email: cleanNewEmail,
        loginEmail: cleanNewEmail,
        emailDomain: newDomain,
      });

      // 5. Record change in Audit Log (Requirement 9)
      serverAuthStore.addAuditLog({
        action: 'email_changed_by_admin',
        userId: user.id,
        targetEmail: cleanNewEmail,
        performedBy: admin.email,
        details: `Administrator ${admin.name} (${admin.email}) changed permanent registered email from ${oldEmail} to ${cleanNewEmail}. All previous sessions & tokens invalidated.`,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        user: updatedUser,
        message: `Registered email successfully updated to ${cleanNewEmail}. Previous sessions invalidated.`,
      });
    }

    // 2. APPROVE PRIVATE EMAIL (Requirement 8 & 9)
    if (action === 'approve_private_email') {
      const { name, workEmail, loginEmail, uNumber, notes } = body;
      if (!name || !workEmail || !loginEmail) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'Name, work email, and private login email are required.' },
          { status: 400 }
        );
      }

      const record = serverAuthStore.addApprovedPrivateUser({
        name: name.trim(),
        workEmail: workEmail.trim().toLowerCase(),
        loginEmail: loginEmail.trim().toLowerCase(),
        uNumber: uNumber ? uNumber.trim() : `U${Math.floor(100000 + Math.random() * 900000)}`,
        approvedBy: admin.email,
        status: 'approved',
        notes: notes || 'Approved by station administrator',
      });

      // Also ensure user exists or is marked as approved in user directory
      const existing = serverAuthStore.findUserByEmail(loginEmail);
      if (existing) {
        serverAuthStore.updateUser(existing.id, {
          approvalStatus: 'approved',
          isApprovedPrivateEmail: true,
          workEmail: workEmail.trim().toLowerCase(),
          approvedBy: admin.email,
          approvedAt: record.approvedAt,
        });
      } else {
        serverAuthStore.createUser({
          name: record.name,
          email: record.loginEmail,
          loginEmail: record.loginEmail,
          workEmail: record.workEmail,
          uNumber: record.uNumber,
          isApprovedPrivateEmail: true,
          approvalStatus: 'approved',
          accountStatus: 'active',
          isAdmin: false,
          isAls: false,
          isLead: false,
          approvedBy: admin.email,
          approvedAt: record.approvedAt,
        });
      }

      serverAuthStore.addAuditLog({
        action: 'user_approved',
        targetEmail: loginEmail,
        performedBy: admin.email,
        details: `Administrator ${admin.name} approved private login email ${loginEmail} (Work: ${workEmail})`,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        approvedUser: record,
        message: `Private email ${loginEmail} approved successfully.`,
      });
    }

    // 3. REVOKE PRIVATE EMAIL APPROVAL
    if (action === 'revoke_private_email') {
      const { loginEmail } = body;
      if (!loginEmail) {
        return NextResponse.json({ error: 'BAD_REQUEST', message: 'Email required.' }, { status: 400 });
      }

      serverAuthStore.revokeApprovedPrivateUser(loginEmail);
      const user = serverAuthStore.findUserByEmail(loginEmail);
      if (user) {
        serverAuthStore.updateUser(user.id, { approvalStatus: 'rejected' });
        serverAuthStore.invalidateAllSessionsForUser(user.id);
      }

      serverAuthStore.addAuditLog({
        action: 'user_disabled',
        targetEmail: loginEmail,
        performedBy: admin.email,
        details: `Administrator revoked approval for private email ${loginEmail}. Sessions invalidated.`,
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, message: `Approval for ${loginEmail} revoked.` });
    }

    // 4. DISABLE / REACTIVATE USER (Requirement 9)
    if (action === 'toggle_status') {
      const { userId, newStatus } = body;
      const user = serverAuthStore.findUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
      }

      const updated = serverAuthStore.updateUser(userId, { accountStatus: newStatus });
      if (newStatus === 'disabled') {
        serverAuthStore.invalidateAllSessionsForUser(userId);
        serverAuthStore.invalidateAllTokensForEmail(user.email);
      }

      serverAuthStore.addAuditLog({
        action: newStatus === 'disabled' ? 'user_disabled' : 'user_reactivated',
        userId: user.id,
        targetEmail: user.email,
        performedBy: admin.email,
        details: `Administrator ${admin.name} set user account status to ${newStatus}.`,
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, user: updated });
    }

    // 5. RESET / REISSUE AUTHENTICATION (Requirement 9)
    if (action === 'reset_auth') {
      const { userId } = body;
      const user = serverAuthStore.findUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
      }

      // Invalidate existing sessions
      serverAuthStore.invalidateAllSessionsForUser(userId);

      serverAuthStore.addAuditLog({
        action: 'session_invalidated',
        userId: user.id,
        targetEmail: user.email,
        performedBy: admin.email,
        details: `Administrator invalidated sessions for ${user.email}. Google re-authentication required.`,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        message: `Authentication reset for ${user.email}. Active sessions invalidated. Google re-authentication required.`,
      });
    }

    // 6. CLEAR PASSWORD (Admin password deletion for re-setup)
    if (action === 'clear_password') {
      const { userId } = body;
      const user = serverAuthStore.findUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
      }

      serverAuthStore.clearPassword(userId);
      serverAuthStore.invalidateAllSessionsForUser(userId);
      try {
        await deletePasswordFromFirestore(userId);
      } catch (err) {
        console.warn('Firebase password delete warning:', err);
      }

      serverAuthStore.addAuditLog({
        action: 'user_approved',
        userId: user.id,
        targetEmail: user.email,
        performedBy: admin.email,
        details: `Administrator ${admin.name} cleared password for ${user.email}, enabling first-time password setup again.`,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        message: `Password cleared for ${user.email}. Staff member can now set up a new password upon next sign-in.`,
      });
    }

    return NextResponse.json({ error: 'UNKNOWN_ACTION', message: `Action ${action} is not supported.` }, { status: 400 });
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
