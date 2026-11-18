import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  computeResultStatus,
  isBlankValue,
  isNotRequiredValue,
  isAssignedOrRequiredValue,
} from '../../../lib/resultOpsParser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fetch with timeout, user-agent, redirect handling, and Google Drive virus-warning bypass
async function fetchGoogleEndpoint(
  url: string,
  timeoutMs: number = 25000
): Promise<{ ok: boolean; status: number; buffer: ArrayBuffer | null; isHtml: boolean; htmlText?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/html,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
    };

    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });

    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, status: res.status, buffer: null, isHtml: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const buffer = await res.arrayBuffer();

    // Check if body is HTML (Google error / warning / login page)
    if (buffer.byteLength > 0 && buffer.byteLength < 600000) {
      const preview = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer.slice(0, 3000)));
      if (
        preview.trim().startsWith('<!DOCTYPE html') ||
        preview.includes('<html') ||
        preview.includes('Google Drive - Virus scan warning')
      ) {
        if (preview.includes('confirm=')) {
          const match = preview.match(/confirm=([a-zA-Z0-9_-]+)/);
          if (match) {
            const confirmUrl = url + (url.includes('?') ? '&' : '?') + `confirm=${match[1]}`;
            const confirmRes = await fetch(confirmUrl, { headers, cache: 'no-store', redirect: 'follow' });
            if (confirmRes.ok) {
              const confirmBuf = await confirmRes.arrayBuffer();
              return { ok: true, status: 200, buffer: confirmBuf, isHtml: false };
            }
          }
        }

        if (preview.includes('ServiceLogin') || preview.includes('accounts.google.com') || preview.includes('Sign in')) {
          return {
            ok: false,
            status: 403,
            buffer: null,
            isHtml: true,
            htmlText: preview,
            error: "Google Sheet requires sign-in. Please ensure link sharing is set to 'Anyone with the link can view' or use 'File > Share > Publish to web'.",
          };
        }

        if (preview.includes('<table') || preview.includes('waffle')) {
          return { ok: true, status: 200, buffer, isHtml: true, htmlText: preview };
        }

        return { ok: false, status: 200, buffer, isHtml: true, htmlText: preview };
      }
    }

    return { ok: true, status: 200, buffer, isHtml: false };
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError';
    return {
      ok: false,
      status: isTimeout ? 504 : 500,
      buffer: null,
      isHtml: false,
      error: isTimeout ? `Connection timed out after ${timeoutMs / 1000}s.` : err.message,
    };
  }
}

// Extract all subsheet names and their GIDs from pubhtml HTML view
async function extractSubsheetsAndGidsFromHtml(pubHtmlUrl: string): Promise<{ name: string; gid: string }[]> {
  try {
    const res = await fetchGoogleEndpoint(pubHtmlUrl, 6000);
    if (!res.buffer) return [];

    const text = new TextDecoder('utf-8').decode(new Uint8Array(res.buffer));
    const map = new Map<string, string>();

    // Pattern 1: <li id="sheet-button-([0-9]+)"[^>]*>.*?<a[^>]*>(.*?)<\/a>
    const p1 = /<li[^>]*id=["']sheet-button-([0-9]+)["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = p1.exec(text)) !== null) {
      const gid = m[1].trim();
      const name = m[2].trim();
      if (name) map.set(name, gid);
    }

    // Pattern 2: ?gid=([0-9]+) ... >(.*?)<
    const p2 = /[?&#]gid=([0-9]+)[^"'>]*["'][^>]*>([^<]+)<\/a>/gi;
    while ((m = p2.exec(text)) !== null) {
      const gid = m[1].trim();
      const name = m[2].trim();
      if (name && !map.has(name)) map.set(name, gid);
    }

    // Pattern 3: JSON "name": "...", "gid": "..."
    const p3 = /"name"\s*:\s*"([^"\\]+)"\s*,\s*"[^"]*"\s*:\s*"[^"]*"\s*,\s*"gid"\s*:\s*"?([0-9]+)"?/gi;
    while ((m = p3.exec(text)) !== null) {
      const name = m[1].trim();
      const gid = m[2].trim();
      if (name && !map.has(name)) map.set(name, gid);
    }

    // Pattern 4: JSON "gid": "...", "name": "..."
    const p4 = /"gid"\s*:\s*"?([0-9]+)"?\s*,\s*"name"\s*:\s*"([^"\\]+)"/gi;
    while ((m = p4.exec(text)) !== null) {
      const gid = m[1].trim();
      const name = m[2].trim();
      if (name && !map.has(name)) map.set(name, gid);
    }

    return Array.from(map.entries()).map(([name, gid]) => ({ name, gid }));
  } catch {
    return [];
  }
}

