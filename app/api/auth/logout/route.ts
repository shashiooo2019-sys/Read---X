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
          details: 'User logged out. Session invalidated.',
        });
        serverAuthStore.deleteSession(sessionId);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear session and device cookies
    response.cookies.delete('read_and_sign_session');
    response.cookies.delete('read_and_sign_device_id');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}
