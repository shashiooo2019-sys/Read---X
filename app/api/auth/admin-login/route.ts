import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const cleanUsername = String(username || '').trim().toLowerCase();
    const isRegularAdmin = (cleanUsername === 'admin' || cleanUsername === 'admin@compliance.system') && password === 'Admin220!';
    const isSuperAdmin = (cleanUsername === 'superadmin' || cleanUsername === 'superadmin@compliance.system') && password === 'SuperAdmin220!';

    if (!isRegularAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin username or password.' },
        { status: 401 }
      );
    }

    const targetEmail = isSuperAdmin ? 'superadmin@compliance.system' : 'admin@compliance.system';
    const targetName = isSuperAdmin ? 'Super Administrator' : 'System Administrator';

    // Find or create admin user
    let adminUser = serverAuthStore.findUserByEmail(targetEmail);
    if (!adminUser) {
      adminUser = serverAuthStore.createUser({
        email: targetEmail,
        name: targetName,
        department: 'System Administration',
        title: isSuperAdmin ? 'Super Administrator' : 'Chief Compliance Administrator',
      });
      // Force admin role
      serverAuthStore.updateUser(adminUser.id, {
        isAdmin: true,
        isSuperAdmin: isSuperAdmin,
        isLead: true,
        isAls: true,
        uNumber: isSuperAdmin ? 'SUPERADMIN' : 'ADMIN',
      });
      adminUser = serverAuthStore.findUserById(adminUser.id)!;
    } else {
      serverAuthStore.updateUser(adminUser.id, {
        isAdmin: true,
        isSuperAdmin: isSuperAdmin,
        isLead: true,
        isAls: true,
      });
      adminUser = serverAuthStore.findUserById(adminUser.id)!;
    }

    const userAgent = req.headers.get('user-agent') || 'unknown-device';
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const sessionId = serverAuthStore.createSession(adminUser.id, adminUser.email, clientIp, userAgent);

    serverAuthStore.addAuditLog({
      action: 'login_success',
      userId: adminUser.id,
      performedBy: cleanUsername,
      targetEmail: adminUser.email,
      details: isSuperAdmin
        ? 'Super Administrator login via superadmin credentials'
        : 'System Administrator login via admin credentials',
      ipAddress: clientIp,
    });

    const response = NextResponse.json({
      success: true,
      user: adminUser,
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
    console.error('Admin login error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error during admin authentication.', error: err.message },
      { status: 500 }
    );
  }
}