// Clean and extract Schedule ID
function cleanScheduleId(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  const match = str.match(/\b(\d{4,8})\b/);
  if (match) return match[1];
  return str;
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

    const trimmedUrl = url.trim();
    const requestedSheet = (targetSubsheet || 'Result view').trim();
    const isPublished =
      trimmedUrl.includes('/spreadsheets/d/e/') ||
      trimmedUrl.includes('/pubhtml') ||
      trimmedUrl.includes('/pub');

    const gidMatch = trimmedUrl.match(/[?&#]gid=([0-9]+)/);
    const urlGid = gidMatch ? gidMatch[1] : null;

    const standardMatch = trimmedUrl.match(/\/spreadsheets\/d\/(?!e\/)([a-zA-Z0-9-_]+)/);
    const sheetId = standardMatch ? standardMatch[1] : null;

    let workbook: XLSX.WorkBook | null = null;
    let sheetNames: string[] = [];
    let selectedSheetName = requestedSheet;
    const ts = Date.now();

    // =========================================================================
    // BRANCH A: PUBLISHED GOOGLE SHEET (/spreadsheets/d/e/... or /pubhtml)
    // =========================================================================
    if (isPublished) {
      let pubBase = trimmedUrl.split('?')[0].split('#')[0];
      if (pubBase.endsWith('/pubhtml')) pubBase = pubBase.replace(/\/pubhtml$/, '/pub');
      else if (!pubBase.endsWith('/pub')) pubBase = pubBase.replace(/\/$/, '') + '/pub';
      const pubHtmlUrl = pubBase.replace(/\/pub$/, '/pubhtml');

      // 1. Discover all tabs and their exact GIDs from pubhtml view
      let discoveredTabs: { name: string; gid: string }[] = [];
      try {
        discoveredTabs = await extractSubsheetsAndGidsFromHtml(pubHtmlUrl);
      } catch {
        discoveredTabs = [];
      }

      if (discoveredTabs.length > 0) {
        sheetNames = discoveredTabs.map((t) => t.name);
      }

      // 2. Identify target tab GID (e.g. for "Result view")
      const reqClean = requestedSheet.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedTab =
        discoveredTabs.find((t) => t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === reqClean) ||
        discoveredTabs.find((t) => t.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes('resultview')) ||
        discoveredTabs.find((t) => t.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes('result'));

      if (matchedTab) {
        selectedSheetName = matchedTab.name;
      }

      const effectiveGid = matchedTab ? matchedTab.gid : urlGid;

      // 3. Build fetch candidates with cachebuster to guarantee live updates
      const candidates: { url: string; isCsv: boolean }[] = [];

      // Candidate 1: Targeted live CSV for the exact GID of "Result view" (Instant live sync, bypasses Google CDN cache!)
      if (effectiveGid) {
        candidates.push({
          url: `${pubBase}?gid=${effectiveGid}&single=true&output=csv&_t=${ts}`,
          isCsv: true,
        });
      }

      // Candidate 2: Full XLSX workbook export with cachebuster
      candidates.push({
        url: `${pubBase}?output=xlsx&_t=${ts}`,
        isCsv: false,
      });

      // Try candidates in order
      for (const cand of candidates) {
        try {
          const res = await fetchGoogleEndpoint(cand.url, 20000);
          if (res.ok && res.buffer && res.buffer.byteLength > 50) {
            const wb = XLSX.read(new Uint8Array(res.buffer), { type: 'array' });
            if (wb && wb.SheetNames && wb.SheetNames.length > 0) {
              workbook = wb;
              if (cand.isCsv) {
                // In CSV export, the single sheet is the target sheet
                selectedSheetName = matchedTab ? matchedTab.name : requestedSheet;
                if (!sheetNames.includes(selectedSheetName)) {
                  sheetNames.push(selectedSheetName);
                }
              } else {
                sheetNames = Array.from(new Set([...sheetNames, ...wb.SheetNames]));
              }
              break;
            }
          }
        } catch {
          // try next
        }
      }
    }

    // =========================================================================
    // BRANCH B: STANDARD GOOGLE SHEET (/spreadsheets/d/<ID>/...)
    // =========================================================================
    else if (sheetId) {
      const candidates: { url: string; isCsv: boolean }[] = [
        {
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(requestedSheet)}&_t=${ts}`,
          isCsv: true,
        },
        {
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&_t=${ts}`,
          isCsv: false,
        },
      ];

      for (const cand of candidates) {
        try {
          const res = await fetchGoogleEndpoint(cand.url, 20000);
          if (res.ok && res.buffer && res.buffer.byteLength > 50) {
            const wb = XLSX.read(new Uint8Array(res.buffer), { type: 'array' });
            if (wb && wb.SheetNames && wb.SheetNames.length > 0) {
              workbook = wb;
              if (cand.isCsv) {
                selectedSheetName = requestedSheet;
                if (!sheetNames.includes(selectedSheetName)) sheetNames.push(selectedSheetName);
              } else {
                sheetNames = Array.from(new Set([...sheetNames, ...wb.SheetNames]));
              }
              break;
            }
          }
        } catch {
          // try next
        }
      }
    }

    // Fallback: direct fetch from input URL if neither branch parsed
    if (!workbook) {
      const fallbackUrl = `${trimmedUrl}${trimmedUrl.includes('?') ? '&' : '?'}_t=${ts}`;
      const res = await fetchGoogleEndpoint(fallbackUrl, 20000);
      if (res.ok && res.buffer && res.buffer.byteLength > 50) {
        workbook = XLSX.read(new Uint8Array(res.buffer), { type: 'array' });
        if (workbook && workbook.SheetNames) {
          sheetNames = Array.from(new Set([...sheetNames, ...workbook.SheetNames]));
        }
      }
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to access or parse Google Sheet content. Please verify link sharing is set to "Anyone with the link can view" or the sheet is published to web.',
        },
        { status: 400 }
      );
    }

    // Resolve target sheet
    let targetSheetObj = workbook.Sheets[selectedSheetName];
    if (!targetSheetObj) {
      const cleanReq = requestedSheet.toLowerCase().replace(/[^a-z0-9]/g, '');
      const foundName =
        workbook.SheetNames.find((s) => s.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanReq) ||
        workbook.SheetNames.find((s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').includes('resultview')) ||
        workbook.SheetNames.find((s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').includes('result'));

      if (foundName) {
        selectedSheetName = foundName;
        targetSheetObj = workbook.Sheets[foundName];
      } else {
        selectedSheetName = workbook.SheetNames[0];
        targetSheetObj = workbook.Sheets[workbook.SheetNames[0]];
      }
    }

    if (!targetSheetObj) {
      return NextResponse.json(
        { success: false, message: `Could not access subsheet "${selectedSheetName}".` },
        { status: 400 }
      );
    }

    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(targetSheetObj, { defval: '' });
    if (rawJson.length === 0) {
      return NextResponse.json(
        {
          success: false,
          sheetNames: sheetNames.length > 0 ? sheetNames : [selectedSheetName],
          activeSheetName: selectedSheetName,
          message: `Subsheet "${selectedSheetName}" contains no rows.`,
        },
        { status: 400 }
      );
    }

    // Map column aliases with priority on exact clean matches
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
      // Pass 1: exact clean match
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKeyMap.has(cleanAlias)) return cleanKeyMap.get(cleanAlias)!;
      }
      // Pass 2: substring match (minimum length 4 to prevent collision)
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanAlias.length < 4) continue;
        for (const [cleanKey, origKey] of cleanKeyMap) {
          if (cleanKey === cleanAlias || cleanKey.includes(cleanAlias) || cleanAlias.includes(cleanKey)) {
            return origKey;
          }
        }
      }
      return null;
    }

    const colSchedule = findCol('schedule id', 'schedule_id', 'scheduleid', 'schedule', 'slot id', 'test id');
    const colCycle = findCol('evaluation cycle', 'eval cycle', 'cycle', 'round');
    const colOpenDate = findCol('result open date', 'open date', 'result open', 'opendate');
    const colCloseDate = findCol('result close date', 'close date', 'result close', 'closedate');
    const colCloseTime = findCol('result close time', 'close time', 'closetime', 'time');
    const colSchool = findCol('school name', 'schoolname', 'school_name', 'school', 'department', 'faculty');
    const colNextRequired = findCol(
      'next round of evaluation required',
      'next round evaluation required',
      'next round required',
      'next evaluation required',
      're-evaluation required',
      're-eval required'
    );
    const colNextAssigned = findCol(
      'next round evaluation assigned',
      'next round assigned',
      'next evaluation assigned',
      're-evaluation assigned',
      'assigned'
    );

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

      // 7. Next Round of Evaluation Required (Col G) & Next Round Evaluation Assigned (Col H)
      const rawNextRequired = colNextRequired ? String(row[colNextRequired] ?? '').trim() : '';
      const rawNextAssigned = colNextAssigned ? String(row[colNextAssigned] ?? '').trim() : '';

      // Determine Date & Time Expiration against client's local time with explicit timezone
      const closeDateTime = parseCloseDateTime(resultCloseDate, resultCloseTime, effectiveTzOffset);
      const isExpired = closeDateTime ? closeDateTime.getTime() <= now.getTime() : false;

      // Status classification based on user requirement:
      // - Both cells blank & deadline in future => ACTIVE
      // - Both cells blank & deadline passed => EXPIRED_ACTION_REQUIRED
      // - Filled with "Not Required" / "No" / "None" / "N/A" => NOT_REQUIRED
      // - Filled with "Required" / "Yes" / "Assigned" / any entry => ASSIGNED (action taken!)
      const status = computeResultStatus(rawNextRequired, rawNextAssigned, isExpired);

      if (status === 'EXPIRED_ACTION_REQUIRED') {
        actionRequiredCount++;
        expiredCount++;
        notAssignedCount++;
      } else if (status === 'ACTIVE') {
        activeCount++;
        notAssignedCount++;
      } else if (status === 'ASSIGNED') {
        assignedCount++;
      } else if (status === 'NOT_REQUIRED') {
        notRequiredCount++;
      }

      const nextRoundRequired = isBlankValue(rawNextRequired)
        ? ''
        : isNotRequiredValue(rawNextRequired)
        ? 'Not Required'
        : rawNextRequired;

      const nextRoundAssigned = isBlankValue(rawNextAssigned)
        ? ''
        : isNotRequiredValue(rawNextAssigned)
        ? 'Not Required'
        : rawNextAssigned.toLowerCase() === 'yes' || rawNextAssigned.toLowerCase() === 'y'
        ? 'Yes'
        : rawNextAssigned;

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
      sheetNames: sheetNames.length > 0 ? sheetNames : [selectedSheetName],
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
