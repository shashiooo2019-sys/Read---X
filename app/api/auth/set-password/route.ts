import { NextRequest, NextResponse } from 'next/server';
import { serverAuthStore } from '@/lib/server-auth-store';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Valid email and password (minimum 6 characters) are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = serverAuthStore.findUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User account not found for this email address.' },
        { status: 404 }
      );
    }

    serverAuthStore.setPassword(user.id, password);

    serverAuthStore.addAuditLog({
      action: 'user_approved', // or similar
      userId: user.id,
      performedBy: cleanEmail,
      targetEmail: cleanEmail,
      details: `User created and saved initial password for ${cleanEmail}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Password successfully created and saved. You can now sign in using your work email and password.',
    });
  } catch (err: any) {
    console.error('Set password error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error while setting password.', error: err.message },
      { status: 500 }
    );
  }
}
