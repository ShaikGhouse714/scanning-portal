import { NextResponse } from 'next/server';
import { getServerPortalSlots, saveServerPortalSlots } from '@/lib/serverStore';
import { parsePortalData } from '@/lib/excelParser';

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
    const slots = getServerPortalSlots();
    return NextResponse.json(
      { success: true, data: slots, total: slots.length },
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
      if (Array.isArray(body.slots)) {
        saveServerPortalSlots(body.slots);
        return NextResponse.json(
          { success: true, message: `Saved ${body.slots.length} portal slots`, total: body.slots.length },
          { status: 200, headers: noCacheHeaders }
        );
      } else if (body.csvText) {
        const parsed = parsePortalData(body.csvText);
        saveServerPortalSlots(parsed);
        return NextResponse.json(
          { success: true, message: `Parsed and saved ${parsed.length} portal slots`, data: parsed },
          { status: 200, headers: noCacheHeaders }
        );
      }
    }

    // Binary file upload (.xlsx / .csv)
    const arrayBuffer = await request.arrayBuffer();
    const parsed = parsePortalData(arrayBuffer);
    saveServerPortalSlots(parsed);

    return NextResponse.json(
      { success: true, message: `Parsed ${parsed.length} exam slots from uploaded portal file`, data: parsed },
      { status: 200, headers: noCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 400, headers: noCacheHeaders }
    );
  }
}
