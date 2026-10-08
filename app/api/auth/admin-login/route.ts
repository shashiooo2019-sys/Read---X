import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (username !== 'admin' || password !== 'Admin220!') {
      return NextResponse.json(
        { success: false, message: 'Invalid admin username or password.' },
        { status: 401 }
      );
    }

    // Find or create system admin user
    let adminUser = serverAuthStore.findUserByEmail('admin@compliance.system');
    if (!adminUser) {
      adminUser = serverAuthStore.createUser({
        email: 'admin@compliance.system',
        name: 'System Administrator',
        department: 'System Administration',
        title: 'Chief Compliance Administrator',
      });
      // Force admin role
      serverAuthStore.updateUser(adminUser.id, { isAdmin: true, isLead: true, isAls: true });
      adminUser = serverAuthStore.findUserById(adminUser.id)!;
    } else {
      serverAuthStore.updateUser(adminUser.id, { isAdmin: true });
      adminUser = serverAuthStore.findUserById(adminUser.id)!;
    }

    const userAgent = req.headers.get('user-agent') || 'unknown-device';
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const sessionId = serverAuthStore.createSession(adminUser.id, adminUser.email, clientIp, userAgent);

    serverAuthStore.addAuditLog({
      action: 'login_success',
      userId: adminUser.id,
      performedBy: 'admin',
      targetEmail: adminUser.email,
      details: 'System Administrator login via separate admin credentials',
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
