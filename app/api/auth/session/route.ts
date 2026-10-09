import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const sessionId = req.cookies.get('read_and_sign_session')?.value || tokenFromHeader;

    if (!sessionId) {
      const res = NextResponse.json({
        authenticated: false,
        user: null,
      });
      res.cookies.delete('read_and_sign_device_id');
      return res;
    }

    const session = serverAuthStore.getSession(sessionId);
    if (!session) {
      const res = NextResponse.json({
        authenticated: false,
        user: null,
      });
      res.cookies.delete('read_and_sign_device_id');
      return res;
    }

    const user = serverAuthStore.findUserById(session.userId);
    if (!user || user.accountStatus === 'disabled') {
      serverAuthStore.deleteSession(sessionId);
      const res = NextResponse.json({
        authenticated: false,
        user: null,
        error: user ? 'ACCOUNT_DISABLED' : 'USER_NOT_FOUND',
      });
      res.cookies.delete('read_and_sign_device_id');
      return res;
    }

    const res = NextResponse.json({
      authenticated: true,
      user,
    });
    res.cookies.delete('read_and_sign_device_id');
    return res;
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
