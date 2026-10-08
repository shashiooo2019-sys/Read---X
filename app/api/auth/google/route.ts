import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '974822903687-vitk00ec65q9jjkpirl35587g1hfglau.apps.googleusercontent.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, uNumber } = body;

    if (!credential) {
      return NextResponse.json(
        { success: false, message: 'Google ID token (credential) is required.' },
        { status: 400 }
      );
    }

    let targetUserByUNumber = null;
    if (uNumber && typeof uNumber === 'string' && uNumber.trim().length > 0) {
      targetUserByUNumber = serverAuthStore.findUserByUNumber(uNumber);
      if (!targetUserByUNumber) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_U_NUMBER',
            message: `Staff U Number "${uNumber.trim()}" was not found in the staff roster. Please verify your correct U number (e.g. U086936).`,
          },
          { status: 400 }
        );
      }
    }

    let googleEmail = '';
    let googleName = '';
    let googlePicture = '';

    // 1. Check if it's a mock token for testing / demo convenience
    if (typeof credential === 'string' && credential.startsWith('mock_google_id_token_for_')) {
      googleEmail = credential.replace('mock_google_id_token_for_', '').trim().toLowerCase();
      const rawName = googleEmail.split('@')[0].replace(/[._-]/g, ' ');
      googleName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else {
      // 2. Try parsing Google JWT locally (payload is second segment of JWT)
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload && payload.email) {
            googleEmail = payload.email.trim().toLowerCase();
            googleName = payload.name || googleEmail.split('@')[0];
            googlePicture = payload.picture;
          }
        }
      } catch (jwtErr) {
        console.warn('Local JWT parse warning:', jwtErr);
      }

      // 3. Fallback to Google tokeninfo API if local parse didn't get email
      if (!googleEmail) {
        try {
          const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, {
            signal: AbortSignal.timeout(6000), // 6 second timeout
          });
          if (tokenInfoRes.ok) {
            const tokenData = await tokenInfoRes.json();
            googleEmail = tokenData.email?.trim().toLowerCase();
            googleName = tokenData.name || googleEmail?.split('@')[0] || 'Google User';
            googlePicture = tokenData.picture;
          } else {
            const errText = await tokenInfoRes.text();
            console.error('Google tokeninfo verification failed:', errText);
          }
        } catch (fetchErr) {
          console.error('Network error communicating with Google tokeninfo endpoint:', fetchErr);
        }
      }
    }

    if (!googleEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTH_SERVER_ERROR',
          message: 'Authentication server error or network timeout communicating with Google. Please check your network connection or try direct work email sign-in.',
        },
        { status: 401 }
      );
    }

    const domain = googleEmail.split('@')[1] || '';
    const isWorkDomain = domain === 'dlh.de' || domain === 'swiss.com';
    const isApprovedPrivate = serverAuthStore.isPrivateEmailApproved(googleEmail);
    const existingUser = targetUserByUNumber || serverAuthStore.findUserByEmail(googleEmail);

    // Authorization check: Must be work email (@dlh.de, @swiss.com) or approved private user or already registered user
    if (!isWorkDomain && !isApprovedPrivate && !existingUser) {
      serverAuthStore.addAuditLog({
        action: 'login_success',
        performedBy: googleEmail,
        targetEmail: googleEmail,
        details: `Unauthorized login attempt from Google account ${googleEmail} (not a work domain or approved private user)`,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED_EMAIL',
          message: `Your Google account (${googleEmail}) is not authorized to access Read & Sign Compliance Manager. Only @dlh.de, @swiss.com work emails and pre-approved private email addresses are permitted.`,
        },
        { status: 403 }
      );
    }

    // Device locking check
    const userAgent = req.headers.get('user-agent') || 'unknown-device';
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const deviceKey = `${clientIp}_${userAgent.substring(0, 50)}`;

    const lockedEmail = serverAuthStore.getDeviceLock(deviceKey);
    if (lockedEmail && lockedEmail !== googleEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'DEVICE_LOCKED',
          message: `This device is already associated with another Read & Sign account (${lockedEmail}). Please contact the administrator if your registered email address needs to be changed.`,
          lockedEmail,
        },
        { status: 403 }
      );
    }

    // Lock device to this email
    serverAuthStore.setDeviceLock(deviceKey, googleEmail);

    // Find or create user
    let user = existingUser;
    if (!user) {
      user = serverAuthStore.createUser({
        email: googleEmail,
        name: googleName,
        department: isWorkDomain ? 'Lufthansa / Swiss Operations' : 'External Operations',
        title: isWorkDomain ? 'Station Operations Specialist' : 'Approved Contractor',
      });
      serverAuthStore.addAuditLog({
        action: 'user_created',
        userId: user.id,
        performedBy: googleEmail,
        targetEmail: googleEmail,
        details: `Created user account for Google authenticated email ${googleEmail}`,
      });
    } else {
      serverAuthStore.updateUser(user.id, {
        email: googleEmail,
        loginEmail: googleEmail,
        name: user.name || googleName,
      });
    }

    // Create secure server session
    const sessionId = serverAuthStore.createSession(user.id, googleEmail, clientIp, userAgent);

    serverAuthStore.addAuditLog({
      action: 'login_success',
      userId: user.id,
      performedBy: googleEmail,
      targetEmail: googleEmail,
      details: `Successful Google OAuth Sign-In for ${googleEmail}`,
      ipAddress: clientIp,
    });

    const response = NextResponse.json({
      success: true,
      user,
    });

    // Set consistent session cookie name: read_and_sign_session
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
    console.error('Google Auth verification error:', err);
    return NextResponse.json(
      { success: false, message: 'Authentication server error processing Google token.', error: err.message },
      { status: 500 }
    );
  }
}
