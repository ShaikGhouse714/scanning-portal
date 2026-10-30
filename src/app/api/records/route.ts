import { NextResponse } from 'next/server';
import { INITIAL_RECORDS } from '@/lib/mockData';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: INITIAL_RECORDS,
    total: INITIAL_RECORDS.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, userId, userName, station, receivedCount, uploadedCount, shift, notes } = body;

    const received = Math.max(0, Number(receivedCount) || 0);
    const uploaded = Math.max(0, Number(uploadedCount) || 0);
    const pending = Math.max(0, received - uploaded);
    const rate = received > 0 ? (uploaded / received) * 100 : 100;

    const newRecord = {
      id: `rec_${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      userId: userId || 'user_unknown',
      userName: userName || 'Operator',
      station: station || 'General Station',
      receivedCount: received,
      uploadedCount: uploaded,
      pendingCount: pending,
      completionRate: rate,
      status: uploaded === received ? 'completed' : uploaded < received ? 'pending_backlog' : 'over_uploaded',
      notes: notes || '',
      shift: shift || 'Morning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Record successfully created/logged',
      data: newRecord,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Invalid payload',
      error: String(error),
    }, { status: 400 });
  }
}

