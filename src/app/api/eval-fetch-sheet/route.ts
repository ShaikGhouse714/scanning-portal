import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Convert Google Sheet URL to direct XLSX or CSV download link
function convertToFetchUrl(inputUrl: string, preferFormat: 'xlsx' | 'csv' = 'xlsx'): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // If already output=csv or output=xlsx
  if (trimmed.includes('output=csv') || trimmed.includes('output=xlsx')) {
    if (preferFormat === 'xlsx' && trimmed.includes('output=csv')) {
      return trimmed.replace('output=csv', 'output=xlsx');
    }
    return trimmed;
  }

  // If published to web (/pub or /pubhtml)
  if (trimmed.includes('/pubhtml') || trimmed.includes('/pub')) {
    const base = trimmed.split('?')[0].replace(/\/pubhtml$/, '/pub').replace(/\/pub$/, '/pub');
    // Extract any existing gid if specified in query
    try {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const gid = urlObj.searchParams.get('gid');
      return gid
        ? `${base}?gid=${gid}&single=true&output=${preferFormat}`
        : `${base}?output=${preferFormat}`;
    } catch {
      return `${base}?output=${preferFormat}`;
    }
  }

  // If standard edit / view Google Sheet URL (e.g. /spreadsheets/d/<SHEET_ID>/edit#gid=<GID>)
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const sheetId = match[1];
    // Check for gid in query or hash
    let gid = '';
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }
    // Exporting as xlsx downloads the entire workbook with all subsheets (Total Data, etc.)
    return gid && preferFormat === 'csv'
      ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      : `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=${preferFormat}`;
  }

  return trimmed;
}

// Clean and extract Schedule ID (handles "Reason: 6251" or numeric string)
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, targetSheet } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Google Sheet URL or Published Web link is required.' },
        { status: 400 }
      );
    }

    // Attempt 1: Fetch as XLSX so all subsheets (including "Total Data") are available
    const xlsxUrl = convertToFetchUrl(url, 'xlsx');
    let res = await fetch(xlsxUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    // Fallback: If XLSX fetch fails, attempt CSV fetch
    if (!res.ok) {
      const csvUrl = convertToFetchUrl(url, 'csv');
      res = await fetch(csvUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Unable to access Google Sheet (HTTP ${res.status}: ${res.statusText}). Please ensure the sheet is "Published to web" (File > Share > Publish to web) or link sharing is set to "Anyone with the link can view".`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 20) {
      return NextResponse.json(
        {
          success: false,
          message: 'The received Google Sheet content is empty. Verify that the sheet contains data.',
        },
        { status: 400 }
      );
    }

    return parseBufferAndRespond(arrayBuffer, targetSheet);
  } catch (error: any) {
    console.error('Error fetching published sheet:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'An unexpected error occurred while fetching the Google Sheet.',
      },
      { status: 500 }
    );
  }
}

function parseBufferAndRespond(arrayBuffer: ArrayBuffer, requestedSheetName?: string) {
  try {
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No sheets found in the Google Sheet document.' },
        { status: 400 }
      );
    }

    // 1. If explicit sheet name requested
    let selectedSheetName = sheetNames.find(
      (s) => s.toLowerCase().trim() === (requestedSheetName || '').toLowerCase().trim()
    );

    // 2. Target subsheet "Total Data" (case-insensitive, ignoring spaces/underscores)
    if (!selectedSheetName) {
      selectedSheetName = sheetNames.find((s) => {
        const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean === 'totaldata' || clean.includes('totaldata');
      });
    }

    // 3. Fallback to first sheet
    if (!selectedSheetName) {
      selectedSheetName = sheetNames[0];
    }

    const sheet = workbook.Sheets[selectedSheetName];
    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawJson.length === 0) {
      return NextResponse.json(
        { success: false, message: `Subsheet "${selectedSheetName}" contains no rows or data entries.` },
        { status: 400 }
      );
    }

    const uniqueScheduleIdsSet = new Set<string>();
    const uniqueSchoolsSet = new Set<string>();
    const uniqueCoursesSet = new Set<string>();
    const uniqueChiefEvaluatorsSet = new Set<string>();

    const rows = rawJson.map((row, idx) => {
      // 1. Schedule ID
      const rawSchedule = getRowField(
        row,
        'schedule id',
        'schedule_id',
        'scheduleid',
        'schedule',
        'slot id',
        'slot',
        'reason'
      );
      const scheduleId = cleanScheduleId(rawSchedule);
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
        raw: row,
      };
    });

    const isTotalData = Boolean(
      selectedSheetName.toLowerCase().replace(/[^a-z0-9]/g, '').includes('totaldata')
    );

    return NextResponse.json({
      success: true,
      sheetName: selectedSheetName,
      isTotalDataSheet: isTotalData,
      sheetNames,
      totalRows: rows.length,
      rows,
      uniqueScheduleIds: Array.from(uniqueScheduleIdsSet).sort(),
      uniqueSchools: Array.from(uniqueSchoolsSet).sort(),
      uniqueCourses: Array.from(uniqueCoursesSet).sort(),
      uniqueChiefEvaluators: Array.from(uniqueChiefEvaluatorsSet).sort(),
      totalWithChiefDetails: rows.filter((r) => r.hasChiefDetails).length,
      totalWithoutChiefDetails: rows.filter((r) => !r.hasChiefDetails).length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to parse sheet data: ${err.message || String(err)}`,
      },
      { status: 500 }
    );
  }
}
