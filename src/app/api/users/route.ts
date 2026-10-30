import { NextResponse } from 'next/server';
import { getServerUsers, addServerUser, saveServerUsers } from '@/lib/serverStore';
import { SUPER_ADMIN_EMAIL } from '@/lib/mockData';

export async function GET() {
  const users = getServerUsers();
  return NextResponse.json({
    success: true,
    data: users,
    total: users.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, station } = body;

    if (!email || !name) {
      return NextResponse.json({ success: false, message: 'Name and email are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      role: (isSuperAdminEmail ? 'super_admin' : 'operator') as 'super_admin' | 'operator',
      station: isSuperAdminEmail ? 'HQ / Scanning Dept Management' : station?.trim() || 'General Station',
      department: 'Scanning Dept',
      avatarColor: isSuperAdminEmail ? 'bg-cyan-600' : 'bg-slate-700',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    const saved = addServerUser(newUser);

    return NextResponse.json({
      success: true,
      message: 'User registered on server',
      data: saved,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error registering user',
      error: String(error),
    }, { status: 400 });
  }
}
