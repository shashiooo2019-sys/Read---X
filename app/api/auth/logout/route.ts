import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const sessionId = req.cookies.get('read_and_sign_session')?.value || tokenFromHeader;

    if (sessionId) {
      const session = serverAuthStore.getSession(sessionId);
      if (session) {
        serverAuthStore.addAuditLog({
          action: 'logout',
          userId: session.userId,
          targetEmail: session.email,
          performedBy: session.email,
          details: 'User logged out. Session invalidated. Device remains permanently associated.',
        });
        serverAuthStore.deleteSession(sessionId);
      }
    }

    const deviceId = req.cookies.get('read_and_sign_device_id')?.value || 'dev-default';
    const deviceLockedEmail = serverAuthStore.getDeviceLock(deviceId);

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      deviceLockedEmail: deviceLockedEmail || null,
    });

    // Clear session cookie, but KEEP device ID cookie
    response.cookies.delete('read_and_sign_session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}
