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

// Fetch with timeout, user-agent, redirect handling, and Google Drive virus-warning bypass
async function fetchGoogleEndpoint(
  url: string,
  timeoutMs: number = 15000
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
      if (preview.trim().startsWith('<!DOCTYPE html') || preview.includes('<html') || preview.includes('Google Drive - Virus scan warning')) {
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
      error: isTimeout ? `Connection to Google Sheet timed out after ${timeoutMs / 1000}s.` : err.message,
    };
  }
}

// Extract sheet names from Google Sheet HTML without downloading the whole workbook
async function extractSubsheetsFromHtml(sheetId: string): Promise<string[]> {
  try {
    const htmlUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
    const res = await fetchGoogleEndpoint(htmlUrl, 5000);
    if (!res.buffer) return [];

    const text = new TextDecoder('utf-8').decode(new Uint8Array(res.buffer));
    const names: string[] = [];

    // Pattern 1: <li id="sheet-button-...">...<a ...>Total Data</a>
    const tabRegex = /<li[^>]*id=["']sheet-button-[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = tabRegex.exec(text)) !== null) {
      const name = m[1].trim();
      if (name && !names.includes(name)) names.push(name);
    }

    // Pattern 2: "name":"Total Data"
    if (names.length === 0) {
      const jsonRegex = /"name"\s*:\s*"([^"\\]+)"\s*,\s*"gid"/gi;
      while ((m = jsonRegex.exec(text)) !== null) {
        const name = m[1].trim();
        if (name && !names.includes(name)) names.push(name);
      }
    }

    return names;
  } catch {
    return [];
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
    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({
          ...cached.data,
          isFromCache: true,
        });
      }
    }

    // Parse URL identifiers
    const sheetIdMatch = trimmedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = trimmedUrl.match(/[?&#]gid=([0-9]+)/);
    const isPublished = trimmedUrl.includes('/pubhtml') || trimmedUrl.includes('/pub');

    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;
    const gid = gidMatch ? gidMatch[1] : null;

    let arrayBuffer: ArrayBuffer | null = null;
    let detectedSheetNames: string[] = [];
    let usedSubsheetName = targetSheet || '';
    let isCsvResponse = false;

    // STEP 1: FAST PATH — Download only the requested sheet or "Total Data" as CSV (Takes ~500ms!)
    if (sheetId) {
      // Find candidate sheet names to try via gviz
      const candidates: string[] = [];
      if (targetSheet && targetSheet.trim()) {
        candidates.push(targetSheet.trim());
      }
      candidates.push('Total Data', 'TotalData', 'total data', 'Sheet1');

      for (const cand of candidates) {
        // gviz by sheet name
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cand)}`;
        const gvizRes = await fetchGoogleEndpoint(gvizUrl, 8000);
        if (gvizRes.ok && gvizRes.buffer && gvizRes.buffer.byteLength > 100 && !gvizRes.isHtml) {
          arrayBuffer = gvizRes.buffer;
          usedSubsheetName = cand;
          isCsvResponse = true;
          break;
        }
      }

      // If sheet name didn't match but gid was provided in the URL
      if (!arrayBuffer && gid) {
        const gidGvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const gidRes = await fetchGoogleEndpoint(gidGvizUrl, 8000);
        if (gidRes.ok && gidRes.buffer && gidRes.buffer.byteLength > 100 && !gidRes.isHtml) {
          arrayBuffer = gidRes.buffer;
          usedSubsheetName = targetSheet || 'Total Data';
          isCsvResponse = true;
        }
      }
    } else if (isPublished) {
      // Published Google Sheet URL
      const base = trimmedUrl.split('?')[0].replace(/\/pubhtml$/, '/pub').replace(/\/pub$/, '/pub');
      const pubCsvUrl = gid
        ? `${base}?gid=${gid}&single=true&output=csv`
        : `${base}?output=csv`;

      const pubRes = await fetchGoogleEndpoint(pubCsvUrl, 8000);
      if (pubRes.ok && pubRes.buffer && pubRes.buffer.byteLength > 100 && !pubRes.isHtml) {
        arrayBuffer = pubRes.buffer;
        usedSubsheetName = targetSheet || 'Total Data';
        isCsvResponse = true;
      }
    }

    // STEP 2: FALLBACK — If fast CSV path wasn't available, fetch standard CSV or XLSX
    if (!arrayBuffer) {
      if (sheetId) {
        // Try export?format=csv with gid or first sheet
        const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
        const exportCsvRes = await fetchGoogleEndpoint(exportCsvUrl, 10000);
        if (exportCsvRes.ok && exportCsvRes.buffer && exportCsvRes.buffer.byteLength > 100 && !exportCsvRes.isHtml) {
          arrayBuffer = exportCsvRes.buffer;
          usedSubsheetName = targetSheet || 'Total Data';
          isCsvResponse = true;
        } else {
          // Fall back to full XLSX export (with 16s timeout)
          const exportXlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
          const xlsxRes = await fetchGoogleEndpoint(exportXlsxUrl, 16000);
          if (xlsxRes.ok && xlsxRes.buffer && xlsxRes.buffer.byteLength > 100 && !xlsxRes.isHtml) {
            arrayBuffer = xlsxRes.buffer;
            isCsvResponse = false;
          } else if (xlsxRes.error && xlsxRes.status === 403) {
            return NextResponse.json({ success: false, message: xlsxRes.error }, { status: 403 });
          }
        }
      } else if (isPublished) {
        const base = trimmedUrl.split('?')[0].replace(/\/pubhtml$/, '/pub').replace(/\/pub$/, '/pub');
        const pubXlsxUrl = `${base}?output=xlsx`;
        const pubXlsxRes = await fetchGoogleEndpoint(pubXlsxUrl, 16000);
        if (pubXlsxRes.ok && pubXlsxRes.buffer && pubXlsxRes.buffer.byteLength > 100 && !pubXlsxRes.isHtml) {
          arrayBuffer = pubXlsxRes.buffer;
          isCsvResponse = false;
        }
      }
    }

    if (!arrayBuffer || arrayBuffer.byteLength < 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to fetch Google Sheet data. Please ensure the link is set to "Anyone with the link can view" or use "File > Share > Publish to web".',
        },
        { status: 400 }
      );
    }

    // If we have sheetId and used CSV fast path, quickly discover other sheet names for the dropdown
    if (sheetId && isCsvResponse) {
      detectedSheetNames = await extractSubsheetsFromHtml(sheetId);
    }

    // Parse the buffer and return structured records
    const result = parseBufferAndRespond(
      arrayBuffer,
      usedSubsheetName || targetSheet,
      detectedSheetNames,
      isCsvResponse
    );

    if (result.success) {
      memoryCache.set(cacheKey, { timestamp: Date.now(), data: result });
      if (memoryCache.size > 50) {
        const oldest = memoryCache.keys().next().value;
        if (oldest) memoryCache.delete(oldest);
      }
    }

    return NextResponse.json(result);
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
      const merged = Array.from(new Set([...extraSheetNames, ...sheetNames]));
      sheetNames = merged;
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

    const sheet = workbook.Sheets[workbook.SheetNames[0]]; // In CSV, it's the first sheet
    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawJson.length === 0) {
      return {
        success: false,
        message: `Subsheet "${selectedSheetName}" contains no rows or data entries.`,
      };
    }

    const uniqueScheduleIdsSet = new Set<string>();
    const uniqueSchoolsSet = new Set<string>();
    const uniqueCoursesSet = new Set<string>();
    const uniqueChiefEvaluatorsSet = new Set<string>();

    const rows = rawJson.map((row, idx) => {
      // 1. Schedule ID (uses robust extractScheduleId)
      const rawSchedule = getRowField(
        row,
        'schedule id',
        'schedule_id',
        'scheduleid',
        'schedule',
        'slot id',
        'slot',
        'reason',
        'test id',
        'exam schedule id'
      );
      const scheduleId = extractScheduleId(rawSchedule);
      if (scheduleId) uniqueScheduleIdsSet.add(scheduleId);

      // 2. Evaluator Email
      const evaluatorEmail = getRowField(
        row,
        'evaluator email id',
        'evaluator email',
        'evaluatoremail',
        'evaluator_email',
        'teacher email',
        'faculty email'
      );

      // 3. Chief Evaluator Email ID (with all variations and common misspellings like cheif)
      let chiefEvaluatorEmail = getRowField(
        row,
        'chief evaluator email id',
        'chief evaluator email',
        'chief evaluator email_id',
        'chief evaluator mail id',
        'chief evaluator mail',
        'chief email id',
        'chief email',
        'chief_evaluator_email',
        'chiefevaluatoremail',
        'chief_email',
        'cheif evaluator email id',
        'cheif evaluator email',
        'cheif evaluator email_id',
        'cheif evaluator mail id',
        'cheif evaluator mail',
        'cheif email id',
        'cheif email',
        'cheif_evaluator_email',
        'cheifevaluatoremail',
        'cheif_email',
        'chief examiner email',
        'cheif examiner email',
        'head evaluator email',
        'lead evaluator email'
      );

      // 4. Chief Evaluator Name / Details
      let chiefEvaluatorName = getRowField(
        row,
        'chief evaluator name',
        'chief evaluator',
        'chiefevaluator',
        'chief name',
        'cheif evaluator name',
        'cheif evaluator',
        'cheifevaluator',
        'cheif name',
        'chief examiner name',
        'cheif examiner name',
        'head evaluator',
        'lead evaluator'
      );

      // Deep fallback: If not found, scan any row key containing "chief" or "cheif"
      if (!chiefEvaluatorEmail) {
        for (const [k, v] of Object.entries(row)) {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanK.includes('chief') || cleanK.includes('cheif')) {
            const strVal = String(v ?? '').trim();
            if (strVal.includes('@')) {
              chiefEvaluatorEmail = strVal;
              break;
            } else if (!chiefEvaluatorName && strVal) {
              chiefEvaluatorName = strVal;
            }
          }
        }
      }

      // If chief name contains @ and no chief email, treat name as email
      if (!chiefEvaluatorEmail && chiefEvaluatorName.includes('@')) {
        chiefEvaluatorEmail = chiefEvaluatorName;
      }

      const hasChiefDetails = Boolean(
        (chiefEvaluatorEmail && chiefEvaluatorEmail.trim().length > 0) ||
        (chiefEvaluatorName && chiefEvaluatorName.trim().length > 0)
      );

      if (chiefEvaluatorEmail) {
        uniqueChiefEvaluatorsSet.add(chiefEvaluatorEmail);
      }

      // 5. Student Details / Student Email
      const studentEmail = getRowField(
        row,
        'student details',
        'student email id',
        'student email',
        'studentemail',
        'student_email',
        'roll no',
        'student id'
      );

      // 6. Student Name
      const studentName = getRowField(
        row,
        'student name',
        'studentname',
        'student_name',
        'candidate name',
        'name'
      );

      // 7. Course Code
      const courseCode = getRowField(
        row,
        'course code',
        'coursecode',
        'course_code',
        'subject code'
      ).toUpperCase();
      if (courseCode) uniqueCoursesSet.add(courseCode);

      // 8. Course Name
      const courseName = getRowField(
        row,
        'course name',
        'coursename',
        'course_name',
        'subject name',
        'subject'
      );

      // 9. School Code
      const schoolCode = getRowField(
        row,
        'school code',
        'schoolcode',
        'school_code',
        'school',
        'faculty code',
        'dept'
      ).toUpperCase();
      if (schoolCode) uniqueSchoolsSet.add(schoolCode);

      // 10. Exam Date
      const examDate = getRowField(
        row,
        'exam date',
        'examdate',
        'exam_date',
        'examination date',
        'date of exam',
        'date',
        'slot date'
      );

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
