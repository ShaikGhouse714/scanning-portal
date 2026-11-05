import * as XLSX from 'xlsx';
import { SCHOOL_CODE_MAP, normalizeSchool } from './mockData';

export interface RawStudentRow {
  studentName: string;
  studentEmail: string;
  courseCode: string;
  courseName: string;
  schoolCode?: string;
  evaluatorName: string;
  evaluatorEmail: string;
  raw: Record<string, any>;
  rowIndex: number;
}

export interface RawScheduleRow {
  courseCode: string;
  courseName: string;
  scheduleId: string;
  raw: Record<string, any>;
  rowIndex: number;
}

export interface MappedStudentAllocation {
  id: string;
  studentName: string;
  studentEmail: string;
  courseCode: string;
  courseName: string;
  evaluatorName: string;
  evaluatorEmail: string;
  scheduleId: string;
  isMapped: boolean;
  issues: string[];
}

export interface EvalOpsValidationSummary {
  totalStudentRecords: number;
  totalUniqueCoursesStudentFile: number;
  totalUniqueCoursesScheduleFile: number;
  totalUniqueEvaluators: number;
  successfullyMappedCount: number;
  unmappedCount: number;
  missingEvaluatorEmailCount: number;
  coursesMissingFromScheduleFile: string[];
  coursesMissingFromStudentFile: string[];
  duplicateScheduleCourses: { courseCode: string; scheduleIds: string[] }[];
}

// Clean and normalize course code for matching (e.g. " CS101 " -> "CS101")
export function normalizeCourseCode(val: any): string {
  if (!val) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

// Helper to inspect workbook sheet names without full parsing
export function getWorkbookSheetNames(fileData: ArrayBuffer | Uint8Array): string[] {
  try {
    const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array', bookSheets: true });
    return workbook.SheetNames || [];
  } catch (err) {
    console.error('Error reading workbook sheet names:', err);
    return [];
  }
}

// Helper to find a value from a row using fuzzy column aliases
export function getRowVal(row: Record<string, any>, ...aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === target) {
        const val = row[key];
        return val !== undefined && val !== null ? String(val).trim() : '';
      }
    }
  }

  // Fallback: check if key includes alias
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey.includes(target) || target.includes(cleanKey)) {
        const val = row[key];
        return val !== undefined && val !== null ? String(val).trim() : '';
      }
    }
  }
  return '';
}

// Extract clean Schedule ID from a value (supports numeric, string, or text in 'Reason' column)
export function extractScheduleId(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // If the cell is a direct number or alphanumeric ID (e.g. "6251" or "SCH-6251")
  if (/^[A-Za-z0-9_-]{2,20}$/.test(str)) {
    return str;
  }

  // If it's a reason sentence like "Scheduled for slot 6251" or "Reason: 6251"
  const digitsMatch = str.match(/\b\d{3,10}\b/);
  if (digitsMatch) {
    return digitsMatch[0];
  }

  return str;
}

