import { SCHOOL_CODE_MAP, normalizeSchool } from './mockData';
import { MasterEvalRow, isMissingOrPlaceholder } from './evalOpsParser';

export type ChiefSortField =
  | 'schoolCode'
  | 'schoolName'
  | 'totalStudents'
  | 'chiefAvailableStudents'
  | 'chiefMissingStudents'
  | 'coveragePct'
  | 'uniqueChiefCount'
  | 'schedulesWithMissingChief';

export type SortDirection = 'asc' | 'desc';

export interface ChiefRosterEntry {
  key: string;
  email: string;
  name: string;
  studentCount: number;
  scheduleCount: number;
  courseCount: number;
  courses: string[];
  schedules: string[];
}

export interface MissingScheduleEntry {
  scheduleId: string;
  courseCode: string;
  courseName: string;
  examDate: string;
  totalStudents: number;
  missingCount: number;
  availableCount: number;
}

export interface SchoolChiefAggregation {
  schoolCode: string;
  schoolName: string;
  totalStudents: number;
  chiefAvailableStudents: number;
  chiefMissingStudents: number;
  coveragePct: number;
  category: 'ALL_AVAILABLE' | 'PARTIAL_MISSING' | 'NONE_AVAILABLE';
  uniqueChiefCount: number;
  totalSchedules: number;
  schedulesAllCovered: number;
  schedulesWithMissingChief: number;
  unscheduledMissingStudents: number;
  totalCourses: number;
  coursesWithMissingChief: number;
  chiefRoster: ChiefRosterEntry[];
  missingSchedules: MissingScheduleEntry[];
  missingScheduleIds: string[];
  missingCourseCodes: string[];
  examDatesCount: number;
}

export interface GlobalChiefStats {
  totalSchools: number;
  schoolsAllAvailable: number;
  schoolsAnyMissing: number;
  schoolsPartialMissing: number;
  schoolsNoneAvailable: number;
  totalStudentsAll: number;
  totalChiefAvailableStudents: number;
  totalChiefMissingStudents: number;
  globalCoveragePct: number;
  totalUniqueChiefsGlobal: number;
}

/**
 * Aggregate master student-allocation rows into per-school Chief Evaluator intelligence.
 * Categorizes each school into `ALL_AVAILABLE` (zero missing), `PARTIAL_MISSING`, or `NONE_AVAILABLE`.
 */
