import { NextResponse } from 'next/server';
import { getServerUsers, addServerUser, updateServerUser } from '@/lib/serverStore';
import { SUPER_ADMIN_EMAIL } from '@/lib/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: Request) {
  try {
    const _url = request.url;
    const users = await getServerUsers();
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
    const { name, email, station, role } = body;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    // Default partner role is Basic Admin ('admin')
    const assignedRole: 'super_admin' | 'admin' | 'operator' = isSuperAdminEmail
      ? 'super_admin'
      : role === 'super_admin'
      ? 'super_admin'
      : 'admin';

    const newUser = {
      id: body.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      role: assignedRole,
      station: isSuperAdminEmail
        ? 'HQ / Scanning Dept Management'
        : station?.trim() || 'Partner Admin Station',
      department: 'Scanning Dept',
      avatarColor: isSuperAdminEmail ? 'bg-cyan-600' : 'bg-indigo-600',
      status: (body.status || 'active') as 'active' | 'inactive',
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const saved = await addServerUser(newUser);

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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, email, role, status } = body;
    const targetKey = id || email;

    if (!targetKey) {
      return NextResponse.json(
        { success: false, message: 'User id or email is required' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const updated = await updateServerUser(targetKey, {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404, headers: noCacheHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User updated successfully',
        data: updated,
      },
      { status: 200, headers: noCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error updating user',
        error: String(error),
      },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
