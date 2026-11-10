import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { extractScheduleId } from '@/lib/evalOpsParser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory cache for fast repeated fetches (3-minute TTL)
interface CacheEntry {
  timestamp: number;
  data: any;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

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
      'Accept': 'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/html,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
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
        // 1. Google Drive large file virus-scan warning (needs confirm token)
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

        // 2. Google Login required
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

        // 3. Published HTML table (pubhtml): if it contains a table, it is valid sheet data
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
    const res = await fetchGoogleEndpoint(pubHtmlUrl, 4000);
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

// Fetch and parse candidate URLs in parallel; return the fastest candidate that produces valid data matching requirements
async function fetchFirstValid(
  candidates: { url: string; isCsv: boolean }[],
  targetSheetName: string,
  extraSheetNames: string[] = [],
  timeoutMs: number = 25000
): Promise<Record<string, any> | null> {
  if (candidates.length === 0) return null;

  const isTargetingTotalData =
    !targetSheetName || targetSheetName.toLowerCase().replace(/[^a-z0-9]/g, '').includes('totaldata');

  const attempts = candidates.map(async (cand) => {
    const res = await fetchGoogleEndpoint(cand.url, timeoutMs);
    if (!res.ok || !res.buffer || res.buffer.byteLength < 50) {
      throw new Error(res.error || 'Empty response');
    }
    const parsed = parseBufferAndRespond(res.buffer, targetSheetName, extraSheetNames, cand.isCsv);
    if (!parsed.success || parsed.totalRows === 0) {
      throw new Error(parsed.message || 'No valid rows found');
    }

    // CRITICAL VALIDATION:
    // If we are targeting "Total Data" (the master allocation sheet for schedules/evaluators):
    // The sheet MUST contain Schedule IDs! A 13-row cover sheet with 0 Schedule IDs is NOT Total Data.
    if (isTargetingTotalData && parsed.uniqueScheduleIds.length === 0) {
      throw new Error(
        `Sheet "${parsed.sheetName}" contains 0 Schedule IDs (${parsed.totalRows} rows); skipping non-allocation sheet.`
      );
    }

    return parsed;
  });

  try {
    return await Promise.any(attempts);
  } catch (err: any) {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, targetSheet, forceRefresh } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Google Sheet URL or Published Web link is required.' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    const cacheKey = `${trimmedUrl.toLowerCase()}::${(targetSheet || '').trim().toLowerCase()}`;

    // 1. Check in-memory cache if not explicitly refreshing
    // Also ensure cached entry has valid data (> 50 rows and > 0 schedule IDs for Total Data)
    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.timestamp < CACHE_TTL_MS &&
        cached.data?.totalRows > 50 &&
        cached.data?.uniqueScheduleIds?.length > 0
      ) {
        return NextResponse.json({
          ...cached.data,
          isFromCache: true,
        });
      }
    }

    // Identify URL type: Published (/spreadsheets/d/e/...) vs Standard (/spreadsheets/d/<ID>/...)
    const isPublished =
      trimmedUrl.includes('/spreadsheets/d/e/') ||
      trimmedUrl.includes('/pubhtml') ||
      trimmedUrl.includes('/pub');

    const gidMatch = trimmedUrl.match(/[?&#]gid=([0-9]+)/);
    const urlGid = gidMatch ? gidMatch[1] : null;

    // Standard sheet ID: match only when NOT followed by /e/ (so /spreadsheets/d/e/ is NOT matched as "e")
    const standardMatch = trimmedUrl.match(/\/spreadsheets\/d\/(?!e\/)([a-zA-Z0-9-_]+)/);
    const sheetId = standardMatch ? standardMatch[1] : null;

    let parsedResult: Record<string, any> | null = null;
    const requestedSheet = targetSheet || 'Total Data';

    // =========================================================================
    // BRANCH A: PUBLISHED GOOGLE SHEET (e.g. /spreadsheets/d/e/2PACX-.../pubhtml)
    // =========================================================================
    if (isPublished) {
      let pubBase = trimmedUrl.split('?')[0].split('#')[0];
      if (pubBase.endsWith('/pubhtml')) pubBase = pubBase.replace(/\/pubhtml$/, '/pub');
      else if (!pubBase.endsWith('/pub')) pubBase = pubBase.replace(/\/$/, '') + '/pub';

      const pubHtmlUrl = pubBase.replace(/\/pub$/, '/pubhtml');

      // 1. Fetch pubhtml to discover all tabs and their exact GIDs
      const tabsPromise = extractSubsheetsAndGidsFromHtml(pubHtmlUrl);

      let effectiveGid = urlGid;
      let discoveredTabs: { name: string; gid: string }[] = [];

      try {
        discoveredTabs = await tabsPromise;
      } catch {
        discoveredTabs = [];
      }

      const allDiscoveredSheetNames = discoveredTabs.map((t) => t.name);

      // 2. If no GID was in the URL, find the GID of "Total Data" or the requested sheet
      if (!effectiveGid && discoveredTabs.length > 0) {
        const cleanTarget = requestedSheet.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetTab =
          discoveredTabs.find((t) => t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
          discoveredTabs.find((t) => t.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes('totaldata'));
        if (targetTab) {
          effectiveGid = targetTab.gid;
        }
      }

      // 3. Build Candidates
      const candidates: { url: string; isCsv: boolean }[] = [];

      // Candidate 1: Targeted CSV for the exact GID of Total Data (fastest, ~400ms)
      if (effectiveGid) {
        candidates.push({
          url: `${pubBase}?gid=${effectiveGid}&single=true&output=csv`,
          isCsv: true,
        });
      }

      // Candidate 2: Full XLSX workbook export (guaranteed to contain all sheets and all 55,000+ rows)
      candidates.push({
        url: `${pubBase}?output=xlsx`,
        isCsv: false,
      });

      // Candidate 3: If user already provided output=csv with gid in their URL
      if (trimmedUrl.includes('output=csv') && urlGid) {
        candidates.push({ url: trimmedUrl, isCsv: true });
      }

      // Execute parallel candidate resolution with 25s timeout for complete 55,000+ row datasets
      parsedResult = await fetchFirstValid(candidates, requestedSheet, allDiscoveredSheetNames, 25000);

      // If still not parsed and we didn't have GID, try full XLSX directly as fallback
      if (!parsedResult) {
        const fallbackRes = await fetchGoogleEndpoint(`${pubBase}?output=xlsx`, 25000);
        if (fallbackRes.ok && fallbackRes.buffer && fallbackRes.buffer.byteLength > 100) {
          parsedResult = parseBufferAndRespond(fallbackRes.buffer, requestedSheet, allDiscoveredSheetNames, false);
        }
      }
    }

    // =========================================================================
    // BRANCH B: STANDARD GOOGLE SHEET (e.g. /spreadsheets/d/<ID>/edit#gid=...)
    // =========================================================================
    else if (sheetId) {
      // 1. Fast Google gviz queries
      const fastCandidates: { url: string; isCsv: boolean }[] = [
        {
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(requestedSheet)}`,
          isCsv: true,
        },
        {
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Total%20Data`,
          isCsv: true,
        },
      ];

      if (urlGid) {
        fastCandidates.push({
          url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${urlGid}`,
          isCsv: true,
        });
      }

      parsedResult = await fetchFirstValid(fastCandidates, requestedSheet, [], 7000);

      // 2. Fallback: Full XLSX export (guaranteed all sheets and rows)
      if (!parsedResult) {
        const fallbackCandidates: { url: string; isCsv: boolean }[] = [
          {
            url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
            isCsv: false,
          },
          {
            url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${urlGid ? `&gid=${urlGid}` : ''}`,
            isCsv: true,
          },
        ];
        parsedResult = await fetchFirstValid(fallbackCandidates, requestedSheet, [], 25000);
      }
    }

    if (!parsedResult || !parsedResult.success || parsedResult.totalRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to fetch Google Sheet data. Please ensure the link is set to "Anyone with the link can view" or use "File > Share > Publish to web", and verify that the "Total Data" subsheet contains exam allocation rows.',
        },
        { status: 400 }
      );
    }

    // Store valid result in memory cache
    memoryCache.set(cacheKey, { timestamp: Date.now(), data: parsedResult });
    if (memoryCache.size > 50) {
      const oldest = memoryCache.keys().next().value;
      if (oldest) memoryCache.delete(oldest);
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error('Error fetching Google Sheet:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'An unexpected error occurred while fetching the Google Sheet.',
      },
      { status: 500 }
    );
  }
}