export function aggregateChiefBySchool(masterRows: MasterEvalRow[]): {
  schoolAggregations: SchoolChiefAggregation[];
  globalStats: GlobalChiefStats;
} {
  interface ChiefAcc {
    email: string;
    name: string;
    studentCount: number;
    courses: Set<string>;
    schedules: Set<string>;
  }
  interface SchedAcc {
    courseCode: string;
    courseName: string;
    examDate: string;
    totalStudents: number;
    availableCount: number;
    missingCount: number;
  }
  interface SchoolAcc {
    schoolCode: string;
    schoolName: string;
    totalStudents: number;
    chiefAvailableStudents: number;
    chiefMissingStudents: number;
    unscheduledMissingStudents: number;
    chiefs: Map<string, ChiefAcc>;
    schedules: Map<string, SchedAcc>;
    courses: Set<string>;
    missingCourses: Set<string>;
    examDates: Set<string>;
  }

  const schoolMap = new Map<string, SchoolAcc>();
  const globalChiefKeys = new Set<string>();

  for (const r of masterRows) {
    const code = (r.schoolCode || 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN';
    let acc = schoolMap.get(code);
    if (!acc) {
      const norm = normalizeSchool(code);
      acc = {
        schoolCode: code,
        schoolName:
          norm.name ||
          SCHOOL_CODE_MAP[code] ||
          (code === 'UNKNOWN' ? 'Unspecified School' : `School of ${code}`),
        totalStudents: 0,
        chiefAvailableStudents: 0,
        chiefMissingStudents: 0,
        unscheduledMissingStudents: 0,
        chiefs: new Map(),
        schedules: new Map(),
        courses: new Set(),
        missingCourses: new Set(),
        examDates: new Set(),
      };
      schoolMap.set(code, acc);
    }

    acc.totalStudents++;
    const courseCode = (r.courseCode || '').trim().toUpperCase();
    if (courseCode) acc.courses.add(courseCode);
    if (r.examDate) acc.examDates.add(r.examDate);

    const cleanEmail =
      r.chiefEvaluatorEmail && !isMissingOrPlaceholder(r.chiefEvaluatorEmail)
        ? r.chiefEvaluatorEmail.trim()
        : '';
    const cleanName =
      r.chiefEvaluatorName && !isMissingOrPlaceholder(r.chiefEvaluatorName)
        ? r.chiefEvaluatorName.trim()
        : '';
    const hasChief = Boolean(cleanEmail || cleanName);

    if (hasChief) {
      acc.chiefAvailableStudents++;
      const chiefKey = (cleanEmail || cleanName).toLowerCase();
      globalChiefKeys.add(chiefKey);

      let chiefAcc = acc.chiefs.get(chiefKey);
      if (!chiefAcc) {
        chiefAcc = {
          email: cleanEmail || cleanName,
          name: cleanName || cleanEmail,
          studentCount: 0,
          courses: new Set(),
          schedules: new Set(),
        };
        acc.chiefs.set(chiefKey, chiefAcc);
      }
      chiefAcc.studentCount++;
      if (courseCode) chiefAcc.courses.add(courseCode);
      if (r.scheduleId) chiefAcc.schedules.add(r.scheduleId);
    } else {
      acc.chiefMissingStudents++;
      if (courseCode) acc.missingCourses.add(courseCode);
      if (!r.scheduleId) acc.unscheduledMissingStudents++;
    }

    if (r.scheduleId) {
      let schedAcc = acc.schedules.get(r.scheduleId);
      if (!schedAcc) {
        schedAcc = {
          courseCode,
          courseName: r.courseName || '',
          examDate: r.examDate || '',
          totalStudents: 0,
          availableCount: 0,
          missingCount: 0,
        };
        acc.schedules.set(r.scheduleId, schedAcc);
      }
      schedAcc.totalStudents++;
      if (hasChief) schedAcc.availableCount++;
      else schedAcc.missingCount++;
    }
  }

  const list: SchoolChiefAggregation[] = [];
  let totalChiefAvailableStudents = 0;
  let totalChiefMissingStudents = 0;
  let schoolsAllAvailable = 0;
  let schoolsPartialMissing = 0;
  let schoolsNoneAvailable = 0;

  for (const acc of schoolMap.values()) {
    totalChiefAvailableStudents += acc.chiefAvailableStudents;
    totalChiefMissingStudents += acc.chiefMissingStudents;

    let category: SchoolChiefAggregation['category'];
    let coveragePct: number;

    if (acc.chiefMissingStudents === 0 && acc.totalStudents > 0) {
      category = 'ALL_AVAILABLE';
      coveragePct = 100;
      schoolsAllAvailable++;
    } else if (acc.chiefAvailableStudents === 0) {
      category = 'NONE_AVAILABLE';
      coveragePct = 0;
      schoolsNoneAvailable++;
    } else {
      category = 'PARTIAL_MISSING';
      // Cap incomplete schools at 99.9% so rounding never shows 100% when gaps remain
      coveragePct = Math.min(
        99.9,
        Math.max(0.1, Number(((acc.chiefAvailableStudents / acc.totalStudents) * 100).toFixed(1)))
      );
      schoolsPartialMissing++;
    }

    const chiefRoster: ChiefRosterEntry[] = Array.from(acc.chiefs.entries())
      .map(([key, c]) => ({
        key,
        email: c.email,
        name: c.name,
        studentCount: c.studentCount,
        scheduleCount: c.schedules.size,
        courseCount: c.courses.size,
        courses: Array.from(c.courses).sort(),
        schedules: Array.from(c.schedules).sort(),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    let schedulesAllCovered = 0;
    const missingSchedules: MissingScheduleEntry[] = [];
    for (const [scheduleId, s] of acc.schedules.entries()) {
      if (s.missingCount === 0) {
        schedulesAllCovered++;
      } else {
        missingSchedules.push({
          scheduleId,
          courseCode: s.courseCode,
          courseName: s.courseName,
          examDate: s.examDate,
          totalStudents: s.totalStudents,
          missingCount: s.missingCount,
          availableCount: s.availableCount,
        });
      }
    }
    missingSchedules.sort(
      (a, b) => b.missingCount - a.missingCount || a.scheduleId.localeCompare(b.scheduleId)
    );

    list.push({
      schoolCode: acc.schoolCode,
      schoolName: acc.schoolName,
      totalStudents: acc.totalStudents,
      chiefAvailableStudents: acc.chiefAvailableStudents,
      chiefMissingStudents: acc.chiefMissingStudents,
      coveragePct,
      category,
      uniqueChiefCount: acc.chiefs.size,
      totalSchedules: acc.schedules.size,
      schedulesAllCovered,
      schedulesWithMissingChief: missingSchedules.length,
      unscheduledMissingStudents: acc.unscheduledMissingStudents,
      totalCourses: acc.courses.size,
      coursesWithMissingChief: acc.missingCourses.size,
      chiefRoster,
      missingSchedules,
      missingScheduleIds: missingSchedules.map((m) => m.scheduleId),
      missingCourseCodes: Array.from(acc.missingCourses).sort(),
      examDatesCount: acc.examDates.size,
    });
  }

  const totalStudentsAll = masterRows.length;
  const globalCoveragePct =
    totalStudentsAll > 0
      ? totalChiefMissingStudents === 0
        ? 100
        : Math.min(99.9, Number(((totalChiefAvailableStudents / totalStudentsAll) * 100).toFixed(1)))
      : 0;

  return {
    schoolAggregations: list,
    globalStats: {
      totalSchools: list.length,
      schoolsAllAvailable,
      schoolsAnyMissing: schoolsPartialMissing + schoolsNoneAvailable,
      schoolsPartialMissing,
      schoolsNoneAvailable,
      totalStudentsAll,
      totalChiefAvailableStudents,
      totalChiefMissingStudents,
      globalCoveragePct,
      totalUniqueChiefsGlobal: globalChiefKeys.size,
    },
  };
}

/** Sort school-wise Chief Evaluator rows by selected column and direction, using schoolCode as deterministic tie-breaker. */
export function sortSchoolChiefAggregations(
  list: SchoolChiefAggregation[],
  sortField: ChiefSortField,
  sortDir: SortDirection
): SchoolChiefAggregation[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    if (sortField === 'schoolCode') {
      return a.schoolCode.localeCompare(b.schoolCode) * dir;
    }
    if (sortField === 'schoolName') {
      return a.schoolName.localeCompare(b.schoolName) * dir;
    }
    const diff = a[sortField] - b[sortField];
    if (diff !== 0) return diff * dir;
    return a.schoolCode.localeCompare(b.schoolCode);
  });
}

