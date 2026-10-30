import { NextResponse } from 'next/server';
import {
  getServerRecords,
  saveOrUpdateServerRecord,
  deleteServerRecord,
  computeServerStatus,
} from '@/lib/serverStore';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: Request) {
  try {
    // Reading request URL guarantees per-request dynamic evaluation
    const _url = request.url;
    const records = getServerRecords();
    return NextResponse.json(
      {
        success: true,
        data: records,
        total: records.length,
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
    const {
      id,
      date,
      userId,
      userName,
      station,
      school,
      receivedCount,
      uploadedCount,
      shift,
      notes,
    } = body;

    const received = Math.max(0, Number(receivedCount) || 0);
    const uploaded = Math.max(0, Number(uploadedCount) || 0);
    const pending = Math.max(0, received - uploaded);
    const rate = received > 0 ? (uploaded / received) * 100 : 100;

    const record = {
      id: id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: date || new Date().toISOString().split('T')[0],
      userId: userId || 'user_unknown',
      userName: userName || 'Operator',
      station: station || 'General Station',
      school: school || 'School of Applied Science',
      receivedCount: received,
      uploadedCount: uploaded,
      pendingCount: pending,
      completionRate: rate,
      status: computeServerStatus(received, uploaded),
      notes: notes || '',
      shift: shift || 'Morning',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveOrUpdateServerRecord(record);

    return NextResponse.json(
      {
        success: true,
        message: 'Record successfully synchronized to server',
        data: record,
      },
      { status: 201, headers: noCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid payload',
        error: String(error),
      },
      { status: 400, headers: noCacheHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID required' },
        { status: 400, headers: noCacheHeaders }
      );
    }
    deleteServerRecord(id);
    return NextResponse.json(
      { success: true, message: 'Record deleted' },
      { status: 200, headers: noCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