// High-performance sheet parser with O(1) upfront column mapping
function parseBufferAndRespond(
  arrayBuffer: ArrayBuffer,
  requestedSheetName?: string,
  extraSheetNames: string[] = [],
  isCsv: boolean = false
): Record<string, any> {
  try {
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    let sheetNames = workbook.SheetNames || [];

    // Merge discovered sheet names if available
    if (extraSheetNames && extraSheetNames.length > 0) {
      sheetNames = Array.from(new Set([...extraSheetNames, ...sheetNames]));
    }

    if (sheetNames.length === 0) {
      sheetNames = [requestedSheetName || 'Total Data'];
    }

    // Find the sheet to parse
    let selectedSheetName = workbook.SheetNames[0];

    if (!isCsv && workbook.SheetNames.length > 1) {
      // 1. If explicit sheet name requested
      if (requestedSheetName) {
        const found = workbook.SheetNames.find(
          (s) => s.toLowerCase().trim() === requestedSheetName.toLowerCase().trim()
        );
        if (found) selectedSheetName = found;
      }

      // 2. Target subsheet "Total Data" (case-insensitive, ignoring spaces/underscores)
      if (!selectedSheetName || selectedSheetName === workbook.SheetNames[0]) {
        const totalDataFound = workbook.SheetNames.find((s) => {
          const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
          return clean === 'totaldata' || clean.includes('totaldata');
        });
        if (totalDataFound) selectedSheetName = totalDataFound;
      }
    } else if (isCsv && requestedSheetName) {
      selectedSheetName = requestedSheetName;
    }

    const sheet = workbook.Sheets[selectedSheetName] || workbook.Sheets[workbook.SheetNames[0]];
    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawJson.length === 0) {
      return {
        success: false,
        message: `Subsheet "${selectedSheetName}" contains no rows or data entries.`,
      };
    }

    // Upfront column index resolution (runs ONCE across first 5 rows instead of on every row!)
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

    const colSchedule = findCol(
      'schedule id', 'schedule_id', 'scheduleid', 'schedule', 'slot id', 'slot', 'reason', 'test id', 'exam schedule id'
    );
    const colEvalEmail = findCol(
      'evaluator email id', 'evaluator email', 'evaluatoremail', 'evaluator_email', 'teacher email', 'faculty email', 'evaluator mail', 'evaluator'
    );
    const colChiefEmail = findCol(
      'chief evaluator email id', 'chief evaluator email', 'chief evaluator email_id', 'chief evaluator mail id',
      'chief evaluator mail', 'chief email id', 'chief email', 'chief_evaluator_email', 'chiefevaluatoremail',
      'chief_email', 'cheif evaluator email id', 'cheif evaluator email', 'cheif evaluator email_id',
      'cheif evaluator mail id', 'cheif evaluator mail', 'cheif email id', 'cheif email', 'cheif_evaluator_email',
      'cheifevaluatoremail', 'cheif_email', 'chief examiner email', 'cheif examiner email', 'head evaluator email', 'lead evaluator email'
    );
    const colChiefName = findCol(
      'chief evaluator name', 'chief evaluator', 'chiefevaluator', 'chief name', 'cheif evaluator name',
      'cheif evaluator', 'cheifevaluator', 'cheif name', 'chief examiner name', 'cheif examiner name',
      'head evaluator', 'lead evaluator'
    );
    const colStudentEmail = findCol(
      'student details', 'student email id', 'student email', 'studentemail', 'student_email', 'roll no', 'student id'
    );
    const colStudentName = findCol(
      'student name', 'studentname', 'student_name', 'candidate name', 'name'
    );
    const colCourseCode = findCol(
      'course code', 'coursecode', 'course_code', 'subject code'
    );
    const colCourseName = findCol(
      'course name', 'coursename', 'course_name', 'subject name', 'subject'
    );
    const colSchoolCode = findCol(
      'school code', 'schoolcode', 'school_code', 'school', 'faculty code', 'dept'
    );
    const colExamDate = findCol(
      'exam date', 'examdate', 'exam_date', 'examination date', 'date of exam', 'date', 'slot date'
    );

    // Deep fallback column for chief details if standard aliases didn't hit
    let colChiefFallback: string | null = null;
    if (!colChiefEmail && !colChiefName) {
      for (const [cleanKey, origKey] of cleanKeyMap) {
        if (cleanKey.includes('chief') || cleanKey.includes('cheif')) {
          colChiefFallback = origKey;
          break;
        }
      }
    }

    const uniqueScheduleIdsSet = new Set<string>();
    const uniqueSchoolsSet = new Set<string>();
    const uniqueCoursesSet = new Set<string>();
    const uniqueChiefEvaluatorsSet = new Set<string>();

    const rows = rawJson.map((row, idx) => {
      // 1. Schedule ID
      const rawSchedule = colSchedule ? String(row[colSchedule] ?? '').trim() : '';
      const scheduleId = extractScheduleId(rawSchedule);
      if (scheduleId) uniqueScheduleIdsSet.add(scheduleId);

      // 2. Evaluator Email
      const evaluatorEmail = colEvalEmail ? String(row[colEvalEmail] ?? '').trim() : '';

      // 3. Chief Evaluator Details
      let chiefEvaluatorEmail = colChiefEmail ? String(row[colChiefEmail] ?? '').trim() : '';
      let chiefEvaluatorName = colChiefName ? String(row[colChiefName] ?? '').trim() : '';

      if (!chiefEvaluatorEmail && colChiefFallback) {
        const strVal = String(row[colChiefFallback] ?? '').trim();
        if (strVal.includes('@')) {
          chiefEvaluatorEmail = strVal;
        } else if (!chiefEvaluatorName && strVal) {
          chiefEvaluatorName = strVal;
        }
      }

      if (!chiefEvaluatorEmail && chiefEvaluatorName.includes('@')) {
        chiefEvaluatorEmail = chiefEvaluatorName;
      }

      const hasChiefDetails = Boolean(
        (chiefEvaluatorEmail && chiefEvaluatorEmail.length > 0) ||
        (chiefEvaluatorName && chiefEvaluatorName.length > 0)
      );

      if (chiefEvaluatorEmail) {
        uniqueChiefEvaluatorsSet.add(chiefEvaluatorEmail);
      }

      // 4. Student Details
      const studentEmail = colStudentEmail ? String(row[colStudentEmail] ?? '').trim() : '';
      const studentName = colStudentName ? String(row[colStudentName] ?? '').trim() : '';

      // 5. Course Code & Name
      const courseCode = colCourseCode ? String(row[colCourseCode] ?? '').trim().toUpperCase() : '';
      if (courseCode) uniqueCoursesSet.add(courseCode);
      const courseName = colCourseName ? String(row[colCourseName] ?? '').trim() : '';

      // 6. School Code & Exam Date
      const schoolCode = colSchoolCode ? String(row[colSchoolCode] ?? '').trim().toUpperCase() : '';
      if (schoolCode) uniqueSchoolsSet.add(schoolCode);
      const examDate = colExamDate ? String(row[colExamDate] ?? '').trim() : '';

      return {
        id: `row_${idx + 1}_${scheduleId || 'nosched'}`,
        scheduleId,
        evaluatorEmail,
        chiefEvaluatorEmail: chiefEvaluatorEmail || '',
        chiefEvaluatorName: chiefEvaluatorName || '',
        hasChiefDetails,
        studentEmail: studentEmail || studentName,
        studentName: studentName || studentEmail,
        courseCode,
        courseName,
        schoolCode,
        examDate,
        raw: {}, // EMPTY RAW: ELIMINATES 90% PAYLOAD SIZE & INSTANT CLIENT PARSING!
      };
    });

    const isTotalData = Boolean(
      selectedSheetName.toLowerCase().replace(/[^a-z0-9]/g, '').includes('totaldata')
    );

    return {
      success: true,
      sheetName: selectedSheetName,
      isTotalDataSheet: isTotalData,
      sheetNames: sheetNames.length > 0 ? sheetNames : [selectedSheetName],
      totalRows: rows.length,
      rows,
      uniqueScheduleIds: Array.from(uniqueScheduleIdsSet).sort(),
      uniqueSchools: Array.from(uniqueSchoolsSet).sort(),
      uniqueCourses: Array.from(uniqueCoursesSet).sort(),
      uniqueChiefEvaluators: Array.from(uniqueChiefEvaluatorsSet).sort(),
      totalWithChiefDetails: rows.filter((r) => r.hasChiefDetails).length,
      totalWithoutChiefDetails: rows.filter((r) => !r.hasChiefDetails).length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to parse sheet data: ${err.message || String(err)}`,
    };
  }
}
