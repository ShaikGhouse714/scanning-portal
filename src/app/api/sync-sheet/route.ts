import { NextResponse } from 'next/server';
import { convertToXlsxExportUrl, parseTeamGoogleSheet } from '@/lib/excelParser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Google Sheet URL is required' },
        { status: 400 }
      );
    }

    const downloadUrl = convertToXlsxExportUrl(url);

    // Fetch the XLSX file from Google Sheets
    const res = await fetch(downloadUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to download sheet from Google (HTTP ${res.status}: ${res.statusText}). Ensure sheet is 'Published to the web' or link sharing is set to 'Anyone with link'.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Downloaded file is too small or invalid. Make sure you selected XLSX format in Publish to the Web.',
        },
        { status: 400 }
      );
    }

    const parsed = parseTeamGoogleSheet(arrayBuffer);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${parsed.sheetNames.length} teammate subsheet(s)`,
      sheetNames: parsed.sheetNames,
      totalEntries: parsed.teammateEntries.length,
      data: parsed.teammateEntries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing Google Sheet: ' + String(error),
      },
      { status: 500 }
    );
  }
}

