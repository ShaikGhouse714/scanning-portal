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

  // If published to web (/spreadsheets/d/e/ or /pub or /pubhtml)
  if (trimmed.includes('/spreadsheets/d/e/') || trimmed.includes('/pubhtml') || trimmed.includes('/pub')) {
    let base = trimmed.split('?')[0].split('#')[0];
    if (base.endsWith('/pubhtml')) base = base.replace(/\/pubhtml$/, '/pub');
    else if (!base.endsWith('/pub')) base = base.replace(/\/$/, '') + '/pub';
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const gid = urlObj.searchParams.get('gid');
    return gid ? `${base}?gid=${gid}&single=true&output=xlsx` : `${base}?output=xlsx`;
  }

  // If standard edit / view Google Sheet URL (e.g. /spreadsheets/d/<SHEET_ID>/edit#gid=<GID>)
  const match = trimmed.match(/\/spreadsheets\/d\/(?!e\/)([a-zA-Z0-9-_]+)/);
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
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    const y = val.getFullYear();
    return `${m}/${d}/${y}`;
  }
  const str = String(val).trim();
  const num = typeof val === 'number' ? val : Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    try {
      const parsed = XLSX.SSF.parse_date_code(num);
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
  return str;
}

// Cleanly format Excel time into standard 12-hour AM/PM format (e.g. 10:00:00 AM, 8:00:00 PM)
function formatSheetTime(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  const str = String(val).trim();

  // 1. If it's a numeric decimal or Excel time code (e.g. 0.8333333333333334 or 0.4166666666666667)
  const num = typeof val === 'number' ? val : Number(str);
  if (
    !isNaN(num) &&
    num >= 0 &&
    !str.includes(':') &&
    !str.includes('AM') &&
    !str.includes('PM') &&
    !str.match(/\.\d{2}\./)
  ) {
    let fraction = num % 1;
    if (fraction === 0 && num > 0 && num < 1) fraction = num;

    const totalSeconds = Math.round(fraction * 86400);
    const rawHours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    const displayHours = rawHours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
  }

  // 2. Normalize dot time notation common in typing (e.g. "10.00.00 AM", "10.30 AM", "2.00 PM")
  const normalized = str.replace(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/g, (m, h, min, s) => {
    return `${h}:${min}:${s || '00'}`;
  });

  // 3. If it's formatted string (e.g. "8:00:00 PM", "10:30 AM", "14:00")
  const match = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const s = match[3] || '00';
    const ampm = match[4] ? match[4].toUpperCase() : null;
    if (ampm) {
      return `${h}:${m}:${s} ${ampm}`;
    } else {
      const isPM = h >= 12;
      const displayH = h % 12 || 12;
      return `${displayH}:${m}:${s} ${isPM ? 'PM' : 'AM'}`;
    }
  }

  // 4. Fallback for "10 AM", "2 PM"
  const simpleMatch = str.match(/(\d{1,2})\s*(AM|PM)/i);
  if (simpleMatch) {
    const h = parseInt(simpleMatch[1], 10);
    const ampm = simpleMatch[2].toUpperCase();
    return `${h}:00:00 ${ampm}`;
  }

  return str;
}

