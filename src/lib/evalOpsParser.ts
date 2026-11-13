import * as XLSX from 'xlsx';
import { SCHOOL_CODE_MAP, normalizeSchool } from './mockData';

export interface RawStudentRow {
  studentName: string;
  studentEmail: string;
  groupName: string;
  courseCode: string;
  courseName: string;
  schoolCode: string;
  examDate: string;
  evaluatorName: string;
  evaluatorEmail: string;
  chiefEvaluatorEmail: string;
  chiefEvaluatorName: string;
  hasChiefDetails: boolean;
  raw: Record<string, any>;
  rowIndex: number;
}

export interface RawScheduleRow {
  courseCode: string;
  courseName: string;
  scheduleId: string;
  groups: string;
  testName: string;
  evaluatorEmail: string;
  evaluatorName: string;
  raw: Record<string, any>;
  rowIndex: number;
}

export interface MappedStudentAllocation {
  id: string;
  studentName: string;
  studentEmail: string;
  groupName?: string;
  courseCode: string;
  courseName: string;
  schoolCode: string;
  examDate: string;
  evaluatorName: string;
  evaluatorEmail: string;
  chiefEvaluatorEmail: string;
  chiefEvaluatorName: string;
  hasChiefDetails: boolean;
  scheduleId: string;
  isMapped: boolean;
  allocationMode?: 'single' | 'sub_schedule_evaluator' | 'sub_schedule_group' | 'duplicate_first';
  issues: string[];
}

export interface EvalOpsValidationSummary {
  totalStudentRecords: number;
  totalUniqueCoursesStudentFile: number;
  totalUniqueCoursesScheduleFile: number;
  totalUniqueEvaluators: number;
  totalChiefEvaluators: number;
  missingChiefEvaluatorCount: number;
  successfullyMappedCount: number;
  unmappedCount: number;
  missingEvaluatorEmailCount: number;
  coursesMissingFromScheduleFile: string[];
  coursesMissingFromStudentFile: string[];
  duplicateScheduleCourses: { courseCode: string; scheduleIds: string[] }[];
  subScheduleDifferentiatedCourses?: {
    courseCode: string;
    scheduleIds: string[];
    evaluatorCount: number;
    details: { evaluator: string; scheduleId: string; groupName?: string }[];
  }[];
}

/** Normalized row shape returned by `/api/eval-fetch-sheet` for dashboards and extractors. */
export interface MasterEvalRow {
  id: string;
  scheduleId: string;
  evaluatorEmail: string;
  evaluatorName?: string;
  chiefEvaluatorEmail: string;
  chiefEvaluatorName: string;
  hasChiefDetails: boolean;
  studentEmail: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  schoolCode: string;
  examDate: string;
  raw: Record<string, any>;
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

// Extract faculty email from a string (e.g. from Participant Group Name "SCE_CS30001_2026-09-07_09:30_santwana.sagnikafcs@kiit.ac.in")
export function extractFacultyEmail(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str || !str.includes('@')) return '';

  // 1. Look for standard portal time delimiter: HH:MM_email
  const timeMatch = str.match(/\b\d{1,2}:\d{2}_([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
  if (timeMatch && timeMatch[1]) {
    return timeMatch[1].trim().toLowerCase();
  }

  // 2. The user specified: "at last there will be email id of faculty"
  // If the string contains delimiters, extract the trailing email token cleanly
  if (str.includes('_') || str.includes(' ') || str.includes(':')) {
    const atIndex = str.lastIndexOf('@');
    const beforeAt = str.substring(0, atIndex);
    const delimIndex = Math.max(
      beforeAt.lastIndexOf('_'),
      beforeAt.lastIndexOf(' '),
      beforeAt.lastIndexOf(':'),
      beforeAt.lastIndexOf('/')
    );
    const rawCandidate = delimIndex >= 0 ? str.substring(delimIndex + 1) : str;
    const cleanMatch = rawCandidate.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (cleanMatch) {
      return cleanMatch[0].trim().toLowerCase();
    }
  }

  // 3. Match any email and strip preceding timestamp/digits (e.g. '30_' from '09:30_')
  const anyEmailMatch = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (anyEmailMatch && anyEmailMatch.length > 0) {
    let last = anyEmailMatch[anyEmailMatch.length - 1];
    last = last.replace(/^\d+[_.:\-]+/, '').trim().toLowerCase();
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(last)) {
      return last;
    }
  }

  return '';
}

// Helper to vigilantly match two evaluator emails or identities
export function emailsMatch(email1: string, email2: string): boolean {
  if (!email1 || !email2) return false;
  const e1 = email1.trim().toLowerCase();
  const e2 = email2.trim().toLowerCase();
  if (e1 === e2) return true;

  // Extract alphanumeric usernames before @
  const u1 = (e1.includes('@') ? e1.split('@')[0] : e1).replace(/[^a-z0-9]/g, '');
  const u2 = (e2.includes('@') ? e2.split('@')[0] : e2).replace(/[^a-z0-9]/g, '');

  if (u1 && u2 && u1.length >= 3 && u2.length >= 3) {
    if (u1 === u2) return true;
    if (u1.length >= 4 && u2.length >= 4 && (u1.includes(u2) || u2.includes(u1))) return true;
  }
  return false;
}

// Helper to find a value from a row using fuzzy column aliases (only returns non-empty values so empty columns are skipped)
export function getRowVal(row: Record<string, any>, ...aliases: string[]): string {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);

  // Pass 1: Exact cleaned match with a non-empty value
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!target) continue;
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === target) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str.length > 0) return str;
        }
      }
    }
  }

  // Pass 2: Substring key match with a non-empty value
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!target || target.length < 3) continue;
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey.includes(target) || target.includes(cleanKey)) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str.length > 0) return str;
        }
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

