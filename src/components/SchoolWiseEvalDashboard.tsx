'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  GraduationCap,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  Copy,
  Check,
  RefreshCw,
  Link2,
  Layers,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { normalizeSchool } from '@/lib/mockData';
import { MasterEvalRow, isMissingOrPlaceholder } from '@/lib/evalOpsParser';
import { aggregateChiefBySchool } from '@/lib/chiefEvaluatorStats';
import { ChiefEvaluatorSchoolSpace } from './ChiefEvaluatorSchoolSpace';
import { CustomDropdown } from './CustomDropdown';
import { SegmentedToggle } from './SegmentedToggle';

export const SchoolWiseEvalDashboard: React.FC = () => {
  // Active Entity Space inside the Dashboard
  const [activeEntity, setActiveEntity] = useState<'OVERVIEW' | 'CHIEF_SPACE'>('OVERVIEW');

  // Google Sheet URL & State
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Master Sheet Loaded Data
  const [masterRows, setMasterRows] = useState<MasterEvalRow[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Selected School Code (e.g. 'SCE', 'ALL', etc.)
  const [selectedSchool, setSelectedSchool] = useState<string>('');

  // Table Quick Filter: 'ALL' | 'EVAL_AVAILABLE' | 'EVAL_MISSING' | 'CHIEF_AVAILABLE' | 'CHIEF_MISSING' | 'BOTH_AVAILABLE'
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'EVAL_AVAILABLE' | 'EVAL_MISSING' | 'CHIEF_AVAILABLE' | 'CHIEF_MISSING' | 'BOTH_AVAILABLE'
  >('ALL');

  // Search Input for Table
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Feedback State for Copy Schedule IDs
  const [copiedScheduleIds, setCopiedScheduleIds] = useState<boolean>(false);

  // Load saved Google Sheet URL on mount and auto-fetch
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

      const rows: MasterEvalRow[] = data.rows || [];
      setMasterRows(rows);
      setSheetName(data.sheetName || 'Total Data');
      setLastSyncTime(new Date().toLocaleTimeString());

      // Save to localStorage for seamless persistence
      try {
        localStorage.setItem('eval_ops_master_sheet_url', urlToFetch);
      } catch {
        // ignore
      }

      // If no school is selected yet, default to the school with the most students or 'ALL'
      if (!selectedSchool && rows.length > 0) {
        const counts = new Map<string, number>();
        rows.forEach((r) => {
          const code = (r.schoolCode || 'UNKNOWN').trim().toUpperCase();
          counts.set(code, (counts.get(code) || 0) + 1);
        });
        const topSchool = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
        if (topSchool) {
          setSelectedSchool(topSchool[0]);
        }
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

  // Single O(N) school aggregation powering both School Selector and Chief Evaluator Space
  const chiefSummary = useMemo(() => aggregateChiefBySchool(masterRows), [masterRows]);

  const availableSchoolsList = useMemo(
    () =>
      chiefSummary.schoolAggregations
        .map((s) => ({ code: s.schoolCode, name: s.schoolName, studentCount: s.totalStudents }))
        .sort((a, b) => b.studentCount - a.studentCount),
    [chiefSummary]
  );

  const chiefSummaryBadges = {
    allAvailableSchools: chiefSummary.globalStats.schoolsAllAvailable,
    missingSchools: chiefSummary.globalStats.schoolsAnyMissing,
  };

  // Selected School Data Rows
  const selectedSchoolRows = useMemo(() => {
    if (!selectedSchool || selectedSchool === 'ALL') return masterRows;
    return masterRows.filter((r) => (r.schoolCode || '').toUpperCase() === selectedSchool.toUpperCase());
  }, [masterRows, selectedSchool]);

  // School-wise Categorized Metrics as requested by the user:
  // 1. Total students available
  // 2. Evaluator detail available for students
  // 3. Evaluator detail not available for students
  // 4. Chief evaluator detail available for students
  // 5. Chief evaluator detail not available for students
  const schoolMetrics = useMemo(() => {
    const totalStudents = selectedSchoolRows.length;
    const scheduleIdsSet = new Set<string>();
    const courseCodesSet = new Set<string>();
    const evaluatorEmailsSet = new Set<string>();
    const chiefEvaluatorsSet = new Set<string>();

    let evalAvailable = 0;
    let evalNotAvailable = 0;
    let chiefAvailable = 0;
    let chiefNotAvailable = 0;
    let bothAvailable = 0;

    for (const r of selectedSchoolRows) {
      if (r.scheduleId) scheduleIdsSet.add(r.scheduleId);
      if (r.courseCode) courseCodesSet.add(r.courseCode.toUpperCase());

      const hasEval = Boolean(r.evaluatorEmail && !isMissingOrPlaceholder(r.evaluatorEmail));
      const hasChief = Boolean(
        (r.chiefEvaluatorEmail && !isMissingOrPlaceholder(r.chiefEvaluatorEmail)) ||
        (r.chiefEvaluatorName && !isMissingOrPlaceholder(r.chiefEvaluatorName))
      );

      if (hasEval) {
        evalAvailable++;
        evaluatorEmailsSet.add(r.evaluatorEmail.trim());
      } else {
        evalNotAvailable++;
      }

      if (hasChief) {
        chiefAvailable++;
        if (r.chiefEvaluatorEmail) chiefEvaluatorsSet.add(r.chiefEvaluatorEmail.trim());
      } else {
        chiefNotAvailable++;
      }

      if (hasEval && hasChief) {
        bothAvailable++;
      }
    }

    const evalAvailablePct = totalStudents > 0 ? Math.round((evalAvailable / totalStudents) * 100) : 0;
    const evalNotAvailablePct = totalStudents > 0 ? Math.round((evalNotAvailable / totalStudents) * 100) : 0;
    const chiefAvailablePct = totalStudents > 0 ? Math.round((chiefAvailable / totalStudents) * 100) : 0;
    const chiefNotAvailablePct = totalStudents > 0 ? Math.round((chiefNotAvailable / totalStudents) * 100) : 0;
    const bothAvailablePct = totalStudents > 0 ? Math.round((bothAvailable / totalStudents) * 100) : 0;

    return {
      totalStudents,
      evalAvailable,
      evalAvailablePct,
      evalNotAvailable,
      evalNotAvailablePct,
      chiefAvailable,
      chiefAvailablePct,
      chiefNotAvailable,
      chiefNotAvailablePct,
      bothAvailable,
      bothAvailablePct,
      uniqueSchedulesCount: scheduleIdsSet.size,
      uniqueCoursesCount: courseCodesSet.size,
      uniqueEvaluatorsCount: evaluatorEmailsSet.size,
      uniqueChiefsCount: chiefEvaluatorsSet.size,
    };
  }, [selectedSchoolRows]);

  // Selected School Friendly Name & Code
  const selectedSchoolInfo = useMemo(() => {
    if (!selectedSchool || selectedSchool === 'ALL') {
      return { code: 'ALL', name: 'All Schools (Aggregated Total Data)' };
    }
    const found = availableSchoolsList.find((s) => s.code === selectedSchool);
    if (found) return found;
    const norm = normalizeSchool(selectedSchool);
    return { code: selectedSchool, name: norm.name || `School of ${selectedSchool}` };
  }, [selectedSchool, availableSchoolsList]);

  // Filtered Table Rows based on Status Filter & Search
  const displayedTableRows = useMemo(() => {
    let list = selectedSchoolRows;

    if (statusFilter === 'EVAL_AVAILABLE') {
      list = list.filter((r) => r.evaluatorEmail && !isMissingOrPlaceholder(r.evaluatorEmail));
    } else if (statusFilter === 'EVAL_MISSING') {
      list = list.filter((r) => !r.evaluatorEmail || isMissingOrPlaceholder(r.evaluatorEmail));
    } else if (statusFilter === 'CHIEF_AVAILABLE') {
      list = list.filter(
        (r) =>
          (r.chiefEvaluatorEmail && !isMissingOrPlaceholder(r.chiefEvaluatorEmail)) ||
          (r.chiefEvaluatorName && !isMissingOrPlaceholder(r.chiefEvaluatorName))
      );
    } else if (statusFilter === 'CHIEF_MISSING') {
      list = list.filter(
        (r) =>
          (!r.chiefEvaluatorEmail || isMissingOrPlaceholder(r.chiefEvaluatorEmail)) &&
          (!r.chiefEvaluatorName || isMissingOrPlaceholder(r.chiefEvaluatorName))
      );
    } else if (statusFilter === 'BOTH_AVAILABLE') {
      list = list.filter(
        (r) =>
          r.evaluatorEmail &&
          !isMissingOrPlaceholder(r.evaluatorEmail) &&
          ((r.chiefEvaluatorEmail && !isMissingOrPlaceholder(r.chiefEvaluatorEmail)) ||
            (r.chiefEvaluatorName && !isMissingOrPlaceholder(r.chiefEvaluatorName)))
      );
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
          r.examDate.toLowerCase().includes(q)
      );
    }

    return list;
  }, [selectedSchoolRows, statusFilter, searchQuery]);

  // Copy Filtered Schedule IDs as CSV string to clipboard
  const handleCopyScheduleIds = async () => {
    const ids = Array.from(new Set(displayedTableRows.map((r) => r.scheduleId).filter(Boolean)));
    if (ids.length === 0) return;
    try {
      await navigator.clipboard.writeText(ids.join(', '));
      setCopiedScheduleIds(true);
      setTimeout(() => setCopiedScheduleIds(false), 2200);
    } catch {
      // ignore
    }
  };

  // Export Filtered Table as Excel (.xlsx)
  const handleExportExcel = () => {
    if (displayedTableRows.length === 0) return;

    const exportData = displayedTableRows.map((r, idx) => ({
      '#': idx + 1,
      'School Code': r.schoolCode,
      'School Name': normalizeSchool(r.schoolCode).name,
      'Schedule ID': r.scheduleId,
      'Course Code': r.courseCode,
      'Course Name': r.courseName,
      'Student Name': r.studentName,
      'Student Email': r.studentEmail,
      'Evaluator Email': (r.evaluatorEmail && !isMissingOrPlaceholder(r.evaluatorEmail)) ? r.evaluatorEmail : 'Details Missing',
      'Chief Evaluator Email': (r.chiefEvaluatorEmail && !isMissingOrPlaceholder(r.chiefEvaluatorEmail)) ? r.chiefEvaluatorEmail : 'Details Missing',
      'Chief Evaluator Name': (r.chiefEvaluatorName && !isMissingOrPlaceholder(r.chiefEvaluatorName)) ? r.chiefEvaluatorName : '',
      'Exam Date': r.examDate,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const sheetTitle = selectedSchool === 'ALL' ? 'All Schools' : `${selectedSchool} Details`;
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));

    const fileName = `School_Data_${selectedSchool}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export Filtered Table as CSV
  const handleExportCsv = () => {
    if (displayedTableRows.length === 0) return;

    const exportData = displayedTableRows.map((r, idx) => ({
      '#': idx + 1,
      'School Code': r.schoolCode,
      'Schedule ID': r.scheduleId,
      'Course Code': r.courseCode,
      'Course Name': r.courseName,
      'Student Name': r.studentName,
      'Student Email': r.studentEmail,
      'Evaluator Email': (r.evaluatorEmail && !isMissingOrPlaceholder(r.evaluatorEmail)) ? r.evaluatorEmail : 'Details Missing',
      'Chief Evaluator Email': (r.chiefEvaluatorEmail && !isMissingOrPlaceholder(r.chiefEvaluatorEmail)) ? r.chiefEvaluatorEmail : 'Details Missing',
      'Exam Date': r.examDate,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `School_Data_${selectedSchool}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-16 font-sans">
      {/* Clean Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">School-wise Dashboard</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select a school to categorize student allocations, evaluator availability, and chief evaluator details from Google Sheet Total Data.
            </p>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleFetchSheet(sheetUrl, sheetName, true)}
            disabled={isLoadingSheet || !sheetUrl.trim()}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-200 hover:text-white transition-all disabled:opacity-50"
            title="Force refresh live data from Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
            <span>{isLoadingSheet ? 'Syncing...' : 'Re-sync Live Sheet'}</span>
          </button>

          {masterRows.length > 0 && (
            <div className="px-3 py-2 rounded-xl bg-[#091f13] border border-[#1a532d] text-emerald-300 text-[11px] font-mono flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{masterRows.length.toLocaleString()} Total Rows</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {sheetError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{sheetError}</span>
          </div>
          <button onClick={() => setSheetError(null)} className="text-red-400 hover:text-red-200 text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Neat Single-Line Google Sheet Connection */}
      <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-zinc-400">
          <Link2 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-semibold text-zinc-300">Google Sheet:</span>
          {sheetName && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              Subsheet: {sheetName}
            </span>
          )}
          {lastSyncTime && <span className="text-[10px] text-zinc-500 font-mono">Synced: {lastSyncTime}</span>}
        </div>

        <div className="flex items-center space-x-2 flex-1 max-w-xl">
          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFetchSheet(sheetUrl, undefined, true);
            }}
            placeholder="Paste Google Sheet URL..."
            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-black border border-[#27272a] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleFetchSheet(sheetUrl, undefined, true)}
            disabled={isLoadingSheet || !sheetUrl.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all disabled:opacity-50 shrink-0"
          >
            {masterRows.length > 0 ? 'Update' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Empty State when no Google Sheet is connected yet */}
      {masterRows.length === 0 && !isLoadingSheet && (
        <div className="p-12 rounded-2xl bg-[#09090b] border border-dashed border-[#27272a] text-center max-w-lg mx-auto my-8">
          <Building2 className="w-8 h-8 text-indigo-400 mx-auto mb-3 opacity-70" />
          <h3 className="text-sm font-bold text-white">Connect Google Sheet Total Data</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Paste your Google Sheet link above and click Connect to explore school-wise stats and the Chief Evaluator elaborated space.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENTITY / WORKSPACE SWITCHER (School Overview vs Chief Evaluator Space) */}
      {/* ========================================================================= */}
      {masterRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setActiveEntity('OVERVIEW')}
            className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              activeEntity === 'OVERVIEW'
                ? 'bg-indigo-500/[0.08] border-indigo-500/60 shadow-lg shadow-indigo-950/20'
                : 'bg-[#09090b] border-[#27272a] hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  activeEntity === 'OVERVIEW'
                    ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300'
                    : 'bg-[#121214] border-[#27272a] text-zinc-400'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xs font-bold text-white tracking-wide uppercase truncate">
                    School-Wise Overview & Student Explorer
                  </h2>
                  {activeEntity === 'OVERVIEW' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  Select a single school to view Evaluator & Chief stats and student rows
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#121214] text-zinc-200 border border-[#27272a] shrink-0">
              {availableSchoolsList.length} Schools
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveEntity('CHIEF_SPACE')}
            className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              activeEntity === 'CHIEF_SPACE'
                ? 'bg-purple-500/[0.08] border-purple-500/60 shadow-lg shadow-purple-950/20'
                : 'bg-[#09090b] border-[#27272a] hover:border-purple-500/40'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  activeEntity === 'CHIEF_SPACE'
                    ? 'bg-purple-500/15 border-purple-500/35 text-purple-300'
                    : 'bg-[#121214] border-[#27272a] text-purple-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xs font-bold text-white tracking-wide uppercase truncate">
                    Chief Evaluator Elaborated Space
                  </h2>
                  {activeEntity === 'CHIEF_SPACE' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  School-wise categorization (All Available vs Missing), sorting & rosters
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0 font-mono text-[10px] font-bold">
              <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                {chiefSummaryBadges.allAvailableSchools} Full
              </span>
              <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25">
                {chiefSummaryBadges.missingSchools} Missing
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEPARATE ENTITY 2: CHIEF EVALUATOR ELABORATED SPACE (SCHOOL-WISE) */}
      {/* ========================================================================= */}
      {masterRows.length > 0 && activeEntity === 'CHIEF_SPACE' && (
        <ChiefEvaluatorSchoolSpace
          masterRows={masterRows}
          precomputedSummary={chiefSummary}
          onInspectSchoolInOverview={(schoolCode, filter) => {
            setSelectedSchool(schoolCode);
            setStatusFilter(filter);
            setSearchQuery('');
            setActiveEntity('OVERVIEW');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* ENTITY 1: 1. SCHOOL SELECTOR (PROMINENT & CLEAN) */}
      {/* ========================================================================= */}
      {masterRows.length > 0 && activeEntity === 'OVERVIEW' && (
        <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <label htmlFor="school-select" className="text-xs font-bold text-white uppercase tracking-wider">
                Select School
              </label>
              <span className="text-[10px] font-mono text-zinc-400">
                ({availableSchoolsList.length} Schools Available)
              </span>
            </div>

            {selectedSchool && (
              <span className="text-xs text-zinc-400 font-mono">
                Viewing: <strong className="text-white">{selectedSchoolInfo.name}</strong>
              </span>
            )}
          </div>

          {/* Searchable Dark School Dropdown */}
          <CustomDropdown
            id="school-select"
            size="lg"
            searchable
            className="w-full"
            minMenuWidth="w-full"
            icon={Building2}
            value={selectedSchool}
            placeholder="-- Please select a school --"
            onChange={(val) => {
              setSelectedSchool(val);
              setStatusFilter('ALL');
            }}
            options={[
              {
                value: 'ALL',
                label: 'ALL SCHOOLS — Complete Total Data',
                sublabel: `${masterRows.length.toLocaleString()} Students across ${availableSchoolsList.length} Schools`,
                badge: 'ALL',
              },
              ...availableSchoolsList.map((s) => ({
                value: s.code,
                label: `${s.code} — ${s.name}`,
                sublabel: `${s.studentCount.toLocaleString()} Students`,
                badge: s.code,
              })),
            ]}
          />

          {/* Quick Select School Pills */}
          <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Quick Pick:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedSchool('ALL');
                setStatusFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                selectedSchool === 'ALL'
                  ? 'bg-white text-black border-white font-bold shadow-sm'
                  : 'bg-[#121214] text-zinc-400 hover:text-white border-[#27272a]'
              }`}
            >
              All Schools
            </button>
            {availableSchoolsList.slice(0, 10).map((s) => {
              const isSelected = selectedSchool === s.code;
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    setSelectedSchool(s.code);
                    setStatusFilter('ALL');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                    isSelected
                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/60 shadow-sm'
                      : 'bg-[#121214] text-zinc-300 hover:text-white hover:bg-[#18181b] border-[#27272a]'
                  }`}
                >
                  {s.code} <span className="text-[10px] opacity-70">({s.studentCount})</span>
                </button>
              );
            })}
            {availableSchoolsList.length > 10 && (
              <span className="text-[10px] font-mono text-zinc-500 ml-1">
                +{availableSchoolsList.length - 10} more in search above
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prompt to Select a School if not selected */}
      {masterRows.length > 0 && activeEntity === 'OVERVIEW' && !selectedSchool && (
        <div className="p-12 rounded-2xl bg-[#09090b] border border-dashed border-[#27272a] text-center max-w-md mx-auto my-8">
          <Building2 className="w-8 h-8 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-white">Select a School Above</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Choose a school from the dropdown to instantly view categorized student and evaluator details.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CATEGORIZED DATA CARDS FOR SELECTED SCHOOL */}
      {/* ========================================================================= */}
      {activeEntity === 'OVERVIEW' && selectedSchool && selectedSchoolRows.length > 0 && (
        <>
          {/* Main Requested Metrics (Clean 5 Clickable Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Total students available */}
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                statusFilter === 'ALL'
                  ? 'bg-[#121214] border-zinc-500 shadow-lg'
                  : 'bg-[#09090b] border-[#27272a] hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Total Students</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-3xl font-black text-white font-mono">{schoolMetrics.totalStudents.toLocaleString()}</p>
              </div>
              <p className="text-[11px] text-zinc-400 mt-3 pt-2.5 border-t border-[#1f1f23]">
                Available student allocations in {selectedSchool === 'ALL' ? 'all schools' : selectedSchool}
              </p>
            </button>

            {/* 2. Evaluator detail available for students */}
            <button
              type="button"
              onClick={() => setStatusFilter('EVAL_AVAILABLE')}
              className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                statusFilter === 'EVAL_AVAILABLE'
                  ? 'bg-emerald-500/[0.08] border-emerald-500/60 shadow-lg'
                  : 'bg-[#09090b] border-[#27272a] hover:border-emerald-500/35'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-emerald-400">
                    Evaluator Available
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    {schoolMetrics.evalAvailable.toLocaleString()}
                  </p>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    ({schoolMetrics.evalAvailablePct}%)
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1f1f23] w-full">
                <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${schoolMetrics.evalAvailablePct}%` }} />
                </div>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Students assigned to an evaluator</span>
              </div>
            </button>

            {/* 3. Evaluator detail not available for students */}
            <button
              type="button"
              onClick={() => setStatusFilter('EVAL_MISSING')}
              className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                statusFilter === 'EVAL_MISSING'
                  ? 'bg-rose-500/[0.08] border-rose-500/60 shadow-lg'
                  : 'bg-[#09090b] border-[#27272a] hover:border-rose-500/35'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-rose-400">
                    Evaluator Not Available
                  </span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-black text-rose-400 font-mono">
                    {schoolMetrics.evalNotAvailable.toLocaleString()}
                  </p>
                  <span className="text-xs font-bold text-rose-400 font-mono">
                    ({schoolMetrics.evalNotAvailablePct}%)
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1f1f23]">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  schoolMetrics.evalNotAvailable === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {schoolMetrics.evalNotAvailable === 0 ? 'All Assigned' : 'Action Required'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Students with missing evaluator email</span>
              </div>
            </button>

            {/* 4. Chief evaluator detail available for students */}
            <button
              type="button"
              onClick={() => setStatusFilter('CHIEF_AVAILABLE')}
              className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                statusFilter === 'CHIEF_AVAILABLE'
                  ? 'bg-purple-500/[0.08] border-purple-500/60 shadow-lg'
                  : 'bg-[#09090b] border-[#27272a] hover:border-purple-500/35'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-purple-400">
                    Chief Available
                  </span>
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-black text-purple-400 font-mono">
                    {schoolMetrics.chiefAvailable.toLocaleString()}
                  </p>
                  <span className="text-xs font-bold text-purple-400 font-mono">
                    ({schoolMetrics.chiefAvailablePct}%)
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1f1f23] w-full">
                <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${schoolMetrics.chiefAvailablePct}%` }} />
                </div>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Students assigned to a chief evaluator</span>
              </div>
            </button>

            {/* 5. Chief evaluator detail not available for students */}
            <button
              type="button"
              onClick={() => setStatusFilter('CHIEF_MISSING')}
              className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                statusFilter === 'CHIEF_MISSING'
                  ? 'bg-amber-500/[0.08] border-amber-500/60 shadow-lg'
                  : 'bg-[#09090b] border-[#27272a] hover:border-amber-500/35'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-400">
                    Chief Not Available
                  </span>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-black text-amber-400 font-mono">
                    {schoolMetrics.chiefNotAvailable.toLocaleString()}
                  </p>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    ({schoolMetrics.chiefNotAvailablePct}%)
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1f1f23]">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  schoolMetrics.chiefNotAvailable === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {schoolMetrics.chiefNotAvailable === 0 ? 'All Covered' : 'Action Required'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Students missing chief evaluator</span>
              </div>
            </button>
          </div>

          {/* Clean Secondary Summary Strip */}
          <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#27272a] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4 text-zinc-400" />
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Unique Schedules</span>
                <span className="font-bold text-white">{schoolMetrics.uniqueSchedulesCount} Distinct Slots</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Courses Offered</span>
                <span className="font-bold text-white">{schoolMetrics.uniqueCoursesCount} Subjects</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Both Details Available</span>
                <span className="font-bold text-sky-400">
                  {schoolMetrics.bothAvailable.toLocaleString()} ({schoolMetrics.bothAvailablePct}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2.5">
              <div className="flex items-center space-x-2.5 min-w-0">
                <Users className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-500 block uppercase">Faculty Count</span>
                  <span className="font-bold text-white truncate block">
                    {schoolMetrics.uniqueEvaluatorsCount} Evaluators / {schoolMetrics.uniqueChiefsCount} Chiefs
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveEntity('CHIEF_SPACE')}
                className="px-2 py-1 rounded-md bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-[10px] font-semibold text-purple-200 inline-flex items-center space-x-1 shrink-0 transition-colors"
                title="Open Elaborated Chief Evaluator Space across all schools"
              >
                <span>Chiefs Space</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. CLEAN STUDENT DETAILS TABLE & QUICK FILTERS */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] space-y-4">
            {/* Table Control Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              {/* Segmented Filter Control */}
              <SegmentedToggle
                size="sm"
                wrap
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: 'All', count: selectedSchoolRows.length.toLocaleString() },
                  {
                    value: 'EVAL_MISSING',
                    label: 'Eval Missing',
                    count: schoolMetrics.evalNotAvailable.toLocaleString(),
                    tone: 'rose',
                  },
                  {
                    value: 'CHIEF_MISSING',
                    label: 'Chief Missing',
                    count: schoolMetrics.chiefNotAvailable.toLocaleString(),
                    tone: 'amber',
                  },
                  {
                    value: 'EVAL_AVAILABLE',
                    label: 'Eval Assigned',
                    count: schoolMetrics.evalAvailable.toLocaleString(),
                    tone: 'emerald',
                  },
                  {
                    value: 'CHIEF_AVAILABLE',
                    label: 'Chief Assigned',
                    count: schoolMetrics.chiefAvailable.toLocaleString(),
                    tone: 'purple',
                  },
                ]}
              />

              {/* Search & Export Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student, schedule, course..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black border border-[#27272a] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopyScheduleIds}
                  className="px-3 py-1.5 rounded-lg bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center space-x-1.5"
                  title="Copy filtered unique schedule IDs as comma-separated values"
                >
                  {copiedScheduleIds ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedScheduleIds ? 'Copied!' : 'Copy IDs'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-lg bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  CSV
                </button>

                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Clean Data Table */}
            <div className="overflow-x-auto rounded-xl border border-[#1f1f23]">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[#1f1f23] bg-[#0c0c0e] text-[10px] font-mono uppercase text-zinc-400">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">School</th>
                    <th className="py-2.5 px-3">Schedule ID</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Student Details</th>
                    <th className="py-2.5 px-3">Evaluator Detail</th>
                    <th className="py-2.5 px-3">Chief Evaluator Detail</th>
                    <th className="py-2.5 px-3 text-right">Exam Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181b]">
                  {displayedTableRows.slice(0, 100).map((r, idx) => {
                    const hasEval = Boolean(r.evaluatorEmail && !isMissingOrPlaceholder(r.evaluatorEmail));
                    const hasChief = Boolean(
                      (r.chiefEvaluatorEmail && !isMissingOrPlaceholder(r.chiefEvaluatorEmail)) ||
                      (r.chiefEvaluatorName && !isMissingOrPlaceholder(r.chiefEvaluatorName))
                    );
                    return (
                      <tr key={r.id || idx} className="hover:bg-[#121215] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#18181b] text-indigo-300 border border-[#27272a]">
                            {r.schoolCode || '―'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{r.scheduleId || '―'}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-zinc-200 block">{r.courseCode}</span>
                          {r.courseName && <span className="text-[10px] text-zinc-400 block line-clamp-1">{r.courseName}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-zinc-200 block">{r.studentName}</span>
                          {r.studentEmail && (
                            <span className="text-[10px] text-zinc-400 font-mono block">{r.studentEmail}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasEval ? (
                            <span className="font-mono text-emerald-400 text-[11px]">{r.evaluatorEmail}</span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
                              Details Missing
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
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
                              Details Missing
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-500 pt-1 font-mono gap-2">
              <span>
                Showing {Math.min(displayedTableRows.length, 100)} of {displayedTableRows.length.toLocaleString()} records for {selectedSchoolInfo.name}
              </span>
              {displayedTableRows.length > 100 && (
                <span className="text-amber-400">
                  Displaying first 100 records for speed. Click <strong>Excel</strong> to export all {displayedTableRows.length.toLocaleString()} rows.
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
