import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Convert Google Sheet URL to direct XLSX/CSV download link
function convertToFetchUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // If already output=xlsx or output=csv
  if (trimmed.includes('output=xlsx')) {
    return trimmed;
  }

  // If published to web (/pub or /pubhtml)
  if (trimmed.includes('/pubhtml') || trimmed.includes('/pub')) {
    const base = trimmed.split('?')[0].replace(/\/pubhtml$/, '/pub').replace(/\/pub$/, '/pub');
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const gid = urlObj.searchParams.get('gid');
    return gid ? `${base}?gid=${gid}&single=true&output=xlsx` : `${base}?output=xlsx`;
  }

  // If standard edit / view Google Sheet URL (e.g. /spreadsheets/d/<SHEET_ID>/edit#gid=<GID>)
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const sheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  }

  return trimmed;
}

// Clean and extract Schedule ID
function cleanScheduleId(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  const match = str.match(/\b(\d{4,8})\b/);
  if (match) return match[1];
  return str;
}

// Helper to look up key by aliases (case-insensitive & stripped)
function getRowField(row: Record<string, any>, ...aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanAlias || cleanKey.includes(cleanAlias)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim().length > 0) {
          return String(val).trim();
        }
      }
    }
  }
  return '';
}

// Cleanly format Excel dates into standard MM/DD/YYYY or YYYY-MM-DD
function formatSheetDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number' || (!isNaN(Number(val)) && Number(val) > 30000 && Number(val) < 60000)) {
    try {
      const parsed = XLSX.SSF.parse_date_code(Number(val));
      if (parsed) {
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        const y = parsed.y;
        return `${m}/${d}/${y}`;
      }
    } catch {
      // fallback
    }
  }
  return String(val).trim();
}

// Cleanly format Excel time
function formatSheetTime(val: any): string {
  if (!val) return '';
  if (typeof val === 'number' && val >= 0 && val < 1) {
    // Decimal time of day
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')}:00 ${ampm}`;
  }
  return String(val).trim();
}