// Parse Student & Evaluator Excel File (with optional targeted sheetName)
export function parseStudentEvaluatorFile(
  fileData: ArrayBuffer | Uint8Array,
  targetSheetName?: string
): {
  rows: RawStudentRow[];
  sheetNames: string[];
  activeSheetName: string;
  detectedSchoolCode: string;
  headersDetected: {
    studentName: boolean;
    studentEmail: boolean;
    courseCode: boolean;
    courseName: boolean;
    evaluatorName: boolean;
    evaluatorEmail: boolean;
  };
  sampleHeaders: string[];
} {
  const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  const sheetNames = workbook.SheetNames || [];
  const activeSheetName =
    targetSheetName && sheetNames.includes(targetSheetName)
      ? targetSheetName
      : sheetNames[0] || '';

  const sheet = workbook.Sheets[activeSheetName];
  if (!sheet) {
    return {
      rows: [],
      sheetNames,
      activeSheetName,
      detectedSchoolCode: 'School',
      headersDetected: {
        studentName: false,
        studentEmail: false,
        courseCode: false,
        courseName: false,
        evaluatorName: false,
        evaluatorEmail: false,
      },
      sampleHeaders: [],
    };
  }

  const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rawJson.length === 0) {
    return {
      rows: [],
      sheetNames,
      activeSheetName,
      detectedSchoolCode: 'School',
      headersDetected: {
        studentName: false,
        studentEmail: false,
        courseCode: false,
        courseName: false,
        evaluatorName: false,
        evaluatorEmail: false,
      },
      sampleHeaders: [],
    };
  }

  const sampleHeaders = Object.keys(rawJson[0] || {});

  // Extract School Code from the student evaluator file:
  // 1. Column search across rows
  let detectedSchoolCode = '';
  const schoolAliases = [
    'school code',
    'schoolcode',
    'school_code',
    'school',
    'faculty code',
    'faculty',
    'school name',
    'college code',
    'college',
    'department',
    'dept code',
    'dept',
    'institution code',
    'inst code',
  ];

  for (const row of rawJson) {
    const val = getRowVal(row, ...schoolAliases);
    if (val && val.trim()) {
      const trimmed = val.trim();
      const norm = normalizeSchool(trimmed);
      if (norm && norm.code && norm.code !== 'GEN') {
        detectedSchoolCode = norm.code;
        break;
      }
      if (/^[A-Za-z0-9_-]{2,12}$/.test(trimmed)) {
        detectedSchoolCode = trimmed.toUpperCase();
        break;
      }
      detectedSchoolCode = trimmed.toUpperCase();
      break;
    }
  }

  // 2. Check active sheet name if no column was found (e.g. sheet named "SCE", "KSOM")
  if (!detectedSchoolCode && activeSheetName) {
    const normSheet = normalizeSchool(activeSheetName);
    if (normSheet && normSheet.code && normSheet.code !== 'GEN') {
      detectedSchoolCode = normSheet.code;
    } else {
      const clean = activeSheetName.trim().toUpperCase();
      if (clean.length <= 12 && !clean.toLowerCase().includes('sheet')) {
        detectedSchoolCode = clean;
      }
    }
  }

  // 3. Inspect top cells in sheet (A1, A2, B1, etc.) for school headers
  if (!detectedSchoolCode && sheet) {
    const checkCells = ['A1', 'A2', 'B1', 'B2', 'C1', 'A3', 'B3'];
    for (const c of checkCells) {
      const cell = sheet[c];
      if (cell && cell.v) {
        const txt = String(cell.v).trim();
        const match = txt.match(/(?:school|faculty|dept)\s*(?:code|name)?\s*[:\-]\s*([A-Za-z0-9_-]+)/i);
        if (match && match[1]) {
          const norm = normalizeSchool(match[1]);
          detectedSchoolCode = norm.code || match[1].toUpperCase();
          break;
        }
        const norm = normalizeSchool(txt);
        if (norm && norm.code && norm.code !== 'GEN') {
          detectedSchoolCode = norm.code;
          break;
        }
      }
    }
  }

  detectedSchoolCode = detectedSchoolCode || 'School';

  const rows: RawStudentRow[] = rawJson.map((row, idx) => {
    // 1. Student Name
    const studentName = getRowVal(
      row,
      'student name',
      'student details',
      'student_name',
      'student',
      'candidate name',
      'candidate',
      'name',
      'studentfullname'
    );

    // 2. Student Email ID
    let studentEmail = getRowVal(
      row,
      'student email id',
      'student email',
      'student_email',
      'student_email_id',
      'student email address',
      'student mail',
      'student mail id',
      'candidate email',
      'student mail address',
      'student id',
      'roll no',
      'roll number',
      'roll'
    );

    // Fallback: If no explicit student email column, check if there's an email column that isn't evaluator email
    if (!studentEmail) {
      for (const k of Object.keys(row)) {
        const lowerK = k.toLowerCase();
        if (
          lowerK.includes('email') &&
          !lowerK.includes('evaluator') &&
          !lowerK.includes('faculty') &&
          !lowerK.includes('teacher') &&
          !lowerK.includes('examiner')
        ) {
          studentEmail = String(row[k]).trim();
          break;
        }
      }
    }

    // 3. Course Code
    const courseCode = getRowVal(
      row,
      'course code',
      'coursecode',
      'course_code',
      'subject code',
      'subjectcode',
      'paper code',
      'course',
      'subject'
    );

    // 4. Course Name / Title
    const courseName = getRowVal(
      row,
      'course name',
      'course title',
      'coursename',
      'course_name',
      'subject name',
      'subject title',
      'subjectname',
      'paper name',
      'paper title',
      'title'
    );

    // 5. Evaluator Name
    const evaluatorName = getRowVal(
      row,
      'evaluator name',
      'evaluator_name',
      'faculty name',
      'teacher name',
      'examiner name',
      'evaluator',
      'faculty',
      'examiner'
    );

    // 6. Evaluator Email ID
    const evaluatorEmail = getRowVal(
      row,
      'evaluator email id',
      'evaluator email',
      'evaluator_email',
      'evaluator_email_id',
      'evaluator mail',
      'evaluator mail id',
      'faculty email',
      'faculty email id',
      'faculty mail',
      'examiner email',
      'teacher email'
    );

    return {
      studentName: studentName || `Student ${idx + 1}`,
      studentEmail: studentEmail || studentName || `student${idx + 1}@student.ac.in`,
      courseCode: normalizeCourseCode(courseCode),
      courseName: courseName.trim(),
      schoolCode: detectedSchoolCode,
      evaluatorName: evaluatorName || 'Unknown Evaluator',
      evaluatorEmail: evaluatorEmail.trim(),
      raw: row,
      rowIndex: idx + 2, // Excel 1-based index (header is row 1)
    };
  });

  // Check detected columns
  const hasStudentName = rows.some((r) => r.studentName && !r.studentName.startsWith('Student '));
  const hasStudentEmail = rows.some((r) => r.studentEmail && r.studentEmail.includes('@'));
  const hasCourseCode = rows.some((r) => r.courseCode.length > 0);
  const hasCourseName = rows.some((r) => r.courseName.length > 0);
  const hasEvaluatorEmail = rows.some((r) => r.evaluatorEmail.length > 0);
  const hasEvaluatorName = rows.some((r) => r.evaluatorName && r.evaluatorName !== 'Unknown Evaluator');

  return {
    rows,
    sheetNames,
    activeSheetName,
    detectedSchoolCode,
    headersDetected: {
      studentName: hasStudentName,
      studentEmail: hasStudentEmail,
      courseCode: hasCourseCode,
      courseName: hasCourseName,
      evaluatorName: hasEvaluatorName,
      evaluatorEmail: hasEvaluatorEmail,
    },
    sampleHeaders,
  };
}

