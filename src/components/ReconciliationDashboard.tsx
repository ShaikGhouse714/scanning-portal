'use client';

import React, { useState, useMemo } from 'react';
import {
  PortalExamSlot,
  TeamSubsheetEntry,
  ReconciledDateSchool,
  TeammateSummary,
  ReconciliationMetrics,
} from '../types';
import {
  RotateCw,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  FileSpreadsheet,
  UploadCloud,
  Search,
  AlertOctagon,
  TrendingUp,
  Link2,
  FileText,
  Users2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  ExternalLink,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { exportReconciliationToCSV } from '../lib/storage';

interface ReconciliationDashboardProps {
  matrix: ReconciledDateSchool[];
  teammates: TeammateSummary[];
  metrics: ReconciliationMetrics;
  portalSlots: PortalExamSlot[];
  teamEntries: TeamSubsheetEntry[];
  googleSheetUrl: string;
  onUpdateSheetUrl: (url: string) => void;
  onSyncGoogleSheet: () => void;
  onUploadPortalFile: (file: File) => void;
  onUploadTeamSheetFile: (file: File) => void;
  onResetToDemoData: () => void;
  isSyncing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lastSyncedTime: string;
  sheetNames?: string[];
}

export const ReconciliationDashboard: React.FC<ReconciliationDashboardProps> = ({
  matrix,
  teammates,
  metrics,
  portalSlots,
  teamEntries,
  googleSheetUrl,
  onUpdateSheetUrl,
  onSyncGoogleSheet,
  onUploadPortalFile,
  onUploadTeamSheetFile,
  onResetToDemoData,
  isSyncing,
  activeTab,
  setActiveTab,
  lastSyncedTime,
  sheetNames = [],
}) => {
  // Matrix Filters
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'discrepancy' | 'matched'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Teammates Tab Filters
  const [teammateSearch, setTeammateSearch] = useState<string>('');
  const [teammateFilter, setTeammateFilter] = useState<'all' | 'active' | 'empty'>('all');
  const [expandedTeammate, setExpandedTeammate] = useState<string | null>(null);

  // Portal Exams Search
  const [portalSearch, setPortalSearch] = useState<string>('');

  // Drilldown modal
  const [expandedItem, setExpandedItem] = useState<ReconciledDateSchool | null>(null);

  // Sheet URL input state inside settings
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(googleSheetUrl);

  // Available dates and schools for matrix dropdowns
  const availableDates = useMemo(() => {
    return Array.from(new Set(matrix.map((m) => m.date))).sort().reverse();
  }, [matrix]);

  const availableSchools = useMemo(() => {
    return Array.from(new Set(matrix.map((m) => m.schoolCode))).sort();
  }, [matrix]);

  // Filtered matrix for Intake vs Portal view
  const filteredMatrix = useMemo(() => {
    return matrix.filter((item) => {
      if (selectedDate !== 'all' && item.date !== selectedDate) return false;
      if (selectedSchool !== 'all' && item.schoolCode !== selectedSchool) return false;
      if (statusFilter === 'discrepancy' && item.status === 'matched') return false;
      if (statusFilter === 'matched' && item.status !== 'matched') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSchool = (item.schoolName || '').toLowerCase().includes(q);
        const matchCode = item.schoolCode.toLowerCase().includes(q);
        const matchDate = item.date.includes(q);
        const matchTeammate = item.teammates.some((t) => t.toLowerCase().includes(q));
        const matchCourse = item.portalSlots.some(
          (s) =>
            s.courseTitle.toLowerCase().includes(q) ||
            s.courseCode.toLowerCase().includes(q)
        );
        if (!matchSchool && !matchCode && !matchDate && !matchTeammate && !matchCourse) {
          return false;
        }
      }

      return true;
    });
  }, [matrix, selectedDate, selectedSchool, statusFilter, searchQuery]);

  // Filtered teammates for Teammates view
  const filteredTeammates = useMemo(() => {
    return teammates.filter((tm) => {
      if (teammateFilter === 'active' && tm.entriesCount === 0) return false;
      if (teammateFilter === 'empty' && tm.entriesCount > 0) return false;

      if (teammateSearch.trim()) {
        const q = teammateSearch.toLowerCase();
        const matchName = tm.name.toLowerCase().includes(q);
        const matchSchool = tm.schoolsCovered.some((s) => s.toLowerCase().includes(q));
        const matchDate = tm.datesActive.some((d) => d.includes(q));
        if (!matchName && !matchSchool && !matchDate) return false;
      }
      return true;
    });
  }, [teammates, teammateFilter, teammateSearch]);

  // Teammates summary numbers
  const activeTeammatesCount = useMemo(() => {
    return teammates.filter((t) => t.entriesCount > 0).length;
  }, [teammates]);

  const emptyTeammatesCount = useMemo(() => {
    return teammates.filter((t) => t.entriesCount === 0).length;
  }, [teammates]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* ========================================================================= */}
      {/* TAB 1: INTAKE VS PORTAL MATRIX (Shows full dashboard with connections & telemetry) */}
      {/* ========================================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Page Title & Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Post Exam Script Intake &amp; Portal Reconciler
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Live automated matching of Team Google Sheet (received &amp; scanned counts) vs.
                Central Portal Uploads (<code className="text-emerald-400 font-mono">Completed</code> column).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={onSyncGoogleSheet}
                disabled={isSyncing}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
                title="Sync latest entries from published Google Sheet"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-white' : ''}`}
                />
                <span>{isSyncing ? 'Syncing Sheet...' : 'Sync Sheet Data'}</span>
              </button>

              <button
                onClick={() => exportReconciliationToCSV(filteredMatrix)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setActiveTab('data_sources')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D2434] hover:bg-[#283248] text-white text-xs font-semibold border border-[#313E57] shadow-sm transition-all"
              >
                <Link2 className="w-3.5 h-3.5 text-slate-300" />
                <span>Connect Sources</span>
              </button>
            </div>
          </div>

          {/* Active Data Source Connections Banner (Exact style from screenshot) */}
          <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A202C] mb-3 text-xs">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                  Active Data Source Connections
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {teamEntries.length > 0 && portalSlots.length > 0
                  ? '2 / 2 connected'
                  : teamEntries.length > 0 || portalSlots.length > 0
                  ? '1 / 2 connected'
                  : '0 / 2 connected'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Card 1: Google Sheet */}
              <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-white block">
                      1. Team Google Sheet
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {teammates.length > 0
                        ? `${teammates.length} Subsheets (${teamEntries.length} logs)`
                        : 'No subsheet loaded'}
                    </span>
                  </div>
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#1A202C]">
                  <span
                    className="text-[10px] text-slate-400 font-mono truncate max-w-[110px]"
                    title={lastSyncedTime}
                  >
                    {lastSyncedTime}
                  </span>
                  <button
                    onClick={onSyncGoogleSheet}
                    className="text-[11px] px-2 py-0.5 rounded bg-[#181E2B] hover:bg-[#222B3D] text-slate-200 border border-[#2D384D] transition-colors"
                  >
                    Sync
                  </button>
                </div>
              </div>

              {/* Card 2: Portal Excel */}
              <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-white block">
                      2. Portal Excel / CSV
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {portalSlots.length > 0
                        ? `${portalSlots.length} Exam Slots (${metrics.totalPortalCompleted} Uploaded)`
                        : 'No portal file staged'}
                    </span>
                  </div>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#1A202C]">
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {portalSlots.length > 0 ? 'File active' : 'Awaiting file'}
                  </span>
                  <label className="text-[11px] px-2 py-0.5 rounded bg-[#181E2B] hover:bg-[#222B3D] text-slate-200 border border-[#2D384D] transition-colors cursor-pointer">
                    <span>Upload</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadPortalFile(f);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Card 3: Discrepancy Status */}
              <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-white block">
                      3. Matching Variance
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {metrics.netDiscrepancy === 0
                        ? '100% Synchronized'
                        : metrics.netDiscrepancy > 0
                        ? `${metrics.netDiscrepancy} pending in portal`
                        : `Portal exceeds by ${Math.abs(metrics.netDiscrepancy)}`}
                    </span>
                  </div>
                  <AlertOctagon
                    className={`w-3.5 h-3.5 ${
                      metrics.netDiscrepancy > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#1A202C]">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      metrics.netDiscrepancy > 0
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {metrics.netDiscrepancy > 0 ? 'Backlog Alert' : 'All Clear'}
                  </span>
                  <button
                    onClick={() =>
                      setStatusFilter(metrics.netDiscrepancy > 0 ? 'discrepancy' : 'all')
                    }
                    className="text-[11px] text-slate-400 hover:text-white underline font-mono"
                  >
                    Inspect
                  </button>
                </div>
              </div>

              {/* Card 4: Reference Data */}
              <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-white block">
                      4. Reference Portal Data
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Pre-configured sample dataset
                    </span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#1A202C]">
                  <span className="text-[10px] text-slate-500 font-mono">120+ rows</span>
                  <button
                    onClick={onResetToDemoData}
                    className="text-[11px] px-2 py-0.5 rounded bg-[#1C1F2E] hover:bg-[#282D42] text-amber-300 border border-[#3E3A52] transition-colors"
                  >
                    Reset Demo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Discrepancy Alert Banner */}
          {metrics.netDiscrepancy > 0 && (
            <div className="bg-rose-950/20 border-l-4 border-rose-500 p-4 rounded-xl shadow-lg border border-rose-500/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-rose-200 uppercase tracking-wide">
                      PORTAL UPLOAD BACKLOG DETECTED: {metrics.netDiscrepancy} SCRIPTS MISSING FROM
                      PORTAL
                    </h3>
                    <p className="text-xs text-rose-300/80 mt-1">
                      Team scanned {metrics.totalTeamScanned} scripts, but central portal has only{' '}
                      {metrics.totalPortalCompleted} marked as{' '}
                      <code className="text-white font-mono">Completed</code>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStatusFilter('discrepancy')}
                  className="text-xs font-semibold text-rose-300 hover:text-white underline shrink-0 hidden sm:block font-mono"
                >
                  Filter Discrepancies →
                </button>
              </div>
            </div>
          )}

          {/* 4 Core Telemetry Cards (Only in Reconciliation view) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Physical Received
                </span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {metrics.totalTeamReceived.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Across {teammates.length} teammate subsheets
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Scanned by Team
                </span>
                <UploadCloud className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {metrics.totalTeamScanned.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Logged in Google Sheet subsheets
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Portal Uploaded (Completed)
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-300" />
              </div>
              <div className="text-2xl font-bold text-slate-200 font-mono">
                {metrics.totalPortalCompleted.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                From {portalSlots.length} portal exam slots
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Net Discrepancy (Scanned - Portal)
                </span>
                <TrendingUp
                  className={`w-4 h-4 ${
                    metrics.netDiscrepancy > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}
                />
              </div>
              <div
                className={`text-2xl font-bold font-mono ${
                  metrics.netDiscrepancy > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {metrics.netDiscrepancy > 0 ? `+${metrics.netDiscrepancy}` : metrics.netDiscrepancy}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                {metrics.discrepancyBatchesCount} school batches flagged
              </span>
            </div>
          </div>

          {/* Dynamic Filters Bar */}
          <div className="bg-[#0E121A] rounded-xl border border-[#1E2430] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Dynamic Filters</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#181F2C] border border-[#2A3447] text-[11px] text-slate-300 font-mono">
                {selectedDate !== 'all' || selectedSchool !== 'all' || statusFilter !== 'all'
                  ? 'Filters Active'
                  : '1 active / 1 total'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filter */}
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              >
                <option value="all">All Dates ({availableDates.length})</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* School Filter */}
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              >
                <option value="all">All Schools ({availableSchools.length})</option>
                {availableSchools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="discrepancy">Discrepancy / Backlog Only</option>
                <option value="matched">100% Matched Only</option>
              </select>

              <button
                onClick={() => {
                  setSelectedDate('all');
                  setSelectedSchool('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 bg-[#161C27] hover:bg-[#202737] text-slate-300 rounded-lg border border-[#283244] text-xs transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Master Reconciliation Table */}
          <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1A202C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-white">
                  Date-Wise &amp; School-Wise Reconciliation Matrix
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({filteredMatrix.length} batches)
                </span>
              </div>

              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search school, course, teammate..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0E14] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#1A202C]">
                  <tr>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">SCHOOL / FACULTY</th>
                    <th className="py-3 px-4 text-right">PHYSICAL REC</th>
                    <th className="py-3 px-4 text-right">TEAM SCANNED</th>
                    <th className="py-3 px-4 text-right">PORTAL UPLOADED</th>
                    <th className="py-3 px-4 text-right">VARIANCE</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4">TEAMMATES INVOLVED</th>
                    <th className="py-3 px-4 text-right">EXAM SLOTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181E29]">
                  {filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-500 text-xs">
                        No reconciliation batches found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map((item) => {
                      const hasDiscrepancy = item.discrepancyScannedVsPortal !== 0;
                      return (
                        <tr
                          key={item.key}
                          onClick={() => setExpandedItem(item)}
                          className={`hover:bg-[#121620] cursor-pointer transition-colors ${
                            hasDiscrepancy ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-slate-200 px-1.5 py-0.5 rounded bg-[#161C27] border border-[#242C3D] text-[10px]">
                                {item.schoolCode}
                              </span>
                              <span
                                className="font-medium text-white truncate max-w-[220px]"
                                title={item.schoolName}
                              >
                                {item.schoolName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {item.teamReceived.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {item.teamScanned.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            {item.portalCompleted.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {item.discrepancyScannedVsPortal === 0 ? (
                              <span className="text-slate-500">0</span>
                            ) : item.discrepancyScannedVsPortal > 0 ? (
                              <span className="text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                                +{item.discrepancyScannedVsPortal}
                              </span>
                            ) : (
                              <span className="text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                {item.discrepancyScannedVsPortal}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                                item.status === 'matched'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : item.status === 'portal_backlog'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : item.status === 'portal_exceeds'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.status === 'matched'
                                ? '100% Synced'
                                : item.status === 'portal_backlog'
                                ? 'Portal Backlog'
                                : item.status === 'portal_exceeds'
                                ? 'Portal Exceeds'
                                : item.status === 'team_only'
                                ? 'Team Only'
                                : 'Portal Only'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.teammates.length === 0 ? (
                                <span className="text-slate-600 italic text-[10px]">None</span>
                              ) : (
                                item.teammates.map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.2 rounded bg-[#161C27] text-slate-300 text-[10px] font-mono border border-[#212836]"
                                  >
                                    {t}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {item.portalSlotsCount} slots
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEAMMATES PERFORMANCE & SUBSHEETS (Only shows relevant teammates data) */}
      {/* ========================================================================= */}
      {activeTab === 'teammates' && (
        <div className="space-y-6">
          {/* Dedicated Teammates Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <Users2 className="w-5 h-5 text-slate-300" />
                <span>Team Subsheets &amp; Operator Status</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Cards are generated for all teammate subsheets in your Google Sheet, even if entries
                are not yet logged.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onSyncGoogleSheet}
                disabled={isSyncing}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-white' : ''}`}
                />
                <span>{isSyncing ? 'Syncing...' : 'Sync Subsheets'}</span>
              </button>

              <button
                onClick={() => setActiveTab('data_sources')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D2434] hover:bg-[#283248] text-white text-xs font-semibold border border-[#313E57] shadow-sm transition-all"
              >
                <Link2 className="w-3.5 h-3.5 text-slate-300" />
                <span>Configure Sheet URL</span>
              </button>
            </div>
          </div>

          {/* Teammate Specific Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Connected Subsheets
                </span>
                <Users2 className="w-4 h-4 text-slate-300" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">{teammates.length}</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Discovered in Google Sheet workbook
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Active With Logged Data
                </span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {activeTeammatesCount}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Subsheets containing script rows
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Awaiting Data (Empty)
                </span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {emptyTeammatesCount}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Created subsheets with no rows yet
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Scripts Scanned
                </span>
                <UploadCloud className="w-4 h-4 text-slate-200" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {metrics.totalTeamScanned.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Cumulative across all teammates
              </span>
            </div>
          </div>

          {/* Teammates Search & Filter Bar */}
          <div className="bg-[#0E121A] rounded-xl border border-[#1E2430] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTeammateFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  teammateFilter === 'all'
                    ? 'bg-[#181E2B] text-white border border-[#273142]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Teammates ({teammates.length})
              </button>
              <button
                onClick={() => setTeammateFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  teammateFilter === 'active'
                    ? 'bg-[#181E2B] text-white border border-[#273142]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active with Logs ({activeTeammatesCount})
              </button>
              <button
                onClick={() => setTeammateFilter('empty')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  teammateFilter === 'empty'
                    ? 'bg-[#181E2B] text-white border border-[#273142]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Awaiting Data ({emptyTeammatesCount})
              </button>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={teammateSearch}
                onChange={(e) => setTeammateSearch(e.target.value)}
                placeholder="Search teammate name, school..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Cards Grid of All Teammates (Both with data AND empty ones!) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeammates.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-[#0E121A] rounded-2xl border border-[#1E2430]">
                No teammate subsheets match your search or filter.
              </div>
            ) : (
              filteredTeammates.map((tm) => {
                const isEmpty = tm.entriesCount === 0;
                const completion =
                  tm.totalReceived > 0 ? (tm.totalScanned / tm.totalReceived) * 100 : 0;
                const isExpanded = expandedTeammate === tm.name;
                return (
                  <div
                    key={tm.name}
                    className={`p-5 rounded-2xl border shadow-xl flex flex-col justify-between transition-all ${
                      isEmpty
                        ? 'bg-[#0B0E14] border-[#181E29]'
                        : 'bg-[#0E121A] border-[#1E2430]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                              isEmpty
                                ? 'bg-[#141822] border-[#222836] text-slate-500'
                                : 'bg-[#1A2230] border-[#28354A] text-white'
                            }`}
                          >
                            {tm.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white">{tm.name}</h3>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Subsheet Tab: {tm.name}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                            isEmpty
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : completion >= 98
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isEmpty ? 'Awaiting Data' : `${completion.toFixed(0)}% Scanned`}
                        </span>
                      </div>

                      {/* Counts Box */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#121620] border border-[#212836] text-[11px] font-mono mb-3">
                        <div>
                          <span className="text-slate-500 text-[9px] block uppercase">Received</span>
                          <span className="font-bold text-slate-200">{tm.totalReceived}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] block uppercase">Scanned</span>
                          <span className="font-bold text-emerald-400">{tm.totalScanned}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] block uppercase">Backlog</span>
                          <span
                            className={`font-bold ${
                              tm.totalReceived - tm.totalScanned > 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {tm.totalReceived - tm.totalScanned}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-1 mb-3">
                        <div>
                          <strong className="text-slate-300">Active Dates:</strong>{' '}
                          <span className="font-mono">
                            {tm.datesActive.length > 0 ? tm.datesActive.join(', ') : 'None logged yet'}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-300">Schools Handled:</strong>{' '}
                          <span className="font-mono">
                            {tm.schoolsCovered.length > 0
                              ? tm.schoolsCovered.join(', ')
                              : 'Awaiting intake'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isEmpty ? (
                      <div className="p-2.5 rounded-lg bg-[#121620] border border-[#1E2430] text-center text-[10px] text-slate-500 italic font-mono">
                        Subsheet exists in Google Sheet. Entries will appear when updated.
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setExpandedTeammate(isExpanded ? null : tm.name)}
                          className="w-full py-1.5 px-3 bg-[#161C27] hover:bg-[#202737] text-slate-300 rounded-lg border border-[#242C3D] text-[11px] font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <span>
                            {isExpanded
                              ? 'Hide Subsheet Rows'
                              : `View Subsheet Rows (${tm.entriesCount})`}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Expanded Subsheet Rows */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[#1E2430] space-y-2 max-h-56 overflow-y-auto pr-1">
                            {tm.entries.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-2 rounded-lg bg-[#121620] border border-[#1E2430] text-[11px]"
                              >
                                <div className="flex items-center justify-between font-mono mb-1">
                                  <span className="text-slate-300 font-semibold">{entry.date}</span>
                                  <span className="text-slate-400">{entry.schoolCode}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                                  <span>
                                    Rec: <strong className="text-white">{entry.receivedCount}</strong> |
                                    Scan:{' '}
                                    <strong className="text-emerald-400">{entry.scannedCount}</strong>
                                  </span>
                                  {entry.notes && (
                                    <span
                                      className="truncate max-w-[120px] text-slate-500"
                                      title={entry.notes}
                                    >
                                      {entry.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PORTAL EXAM SCHEDULES MASTER (Only shows relevant portal data) */}
      {/* ========================================================================= */}
      {activeTab === 'portal_exams' && (
        <div className="space-y-6">
          {/* Dedicated Portal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Central Portal Exam Schedules Master</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Extracted from your uploaded portal file ({portalSlots.length} exam slots). Script
                uploads are counted from the{' '}
                <code className="text-emerald-400 font-mono">Completed</code> column.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold border border-[#303D57] shadow-sm transition-all cursor-pointer">
                <UploadCloud className="w-3.5 h-3.5 text-slate-300" />
                <span>Upload New Portal File</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadPortalFile(f);
                  }}
                />
              </label>

              <button
                onClick={() => exportReconciliationToCSV(matrix, 'Portal_Exam_Master.csv')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Portal Specific Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Exam Slots Staged
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">{portalSlots.length}</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Individual slot schedules
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Completed Uploads
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {metrics.totalPortalCompleted.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Sum of &apos;Completed&apos; column
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Schools with Exams
                </span>
                <GraduationCap className="w-4 h-4 text-slate-300" />
              </div>
              <div className="text-2xl font-bold text-slate-200 font-mono">
                {metrics.totalSchoolsCount}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Faculties in schedule
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Examination Dates
                </span>
                <Calendar className="w-4 h-4 text-slate-300" />
              </div>
              <div className="text-2xl font-bold text-slate-200 font-mono">
                {metrics.totalDatesCount}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Unique exam days
              </span>
            </div>
          </div>

          {/* Portal Table */}
          <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1A202C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-white">
                  Portal Timetable &amp; Upload Status
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({portalSlots.length} records)
                </span>
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={portalSearch}
                  onChange={(e) => setPortalSearch(e.target.value)}
                  placeholder="Search course title, code, school, id..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0E14] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#1A202C] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">SCHED ID</th>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">SCHOOL</th>
                    <th className="py-3 px-4">COURSE CODE</th>
                    <th className="py-3 px-4">COURSE TITLE</th>
                    <th className="py-3 px-4">PROGRAMME</th>
                    <th className="py-3 px-4 text-right">COMPLETED</th>
                    <th className="py-3 px-4 text-right">NOT STARTED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181E29]">
                  {portalSlots
                    .filter((s) => {
                      if (!portalSearch.trim()) return true;
                      const q = portalSearch.toLowerCase();
                      return (
                        s.scheduleId.includes(q) ||
                        s.courseCode.toLowerCase().includes(q) ||
                        s.courseTitle.toLowerCase().includes(q) ||
                        s.schoolCode.toLowerCase().includes(q) ||
                        s.date.includes(q)
                      );
                    })
                    .map((s) => (
                      <tr key={s.scheduleId} className="hover:bg-[#121620] transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-400">{s.scheduleId}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">{s.date}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono font-bold text-slate-200 px-1.5 py-0.5 rounded bg-[#161C27] border border-[#242C3D] text-[10px]">
                            {s.schoolCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">{s.courseCode}</td>
                        <td
                          className="py-2.5 px-4 font-medium text-white max-w-xs truncate"
                          title={s.courseTitle}
                        >
                          {s.courseTitle}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">{s.programme}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                          {s.completed.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {s.notStarted}
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
      {/* TAB 4: DATA SOURCES & SYNC SETTINGS (Only shows configuration cards) */}
      {/* ========================================================================= */}
      {activeTab === 'data_sources' && (
        <div className="space-y-6">
          {/* Dedicated Data Sources Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <Link2 className="w-5 h-5 text-slate-300" />
                <span>Data Source Integrations &amp; Live Sync</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Configure your published Google Sheet URL and central portal Excel/CSV file.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onSyncGoogleSheet}
                disabled={isSyncing}
                className="py-1.5 px-3 rounded-lg bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold border border-[#303D57] transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Google Sheet Now'}</span>
              </button>
            </div>
          </div>

          {/* 2 Configuration Boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Google Sheet Publish to Web Configuration */}
            <div className="p-6 rounded-2xl bg-[#0E121A] border border-[#1E2430] shadow-xl space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-[#1A202C]">
                <Link2 className="w-4 h-4 text-slate-300" />
                <h2 className="text-sm font-semibold text-white">
                  Team Google Sheet (Publish to Web)
                </h2>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                In your Google Sheet containing subsheets for each teammate:
                <br />
                1. Click <strong className="text-white">File → Share → Publish to the web</strong>.
                <br />
                2. Select <strong className="text-white">Entire Document</strong> and choose{' '}
                <strong className="text-emerald-400 font-mono">Microsoft Excel (.xlsx)</strong> or
                Web page.
                <br />
                3. Click <strong className="text-white">Publish</strong> and paste the link below:
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Published Google Sheet URL
                </label>
                <input
                  type="url"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=xlsx"
                  className="w-full text-xs p-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white font-mono focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => {
                    onUpdateSheetUrl(sheetUrlInput);
                    onSyncGoogleSheet();
                  }}
                  disabled={isSyncing || !sheetUrlInput.trim()}
                  className="py-2 px-4 rounded-xl bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold border border-[#303D57] transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Connecting...' : 'Save & Sync Sheet'}</span>
                </button>

                <span className="text-[11px] text-slate-500">
                  Or upload the downloaded .xlsx directly below.
                </span>
              </div>

              <div className="pt-4 border-t border-[#1A202C]">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Google Sheet (.xlsx) Directly
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadTeamSheetFile(f);
                  }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1E2536] file:text-white hover:file:bg-[#283248] cursor-pointer"
                />
              </div>
            </div>

            {/* Box 2: Portal Excel Upload Configuration */}
            <div className="p-6 rounded-2xl bg-[#0E121A] border border-[#1E2430] shadow-xl space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-[#1A202C]">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Central Portal Uploads File</h2>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Upload the timetable &amp; upload status export from your central portal.
                <br />
                The system automatically parses the{' '}
                <strong className="text-emerald-400 font-mono">Completed</strong> column to count
                scripts uploaded per school and date.
              </p>

              <div className="p-5 rounded-xl bg-[#121620] border-2 border-dashed border-[#242C3D] text-center space-y-3">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-white">
                    Drop your Portal Excel / CSV here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Supports .xlsx, .xls, .csv</p>
                </div>

                <label className="inline-block py-1.5 px-4 rounded-xl bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold border border-[#303D57] transition-all cursor-pointer">
                  <span>Select File from Computer</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadPortalFile(f);
                    }}
                  />
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Current Staged Slots: <strong className="text-white">{portalSlots.length}</strong>
                </span>
                <button
                  onClick={onResetToDemoData}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono"
                >
                  Reload Default Reference File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Modal (When clicking any batch in the matrix) */}
      {expandedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0E121A] border border-[#212838] rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#1A202C]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#161C27] border border-[#283244] text-xs">
                    {expandedItem.schoolCode}
                  </span>
                  <h3 className="text-sm font-bold text-white">{expandedItem.schoolName}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Date: {expandedItem.date}</p>
              </div>
              <button
                onClick={() => setExpandedItem(null)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-[#181E2B]"
              >
                ✕ Close
              </button>
            </div>

            {/* Reconciliation Comparison Summary */}
            <div className="grid grid-cols-4 gap-3 text-xs font-mono p-3 rounded-xl bg-[#121620] border border-[#212836]">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Physical Received</span>
                <span className="font-bold text-slate-200">{expandedItem.teamReceived}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Team Scanned</span>
                <span className="font-bold text-white">{expandedItem.teamScanned}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Portal Uploaded</span>
                <span className="font-bold text-emerald-400">{expandedItem.portalCompleted}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Variance</span>
                <span
                  className={`font-bold ${
                    expandedItem.discrepancyScannedVsPortal !== 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {expandedItem.discrepancyScannedVsPortal > 0
                    ? `+${expandedItem.discrepancyScannedVsPortal} (Portal backlog)`
                    : expandedItem.discrepancyScannedVsPortal}
                </span>
              </div>
            </div>

            {/* Side-by-side breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left: Teammates Subsheet Entries */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider text-slate-400 flex items-center space-x-1">
                  <Users2 className="w-3.5 h-3.5" />
                  <span>Teammate Entries ({expandedItem.teamEntries.length})</span>
                </h4>
                {expandedItem.teamEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-[#121620] rounded-xl">
                    No entries logged in team sheet for this date and school.
                  </p>
                ) : (
                  expandedItem.teamEntries.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-xl bg-[#121620] border border-[#212836] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{e.teammateName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{e.shift}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                        <span>Rec: {e.receivedCount}</span>
                        <span className="text-emerald-400 font-bold">Scanned: {e.scannedCount}</span>
                      </div>
                      {e.notes && <p className="text-[10px] text-slate-500 italic">{e.notes}</p>}
                    </div>
                  ))
                )}
              </div>

              {/* Right: Portal Exam Slots */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider text-slate-400 flex items-center space-x-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Portal Exam Slots ({expandedItem.portalSlots.length})</span>
                </h4>
                {expandedItem.portalSlots.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-[#121620] rounded-xl">
                    No matching exams found in portal file for this date and school.
                  </p>
                ) : (
                  expandedItem.portalSlots.map((s) => (
                    <div
                      key={s.scheduleId}
                      className="p-3 rounded-xl bg-[#121620] border border-[#212836] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="truncate max-w-[200px]" title={s.courseTitle}>
                          {s.courseTitle}
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">
                          {s.completed} uploaded
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>
                          {s.courseCode} ({s.semester})
                        </span>
                        <span>Id: {s.scheduleId}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