// Parse combined DateTime for comparison
function parseCloseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null;
  const dClean = dateStr.trim();
  const tClean = timeStr ? timeStr.trim() : '23:59:59';

  // 1. Try standard JS parse
  const direct = new Date(`${dClean} ${tClean}`);
  if (!isNaN(direct.getTime())) return direct;

  // 2. Parse MM/DD/YYYY or DD/MM/YYYY
  const parts = dClean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;

    // Default to MM/DD/YYYY if p1 <= 12, else DD/MM/YYYY
    const month = p1 <= 12 ? p1 - 1 : p2 - 1;
    const day = p1 <= 12 ? p2 : p1;

    let hours = 23;
    let minutes = 59;
    let seconds = 59;

    const tMatch = tClean.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (tMatch) {
      hours = parseInt(tMatch[1], 10);
      minutes = parseInt(tMatch[2], 10);
      seconds = tMatch[3] ? parseInt(tMatch[3], 10) : 0;
      const ampm = tMatch[4] ? tMatch[4].toUpperCase() : null;
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    const constructed = new Date(y, month, day, hours, minutes, seconds);
    if (!isNaN(constructed.getTime())) return constructed;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, targetSubsheet } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Google Sheet URL or Published Web link is required.' },
        { status: 400 }
      );
    }

    const downloadUrl = convertToFetchUrl(url);

    // Fetch live XLSX data from Google
    const res = await fetch(downloadUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Unable to access Google Sheet (HTTP ${res.status}: ${res.statusText}). Please verify link sharing is set to "Anyone with the link can view" or the sheet is "Published to web".`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 50) {
      return NextResponse.json(
        { success: false, message: 'Downloaded Google Sheet content is empty or invalid.' },
        { status: 400 }
      );
    }

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No sheets found in the Google Sheet document.' },
        { status: 400 }
      );
    }

    // Target Subsheet Selection:
    // Look for targetSubsheet (e.g. "Result view") or case-insensitive match
    const reqSheet = (targetSubsheet || 'Result view').trim().toLowerCase();
    let selectedSheetName = sheetNames.find((s) => s.toLowerCase() === reqSheet);

    // Fallbacks if "Result view" is slightly varied: "resultview", "results", "result"
    if (!selectedSheetName) {
      selectedSheetName = sheetNames.find((s) => {
        const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean === 'resultview' || clean.includes('result');
      });
    }

    // If still not found, default to first sheet
    if (!selectedSheetName) {
      selectedSheetName = sheetNames[0];
    }

    const sheet = workbook.Sheets[selectedSheetName];
    if (!sheet) {
      return NextResponse.json(
        { success: false, message: `Could not access sheet "${selectedSheetName}".` },
        { status: 400 }
      );
    }

    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rawJson.length === 0) {
      return NextResponse.json(
        {
          success: false,
          sheetNames,
          activeSheetName: selectedSheetName,
          message: `Subsheet "${selectedSheetName}" contains no rows.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const schoolsSet = new Set<string>();

    let actionRequiredCount = 0;
    let expiredCount = 0;
    let activeCount = 0;
    let assignedCount = 0;
    let notRequiredCount = 0;

    const rows = rawJson.map((row, idx) => {
      // 1. Schedule ID (Col A)
      const rawSchedule = getRowField(
        row,
        'schedule id',
        'schedule_id',
        'scheduleid',
        'schedule',
        'slot id'
      );
      const scheduleId = cleanScheduleId(rawSchedule);

      // 2. Evaluation Cycle (Col B)
      const evaluationCycle = getRowField(
        row,
        'evaluation cycle',
        'eval cycle',
        'cycle',
        'round'
      ) || 'primary';

      // 3. Result Open Date (Col C)
      const rawOpenDate = getRowField(
        row,
        'result open date',
        'open date',
        'result open',
        'opendate'
      );
      const resultOpenDate = formatSheetDate(rawOpenDate);

      // 4. Result Close Date (Col D)
      const rawCloseDate = getRowField(
        row,
        'result close date',
        'close date',
        'result close',
        'closedate'
      );
      const resultCloseDate = formatSheetDate(rawCloseDate);

      // 5. Result Close Time (Col E)
      const rawCloseTime = getRowField(
        row,
        'result close time',
        'close time',
        'closetime',
        'time'
      );
      const resultCloseTime = formatSheetTime(rawCloseTime);

      // 6. School Name (Col F)
      const schoolName = getRowField(
        row,
        'school name',
        'schoolname',
        'school_name',
        'school',
        'department',
        'faculty'
      );
      if (schoolName) schoolsSet.add(schoolName);

      // 7. Next Round of Evaluation Required (Col G)
      const rawNextRequired = getRowField(
        row,
        'next round of evaluation required',
        'next round evaluation required',
        'next round required',
        'next evaluation required',
        're-evaluation required',
        're-eval required'
      );
      const isNotRequired =
        rawNextRequired.toLowerCase().includes('not') ||
        rawNextRequired.toLowerCase() === 'no';
      const nextRoundRequired = isNotRequired
        ? 'Not Required'
        : rawNextRequired
        ? 'Required'
        : 'Required'; // Default to Required if marked or under review

      // 8. Next Round Evaluation Assigned (Col H)
      const rawNextAssigned = getRowField(
        row,
        'next round evaluation assigned',
        'next round assigned',
        'next evaluation assigned',
        'assigned'
      );
      const isAssigned =
        rawNextAssigned.toLowerCase() === 'yes' ||
        rawNextAssigned.toLowerCase() === 'y' ||
        rawNextAssigned.toLowerCase().includes('assigned');
      const nextRoundAssigned = isAssigned ? 'Yes' : rawNextAssigned ? rawNextAssigned : '';

      // Determine Date & Time Expiration
      const closeDateTime = parseCloseDateTime(resultCloseDate, resultCloseTime);
      const isExpired = closeDateTime ? closeDateTime.getTime() <= now.getTime() : false;

      // Status classification
      let status: 'EXPIRED_ACTION_REQUIRED' | 'ACTIVE' | 'ASSIGNED' | 'NOT_REQUIRED' = 'ACTIVE';

      if (isNotRequired) {
        status = 'NOT_REQUIRED';
        notRequiredCount++;
      } else if (isAssigned) {
        status = 'ASSIGNED';
        assignedCount++;
      } else if (isExpired) {
        status = 'EXPIRED_ACTION_REQUIRED';
        actionRequiredCount++;
        expiredCount++;
      } else {
        status = 'ACTIVE';
        activeCount++;
      }

      return {
        id: `res_${idx + 1}_${scheduleId || idx}`,
        scheduleId: scheduleId || `SCH-${idx + 1}`,
        evaluationCycle,
        resultOpenDate,
        resultCloseDate,
        resultCloseTime,
        closeTimestamp: closeDateTime ? closeDateTime.getTime() : null,
        schoolName,
        nextRoundRequired,
        nextRoundAssigned,
        isExpired,
        status,
        raw: row,
      };
    });

    return NextResponse.json({
      success: true,
      sheetNames,
      activeSheetName: selectedSheetName,
      totalRows: rows.length,
      actionRequiredCount,
      expiredCount,
      activeCount,
      assignedCount,
      notRequiredCount,
      schools: Array.from(schoolsSet).sort(),
      rows,
    });
  } catch (error: any) {
    console.error('Error fetching result sheet:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'An error occurred while fetching the Google Sheet.',
      },
      { status: 500 }
    );
  }
}
