import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Convert Google Sheet URL to direct CSV or XLSX download link
function convertToFetchUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // If already output=csv or output=xlsx
  if (trimmed.includes('output=csv') || trimmed.includes('output=xlsx')) {
    return trimmed;
  }

  // If published to web (/pub or /pubhtml)
  if (trimmed.includes('/pubhtml') || trimmed.includes('/pub')) {
    const base = trimmed.split('?')[0].replace(/\/pubhtml$/, '/pub').replace(/\/pub$/, '/pub');
    // Extract any existing gid if specified in query
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const gid = urlObj.searchParams.get('gid');
    return gid ? `${base}?gid=${gid}&single=true&output=csv` : `${base}?output=csv`;
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
    return gid
      ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      : `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
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
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Google Sheet URL or Published Web link is required.' },
        { status: 400 }
      );
    }

    const downloadUrl = convertToFetchUrl(url);

    // Fetch live data from Google Sheets
    const res = await fetch(downloadUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      // Fallback: If CSV export failed, try XLSX export
      if (downloadUrl.includes('format=csv') || downloadUrl.includes('output=csv')) {
        const xlsxUrl = downloadUrl.replace('format=csv', 'format=xlsx').replace('output=csv', 'output=xlsx');
        const fallbackRes = await fetch(xlsxUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          cache: 'no-store',
        });

        if (fallbackRes.ok) {
          const ab = await fallbackRes.arrayBuffer();
          return parseBufferAndRespond(ab);
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: `Unable to access Google Sheet (HTTP ${res.status}: ${res.statusText}). Please ensure the sheet is "Published to web" (File > Share > Publish to web) or link sharing is set to "Anyone with the link".`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 20) {
      return NextResponse.json(
        {
          success: false,
          message: 'The received Google Sheet content is empty. Verify that the published sheet contains data.',
        },
        { status: 400 }
      );
    }

    return parseBufferAndRespond(arrayBuffer);
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

function parseBufferAndRespond(arrayBuffer: ArrayBuffer) {
  try {
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No sheets found in the Google Sheet document.' },
        { status: 400 }
      );
    }

    const firstSheetName = sheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawJson.length === 0) {
      return NextResponse.json(
        { success: false, message: `Sheet "${firstSheetName}" contains no rows or entries.` },
        { status: 400 }
      );
    }

    const uniqueScheduleIdsSet = new Set<string>();
    const uniqueSchoolsSet = new Set<string>();
    const uniqueCoursesSet = new Set<string>();

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

      // 3. Student Details / Student Email
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

      // 4. Student Name
      const studentName = getRowField(
        row,
        'student name',
        'studentname',
        'student_name',
        'candidate name',
        'name'
      );

      // 5. Course Code
      const courseCode = getRowField(
        row,
        'course code',
        'coursecode',
        'course_code',
        'subject code'
      ).toUpperCase();
      if (courseCode) uniqueCoursesSet.add(courseCode);

      // 6. Course Name
      const courseName = getRowField(
        row,
        'course name',
        'coursename',
        'course_name',
        'subject name',
        'subject'
      );

      // 7. School Code
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

      // 8. Exam Date
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
        studentEmail: studentEmail || studentName,
        studentName: studentName || studentEmail,
        courseCode,
        courseName,
        schoolCode,
        examDate,
        raw: row,
      };
    });

    return NextResponse.json({
      success: true,
      sheetName: firstSheetName,
      sheetNames,
      totalRows: rows.length,
      rows,
      uniqueScheduleIds: Array.from(uniqueScheduleIdsSet).sort(),
      uniqueSchools: Array.from(uniqueSchoolsSet).sort(),
      uniqueCourses: Array.from(uniqueCoursesSet).sort(),
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
