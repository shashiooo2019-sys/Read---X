import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const sessionId = req.cookies.get('read_and_sign_session')?.value || tokenFromHeader;

    const deviceId = req.cookies.get('read_and_sign_device_id')?.value || 'dev-default';
    const deviceLockedEmail = serverAuthStore.getDeviceLock(deviceId);

    if (!sessionId) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        deviceLockedEmail: deviceLockedEmail || null,
      });
    }

    const session = serverAuthStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        deviceLockedEmail: deviceLockedEmail || null,
      });
    }

    const user = serverAuthStore.findUserById(session.userId);
    if (!user || user.accountStatus === 'disabled') {
      serverAuthStore.deleteSession(sessionId);
      return NextResponse.json({
        authenticated: false,
        user: null,
        error: user ? 'ACCOUNT_DISABLED' : 'USER_NOT_FOUND',
        deviceLockedEmail: deviceLockedEmail || null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user,
      deviceLockedEmail: deviceLockedEmail || user.email,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
