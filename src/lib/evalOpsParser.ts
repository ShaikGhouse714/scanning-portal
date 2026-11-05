import * as XLSX from 'xlsx';

export interface RawStudentRow {
  studentName: string;
  courseCode: string;
  evaluatorName: string;
  evaluatorEmail: string;
  raw: Record<string, any>;
  rowIndex: number;
}

export interface RawScheduleRow {
  courseCode: string;
  scheduleId: string;
  raw: Record<string, any>;
  rowIndex: number;
}

export interface MappedStudentAllocation {
  id: string;
  studentName: string;
  courseCode: string;
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

// Parse Student & Evaluator Excel File
export function parseStudentEvaluatorFile(fileData: ArrayBuffer | Uint8Array): {
  rows: RawStudentRow[];
  headersDetected: {
    studentName: boolean;
    courseCode: boolean;
    evaluatorName: boolean;
    evaluatorEmail: boolean;
  };
  sampleHeaders: string[];
} {
  const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      rows: [],
      headersDetected: { studentName: false, courseCode: false, evaluatorName: false, evaluatorEmail: false },
      sampleHeaders: [],
    };
  }

  const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rawJson.length === 0) {
    return {
      rows: [],
      headersDetected: { studentName: false, courseCode: false, evaluatorName: false, evaluatorEmail: false },
      sampleHeaders: [],
    };
  }

  const sampleHeaders = Object.keys(rawJson[0] || {});

  const rows: RawStudentRow[] = rawJson.map((row, idx) => {
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

    const evaluatorEmail = getRowVal(
      row,
      'evaluator email id',
      'evaluator email',
      'evaluator_email',
      'evaluator_email_id',
      'email id',
      'evaluator mail',
      'faculty email',
      'faculty email id',
      'email',
      'mail'
    );

    return {
      studentName: studentName || `Student ${idx + 1}`,
      courseCode: normalizeCourseCode(courseCode),
      evaluatorName: evaluatorName || 'Unknown Evaluator',
      evaluatorEmail: evaluatorEmail.trim(),
      raw: row,
      rowIndex: idx + 2, // Excel 1-based index (header is row 1)
    };
  });

  // Check detected columns
  const hasStudentName = rows.some((r) => r.studentName && !r.studentName.startsWith('Student '));
  const hasCourseCode = rows.some((r) => r.courseCode.length > 0);
  const hasEvaluatorEmail = rows.some((r) => r.evaluatorEmail.length > 0);
  const hasEvaluatorName = rows.some((r) => r.evaluatorName && r.evaluatorName !== 'Unknown Evaluator');

  return {
    rows,
    headersDetected: {
      studentName: hasStudentName,
      courseCode: hasCourseCode,
      evaluatorName: hasEvaluatorName,
      evaluatorEmail: hasEvaluatorEmail,
    },
    sampleHeaders,
  };
}

// Parse Test Schedule Excel File
export function parseScheduleFile(fileData: ArrayBuffer | Uint8Array): {
  rows: RawScheduleRow[];
  headersDetected: {
    courseCode: boolean;
    scheduleId: boolean;
  };
  sampleHeaders: string[];
} {
  const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      rows: [],
      headersDetected: { courseCode: false, scheduleId: false },
      sampleHeaders: [],
    };
  }

  const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rawJson.length === 0) {
    return {
      rows: [],
      headersDetected: { courseCode: false, scheduleId: false },
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
      scheduleId,
      raw: row,
      rowIndex: idx + 2,
    };
  });

  const hasCourseCode = rows.some((r) => r.courseCode.length > 0);
  const hasScheduleId = rows.some((r) => r.scheduleId.length > 0);

  return {
    rows,
    headersDetected: {
      courseCode: hasCourseCode,
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
  // Build a lookup map for Schedule IDs by Course Code
  // A course in schedule file may map to a schedule ID
  const scheduleMap = new Map<string, string[]>();

  for (const s of scheduleRows) {
    if (!s.courseCode || !s.scheduleId) continue;
    const existing = scheduleMap.get(s.courseCode) || [];
    if (!existing.includes(s.scheduleId)) {
      existing.push(s.scheduleId);
    }
    scheduleMap.set(s.courseCode, existing);
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
      id: `alloc_${idx + 1}_${st.courseCode}_${st.studentName.replace(/\s+/g, '_')}`,
      studentName: st.studentName,
      courseCode: st.courseCode,
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

// Generate the exact 3-column downloadable Excel file requested:
// Column 1: Schedule ID
// Column 2: Evaluator Email ID
// Column 3: Student Details
export function generateEvalOpsExcel(
  allocations: MappedStudentAllocation[],
  onlySuccessfullyMapped: boolean = false
): void {
  const listToExport = onlySuccessfullyMapped
    ? allocations.filter((a) => a.isMapped)
    : allocations;

  // Format exactly as required: Schedule ID, Evaluator Email ID, Student Details
  const excelRows = listToExport.map((item) => ({
    'Schedule ID': item.scheduleId === 'UNMAPPED' ? '' : item.scheduleId,
    'Evaluator Email ID': item.evaluatorEmail,
    'Student Details': item.studentName,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows, {
    header: ['Schedule ID', 'Evaluator Email ID', 'Student Details'],
  });

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 18 }, // Schedule ID
    { wch: 34 }, // Evaluator Email ID
    { wch: 30 }, // Student Details
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Student Evaluator Allocations');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `Eval_Ops_Mapped_Allocations_${dateStr}_${timeStr}.xlsx`;

  // Write file directly to browser download
  XLSX.writeFile(wb, filename);
}