// Check whether a cell value represents "missing details", placeholders, or empty data
export function isMissingOrPlaceholder(val: any): boolean {
  if (val === null || val === undefined) return true;
  const str = String(val).trim().toLowerCase();
  if (str.length === 0) return true;

  const placeholders = [
    'details missing',
    'detail missing',
    'missing details',
    'missing detail',
    'missing',
    'details not available',
    'detail not available',
    'not available',
    'not assigned',
    'unassigned',
    'no details',
    'no detail',
    'no evaluator',
    'no chief',
    'na',
    'n/a',
    'none',
    'nil',
    'null',
    'undefined',
    '-',
    '--',
    '---',
    'tbd',
    'pending',
    'blank',
    'empty',
    'not applicable',
  ];

  if (placeholders.includes(str)) return true;

  if (
    str.includes('missing') ||
    str.includes('not available') ||
    str.includes('not assigned') ||
    str.includes('unassigned') ||
    str.includes('no detail')
  ) {
    return true;
  }

  return false;
}

// Cleanly format Excel dates into standard YYYY-MM-DD format
export function formatExcelDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // Check if it's a numeric Excel serial date (e.g., 40000 - 55000)
  if (typeof val === 'number' || (!isNaN(Number(val)) && Number(val) > 30000 && Number(val) < 60000)) {
    try {
      const parsedDate = XLSX.SSF.parse_date_code(Number(val));
      if (parsedDate) {
        const y = parsedDate.y;
        const m = String(parsedDate.m).padStart(2, '0');
        const d = String(parsedDate.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // fallback
    }
  }
  return String(val).trim();
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
    groupName: boolean;
    courseCode: boolean;
    courseName: boolean;
    schoolCode: boolean;
    examDate: boolean;
    evaluatorName: boolean;
    evaluatorEmail: boolean;
    chiefEvaluatorEmail: boolean;
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
        groupName: false,
        courseCode: false,
        courseName: false,
        schoolCode: false,
        examDate: false,
        evaluatorName: false,
        evaluatorEmail: false,
        chiefEvaluatorEmail: false,
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
        groupName: false,
        courseCode: false,
        courseName: false,
        schoolCode: false,
        examDate: false,
        evaluatorName: false,
        evaluatorEmail: false,
        chiefEvaluatorEmail: false,
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
    const rawEvalName = getRowVal(
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
    const evaluatorName = isMissingOrPlaceholder(rawEvalName) ? '' : rawEvalName.trim();

    // 6. Evaluator Email ID
    const rawEvalEmail = getRowVal(
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
    let evaluatorEmail = isMissingOrPlaceholder(rawEvalEmail) ? '' : rawEvalEmail.trim();

    // 7. Chief Evaluator Email ID (with all variations and common misspellings)
    let chiefEvaluatorEmail = getRowVal(
      row,
      'chief evaluator email id',
      'chief evaluator email',
      'chief evaluator email_id',
      'chief evaluator mail id',
      'chief evaluator mail',
      'chief email id',
      'chief email',
      'chief mail id',
      'chief mail',
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
      'cheif mail id',
      'cheif mail',
      'cheif_evaluator_email',
      'cheifevaluatoremail',
      'cheif_email',
      'chief examiner email',
      'cheif examiner email',
      'head evaluator email',
      'lead evaluator email'
    );
    if (isMissingOrPlaceholder(chiefEvaluatorEmail)) chiefEvaluatorEmail = '';

    let chiefEvaluatorName = getRowVal(
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
    if (isMissingOrPlaceholder(chiefEvaluatorName)) chiefEvaluatorName = '';

    // Deep fallback: Scan any column containing chief or cheif
    if (!chiefEvaluatorEmail) {
      for (const [k, v] of Object.entries(row)) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK.includes('chief') || cleanK.includes('cheif')) {
          const strVal = String(v ?? '').trim();
          if (!isMissingOrPlaceholder(strVal)) {
            if (strVal.includes('@')) {
              chiefEvaluatorEmail = strVal;
              break;
            } else if (!chiefEvaluatorName && strVal) {
              chiefEvaluatorName = strVal;
            }
          }
        }
      }
    }

    if (!chiefEvaluatorEmail && chiefEvaluatorName && chiefEvaluatorName.includes('@')) {
      chiefEvaluatorEmail = chiefEvaluatorName;
    }

    const hasChiefDetails = Boolean(
      (chiefEvaluatorEmail && !isMissingOrPlaceholder(chiefEvaluatorEmail) && chiefEvaluatorEmail.trim().length > 0) ||
      (chiefEvaluatorName && !isMissingOrPlaceholder(chiefEvaluatorName) && chiefEvaluatorName.trim().length > 0)
    );

    // 8. School Code for row
    const rowSchoolVal = getRowVal(
      row,
      'school code',
      'schoolcode',
      'school_code',
      'school',
      'faculty code',
      'faculty',
      'dept code',
      'dept',
      'department'
    );
    let rowSchoolCode = detectedSchoolCode;
    if (rowSchoolVal) {
      const norm = normalizeSchool(rowSchoolVal);
      rowSchoolCode = (norm && norm.code && norm.code !== 'GEN') ? norm.code : rowSchoolVal.trim().toUpperCase();
    }

    // 9. Exam Date for row
    const rawExamDate = getRowVal(
      row,
      'exam date',
      'examination date',
      'date of exam',
      'date of examination',
      'date',
      'exam_date',
      'examdate',
      'test date',
      'slot date'
    );
    const examDate = formatExcelDate(rawExamDate);

    // 10. Participant Group Name (used to differentiate sub-tests/schedules)
    const groupName = getRowVal(
      row,
      'group name',
      'group names',
      'group',
      'groups',
      'participant group',
      'participant group name',
      'participant groups',
      'participant groups name',
      'section',
      'sec',
      'batch',
      'student group',
      'candidate group',
      'division',
      'sub test',
      'sub schedule',
      'sub-test',
      'sub-schedule'
    ).trim();

    // Fallback: If evaluatorEmail was missing, check if it's in groupName or any other cell
    if (!evaluatorEmail && groupName) {
      evaluatorEmail = extractFacultyEmail(groupName);
    }
    if (!evaluatorEmail) {
      for (const [k, v] of Object.entries(row)) {
        const lowerK = k.toLowerCase();
        if (
          !lowerK.includes('student') &&
          !lowerK.includes('candidate') &&
          !lowerK.includes('roll') &&
          !lowerK.includes('chief') &&
          !lowerK.includes('cheif')
        ) {
          const extracted = extractFacultyEmail(v);
          if (extracted) {
            evaluatorEmail = extracted;
            break;
          }
        }
      }
    }
    evaluatorEmail = extractFacultyEmail(evaluatorEmail) || evaluatorEmail.toLowerCase().trim();

    return {
      studentName: studentName || `Student ${idx + 1}`,
      studentEmail: studentEmail || studentName || `student${idx + 1}@student.ac.in`,
      groupName,
      courseCode: normalizeCourseCode(courseCode),
      courseName: courseName.trim(),
      schoolCode: rowSchoolCode || detectedSchoolCode,
      examDate,
      evaluatorName: evaluatorName || 'Unknown Evaluator',
      evaluatorEmail: evaluatorEmail.trim(),
      chiefEvaluatorEmail: chiefEvaluatorEmail.trim(),
      chiefEvaluatorName: chiefEvaluatorName.trim(),
      hasChiefDetails,
      raw: row,
      rowIndex: idx + 2, // Excel 1-based index (header is row 1)
    };
  });

  // Check detected columns
  const hasStudentName = rows.some((r) => r.studentName && !r.studentName.startsWith('Student '));
  const hasStudentEmail = rows.some((r) => r.studentEmail && r.studentEmail.includes('@'));
  const hasGroupName = rows.some((r) => r.groupName && r.groupName.length > 0);
  const hasCourseCode = rows.some((r) => r.courseCode.length > 0);
  const hasCourseName = rows.some((r) => r.courseName.length > 0);
  const hasSchoolCode = rows.some((r) => r.schoolCode && r.schoolCode !== 'School');
  const hasExamDate = rows.some((r) => r.examDate.length > 0);
  const hasEvaluatorEmail = rows.some((r) => r.evaluatorEmail.length > 0);
  const hasEvaluatorName = rows.some((r) => r.evaluatorName && r.evaluatorName !== 'Unknown Evaluator');
  const hasChiefEvaluatorEmail = rows.some((r) => r.chiefEvaluatorEmail.length > 0 && !isMissingOrPlaceholder(r.chiefEvaluatorEmail));

  return {
    rows,
    sheetNames,
    activeSheetName,
    detectedSchoolCode,
    headersDetected: {
      studentName: hasStudentName,
      studentEmail: hasStudentEmail,
      groupName: hasGroupName,
      courseCode: hasCourseCode,
      courseName: hasCourseName,
      schoolCode: hasSchoolCode,
      examDate: hasExamDate,
      evaluatorName: hasEvaluatorName,
      evaluatorEmail: hasEvaluatorEmail,
      chiefEvaluatorEmail: hasChiefEvaluatorEmail,
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
    groups: boolean;
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
      headersDetected: { courseCode: false, courseName: false, scheduleId: false, groups: false },
      sampleHeaders: [],
    };
  }

  const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rawJson.length === 0) {
    return {
      rows: [],
      sheetNames,
      activeSheetName,
      headersDetected: { courseCode: false, courseName: false, scheduleId: false, groups: false },
      sampleHeaders: [],
    };
  }

  const sampleHeaders = Object.keys(rawJson[0] || {});

  const rows: RawScheduleRow[] = rawJson.map((row, idx) => {
    let courseCode = getRowVal(
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

    // Participant Group Name / Groups
    let participantGroupName = getRowVal(
      row,
      'participant group name',
      'participant group names',
      'participant groups name',
      'participant group',
      'participant groups',
      'groups',
      'group name',
      'group names',
      'group',
      'batch',
      'section'
    ).trim();

    // Exam / Test / Schedule Name
    const testName = getRowVal(
      row,
      'name',
      'exam name',
      'test name',
      'schedule name',
      'title',
      'exam title',
      'test title'
    ).trim();

    // Fallback: If courseCode is empty or '-', extract from testName or participantGroupName
    if (!courseCode || courseCode === '-') {
      const nameMatch = testName.match(/\b([A-Z]{2,4}\d{4,5}[A-Z]?)\b/i);
      if (nameMatch) {
        courseCode = nameMatch[1];
      } else {
        const groupMatch = participantGroupName.match(/(?:^|[_\-\s])([A-Z]{2,4}\d{4,5}[A-Z]?)(?:[_\-\s:]|$)/i);
        if (groupMatch) {
          courseCode = groupMatch[1];
        }
      }
    }

    // Extract faculty email directly from participant group name ("at last there will be email id of faculty")
    let facultyEmail = extractFacultyEmail(participantGroupName);

    if (!facultyEmail && testName) {
      facultyEmail = extractFacultyEmail(testName);
    }

    const rawEvalEmail = getRowVal(
      row,
      'evaluator email',
      'evaluator email id',
      'evaluator mail',
      'evaluator mail id',
      'faculty email',
      'faculty email id',
      'faculty mail',
      'teacher email',
      'examiner email'
    ).trim();
    if (!facultyEmail && rawEvalEmail && !isMissingOrPlaceholder(rawEvalEmail)) {
      facultyEmail = extractFacultyEmail(rawEvalEmail) || rawEvalEmail.toLowerCase().trim();
    }

    // Deep scan all cells of this schedule row if still not found
    if (!facultyEmail) {
      for (const [colName, colVal] of Object.entries(row)) {
        const extracted = extractFacultyEmail(colVal);
        if (extracted) {
          facultyEmail = extracted;
          if (!participantGroupName) {
            participantGroupName = String(colVal).trim();
          }
          break;
        }
      }
    }

    const rawEvalName = getRowVal(
      row,
      'evaluator name',
      'evaluator_name',
      'faculty name',
      'teacher name',
      'examiner name',
      'evaluator',
      'faculty'
    ).trim();
    const evaluatorName = isMissingOrPlaceholder(rawEvalName) ? '' : rawEvalName;

    return {
      courseCode: normalizeCourseCode(courseCode),
      courseName: courseName.trim(),
      scheduleId,
      groups: participantGroupName,
      testName,
      evaluatorEmail: facultyEmail,
      evaluatorName,
      raw: row,
      rowIndex: idx + 2,
    };
  });

  const hasCourseCode = rows.some((r) => r.courseCode.length > 0);
  const hasCourseName = rows.some((r) => r.courseName.length > 0);
  const hasScheduleId = rows.some((r) => r.scheduleId.length > 0);
  const hasGroups = rows.some((r) => r.groups.length > 0);

  return {
    rows,
    sheetNames,
    activeSheetName,
    headersDetected: {
      courseCode: hasCourseCode,
      courseName: hasCourseName,
      scheduleId: hasScheduleId,
      groups: hasGroups,
    },
    sampleHeaders,
  };
}

