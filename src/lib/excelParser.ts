import * as XLSX from 'xlsx';
import {
  PortalExamSlot,
  TeamSubsheetEntry,
  ReconciledDateSchool,
  TeammateSummary,
  ReconciliationMetrics,
} from '../types';
import { normalizeSchool, DEFAULT_PORTAL_CSV, DEFAULT_TEAM_ENTRIES } from './mockData';

// Extract clean YYYY-MM-DD date from date string or timetable text
export function extractDateString(val: any): string {
  if (!val) return 'Unknown';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();

  // Excel serial date number check
  if (!isNaN(Number(str)) && Number(str) > 30000 && Number(str) < 60000) {
    const d = XLSX.SSF.parse_date_code(Number(str));
    if (d) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
    }
  }

  // Regex for YYYY-MM-DD or YYYY/MM/DD
  const m1 = str.match(/(20\d{2}[-/]\d{1,2}[-/]\d{1,2})/);
  if (m1) {
    const parts = m1[1].replace(/\//g, '-').split('-');
    const pad = (s: string) => s.padStart(2, '0');
    return `${parts[0]}-${pad(parts[1])}-${pad(parts[2])}`;
  }

  // Regex for DD-MM-YYYY or DD/MM/YYYY
  const m2 = str.match(/(\b\d{1,2}[-/]\d{1,2}[-/]20\d{2}\b)/);
  if (m2) {
    const parts = m2[1].replace(/\//g, '-').split('-');
    const pad = (s: string) => s.padStart(2, '0');
    return `${parts[2]}-${pad(parts[1])}-${pad(parts[0])}`;
  }

  return str;
}

// 1. Parse Portal Excel / CSV File
export function parsePortalData(data: string | ArrayBuffer): PortalExamSlot[] {
  let workbook: XLSX.WorkBook;

  if (typeof data === 'string') {
    // If CSV text
    workbook = XLSX.read(data, { type: 'string', raw: true });
  } else {
    // Binary ArrayBuffer (.xlsx / .xls)
    workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
  }

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const slots: PortalExamSlot[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    // Find keys with case-insensitivity
    const getVal = (...names: string[]) => {
      for (const name of names) {
        for (const k of Object.keys(row)) {
          if (k.trim().toLowerCase() === name.toLowerCase()) {
            return row[k];
          }
        }
      }
      return '';
    };

    const scheduleId = String(getVal('Schedule Id', 'ScheduleId', 'Id') || `slot_${i + 1}`).trim();
    const name = String(getVal('Name', 'Exam Name') || '').trim();
    const groups = String(getVal('Groups', 'Group') || '').trim();
    const scheduleTime = String(getVal('Schedule Time', 'ScheduleTime', 'Time') || '').trim();
    const examCycle = String(getVal('ExamCycle', 'Exam Cycle') || '').trim();
    const rawSchoolCode = String(getVal('SchoolCode', 'School Code', 'School') || '').trim();
    const courseCode = String(getVal('CourseCode', 'Course Code') || '').trim();
    const courseTitle = String(getVal('CourseTitle', 'Course Title', 'Subject') || '').trim();
    const semester = String(getVal('Semester', 'Sem') || '').trim();
    const programme = String(getVal('Programme', 'Program') || '').trim();

    const completed = Math.max(0, parseInt(String(getVal('Completed', 'Completed Count', 'Uploaded'))) || 0);
    const started = Math.max(0, parseInt(String(getVal('Started'))) || 0);
    const notStarted = Math.max(0, parseInt(String(getVal('Not Started', 'NotStarted'))) || 0);

    // Skip blank or invalid header echoes
    if (!name && !courseTitle && completed === 0) continue;

    const date = extractDateString(`${scheduleTime} ${groups} ${name}`);
    const { code: schoolCode, name: schoolName } = normalizeSchool(rawSchoolCode || name);

    slots.push({
      scheduleId,
      name,
      groups,
      scheduleTime,
      examCycle,
      schoolCode,
      schoolName,
      courseCode,
      courseTitle,
      semester,
      programme,
      completed,
      started,
      notStarted,
      date,
    });
  }

  return slots;
}

// 2. Parse Team Google Sheet (Subsheets per teammate)
export function parseTeamGoogleSheet(data: ArrayBuffer): {
  teammateEntries: TeamSubsheetEntry[];
  sheetNames: string[];
} {
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
  const entries: TeamSubsheetEntry[] = [];
  const processedSheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const trimmedSheetName = sheetName.trim();
    if (!trimmedSheetName) continue;

    // Track EVERY sheet name in the workbook, even if empty!
    processedSheets.push(trimmedSheetName);

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];

      // Fuzzy find column helper
      const findField = (regex: RegExp) => {
        for (const k of Object.keys(row)) {
          if (regex.test(k.trim().toLowerCase())) {
            return row[k];
          }
        }
        return '';
      };

      const rawDate = findField(/date|day/);
      const rawSchool = findField(/school|faculty|dept|department|center/);
      const rawReceived = findField(/received|intake|physical|received count|scripts|count|qty|total|answer sheets|booklets/);
      const rawScanned = findField(/scanned|uploaded|scan count|verified/);
      const rawShift = findField(/shift|slot|session/);
      const rawNotes = findField(/note|remark|reason|backlog/);

      const date = extractDateString(rawDate);
      if (!date || date === 'Unknown') continue;

      const receivedCount = Math.max(0, parseInt(String(rawReceived)) || 0);
      const scannedCount = rawScanned ? Math.max(0, parseInt(String(rawScanned)) || 0) : receivedCount;

      // If received count is 0 and no school, likely empty row
      if (!rawSchool && receivedCount === 0) continue;

      const { code: schoolCode, name: schoolName } = normalizeSchool(String(rawSchool));

      entries.push({
        id: `team_${trimmedSheetName}_${date}_${schoolCode}_${r}`,
        teammateName: trimmedSheetName,
        date,
        school: schoolName,
        schoolCode,
        receivedCount,
        scannedCount,
        shift: rawShift ? String(rawShift).trim() : 'Morning',
        notes: rawNotes ? String(rawNotes).trim() : '',
      });
    }
  }

  return { teammateEntries: entries, sheetNames: processedSheets };
}

