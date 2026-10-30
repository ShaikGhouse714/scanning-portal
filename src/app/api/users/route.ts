import { NextResponse } from 'next/server';
import { getServerUsers, addServerUser } from '@/lib/serverStore';
import { SUPER_ADMIN_EMAIL } from '@/lib/mockData';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: Request) {
  try {
    const _url = request.url;
    const users = getServerUsers();
    return NextResponse.json(
      {
        success: true,
        data: users,
        total: users.length,
      },
      {
        status: 200,
        headers: noCacheHeaders,
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, station } = body;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    const newUser = {
      id: body.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      role: (isSuperAdminEmail ? 'super_admin' : 'operator') as 'super_admin' | 'operator',
      station: isSuperAdminEmail
        ? 'HQ / Scanning Dept Management'
        : station?.trim() || 'General Station',
      department: 'Scanning Dept',
      avatarColor: isSuperAdminEmail ? 'bg-cyan-600' : 'bg-slate-700',
      status: 'active' as const,
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const saved = addServerUser(newUser);

    return NextResponse.json(
      {
        success: true,
        message: 'User registered on server',
        data: saved,
      },
      { status: 201, headers: noCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error registering user',
        error: String(error),
      },
      { status: 400, headers: noCacheHeaders }
    );
  }
}
