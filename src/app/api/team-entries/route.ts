import { NextResponse } from 'next/server';
import {
  getServerTeamEntries,
  saveServerTeamEntries,
  getServerSheetUrl,
  saveServerSheetUrl,
} from '@/lib/serverStore';
import { parseTeamGoogleSheet } from '@/lib/excelParser';

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
    const entries = getServerTeamEntries();
    const sheetUrl = getServerSheetUrl();
    return NextResponse.json(
      { success: true, data: entries, total: entries.length, sheetUrl },
      { status: 200, headers: noCacheHeaders }
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
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.sheetUrl) {
        saveServerSheetUrl(body.sheetUrl);
      }
      if (Array.isArray(body.entries)) {
        saveServerTeamEntries(body.entries);
        return NextResponse.json(
          { success: true, message: `Saved ${body.entries.length} team entries`, total: body.entries.length },
          { status: 200, headers: noCacheHeaders }
        );
      }
    }

    // Binary file upload (.xlsx)
    const arrayBuffer = await request.arrayBuffer();
    const parsed = parseTeamGoogleSheet(arrayBuffer);
    saveServerTeamEntries(parsed.teammateEntries);

    return NextResponse.json(
      {
        success: true,
        message: `Parsed ${parsed.teammateEntries.length} entries across ${parsed.sheetNames.length} teammate subsheets`,
        sheetNames: parsed.sheetNames,
        data: parsed.teammateEntries,
      },
      { status: 200, headers: noCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 400, headers: noCacheHeaders }
    );
  }
}