// Parse Test Schedule Excel File (with optional targeted sheetName)
export function parseScheduleFile(
  fileData: ArrayBuffer | Uint8Array,
  targetSheetName?: string
): {
  rows: RawScheduleRow[];
  sheetNames: string[];
  activeSheetName: string;
  headersDetected: {
    courseCode: boolean;
    courseName: boolean;
    scheduleId: boolean;
  };
  sampleHeaders: string[];
} {
  const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  const sheetNames = workbook.SheetNames || [];
  const activeSheetName =
    targetSheetName && sheetNames.includes(targetSheetName)
      ? targetSheetName
      : sheetNames[0] || '';

  const sheet = workbook.Sheets[activeSheetName];
  if (!sheet) {
    return {
      rows: [],
      sheetNames,
      activeSheetName,
      headersDetected: { courseCode: false, courseName: false, scheduleId: false },
      sampleHeaders: [],
    };
  }

  const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rawJson.length === 0) {
    return {
      rows: [],
      sheetNames,
      activeSheetName,
      headersDetected: { courseCode: false, courseName: false, scheduleId: false },
      sampleHeaders: [],
    };
  }

  const sampleHeaders = Object.keys(rawJson[0] || {});

  const rows: RawScheduleRow[] = rawJson.map((row, idx) => {
    const courseCode = getRowVal(
      row,
      'course code',
      'coursecode',
      'course_code',
      'subject code',
      'paper code',
      'course',
      'subject'
    );

    const courseName = getRowVal(
      row,
      'course name',
      'course title',
      'coursename',
      'course_name',
      'subject name',
      'subject title',
      'subjectname',
      'paper name',
      'paper title',
      'title',
      'name'
    );

    // Schedule ID can be in 'reason' column or 'schedule id' column
    const rawScheduleVal = getRowVal(
      row,
      'schedule id',
      'schedule_id',
      'scheduleid',
      'reason', // explicitly requested by user: "it will be there in reason column"
      'slot id',
      'test id',
      'exam schedule id',
      'schedule'
    );

    const scheduleId = extractScheduleId(rawScheduleVal);

    return {
      courseCode: normalizeCourseCode(courseCode),
      courseName: courseName.trim(),
      scheduleId,
      raw: row,
      rowIndex: idx + 2,
    };
  });

  const hasCourseCode = rows.some((r) => r.courseCode.length > 0);
  const hasCourseName = rows.some((r) => r.courseName.length > 0);
  const hasScheduleId = rows.some((r) => r.scheduleId.length > 0);

  return {
    rows,
    sheetNames,
    activeSheetName,
    headersDetected: {
      courseCode: hasCourseCode,
      courseName: hasCourseName,
      scheduleId: hasScheduleId,
    },
    sampleHeaders,
  };
}

