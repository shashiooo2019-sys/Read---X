import { NextRequest, NextResponse } from 'next/server';
import { saveUserToFirestore } from '@/lib/firebase';
import { serverAuthStore } from '@/lib/server-auth-store';

export async function POST(req: NextRequest) {
  try {
    // Create the superadmin user
    const superadmin = {
      id: 'u-superadmin',
      uNumber: 'SUPERADMIN',
      name: 'Super Administrator',
      email: 'superadmin@compliance.system',
      isAls: true,
      isLead: true,
      isAdmin: true,
      isSuperAdmin: true,
      department: 'System Administration',
      title: 'Super Administrator',
      createdAt: new Date().toISOString(),
      accountStatus: 'active',
      approvalStatus: 'approved',
    };

    // Save to Firestore
    await saveUserToFirestore(superadmin as any);
    
    // Hash password and save
    const password = 'SuperAdmin220!';
    const passwordHash = serverAuthStore.hashPassword(password);
    
    // Save to Firestore passwords
    await import('@/lib/firebase').then(f => f.savePasswordToFirestore('u-superadmin', 'superadmin@compliance.system', passwordHash, 'SUPERADMIN'));

    return NextResponse.json({ success: true, message: 'Superadmin created' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