// 3. Reconcile Team Subsheets vs Portal Uploads
export function reconcileIntakeVsPortal(
  teamEntries: TeamSubsheetEntry[],
  portalSlots: PortalExamSlot[],
  allTeammateNames: string[] = []
): {
  matrix: ReconciledDateSchool[];
  teammates: TeammateSummary[];
  metrics: ReconciliationMetrics;
} {
  // Map of unique date + schoolCode
  const dateSchoolMap = new Map<
    string,
    {
      date: string;
      schoolCode: string;
      schoolName: string;
      teamEntries: TeamSubsheetEntry[];
      portalSlots: PortalExamSlot[];
    }
  >();

  // 1. Group Team Entries
  for (const t of teamEntries) {
    const key = `${t.date}_${t.schoolCode}`;
    if (!dateSchoolMap.has(key)) {
      dateSchoolMap.set(key, {
        date: t.date,
        schoolCode: t.schoolCode,
        schoolName: t.school,
        teamEntries: [],
        portalSlots: [],
      });
    }
    dateSchoolMap.get(key)!.teamEntries.push(t);
  }

  // 2. Group Portal Slots
  for (const p of portalSlots) {
    const key = `${p.date}_${p.schoolCode}`;
    if (!dateSchoolMap.has(key)) {
      dateSchoolMap.set(key, {
        date: p.date,
        schoolCode: p.schoolCode,
        schoolName: p.schoolName,
        teamEntries: [],
        portalSlots: [],
      });
    }
    dateSchoolMap.get(key)!.portalSlots.push(p);
  }

  // 3. Build Matrix
  const matrix: ReconciledDateSchool[] = [];

  for (const [key, item] of dateSchoolMap.entries()) {
    const teamReceived = item.teamEntries.reduce((sum, e) => sum + e.receivedCount, 0);
    const portalCompleted = item.portalSlots.reduce((sum, s) => sum + s.completed, 0);
    const teamScanned = item.teamEntries.reduce((sum, e) => sum + (e.scannedCount || e.receivedCount), 0);

    // Primary Reconciliation: Match Physical Received (Team) against Completed (Central Portal)
    const discrepancy = teamReceived - portalCompleted;

    let status: ReconciledDateSchool['status'] = 'matched';

    if (item.teamEntries.length === 0 && item.portalSlots.length > 0) {
      status = 'portal_only';
    } else if (item.portalSlots.length === 0 && item.teamEntries.length > 0) {
      status = 'team_only';
    } else if (discrepancy > 0) {
      status = 'portal_backlog'; // Team physically received scripts, but portal has fewer completed
    } else if (discrepancy < 0) {
      status = 'portal_exceeds'; // Central portal has more completed than physically received by team
    } else {
      status = 'matched'; // Exact match between physical received and portal completed!
    }

    const teammates = Array.from(new Set(item.teamEntries.map((e) => e.teammateName)));

    matrix.push({
      key,
      date: item.date,
      schoolCode: item.schoolCode,
      schoolName: item.schoolName,
      teamReceived,
      portalCompleted,
      teamScanned,
      discrepancy,
      discrepancyScannedVsPortal: discrepancy,
      discrepancyReceivedVsScanned: 0,
      status,
      teammates,
      portalSlotsCount: item.portalSlots.length,
      portalSlots: item.portalSlots,
      teamEntries: item.teamEntries,
    });
  }

  // Sort matrix chronologically, then by school
  matrix.sort((a, b) => {
    const dComp = b.date.localeCompare(a.date);
    if (dComp !== 0) return dComp;
    return a.schoolCode.localeCompare(b.schoolCode);
  });

  // 4. Build Teammates Summary (Including all subsheet names, even if data is empty!)
  const teammateMap = new Map<string, TeamSubsheetEntry[]>();

  // Register every discovered subsheet name so cards are generated even when data is empty
  for (const name of allTeammateNames) {
    const trimmed = name.trim();
    if (trimmed && !teammateMap.has(trimmed)) {
      teammateMap.set(trimmed, []);
    }
  }

  // Register all teammates who have entries
  for (const e of teamEntries) {
    const trimmed = e.teammateName.trim();
    if (!teammateMap.has(trimmed)) {
      teammateMap.set(trimmed, []);
    }
    teammateMap.get(trimmed)!.push(e);
  }

  const teammates: TeammateSummary[] = [];
  for (const [name, entries] of teammateMap.entries()) {
    const totalReceived = entries.reduce((s, e) => s + e.receivedCount, 0);
    const totalScanned = entries.reduce((s, e) => s + e.scannedCount, 0);
    const schoolsCovered = Array.from(new Set(entries.map((e) => e.schoolCode)));
    const datesActive = Array.from(new Set(entries.map((e) => e.date))).sort();

    teammates.push({
      name,
      totalReceived,
      totalScanned,
      schoolsCovered,
      datesActive,
      entriesCount: entries.length,
      entries,
    });
  }

  // Sort teammates: active first with highest scanned count, then empty ones alphabetically
  teammates.sort((a, b) => {
    if (a.entriesCount > 0 && b.entriesCount === 0) return -1;
    if (a.entriesCount === 0 && b.entriesCount > 0) return 1;
    if (b.totalScanned !== a.totalScanned) return b.totalScanned - a.totalScanned;
    return a.name.localeCompare(b.name);
  });

  // 5. Global Metrics
  const totalTeamReceived = matrix.reduce((sum, m) => sum + m.teamReceived, 0);
  const totalPortalCompleted = matrix.reduce((sum, m) => sum + m.portalCompleted, 0);
  const totalTeamScanned = totalTeamReceived;
  const netDiscrepancy = totalTeamReceived - totalPortalCompleted;

  const matchedBatchesCount = matrix.filter((m) => m.status === 'matched').length;
  const discrepancyBatchesCount = matrix.filter(
    (m) => m.status === 'portal_backlog' || m.status === 'portal_exceeds'
  ).length;

  const uniqueSchools = new Set(matrix.map((m) => m.schoolCode));
  const uniqueDates = new Set(matrix.map((m) => m.date));

  const metrics: ReconciliationMetrics = {
    totalTeamReceived,
    totalPortalCompleted,
    totalTeamScanned,
    netDiscrepancy,
    matchedBatchesCount,
    discrepancyBatchesCount,
    totalTeammatesCount: teammates.length,
    totalSchoolsCount: uniqueSchools.size,
    totalDatesCount: uniqueDates.size,
  };

  return { matrix, teammates, metrics };
}

// Convert google sheet URL (edit, view, pub) to xlsx export format
export function convertToXlsxExportUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If already output=xlsx
  if (trimmed.includes('output=xlsx')) return trimmed;

  // If publish to web URL ending with /pub or /pubhtml
  if (trimmed.includes('/pub') || trimmed.includes('/pubhtml')) {
    const base = trimmed.split('?')[0].replace(/\/pubhtml$/, '/pub').replace(/\/pub$/, '/pub');
    return `${base}?output=xlsx`;
  }

  // If standard edit / view Google Sheet URL
  const sheetIdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetIdMatch) {
    const sheetId = sheetIdMatch[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  }

  return trimmed;
}

// Initial defaults
export function getInitialReconciliationState() {
  const portalSlots = parsePortalData(DEFAULT_PORTAL_CSV);
  const teamEntries = [...DEFAULT_TEAM_ENTRIES];
  return reconcileIntakeVsPortal(teamEntries, portalSlots);
}

