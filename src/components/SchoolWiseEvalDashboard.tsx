'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  GraduationCap,
  Building2,
  FileSpreadsheet,
  Link2,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Copy,
  Check,
  Filter,
  Users2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { SCHOOL_CODE_MAP, normalizeSchool } from '@/lib/mockData';

interface MasterEvalRow {
  id: string;
  scheduleId: string;
  evaluatorEmail: string;
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

interface SchoolStat {
  code: string;
  name: string;
  totalAllocations: number;
  uniqueSchedulesCount: number;
  uniqueCoursesCount: number;
  evaluatorAssignedCount: number;
  evaluatorMissingCount: number;
  evaluatorCoveragePct: number;
  chiefAssignedCount: number;
  chiefMissingCount: number;
  chiefCoveragePct: number;
  fullyAllocatedCount: number;
  fullyAllocatedPct: number;
  uniqueEvaluatorsCount: number;
  uniqueChiefsCount: number;
}

export const SchoolWiseEvalDashboard: React.FC = () => {
  // Google Sheet URL & State
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Master Sheet Loaded Data
  const [masterRows, setMasterRows] = useState<MasterEvalRow[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [isTotalDataSheet, setIsTotalDataSheet] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Active School Selection Filter ('ALL' or specific school code)
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');

  // Sub-view Tab within the Dashboard: 'overview' | 'courses' | 'evaluators' | 'records'
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'courses' | 'evaluators' | 'records'>('overview');

  // Search & Filter State for Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [evalFilter, setEvalFilter] = useState<'ALL' | 'ASSIGNED' | 'MISSING'>('ALL');
  const [chiefFilter, setChiefFilter] = useState<'ALL' | 'ASSIGNED' | 'MISSING'>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');

  // Copy Feedback
  const [copiedScheduleIds, setCopiedScheduleIds] = useState<boolean>(false);

  // Load saved Google Sheet URL from localStorage on mount and auto-fetch if present
  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem('eval_ops_master_sheet_url');
      if (savedUrl) {
        setSheetUrl(savedUrl);
        handleFetchSheet(savedUrl, undefined, false);
      }
    } catch {
      // localStorage fallback
    }
  }, []);

  // Connect & Fetch Master Sheet ("Total Data" subsheet priority)
  const handleFetchSheet = async (overrideUrl?: string, targetSheetName?: string, isExplicitRefresh: boolean = false) => {
    const urlToFetch = (overrideUrl || sheetUrl).trim();
    if (!urlToFetch) {
      setSheetError('Please enter a Google Sheet URL or Published Web link.');
      return;
    }

    setIsLoadingSheet(true);
    setSheetError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch('/api/eval-fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToFetch,
          targetSheet: targetSheetName,
          forceRefresh: isExplicitRefresh,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch Google Sheet data.');
      }

      setMasterRows(data.rows || []);
      setSheetName(data.sheetName || 'Total Data');
      setIsTotalDataSheet(Boolean(data.isTotalDataSheet));
      setAvailableSheets(data.sheetNames || []);
      setLastSyncTime(new Date().toLocaleTimeString());

      // Save to localStorage for seamless persistence across extractors
      try {
        localStorage.setItem('eval_ops_master_sheet_url', urlToFetch);
      } catch {
        // ignore
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      setSheetError(
        isTimeout
          ? 'Sync timed out. Google Sheets took too long to respond. Please check your link or try again.'
          : err.message || 'Failed to connect to Google Sheet.'
      );
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // =========================================================================
  // SCHOOL-WISE AGGREGATION & METRICS
  // =========================================================================
  const schoolStats = useMemo<SchoolStat[]>(() => {
    if (masterRows.length === 0) return [];

    const map = new Map<
      string,
      {
        code: string;
        name: string;
        rows: MasterEvalRow[];
        scheduleIds: Set<string>;
        courses: Set<string>;
        evaluators: Set<string>;
        chiefs: Set<string>;
        withEval: number;
        withoutEval: number;
        withChief: number;
        withoutChief: number;
        fullyAllocated: number;
      }
    >();

    for (const row of masterRows) {
      const code = (row.schoolCode || 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN';
      if (!map.has(code)) {
        const norm = normalizeSchool(code);
        map.set(code, {
          code,
          name: norm.name || SCHOOL_CODE_MAP[code] || `School (${code})`,
          rows: [],
          scheduleIds: new Set<string>(),
          courses: new Set<string>(),
          evaluators: new Set<string>(),
          chiefs: new Set<string>(),
          withEval: 0,
          withoutEval: 0,
          withChief: 0,
          withoutChief: 0,
          fullyAllocated: 0,
        });
      }

      const entry = map.get(code)!;
      entry.rows.push(row);
      if (row.scheduleId) entry.scheduleIds.add(row.scheduleId);
      if (row.courseCode) entry.courses.add(row.courseCode);

      const hasEval = Boolean(row.evaluatorEmail && row.evaluatorEmail.trim().length > 0);
      const hasChief = Boolean(
        (row.chiefEvaluatorEmail && row.chiefEvaluatorEmail.trim().length > 0) ||
        (row.chiefEvaluatorName && row.chiefEvaluatorName.trim().length > 0)
      );

      if (hasEval) {
        entry.withEval++;
        entry.evaluators.add(row.evaluatorEmail.trim());
      } else {
        entry.withoutEval++;
      }

      if (hasChief) {
        entry.withChief++;
        if (row.chiefEvaluatorEmail) entry.chiefs.add(row.chiefEvaluatorEmail.trim());
      } else {
        entry.withoutChief++;
      }

      if (hasEval && hasChief) {
        entry.fullyAllocated++;
      }
    }

    const stats: SchoolStat[] = Array.from(map.values()).map((e) => {
      const total = e.rows.length;
      return {
        code: e.code,
        name: e.name,
        totalAllocations: total,
        uniqueSchedulesCount: e.scheduleIds.size,
        uniqueCoursesCount: e.courses.size,
        evaluatorAssignedCount: e.withEval,
        evaluatorMissingCount: e.withoutEval,
        evaluatorCoveragePct: total > 0 ? Math.round((e.withEval / total) * 100) : 0,
        chiefAssignedCount: e.withChief,
        chiefMissingCount: e.withoutChief,
        chiefCoveragePct: total > 0 ? Math.round((e.withChief / total) * 100) : 0,
        fullyAllocatedCount: e.fullyAllocated,
        fullyAllocatedPct: total > 0 ? Math.round((e.fullyAllocated / total) * 100) : 0,
        uniqueEvaluatorsCount: e.evaluators.size,
        uniqueChiefsCount: e.chiefs.size,
      };
    });

    // Sort by total allocations descending
    return stats.sort((a, b) => b.totalAllocations - a.totalAllocations);
  }, [masterRows]);

  // Overall Global Aggregates
  const globalMetrics = useMemo(() => {
    const totalAllocations = masterRows.length;
    const scheduleSet = new Set<string>();
    const courseSet = new Set<string>();
    const evaluatorSet = new Set<string>();
    const chiefSet = new Set<string>();

    let withEval = 0;
    let withChief = 0;
    let fullyAllocated = 0;

    for (const r of masterRows) {
      if (r.scheduleId) scheduleSet.add(r.scheduleId);
      if (r.courseCode) courseSet.add(r.courseCode);

      const hasEval = Boolean(r.evaluatorEmail && r.evaluatorEmail.trim().length > 0);
      const hasChief = Boolean(
        (r.chiefEvaluatorEmail && r.chiefEvaluatorEmail.trim().length > 0) ||
        (r.chiefEvaluatorName && r.chiefEvaluatorName.trim().length > 0)
      );

      if (hasEval) {
        withEval++;
        evaluatorSet.add(r.evaluatorEmail.trim());
      }
      if (hasChief) {
        withChief++;
        if (r.chiefEvaluatorEmail) chiefSet.add(r.chiefEvaluatorEmail.trim());
      }
      if (hasEval && hasChief) fullyAllocated++;
    }

    return {
      totalAllocations,
      uniqueSchedulesCount: scheduleSet.size,
      schoolsCount: schoolStats.length,
      uniqueCoursesCount: courseSet.size,
      evaluatorAssignedCount: withEval,
      evaluatorMissingCount: totalAllocations - withEval,
      evaluatorCoveragePct: totalAllocations > 0 ? Math.round((withEval / totalAllocations) * 100) : 0,
      chiefAssignedCount: withChief,
      chiefMissingCount: totalAllocations - withChief,
      chiefCoveragePct: totalAllocations > 0 ? Math.round((withChief / totalAllocations) * 100) : 0,
      fullyAllocatedCount: fullyAllocated,
      fullyAllocatedPct: totalAllocations > 0 ? Math.round((fullyAllocated / totalAllocations) * 100) : 0,
      uniqueEvaluatorsCount: evaluatorSet.size,
      uniqueChiefsCount: chiefSet.size,
    };
  }, [masterRows, schoolStats]);

  // Currently Active School Stat (if specific school selected)
  const activeSchoolStat = useMemo(() => {
    if (selectedSchool === 'ALL') return null;
    return schoolStats.find((s) => s.code.toUpperCase() === selectedSchool.toUpperCase()) || null;
  }, [selectedSchool, schoolStats]);

  // Filter rows by Selected School
  const schoolFilteredRows = useMemo(() => {
    if (selectedSchool === 'ALL') return masterRows;
    return masterRows.filter((r) => (r.schoolCode || '').toUpperCase() === selectedSchool.toUpperCase());
  }, [masterRows, selectedSchool]);

  // Available Courses in the current school filter (for dropdown)
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    schoolFilteredRows.forEach((r) => {
      if (r.courseCode) set.add(r.courseCode.toUpperCase());
    });
    return Array.from(set).sort();
  }, [schoolFilteredRows]);

  // Course-wise Breakdown within current school selection
  const courseBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        courseCode: string;
        courseName: string;
        schoolCode: string;
        totalStudents: number;
        scheduleIds: Set<string>;
        evaluators: Set<string>;
        chiefs: Set<string>;
        withEval: number;
        withChief: number;
      }
    >();

    for (const r of schoolFilteredRows) {
      const code = (r.courseCode || 'UNKNOWN').toUpperCase();
      if (!map.has(code)) {
        map.set(code, {
          courseCode: code,
          courseName: r.courseName || code,
          schoolCode: r.schoolCode || '',
          totalStudents: 0,
          scheduleIds: new Set<string>(),
          evaluators: new Set<string>(),
          chiefs: new Set<string>(),
          withEval: 0,
          withChief: 0,
        });
      }
      const entry = map.get(code)!;
      entry.totalStudents++;
      if (r.scheduleId) entry.scheduleIds.add(r.scheduleId);

      const hasEval = Boolean(r.evaluatorEmail && r.evaluatorEmail.trim().length > 0);
      const hasChief = Boolean(
        (r.chiefEvaluatorEmail && r.chiefEvaluatorEmail.trim().length > 0) ||
        (r.chiefEvaluatorName && r.chiefEvaluatorName.trim().length > 0)
      );

      if (hasEval) {
        entry.withEval++;
        entry.evaluators.add(r.evaluatorEmail.trim());
      }
      if (hasChief) {
        entry.withChief++;
        if (r.chiefEvaluatorEmail) entry.chiefs.add(r.chiefEvaluatorEmail.trim());
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalStudents - a.totalStudents);
  }, [schoolFilteredRows]);

  // Evaluator Workload Breakdown within current school selection
  const evaluatorBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        email: string;
        scheduleIds: Set<string>;
        courses: Set<string>;
        studentCount: number;
      }
    >();

    let unassignedStudents = 0;
    const unassignedSchedules = new Set<string>();

    for (const r of schoolFilteredRows) {
      const email = (r.evaluatorEmail || '').trim();
      if (!email) {
        unassignedStudents++;
        if (r.scheduleId) unassignedSchedules.add(r.scheduleId);
        continue;
      }

      if (!map.has(email)) {
        map.set(email, {
          email,
          scheduleIds: new Set<string>(),
          courses: new Set<string>(),
          studentCount: 0,
        });
      }
      const entry = map.get(email)!;
      entry.studentCount++;
      if (r.scheduleId) entry.scheduleIds.add(r.scheduleId);
      if (r.courseCode) entry.courses.add(r.courseCode);
    }

    const evaluators = Array.from(map.values()).sort((a, b) => b.studentCount - a.studentCount);
    return {
      evaluators,
      unassignedStudents,
      unassignedSchedulesCount: unassignedSchedules.size,
    };
  }, [schoolFilteredRows]);

  // Chief Evaluator Workload Breakdown within current school selection
  const chiefBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        email: string;
        name: string;
        scheduleIds: Set<string>;
        courses: Set<string>;
        studentCount: number;
      }
    >();

    let unassignedStudents = 0;
    const unassignedSchedules = new Set<string>();

    for (const r of schoolFilteredRows) {
      const email = (r.chiefEvaluatorEmail || '').trim();
      const name = (r.chiefEvaluatorName || '').trim();
      if (!email && !name) {
        unassignedStudents++;
        if (r.scheduleId) unassignedSchedules.add(r.scheduleId);
        continue;
      }

      const key = email || name;
      if (!map.has(key)) {
        map.set(key, {
          email: email || key,
          name: name || email,
          scheduleIds: new Set<string>(),
          courses: new Set<string>(),
          studentCount: 0,
        });
      }
      const entry = map.get(key)!;
      entry.studentCount++;
      if (r.scheduleId) entry.scheduleIds.add(r.scheduleId);
      if (r.courseCode) entry.courses.add(r.courseCode);
    }

    const chiefs = Array.from(map.values()).sort((a, b) => b.studentCount - a.studentCount);
    return {
      chiefs,
      unassignedStudents,
      unassignedSchedulesCount: unassignedSchedules.size,
    };
  }, [schoolFilteredRows]);

  // Table Filtered Entries (Search, Evaluator filter, Chief filter, Course filter)
  const displayedRows = useMemo(() => {
    let list = schoolFilteredRows;

    if (evalFilter === 'ASSIGNED') {
      list = list.filter((r) => r.evaluatorEmail && r.evaluatorEmail.trim().length > 0);
    } else if (evalFilter === 'MISSING') {
      list = list.filter((r) => !r.evaluatorEmail || r.evaluatorEmail.trim().length === 0);
    }

    if (chiefFilter === 'ASSIGNED') {
      list = list.filter(
        (r) =>
          (r.chiefEvaluatorEmail && r.chiefEvaluatorEmail.trim().length > 0) ||
          (r.chiefEvaluatorName && r.chiefEvaluatorName.trim().length > 0)
      );
    } else if (chiefFilter === 'MISSING') {
      list = list.filter(
        (r) =>
          (!r.chiefEvaluatorEmail || r.chiefEvaluatorEmail.trim().length === 0) &&
          (!r.chiefEvaluatorName || r.chiefEvaluatorName.trim().length === 0)
      );
    }

    if (courseFilter !== 'ALL') {
      list = list.filter((r) => (r.courseCode || '').toUpperCase() === courseFilter.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.scheduleId.toLowerCase().includes(q) ||
          r.evaluatorEmail.toLowerCase().includes(q) ||
          r.chiefEvaluatorEmail.toLowerCase().includes(q) ||
          r.chiefEvaluatorName.toLowerCase().includes(q) ||
          r.studentEmail.toLowerCase().includes(q) ||
          r.studentName.toLowerCase().includes(q) ||
          r.courseCode.toLowerCase().includes(q) ||
          r.courseName.toLowerCase().includes(q) ||
          r.schoolCode.toLowerCase().includes(q) ||
          r.examDate.toLowerCase().includes(q)
      );
    }

    return list;
  }, [schoolFilteredRows, evalFilter, chiefFilter, courseFilter, searchQuery]);

  // Copy Filtered Schedule IDs as comma-separated values
  const handleCopyScheduleIds = async () => {
    const ids = Array.from(new Set(displayedRows.map((r) => r.scheduleId).filter(Boolean)));
    if (ids.length === 0) return;
    try {
      await navigator.clipboard.writeText(ids.join(', '));
      setCopiedScheduleIds(true);
      setTimeout(() => setCopiedScheduleIds(false), 2200);
    } catch {
      // ignore
    }
  };

  // Export Filtered Records as Excel
  const handleExportExcel = () => {
    if (displayedRows.length === 0) return;

    const exportData = displayedRows.map((r, idx) => ({
      '#': idx + 1,
      'School Code': r.schoolCode,
      'School Name': normalizeSchool(r.schoolCode).name,
      'Schedule ID': r.scheduleId,
      'Course Code': r.courseCode,
      'Course Name': r.courseName,
      'Student Name': r.studentName,
      'Student Email': r.studentEmail,
      'Evaluator Email': r.evaluatorEmail || 'UNASSIGNED',
      'Chief Evaluator Email': r.chiefEvaluatorEmail || 'UNASSIGNED',
      'Chief Evaluator Name': r.chiefEvaluatorName || '',
      'Exam Date': r.examDate,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const sheetTitle = selectedSchool === 'ALL' ? 'All Schools' : `${selectedSchool} Allocations`;
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));

    // Also append School Summary sheet
    const summaryData = schoolStats.map((s) => ({
      'School Code': s.code,
      'School Name': s.name,
      'Total Allocations': s.totalAllocations,
      'Unique Schedules': s.uniqueSchedulesCount,
      'Unique Courses': s.uniqueCoursesCount,
      'Evaluator Assigned': s.evaluatorAssignedCount,
      'Evaluator Missing': s.evaluatorMissingCount,
      'Evaluator Coverage %': `${s.evaluatorCoveragePct}%`,
      'Chief Assigned': s.chiefAssignedCount,
      'Chief Missing': s.chiefMissingCount,
      'Chief Coverage %': `${s.chiefCoveragePct}%`,
      'Fully Complete %': `${s.fullyAllocatedPct}%`,
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'School Summary');

    const fileName = `School_Allocations_${selectedSchool}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (displayedRows.length === 0) return;
    const exportData = displayedRows.map((r, idx) => ({
      '#': idx + 1,
      'School Code': r.schoolCode,
      'Schedule ID': r.scheduleId,
      'Course Code': r.courseCode,
      'Course Name': r.courseName,
      'Student Name': r.studentName,
      'Student Email': r.studentEmail,
      'Evaluator Email': r.evaluatorEmail || 'UNASSIGNED',
      'Chief Evaluator Email': r.chiefEvaluatorEmail || 'UNASSIGNED',
      'Exam Date': r.examDate,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `School_Allocations_${selectedSchool}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight">School-wise Dashboard</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Total Data Analytics
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                School-categorized allocation metrics, evaluator distribution, chief evaluator coverage, and schedule analytics pulled from Google Sheet Total Data.
              </p>
            </div>
          </div>
        </div>

        {/* Sync Status Badge */}
        {masterRows.length > 0 && (
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => handleFetchSheet(sheetUrl, sheetName, true)}
              disabled={isLoadingSheet}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition-all disabled:opacity-50"
              title="Force re-sync data directly from Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
              <span>{isLoadingSheet ? 'Syncing...' : 'Re-sync Sheet'}</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-[#0d1f14] border border-[#1f5c35] text-[11px] font-mono text-emerald-300 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected: {masterRows.length.toLocaleString()} Total Records</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {sheetError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start justify-between">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Unable to Fetch Sheet Data</p>
              <p className="mt-0.5 text-red-300/90">{sheetError}</p>
            </div>
          </div>
          <button onClick={() => setSheetError(null)} className="text-red-400 hover:text-red-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 01. Source Google Sheet Connection Card (Always visible or compact) */}
      <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Source Google Sheet</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Total Data
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Auto-targets the master <code className="text-indigo-300">Total Data</code> subsheet for complete student, course, school, and evaluator records.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFetchSheet(sheetUrl, undefined, true);
                }}
                placeholder="Paste Google Sheet URL or Publish to web link..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black border border-[#27272a] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => handleFetchSheet(sheetUrl, undefined, true)}
              disabled={isLoadingSheet || !sheetUrl.trim()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-2 shrink-0 shadow-sm"
            >
              {isLoadingSheet ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{masterRows.length > 0 ? 'Sync' : 'Connect'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subsheets selection if multiple exist */}
        {availableSheets.length > 1 && (
          <div className="mt-3 pt-3 border-t border-[#1f1f23] flex items-center space-x-2 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300">Active Subsheet:</span>
            <div className="flex flex-wrap gap-1.5">
              {availableSheets.map((s) => (
                <button
                  key={s}
                  onClick={() => handleFetchSheet(sheetUrl, s, true)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                    s.toLowerCase() === sheetName.toLowerCase()
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-[#18181b] hover:bg-[#27272a] text-zinc-400 border border-[#27272a]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {lastSyncTime && <span className="ml-auto text-[10px] text-zinc-500 font-mono">Synced: {lastSyncTime}</span>}
          </div>
        )}
      </div>

      {/* Empty State when no master data loaded */}
      {masterRows.length === 0 && !isLoadingSheet && (
        <div className="p-12 rounded-2xl bg-[#09090b] border border-dashed border-[#27272a] text-center max-w-xl mx-auto my-12">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-white">No Google Sheet Data Loaded</h2>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Please enter your published Google Sheet link or standard sheet URL above and click <strong>Connect</strong>. The dashboard will automatically categorize all allocations, courses, and schedules school-wise.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 02. EXECUTIVE STATS OVERVIEW CARDS (GLOBAL TOTAL DATA) */}
      {/* ========================================================================= */}
      {masterRows.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Total Allocations */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222] relative overflow-hidden">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Total Allocations</span>
              <p className="text-2xl font-black text-white mt-1 font-mono">{globalMetrics.totalAllocations.toLocaleString()}</p>
              <div className="flex items-center space-x-1 mt-1 text-[10px] text-zinc-400 font-mono">
                <span>Students in sheet</span>
              </div>
            </div>

            {/* Unique Schedules */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Unique Schedules</span>
              <p className="text-2xl font-black text-white mt-1 font-mono">{globalMetrics.uniqueSchedulesCount.toLocaleString()}</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Distinct slots</span>
            </div>

            {/* Participating Schools */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Schools</span>
              <p className="text-2xl font-black text-indigo-400 mt-1 font-mono">{globalMetrics.schoolsCount}</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Categorized</span>
            </div>

            {/* Unique Courses */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Courses</span>
              <p className="text-2xl font-black text-white mt-1 font-mono">{globalMetrics.uniqueCoursesCount}</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Subjects offered</span>
            </div>

            {/* Evaluator Coverage */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Evaluator Assigned</span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">{globalMetrics.evaluatorCoveragePct}%</span>
              </div>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {globalMetrics.evaluatorAssignedCount.toLocaleString()}
              </p>
              <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${globalMetrics.evaluatorCoveragePct}%` }} />
              </div>
            </div>

            {/* Chief Evaluator Coverage */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Chief Assigned</span>
                <span className="text-[10px] font-bold text-purple-400 font-mono">{globalMetrics.chiefCoveragePct}%</span>
              </div>
              <p className="text-2xl font-black text-purple-400 mt-1 font-mono">
                {globalMetrics.chiefAssignedCount.toLocaleString()}
              </p>
              <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${globalMetrics.chiefCoveragePct}%` }} />
              </div>
            </div>

            {/* Complete Coverage (Both) */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#222222]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Fully Complete</span>
                <span className="text-[10px] font-bold text-sky-400 font-mono">{globalMetrics.fullyAllocatedPct}%</span>
              </div>
              <p className="text-2xl font-black text-sky-400 mt-1 font-mono">
                {globalMetrics.fullyAllocatedCount.toLocaleString()}
              </p>
              <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${globalMetrics.fullyAllocatedPct}%` }} />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 03. INTERACTIVE SCHOOL SELECTOR PILLS & CARDS */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Categorized Schools</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {schoolStats.length} Schools Active
                </span>
              </div>

              {selectedSchool !== 'ALL' && (
                <button
                  onClick={() => setSelectedSchool('ALL')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                >
                  <span>Reset to All Schools</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* School Filter Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setSelectedSchool('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-2 ${
                  selectedSchool === 'ALL'
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#121214] text-zinc-400 hover:text-white border border-[#27272a]'
                }`}
              >
                <span>ALL SCHOOLS</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    selectedSchool === 'ALL' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {globalMetrics.totalAllocations}
                </span>
              </button>

              {schoolStats.map((school) => {
                const isSelected = selectedSchool === school.code;
                return (
                  <button
                    key={school.code}
                    onClick={() => setSelectedSchool(school.code)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-2.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-400'
                        : 'bg-[#0f0f11] text-zinc-300 hover:text-white hover:bg-[#18181b] border border-[#222222]'
                    }`}
                  >
                    <span className="font-mono font-bold">{school.code}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#1e1e24] text-zinc-400'
                      }`}
                    >
                      {school.totalAllocations}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        school.fullyAllocatedPct > 80
                          ? 'bg-emerald-400'
                          : school.fullyAllocatedPct > 40
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      title={`${school.fullyAllocatedPct}% Fully Allocated`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Currently Active School Context Banner (when school selected) */}
            {activeSchoolStat && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-black border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-bold text-white">{activeSchoolStat.code}</span>
                      <span className="text-xs text-zinc-300 font-normal">― {activeSchoolStat.name}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Filtered view of {activeSchoolStat.totalAllocations.toLocaleString()} student allocations across{' '}
                      {activeSchoolStat.uniqueSchedulesCount} schedule IDs and {activeSchoolStat.uniqueCoursesCount} courses.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0 font-mono text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block uppercase">Evaluators</span>
                    <span className="font-bold text-emerald-400">
                      {activeSchoolStat.evaluatorAssignedCount}/{activeSchoolStat.totalAllocations} ({activeSchoolStat.evaluatorCoveragePct}%)
                    </span>
                  </div>
                  <div className="h-7 w-px bg-zinc-800" />
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block uppercase">Chief Evaluators</span>
                    <span className="font-bold text-purple-400">
                      {activeSchoolStat.chiefAssignedCount}/{activeSchoolStat.totalAllocations} ({activeSchoolStat.chiefCoveragePct}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 04. SUB-DASHBOARD PERSPECTIVE TABS */}
          {/* ========================================================================= */}
          <div className="border-b border-[#222222] flex items-center space-x-4 pt-2">
            <button
              onClick={() => setActiveViewTab('overview')}
              className={`pb-3 text-xs font-bold transition-all relative ${
                activeViewTab === 'overview' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>School Comparison Overview</span>
              {activeViewTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveViewTab('courses')}
              className={`pb-3 text-xs font-bold transition-all relative ${
                activeViewTab === 'courses' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Course Breakdown ({courseBreakdown.length})</span>
              {activeViewTab === 'courses' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveViewTab('evaluators')}
              className={`pb-3 text-xs font-bold transition-all relative ${
                activeViewTab === 'evaluators' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Faculty & Chief Workload ({evaluatorBreakdown.evaluators.length + chiefBreakdown.chiefs.length})</span>
              {activeViewTab === 'evaluators' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveViewTab('records')}
              className={`pb-3 text-xs font-bold transition-all relative ${
                activeViewTab === 'records' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>All Student Records ({displayedRows.length.toLocaleString()})</span>
              {activeViewTab === 'records' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: SCHOOL COMPARISON OVERVIEW */}
          {/* ========================================================================= */}
          {activeViewTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schoolStats.map((school) => {
                  const isSelected = selectedSchool === school.code;
                  return (
                    <div
                      key={school.code}
                      onClick={() => setSelectedSchool(isSelected ? 'ALL' : school.code)}
                      className={`p-5 rounded-2xl transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#121217] border-indigo-500 shadow-lg shadow-indigo-500/10'
                          : 'bg-[#09090b] hover:bg-[#0f0f12] border-[#222222]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-white font-mono">{school.code}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181b] text-zinc-300 border border-[#27272a]">
                              {school.totalAllocations.toLocaleString()} Allocations
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{school.name}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Completed</span>
                          <span
                            className={`text-sm font-black font-mono ${
                              school.fullyAllocatedPct > 80
                                ? 'text-emerald-400'
                                : school.fullyAllocatedPct > 40
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {school.fullyAllocatedPct}%
                          </span>
                        </div>
                      </div>

                      {/* Mini Metric Grid */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1f1f23] text-center font-mono">
                        <div className="p-2 rounded-xl bg-[#121215] border border-[#1f1f23]">
                          <span className="text-[9px] text-zinc-500 block uppercase">Schedules</span>
                          <span className="text-xs font-bold text-white">{school.uniqueSchedulesCount}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#121215] border border-[#1f1f23]">
                          <span className="text-[9px] text-zinc-500 block uppercase">Courses</span>
                          <span className="text-xs font-bold text-white">{school.uniqueCoursesCount}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#121215] border border-[#1f1f23]">
                          <span className="text-[9px] text-zinc-500 block uppercase">Evaluators</span>
                          <span className="text-xs font-bold text-emerald-400">{school.uniqueEvaluatorsCount}</span>
                        </div>
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-2 mt-4">
                        <div>
                          <div className="flex justify-between text-[10px] font-mono mb-1">
                            <span className="text-zinc-400">Evaluator Assigned</span>
                            <span className="text-emerald-400 font-bold">
                              {school.evaluatorAssignedCount}/{school.totalAllocations} ({school.evaluatorCoveragePct}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${school.evaluatorCoveragePct}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-mono mb-1">
                            <span className="text-zinc-400">Chief Evaluator Assigned</span>
                            <span className="text-purple-400 font-bold">
                              {school.chiefAssignedCount}/{school.totalAllocations} ({school.chiefCoveragePct}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-500 h-full rounded-full transition-all"
                              style={{ width: `${school.chiefCoveragePct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#1f1f23] flex items-center justify-between text-[11px] text-indigo-400">
                        <span className="font-semibold">{isSelected ? 'Active Filter' : 'Click to inspect school'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: COURSE BREAKDOWN WITHIN CURRENT SCHOOL */}
          {/* ========================================================================= */}
          {activeViewTab === 'courses' && (
            <div className="rounded-2xl bg-[#09090b] border border-[#222222] overflow-hidden">
              <div className="p-4 border-b border-[#222222] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Course Offerings ({courseBreakdown.length} Courses)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Breakdown of courses, schedule distribution, and assignment health{' '}
                    {selectedSchool === 'ALL' ? 'across all schools' : `for ${selectedSchool}`}.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#1f1f23] bg-[#0c0c0e] text-[10px] font-mono uppercase text-zinc-400">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Course Name</th>
                      <th className="py-3 px-4 text-center">School</th>
                      <th className="py-3 px-4 text-right">Unique Schedules</th>
                      <th className="py-3 px-4 text-right">Total Students</th>
                      <th className="py-3 px-4">Evaluator Coverage</th>
                      <th className="py-3 px-4">Chief Coverage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181b]">
                    {courseBreakdown.map((course, idx) => {
                      const evalPct = course.totalStudents > 0 ? Math.round((course.withEval / course.totalStudents) * 100) : 0;
                      const chiefPct = course.totalStudents > 0 ? Math.round((course.withChief / course.totalStudents) * 100) : 0;
                      return (
                        <tr key={course.courseCode} className="hover:bg-[#121215] transition-colors">
                          <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-white">{course.courseCode}</td>
                          <td className="py-3 px-4 text-zinc-300">{course.courseName || '―'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#18181b] text-indigo-300 border border-[#27272a]">
                              {course.schoolCode || '―'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {course.scheduleIds.size}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {course.totalStudents.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[11px] font-mono font-bold ${evalPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {evalPct}%
                              </span>
                              <div className="w-16 bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${evalPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[11px] font-mono font-bold ${chiefPct === 100 ? 'text-purple-400' : 'text-amber-400'}`}>
                                {chiefPct}%
                              </span>
                              <div className="w-16 bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${chiefPct}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: EVALUATOR & CHIEF WORKLOAD WITHIN CURRENT SCHOOL */}
          {/* ========================================================================= */}
          {activeViewTab === 'evaluators' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evaluators Column */}
              <div className="rounded-2xl bg-[#09090b] border border-[#222222] overflow-hidden">
                <div className="p-4 border-b border-[#222222] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Users2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Evaluators ({evaluatorBreakdown.evaluators.length})
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Assigned evaluators in {selectedSchool === 'ALL' ? 'all schools' : selectedSchool}
                      </p>
                    </div>
                  </div>

                  {evaluatorBreakdown.unassignedStudents > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800">
                      {evaluatorBreakdown.unassignedStudents} Unassigned Students
                    </span>
                  )}
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="sticky top-0 bg-[#0c0c0e] border-b border-[#1f1f23] text-[10px] font-mono uppercase text-zinc-400">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Evaluator Email</th>
                        <th className="py-2.5 px-3 text-right">Schedules</th>
                        <th className="py-2.5 px-3 text-right">Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#18181b]">
                      {evaluatorBreakdown.evaluators.map((ev, idx) => (
                        <tr key={ev.email} className="hover:bg-[#121215] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-zinc-200">{ev.email}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                            {ev.scheduleIds.size}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            {ev.studentCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chief Evaluators Column */}
              <div className="rounded-2xl bg-[#09090b] border border-[#222222] overflow-hidden">
                <div className="p-4 border-b border-[#222222] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Chief Evaluators ({chiefBreakdown.chiefs.length})
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Lead evaluators in {selectedSchool === 'ALL' ? 'all schools' : selectedSchool}
                      </p>
                    </div>
                  </div>

                  {chiefBreakdown.unassignedStudents > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800">
                      {chiefBreakdown.unassignedStudents} Unassigned Students
                    </span>
                  )}
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="sticky top-0 bg-[#0c0c0e] border-b border-[#1f1f23] text-[10px] font-mono uppercase text-zinc-400">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Chief Evaluator</th>
                        <th className="py-2.5 px-3 text-right">Schedules</th>
                        <th className="py-2.5 px-3 text-right">Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#18181b]">
                      {chiefBreakdown.chiefs.map((cf, idx) => (
                        <tr key={cf.email} className="hover:bg-[#121215] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-zinc-200 block">{cf.email}</span>
                            {cf.name && cf.name !== cf.email && (
                              <span className="text-[10px] text-zinc-400 block">{cf.name}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                            {cf.scheduleIds.size}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                            {cf.studentCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: COMPREHENSIVE DATA TABLE (FILTERABLE & EXPORTABLE) */}
          {/* ========================================================================= */}
          {activeViewTab === 'records' && (
            <div className="rounded-2xl bg-[#09090b] border border-[#222222] overflow-hidden space-y-4 p-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* Search Input */}
                  <div className="relative min-w-[240px] flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Schedule, Student, Course, Faculty..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-black border border-[#27272a] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Evaluator Status Filter */}
                  <select
                    value={evalFilter}
                    onChange={(e) => setEvalFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-black border border-[#27272a] text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="ALL">Evaluator: All</option>
                    <option value="ASSIGNED">Evaluator: Assigned</option>
                    <option value="MISSING">Evaluator: Missing</option>
                  </select>

                  {/* Chief Evaluator Status Filter */}
                  <select
                    value={chiefFilter}
                    onChange={(e) => setChiefFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-black border border-[#27272a] text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="ALL">Chief: All</option>
                    <option value="ASSIGNED">Chief: Assigned</option>
                    <option value="MISSING">Chief: Missing</option>
                  </select>

                  {/* Course Filter Dropdown */}
                  {availableCourses.length > 0 && (
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-black border border-[#27272a] text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono max-w-[180px]"
                    >
                      <option value="ALL">Course: All ({availableCourses.length})</option>
                      {availableCourses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Actions: Copy Schedule IDs & Export Excel */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleCopyScheduleIds}
                    className="px-3 py-1.5 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center space-x-2"
                    title="Copy all filtered unique Schedule IDs as comma-separated values"
                  >
                    {copiedScheduleIds ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>{copiedScheduleIds ? 'Copied IDs!' : 'Copy Schedule IDs'}</span>
                  </button>

                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                  >
                    Export CSV
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-[#1f1f23]">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#1f1f23] bg-[#0c0c0e] text-[10px] font-mono uppercase text-zinc-400">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">School</th>
                      <th className="py-2.5 px-3">Schedule ID</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Student Details</th>
                      <th className="py-2.5 px-3">Evaluator Email</th>
                      <th className="py-2.5 px-3">Chief Evaluator</th>
                      <th className="py-2.5 px-3 text-right">Exam Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181b]">
                    {displayedRows.slice(0, 150).map((r, idx) => {
                      const hasEval = Boolean(r.evaluatorEmail && r.evaluatorEmail.trim().length > 0);
                      const hasChief = Boolean(
                        (r.chiefEvaluatorEmail && r.chiefEvaluatorEmail.trim().length > 0) ||
                        (r.chiefEvaluatorName && r.chiefEvaluatorName.trim().length > 0)
                      );
                      return (
                        <tr key={r.id || idx} className="hover:bg-[#121215] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#18181b] text-indigo-300 border border-[#27272a]">
                              {r.schoolCode || '―'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{r.scheduleId || '―'}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-zinc-200 block">{r.courseCode}</span>
                            {r.courseName && <span className="text-[10px] text-zinc-400 block">{r.courseName}</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-zinc-200 block">{r.studentName}</span>
                            {r.studentEmail && <span className="text-[10px] text-zinc-400 font-mono block">{r.studentEmail}</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {hasEval ? (
                              <span className="font-mono text-emerald-400 text-[11px]">{r.evaluatorEmail}</span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {hasChief ? (
                              <div>
                                <span className="font-mono text-purple-300 text-[11px] block">{r.chiefEvaluatorEmail}</span>
                                {r.chiefEvaluatorName && r.chiefEvaluatorName !== r.chiefEvaluatorEmail && (
                                  <span className="text-[10px] text-zinc-400 block">{r.chiefEvaluatorName}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-400 text-[11px]">
                            {r.examDate || '―'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 font-mono">
                <span>
                  Showing {Math.min(displayedRows.length, 150)} of {displayedRows.length.toLocaleString()} matching records
                </span>
                {displayedRows.length > 150 && (
                  <span className="text-amber-400">
                    Preview limited to first 150 records in browser. Use <strong>Export Excel</strong> for all {displayedRows.length.toLocaleString()} rows.
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

