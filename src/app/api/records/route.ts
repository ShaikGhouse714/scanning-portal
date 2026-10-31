import { NextResponse } from 'next/server';
import { getServerTeamEntries } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const _url = request.url;
  const entries = getServerTeamEntries();
  return NextResponse.json({ success: true, data: entries });
}