// Map the two Excel datasets together and perform validation with multi-subschedule differentiation
export function mapStudentEvaluatorSchedules(
  studentRows: RawStudentRow[],
  scheduleRows: RawScheduleRow[]
): {
  mappedAllocations: MappedStudentAllocation[];
  summary: EvalOpsValidationSummary;
} {
  // 1. Build lookup of Schedule Candidates and Course Names by Course Code
  interface ScheduleCandidate {
    scheduleId: string;
    courseCode: string;
    courseName: string;
    groups: string;
    testName: string;
    evaluatorEmail: string;
    evaluatorName: string;
    rawString: string;
  }

  const courseSchedulesMap = new Map<string, ScheduleCandidate[]>();
  const courseNameMap = new Map<string, string>();

  for (const s of scheduleRows) {
    if (!s.courseCode) continue;

    if (s.courseName && !courseNameMap.has(s.courseCode)) {
      courseNameMap.set(s.courseCode, s.courseName);
    }

    if (!s.scheduleId) continue;

    const existingCandidates = courseSchedulesMap.get(s.courseCode) || [];
    const foundIdx = existingCandidates.findIndex((c) => c.scheduleId === s.scheduleId);

    const rowValues = Object.values(s.raw || {}).map((v) => String(v ?? '')).join(' ');

    if (foundIdx >= 0) {
      // Merge metadata if candidate with same schedule ID already exists
      const existing = existingCandidates[foundIdx];
      if (!existing.groups && s.groups) existing.groups = s.groups;
      if (!existing.testName && s.testName) existing.testName = s.testName;
      if (!existing.evaluatorEmail && s.evaluatorEmail) existing.evaluatorEmail = s.evaluatorEmail;
      if (!existing.evaluatorName && s.evaluatorName) existing.evaluatorName = s.evaluatorName;
      existing.rawString = `${existing.rawString} ${rowValues}`.trim();
    } else {
      existingCandidates.push({
        scheduleId: s.scheduleId,
        courseCode: s.courseCode,
        courseName: s.courseName,
        groups: s.groups || '',
        testName: s.testName || '',
        evaluatorEmail: s.evaluatorEmail || '',
        evaluatorName: s.evaluatorName || '',
        rawString: `${s.groups || ''} ${s.testName || ''} ${s.evaluatorEmail || ''} ${s.evaluatorName || ''} ${rowValues}`.trim(),
      });
      courseSchedulesMap.set(s.courseCode, existingCandidates);
    }
  }

  // Also harvest course names from student rows if available
  for (const st of studentRows) {
    if (st.courseCode && st.courseName && !courseNameMap.has(st.courseCode)) {
      courseNameMap.set(st.courseCode, st.courseName);
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
    if (!courseSchedulesMap.has(sc) || (courseSchedulesMap.get(sc)?.length === 0)) {
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

  // 2. Multi-Subschedule Matching & Differentiated Allocation
  const studentScheduleAssignment: string[] = new Array(studentRows.length).fill('');
  const studentAllocationMode: ('single' | 'sub_schedule_evaluator' | 'sub_schedule_group' | 'duplicate_first')[] =
    new Array(studentRows.length).fill('single');
  const unresolvedDuplicateCourseCodes = new Set<string>();
  const unresolvedDuplicateCourses: { courseCode: string; scheduleIds: string[] }[] = [];
  const subScheduleDifferentiatedCourses: {
    courseCode: string;
    scheduleIds: string[];
    evaluatorCount: number;
    details: { evaluator: string; scheduleId: string; groupName?: string }[];
  }[] = [];

  // Group student indices by courseCode
  const studentsByCourse = new Map<string, number[]>();
  for (let idx = 0; idx < studentRows.length; idx++) {
    const cCode = studentRows[idx].courseCode;
    if (!cCode) continue;
    const list = studentsByCourse.get(cCode) || [];
    list.push(idx);
    studentsByCourse.set(cCode, list);
  }

  // Iterate over each course
  for (const [courseCode, studentIndices] of studentsByCourse.entries()) {
    const candidates = courseSchedulesMap.get(courseCode) || [];

    if (candidates.length === 0) {
      for (const idx of studentIndices) {
        studentScheduleAssignment[idx] = '';
      }
      continue;
    }

    if (candidates.length === 1) {
      // Single schedule for the course: normal 1-to-1 mapping
      const singleId = candidates[0].scheduleId;
      for (const idx of studentIndices) {
        studentScheduleAssignment[idx] = singleId;
        studentAllocationMode[idx] = 'single';
      }
      continue;
    }

    // MULTIPLE SCHEDULE CANDIDATES DETECTED (candidates.length > 1)
    // Vigilant dual-mode handling:
    // Mode A: Specialized Sub-Schedule Differentiated Mode (when candidates have embedded faculty emails in participant group name matching student evaluators)
    // Mode B: Normal Mode (when candidates are duplicate/parallel schedules without faculty emails: assign primary schedule ID to all students and report conflicts)

    // Inspect candidate schedules for embedded faculty emails or group info
    const candidateEmailsWithCandidate = candidates.map((c) => ({
      candidate: c,
      email: c.evaluatorEmail || extractFacultyEmail(c.groups) || extractFacultyEmail(c.testName),
    }));

    const hasAnyCandidateEmail = candidateEmailsWithCandidate.some((ce) => Boolean(ce.email && ce.email.includes('@')));

    const evaluatorToScheduleMap = new Map<string, string>();
    const groupToScheduleMap = new Map<string, string>();
    const assignedCandidateScheduleIds = new Set<string>();

    // Pass 1: Match by faculty email (from participant group name or candidate email) against student evaluator email
    for (const idx of studentIndices) {
      const st = studentRows[idx];
      const stEmail = extractFacultyEmail(st.evaluatorEmail) || st.evaluatorEmail.toLowerCase().trim();
      if (!stEmail || evaluatorToScheduleMap.has(stEmail)) continue;

      // 1. Direct match with candidate's extracted faculty email
      for (const ce of candidateEmailsWithCandidate) {
        if (ce.email && emailsMatch(ce.email, stEmail)) {
          evaluatorToScheduleMap.set(stEmail, ce.candidate.scheduleId);
          assignedCandidateScheduleIds.add(ce.candidate.scheduleId);
          break;
        }
      }
      if (evaluatorToScheduleMap.has(stEmail)) continue;

      // 2. Substring match inside candidate's participant group name
      const groupSubCandidate = candidates.find(
        (c) => c.groups && c.groups.toLowerCase().includes(stEmail)
      );
      if (groupSubCandidate) {
        evaluatorToScheduleMap.set(stEmail, groupSubCandidate.scheduleId);
        assignedCandidateScheduleIds.add(groupSubCandidate.scheduleId);
        continue;
      }

      // 3. Username match
      const username = (stEmail.includes('@') ? stEmail.split('@')[0] : stEmail).replace(/[^a-z0-9]/g, '');
      if (username && username.length >= 4) {
        const userCandidate = candidates.find((c) => {
          const cEmail = c.evaluatorEmail || extractFacultyEmail(c.groups);
          const cUser = cEmail ? (cEmail.includes('@') ? cEmail.split('@')[0] : cEmail).replace(/[^a-z0-9]/g, '') : '';
          if (cUser && (cUser === username || cUser.includes(username) || username.includes(cUser))) return true;
          const cleanGrp = (c.groups || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanGrp && cleanGrp.includes(username)) return true;
          return false;
        });
        if (userCandidate) {
          evaluatorToScheduleMap.set(stEmail, userCandidate.scheduleId);
          assignedCandidateScheduleIds.add(userCandidate.scheduleId);
          continue;
        }
      }
    }

    // Pass 2: Match by participant group name (from Clean Data) against schedule ID or schedule groups
    for (const idx of studentIndices) {
      const st = studentRows[idx];
      const gName = (st.groupName || '').toLowerCase().trim();
      if (!gName || groupToScheduleMap.has(gName)) continue;

      const gEmail = extractFacultyEmail(gName);
      if (gEmail) {
        for (const ce of candidateEmailsWithCandidate) {
          if (ce.email && emailsMatch(ce.email, gEmail)) {
            groupToScheduleMap.set(gName, ce.candidate.scheduleId);
            assignedCandidateScheduleIds.add(ce.candidate.scheduleId);
            break;
          }
        }
        if (groupToScheduleMap.has(gName)) continue;
      }

      const idMatch = candidates.find(
        (c) => c.scheduleId.toLowerCase() === gName || gName.includes(c.scheduleId.toLowerCase())
      );
      if (idMatch) {
        groupToScheduleMap.set(gName, idMatch.scheduleId);
        assignedCandidateScheduleIds.add(idMatch.scheduleId);
        continue;
      }

      const grpMatch = candidates.find(
        (c) =>
          c.groups.toLowerCase() === gName ||
          (gName.length >= 3 && c.groups.toLowerCase().includes(gName)) ||
          (c.groups.length >= 3 && gName.includes(c.groups.toLowerCase()))
      );
      if (grpMatch) {
        groupToScheduleMap.set(gName, grpMatch.scheduleId);
        assignedCandidateScheduleIds.add(grpMatch.scheduleId);
        continue;
      }
    }

    // Pass 3: Try matching by evaluator name if candidate has evaluatorName or groups mentions the name
    for (const idx of studentIndices) {
      const st = studentRows[idx];
      const stName = (st.evaluatorName || '').toLowerCase().trim();
      if (!stName || stName === 'unknown evaluator' || evaluatorToScheduleMap.has(stName)) continue;

      for (const c of candidates) {
        const cName = (c.evaluatorName || '').toLowerCase().trim();
        if (cName && (cName === stName || (cName.length >= 4 && (cName.includes(stName) || stName.includes(cName))))) {
          evaluatorToScheduleMap.set(stName, c.scheduleId);
          assignedCandidateScheduleIds.add(c.scheduleId);
          break;
        }
        if (c.groups && c.groups.toLowerCase().includes(stName)) {
          evaluatorToScheduleMap.set(stName, c.scheduleId);
          assignedCandidateScheduleIds.add(c.scheduleId);
          break;
        }
      }
    }

    // VIGILANCE CHECK:
    // Determine whether this course qualifies as Sub-Schedule Differentiated Mode,
    // OR if it is a Normal Course with multiple conflicting Schedule IDs.
    const isSubScheduleDifferentiated =
      assignedCandidateScheduleIds.size > 1 ||
      (assignedCandidateScheduleIds.size >= 1 && hasAnyCandidateEmail);

    if (!isSubScheduleDifferentiated) {
      // MODE B: NORMAL PREVIOUS BEHAVIOUR FOR ALL REMAINING IDS
      // When multiple schedules exist but lack faculty-email sub-test designations:
      // Assign the primary schedule ID (candidates[0].scheduleId) to all students in this course
      const primaryScheduleId = candidates[0].scheduleId;
      for (const idx of studentIndices) {
        studentScheduleAssignment[idx] = primaryScheduleId;
        studentAllocationMode[idx] = 'duplicate_first';
      }

      // Record in duplicateScheduleCourses for diagnostics display
      unresolvedDuplicateCourseCodes.add(courseCode);
      unresolvedDuplicateCourses.push({
        courseCode,
        scheduleIds: candidates.map((c) => c.scheduleId),
      });

      continue;
    }

    // MODE A: SPECIALIZED SUB-SCHEDULE DIFFERENTIATED ALLOCATION
    // For courses with embedded faculty emails in participant groups:
    const primaryCandidateId = candidates[0].scheduleId;
    for (const idx of studentIndices) {
      const st = studentRows[idx];
      const stEmail = extractFacultyEmail(st.evaluatorEmail) || st.evaluatorEmail.toLowerCase().trim();
      const stName = (st.evaluatorName || '').toLowerCase().trim();
      const gName = (st.groupName || '').toLowerCase().trim();

      if (stEmail && evaluatorToScheduleMap.has(stEmail)) {
        studentScheduleAssignment[idx] = evaluatorToScheduleMap.get(stEmail)!;
        studentAllocationMode[idx] = 'sub_schedule_evaluator';
      } else if (gName && groupToScheduleMap.has(gName)) {
        studentScheduleAssignment[idx] = groupToScheduleMap.get(gName)!;
        studentAllocationMode[idx] = 'sub_schedule_group';
      } else if (stName && evaluatorToScheduleMap.has(stName)) {
        studentScheduleAssignment[idx] = evaluatorToScheduleMap.get(stName)!;
        studentAllocationMode[idx] = 'sub_schedule_evaluator';
      } else {
        // Fallback for any unmatched student in this differentiated course: primary candidate
        studentScheduleAssignment[idx] = primaryCandidateId;
        studentAllocationMode[idx] = 'single';
      }
    }

    // Build details for the diagnostics banner
    const matchedDetails: { evaluator: string; scheduleId: string; groupName?: string }[] = [];
    for (const [ev, sid] of evaluatorToScheduleMap.entries()) {
      matchedDetails.push({ evaluator: ev, scheduleId: sid });
    }
    for (const [grp, sid] of groupToScheduleMap.entries()) {
      if (!matchedDetails.some((m) => m.scheduleId === sid)) {
        matchedDetails.push({ evaluator: grp, scheduleId: sid, groupName: grp });
      }
    }

    // Count distinct evaluators in this course
    const distinctEvaluators = Array.from(
      new Set(
        studentIndices
          .map((idx) => {
            const st = studentRows[idx];
            return (
              extractFacultyEmail(st.evaluatorEmail) ||
              st.evaluatorEmail.toLowerCase().trim() ||
              (st.evaluatorName && st.evaluatorName !== 'Unknown Evaluator' ? st.evaluatorName : '')
            );
          })
          .filter(Boolean)
      )
    );

    subScheduleDifferentiatedCourses.push({
      courseCode,
      scheduleIds: candidates.map((c) => c.scheduleId),
      evaluatorCount: distinctEvaluators.length || candidates.length,
      details: matchedDetails,
    });
  }

  // 3. Construct mappedAllocations
  let successfullyMappedCount = 0;
  let missingEvaluatorEmailCount = 0;
  let unmappedCount = 0;

  const mappedAllocations: MappedStudentAllocation[] = studentRows.map((st, idx) => {
    const issues: string[] = [];
    const scheduleId = studentScheduleAssignment[idx] || '';
    const courseName = courseNameMap.get(st.courseCode) || st.courseName || '';

    if (!st.courseCode) {
      issues.push('Missing course code in student record');
    } else if (!scheduleId) {
      issues.push(`Course ${st.courseCode} not found in Test Schedule file`);
    } else if (unresolvedDuplicateCourseCodes.has(st.courseCode)) {
      const candidates = courseSchedulesMap.get(st.courseCode) || [];
      issues.push(
        `Course ${st.courseCode} has multiple conflicting Schedule IDs (${candidates
          .map((c) => c.scheduleId)
          .join(', ')}). Used first.`
      );
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
      groupName: st.groupName,
      courseCode: st.courseCode,
      courseName,
      schoolCode: st.schoolCode || '',
      examDate: st.examDate || '',
      evaluatorName: st.evaluatorName,
      evaluatorEmail: st.evaluatorEmail,
      chiefEvaluatorEmail: st.chiefEvaluatorEmail || '',
      chiefEvaluatorName: st.chiefEvaluatorName || '',
      hasChiefDetails: st.hasChiefDetails,
      scheduleId: scheduleId || 'UNMAPPED',
      isMapped,
      allocationMode: studentAllocationMode[idx],
      issues,
    };
  });

  const uniqueChiefEvaluators = new Set<string>();
  let totalWithChief = 0;
  let missingChiefCount = 0;
  for (const st of studentRows) {
    if (st.chiefEvaluatorEmail && !isMissingOrPlaceholder(st.chiefEvaluatorEmail)) {
      uniqueChiefEvaluators.add(st.chiefEvaluatorEmail.toLowerCase());
      totalWithChief++;
    } else {
      missingChiefCount++;
    }
  }

  const summary: EvalOpsValidationSummary = {
    totalStudentRecords: studentRows.length,
    totalUniqueCoursesStudentFile: studentCourses.size,
    totalUniqueCoursesScheduleFile: scheduleCourses.size,
    totalUniqueEvaluators: uniqueEvaluators.size,
    totalChiefEvaluators: uniqueChiefEvaluators.size,
    missingChiefEvaluatorCount: missingChiefCount,
    successfullyMappedCount,
    unmappedCount,
    missingEvaluatorEmailCount,
    coursesMissingFromScheduleFile,
    coursesMissingFromStudentFile,
    duplicateScheduleCourses: unresolvedDuplicateCourses,
    subScheduleDifferentiatedCourses,
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
// Column G: School Code
// Column H: Exam Date
export function generateEvalOpsExcel(
  allocations: MappedStudentAllocation[],
  onlySuccessfullyMapped: boolean = false,
  schoolCode: string = ''
): void {
  const listToExport = onlySuccessfullyMapped
    ? allocations.filter((a) => a.isMapped)
    : allocations;

  // Format with all subsequent columns extracted from student-evaluator data:
  const excelRows = listToExport.map((item) => {
    const sCode = item.schoolCode || schoolCode;
    return {
      'Schedule ID': item.scheduleId === 'UNMAPPED' ? '' : item.scheduleId,
      'Evaluator Email ID': (item.evaluatorEmail && !isMissingOrPlaceholder(item.evaluatorEmail)) ? item.evaluatorEmail : 'No details are available',
      'Chief Evaluator Email ID': (item.chiefEvaluatorEmail && !isMissingOrPlaceholder(item.chiefEvaluatorEmail)) ? item.chiefEvaluatorEmail : 'No details are available',
      'Student Details': item.studentEmail || item.studentName,
      'Student Name': item.studentName,
      'Course Code': item.courseCode,
      'Course Name': item.courseName,
      'School Code': sCode,
      'Exam Date': item.examDate,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows, {
    header: [
      'Schedule ID',
      'Evaluator Email ID',
      'Chief Evaluator Email ID',
      'Student Details',
      'Student Name',
      'Course Code',
      'Course Name',
      'School Code',
      'Exam Date',
    ],
  });

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 18 }, // Col A: Schedule ID
    { wch: 34 }, // Col B: Evaluator Email ID
    { wch: 34 }, // Col C: Chief Evaluator Email ID
    { wch: 34 }, // Col D: Student Details (Email ID)
    { wch: 28 }, // Col E: Student Name
    { wch: 16 }, // Col F: Course Code
    { wch: 32 }, // Col G: Course Name
    { wch: 16 }, // Col H: School Code
    { wch: 18 }, // Col I: Exam Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Evaluator Assignment');

  const cleanSchoolCode = (schoolCode || 'School').trim().toUpperCase();
  const filename = `${cleanSchoolCode} - Evaluator assignment.xlsx`;

  // Write file directly to browser download
  XLSX.writeFile(wb, filename);
}