// Map the two Excel datasets together and perform validation
export function mapStudentEvaluatorSchedules(
  studentRows: RawStudentRow[],
  scheduleRows: RawScheduleRow[]
): {
  mappedAllocations: MappedStudentAllocation[];
  summary: EvalOpsValidationSummary;
} {
  // Build a lookup map for Schedule IDs and Course Names by Course Code
  const scheduleMap = new Map<string, string[]>();
  const courseNameMap = new Map<string, string>();

  for (const s of scheduleRows) {
    if (!s.courseCode) continue;

    if (s.scheduleId) {
      const existing = scheduleMap.get(s.courseCode) || [];
      if (!existing.includes(s.scheduleId)) {
        existing.push(s.scheduleId);
      }
      scheduleMap.set(s.courseCode, existing);
    }

    if (s.courseName && !courseNameMap.has(s.courseCode)) {
      courseNameMap.set(s.courseCode, s.courseName);
    }
  }

  // Also harvest course names from student rows if available
  for (const st of studentRows) {
    if (st.courseCode && st.courseName && !courseNameMap.has(st.courseCode)) {
      courseNameMap.set(st.courseCode, st.courseName);
    }
  }

  // Check for duplicate schedules for the same course code
  const duplicateScheduleCourses: { courseCode: string; scheduleIds: string[] }[] = [];
  for (const [code, ids] of scheduleMap.entries()) {
    if (ids.length > 1) {
      duplicateScheduleCourses.push({ courseCode: code, scheduleIds: ids });
    }
  }

  // Course sets
  const studentCourses = new Set<string>();
  const scheduleCourses = new Set<string>();
  const uniqueEvaluators = new Set<string>();

  for (const s of studentRows) {
    if (s.courseCode) studentCourses.add(s.courseCode);
    if (s.evaluatorEmail) uniqueEvaluators.add(s.evaluatorEmail.toLowerCase());
  }

  for (const sc of scheduleRows) {
    if (sc.courseCode) scheduleCourses.add(sc.courseCode);
  }

  // Courses in student file missing in schedule file
  const coursesMissingFromScheduleFile: string[] = [];
  for (const sc of studentCourses) {
    if (!scheduleMap.has(sc) || (scheduleMap.get(sc)?.length === 0)) {
      coursesMissingFromScheduleFile.push(sc);
    }
  }

  // Courses in schedule file missing in student file
  const coursesMissingFromStudentFile: string[] = [];
  for (const sc of scheduleCourses) {
    if (!studentCourses.has(sc)) {
      coursesMissingFromStudentFile.push(sc);
    }
  }

  // Perform student-level mapping
  let successfullyMappedCount = 0;
  let missingEvaluatorEmailCount = 0;
  let unmappedCount = 0;

  const mappedAllocations: MappedStudentAllocation[] = studentRows.map((st, idx) => {
    const issues: string[] = [];

    // Lookup schedule ID by course code
    const matchedSchedules = scheduleMap.get(st.courseCode) || [];
    const scheduleId = matchedSchedules.length > 0 ? matchedSchedules[0] : '';
    const courseName = courseNameMap.get(st.courseCode) || st.courseName || '';

    if (!st.courseCode) {
      issues.push('Missing course code in student record');
    } else if (!scheduleId) {
      issues.push(`Course ${st.courseCode} not found in Test Schedule file`);
    } else if (matchedSchedules.length > 1) {
      issues.push(`Course ${st.courseCode} has multiple conflicting Schedule IDs (${matchedSchedules.join(', ')}). Used first.`);
    }

    if (!st.evaluatorEmail) {
      issues.push('Missing evaluator email ID');
      missingEvaluatorEmailCount++;
    }

    const isMapped = Boolean(scheduleId && st.evaluatorEmail);
    if (isMapped) {
      successfullyMappedCount++;
    } else {
      unmappedCount++;
    }

    return {
      id: `alloc_${idx + 1}_${st.courseCode}_${(st.studentEmail || st.studentName).replace(/\s+/g, '_')}`,
      studentName: st.studentName,
      studentEmail: st.studentEmail,
      courseCode: st.courseCode,
      courseName,
      evaluatorName: st.evaluatorName,
      evaluatorEmail: st.evaluatorEmail,
      scheduleId: scheduleId || 'UNMAPPED',
      isMapped,
      issues,
    };
  });

  const summary: EvalOpsValidationSummary = {
    totalStudentRecords: studentRows.length,
    totalUniqueCoursesStudentFile: studentCourses.size,
    totalUniqueCoursesScheduleFile: scheduleCourses.size,
    totalUniqueEvaluators: uniqueEvaluators.size,
    successfullyMappedCount,
    unmappedCount,
    missingEvaluatorEmailCount,
    coursesMissingFromScheduleFile,
    coursesMissingFromStudentFile,
    duplicateScheduleCourses,
  };

  return {
    mappedAllocations,
    summary,
  };
}