// Parse combined DateTime for comparison against current local time with explicit timezone offset
function parseCloseDateTime(dateStr: string, timeStr: string, tzOffsetStr = '+05:30'): Date | null {
  if (!dateStr) return null;
  const dClean = dateStr.trim();
  const tClean = timeStr ? timeStr.trim() : '23:59:59';

  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  // 1. If decimal number like 0.4166666666666667
  const numTime = Number(tClean);
  if (
    !isNaN(numTime) &&
    numTime >= 0 &&
    numTime < 1 &&
    !tClean.includes(':') &&
    !tClean.includes('AM') &&
    !tClean.includes('PM') &&
    !tClean.match(/\.\d{2}\./)
  ) {
    const totalSecs = Math.round(numTime * 86400);
    hours = Math.floor(totalSecs / 3600) % 24;
    minutes = Math.floor((totalSecs % 3600) / 60);
    seconds = totalSecs % 60;
  } else {
    // 2. Normalize dots to colons: "10.00.00 AM" or "10.30 AM" -> "10:00:00 AM"
    const normalized = tClean.replace(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/g, (m, h, min, s) => {
      return `${h}:${min}:${s || '00'}`;
    });

    const tMatch = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (tMatch) {
      hours = parseInt(tMatch[1], 10);
      minutes = parseInt(tMatch[2], 10);
      seconds = tMatch[3] ? parseInt(tMatch[3], 10) : 0;
      const ampm = tMatch[4] ? tMatch[4].toUpperCase() : null;
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
      const simpleMatch = tClean.match(/(\d{1,2})\s*(AM|PM)/i);
      if (simpleMatch) {
        hours = parseInt(simpleMatch[1], 10);
        minutes = 0;
        seconds = 0;
        const ampm = simpleMatch[2].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
    }
  }

  // Parse Date parts
  const parts = dClean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);

    let year = y;
    let month = 1;
    let day = 1;

    if (p1 > 1000) {
      // YYYY-MM-DD
      year = p1;
      month = p2;
      day = y;
    } else {
      if (y < 100) y += 2000;
      year = y;
      // In the user's sheet (e.g. 10/12/2026, 11/6/2026), format is MM/DD/YYYY
      month = p1 <= 12 ? p1 : p2;
      day = p1 <= 12 ? p2 : p1;
    }

    const yStr = String(year).padStart(4, '0');
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const hhStr = String(hours).padStart(2, '0');
    const mmStr = String(minutes).padStart(2, '0');
    const ssStr = String(seconds).padStart(2, '0');

    // Attach timezone offset (+05:30) so servers everywhere interpret it identically
    const offset = tzOffsetStr.startsWith('+') || tzOffsetStr.startsWith('-') ? tzOffsetStr : `+${tzOffsetStr}`;
    const isoString = `${yStr}-${mStr}-${dStr}T${hhStr}:${mmStr}:${ssStr}${offset}`;
    const dt = new Date(isoString);
    if (!isNaN(dt.getTime())) return dt;

    const fallback = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  const direct = new Date(`${dClean} ${tClean}`);
  if (!isNaN(direct.getTime())) return direct;

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, targetSubsheet, clientTime, tzOffset } = body;
    const now = clientTime ? new Date(clientTime) : new Date();
    const effectiveTzOffset = tzOffset || '+05:30';

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

    const cleanKeyMap = new Map<string, string>();
    const scanLimit = Math.min(rawJson.length, 5);
    for (let i = 0; i < scanLimit; i++) {
      for (const key of Object.keys(rawJson[i])) {
        const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean && !cleanKeyMap.has(clean)) {
          cleanKeyMap.set(clean, key);
        }
      }
    }

    function findCol(...aliases: string[]): string | null {
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKeyMap.has(cleanAlias)) return cleanKeyMap.get(cleanAlias)!;
        for (const [cleanKey, origKey] of cleanKeyMap) {
          if (cleanKey.includes(cleanAlias)) return origKey;
        }
      }
      return null;
    }

    const colSchedule = findCol('schedule id', 'schedule_id', 'scheduleid', 'schedule', 'slot id');
    const colCycle = findCol('evaluation cycle', 'eval cycle', 'cycle', 'round');
    const colOpenDate = findCol('result open date', 'open date', 'result open', 'opendate');
    const colCloseDate = findCol('result close date', 'close date', 'result close', 'closedate');
    const colCloseTime = findCol('result close time', 'close time', 'closetime', 'time');
    const colSchool = findCol('school name', 'schoolname', 'school_name', 'school', 'department', 'faculty');
    const colNextRequired = findCol('next round of evaluation required', 'next round evaluation required', 'next round required', 'next evaluation required', 're-evaluation required', 're-eval required');
    const colNextAssigned = findCol('next round evaluation assigned', 'next round assigned', 'next evaluation assigned', 'assigned');

    const schoolsSet = new Set<string>();

    let actionRequiredCount = 0;
    let expiredCount = 0;
    let activeCount = 0;
    let assignedCount = 0;
    let notAssignedCount = 0;
    let notRequiredCount = 0;

    const rows = rawJson.map((row, idx) => {
      // 1. Schedule ID (Col A)
      const rawSchedule = colSchedule ? String(row[colSchedule] ?? '').trim() : '';
      const scheduleId = cleanScheduleId(rawSchedule);

      // 2. Evaluation Cycle (Col B)
      const evaluationCycle = (colCycle ? String(row[colCycle] ?? '').trim() : '') || 'primary';

      // 3. Result Open Date (Col C)
      const rawOpenDate = colOpenDate ? row[colOpenDate] : '';
      const resultOpenDate = formatSheetDate(rawOpenDate);

      // 4. Result Close Date (Col D)
      const rawCloseDate = colCloseDate ? row[colCloseDate] : '';
      const resultCloseDate = formatSheetDate(rawCloseDate);

      // 5. Result Close Time (Col E)
      const rawCloseTime = colCloseTime ? row[colCloseTime] : '';
      const resultCloseTime = formatSheetTime(rawCloseTime);

      // 6. School Name (Col F)
      const schoolName = colSchool ? String(row[colSchool] ?? '').trim() : '';
      if (schoolName) schoolsSet.add(schoolName);

      // 7. Next Round of Evaluation Required (Col G)
      const rawNextRequired = colNextRequired ? String(row[colNextRequired] ?? '').trim() : '';
      const isNotRequired =
        rawNextRequired.toLowerCase().includes('not') ||
        rawNextRequired.toLowerCase() === 'no';
      const isExplicitlyRequired =
        rawNextRequired.toLowerCase() === 'required' ||
        rawNextRequired.toLowerCase() === 'yes' ||
        rawNextRequired.toLowerCase() === 'y';

      // Keep blank/empty if not filled! The user fills this only after result close
      const nextRoundRequired = isNotRequired
        ? 'Not Required'
        : isExplicitlyRequired
        ? 'Required'
        : rawNextRequired
        ? rawNextRequired
        : '';

      // 8. Next Round Evaluation Assigned (Col H)
      const rawNextAssigned = colNextAssigned ? String(row[colNextAssigned] ?? '').trim() : '';
      const isAssigned =
        rawNextAssigned.toLowerCase() === 'yes' ||
        rawNextAssigned.toLowerCase() === 'y' ||
        rawNextAssigned.toLowerCase().includes('assigned');
      const nextRoundAssigned = isAssigned ? 'Yes' : rawNextAssigned ? rawNextAssigned : '';

      // Determine Date & Time Expiration against current local time with explicit timezone
      const closeDateTime = parseCloseDateTime(resultCloseDate, resultCloseTime, effectiveTzOffset);
      const isExpired = closeDateTime ? closeDateTime.getTime() <= now.getTime() : false;

      // Status classification
      let status: 'EXPIRED_ACTION_REQUIRED' | 'ACTIVE' | 'ASSIGNED' | 'NOT_REQUIRED' = 'ACTIVE';

      if (isAssigned) {
        // Evaluation assignment completed
        status = 'ASSIGNED';
        assignedCount++;
      } else {
        notAssignedCount++;
        if (!isExpired) {
          // Result is currently open (closes in future)
          status = 'ACTIVE';
          activeCount++;
        } else {
          // Result close date & time has expired!
          if (isNotRequired) {
            // Closed and verified that re-evaluation is not required
            status = 'NOT_REQUIRED';
            notRequiredCount++;
          } else {
            // Time completed, but Next Round Required is EMPTY (needs review) or 'Required' and not yet assigned!
            // Triggers critical alert: "Time is completed. Please check re-evaluations and assign."
            status = 'EXPIRED_ACTION_REQUIRED';
            actionRequiredCount++;
            expiredCount++;
          }
        }
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
      notAssignedCount,
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