// Generate the downloadable Excel file requested:
// Column A: Schedule ID
// Column B: Evaluator Email ID
// Column C: Student Details (Student Email ID)
// Column D: Student Name
// Column E: Course Code
// Column F: Course Name
export function generateEvalOpsExcel(
  allocations: MappedStudentAllocation[],
  onlySuccessfullyMapped: boolean = false,
  schoolCode: string = ''
): void {
  const listToExport = onlySuccessfullyMapped
    ? allocations.filter((a) => a.isMapped)
    : allocations;

  // Format exactly as required:
  // Col A: Schedule ID
  // Col B: Evaluator Email ID
  // Col C: Student Details (Student Email ID)
  // Col D: Student Name
  // Col E: Course Code
  // Col F: Course Name
  const excelRows = listToExport.map((item) => ({
    'Schedule ID': item.scheduleId === 'UNMAPPED' ? '' : item.scheduleId,
    'Evaluator Email ID': item.evaluatorEmail,
    'Student Details': item.studentEmail || item.studentName,
    'Student Name': item.studentName,
    'Course Code': item.courseCode,
    'Course Name': item.courseName,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows, {
    header: [
      'Schedule ID',
      'Evaluator Email ID',
      'Student Details',
      'Student Name',
      'Course Code',
      'Course Name',
    ],
  });

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 18 }, // Col A: Schedule ID
    { wch: 34 }, // Col B: Evaluator Email ID
    { wch: 34 }, // Col C: Student Details (Email ID)
    { wch: 28 }, // Col D: Student Name
    { wch: 16 }, // Col E: Course Code
    { wch: 32 }, // Col F: Course Name
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Evaluator Assignment');

  const cleanSchoolCode = (schoolCode || 'School').trim().toUpperCase();
  const filename = `${cleanSchoolCode} - Evaluator assignment.xlsx`;

  // Write file directly to browser download
  XLSX.writeFile(wb, filename);
}
