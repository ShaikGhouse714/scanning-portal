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
  Maximize2,
  ArrowUpDown,
  X,
  Building2,
  CalendarDays,
  FileCheck2,
} from 'lucide-react';
import { exportReconciliationToCSV, exportPortalSlotsToCSV } from '../lib/storage';
import { CustomDropdown, DropdownOption } from './CustomDropdown';
import { SCHOOL_CODE_MAP } from '../lib/mockData';

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

  // Portal Exams Search, Sorting, and Sector Filter
  const [portalSearch, setPortalSearch] = useState<string>('');
  const [portalSortBy, setPortalSortBy] = useState<
    'date_desc' | 'date_asc' | 'school_asc' | 'school_desc' | 'completed_desc' | 'completed_asc' | 'code_asc'
  >('date_desc');
  const [portalSectorFilter, setPortalSectorFilter] = useState<'all' | 'unscanned' | 'scanned'>('all');
  const [portalViewMode, setPortalViewMode] = useState<'table' | 'daywise' | 'schoolwise'>('table');

  // Drilldown modal
  const [expandedItem, setExpandedItem] = useState<ReconciledDateSchool | null>(null);

  // Large Teammate Expansion Modal & Sorting State
  const [selectedTeammateModal, setSelectedTeammateModal] = useState<TeammateSummary | null>(null);
  const [teammateSortBy, setTeammateSortBy] = useState<
    'date_desc' | 'date_asc' | 'school_asc' | 'school_desc' | 'scanned_desc' | 'received_desc'
  >('date_desc');
  const [teammateModalTab, setTeammateModalTab] = useState<'entries' | 'daywise' | 'schoolwise'>('entries');
  const [teammateModalSearch, setTeammateModalSearch] = useState<string>('');

  // Keep modal data reactive with latest synced data
  const activeModalTeammate = useMemo(() => {
    if (!selectedTeammateModal) return null;
    return teammates.find((t) => t.name === selectedTeammateModal.name) || selectedTeammateModal;
  }, [selectedTeammateModal, teammates]);

  // Sorted & Filtered entries for selected teammate
  const sortedTeammateEntries = useMemo(() => {
    if (!activeModalTeammate) return [];
    let list = [...activeModalTeammate.entries];

    if (teammateModalSearch.trim()) {
      const q = teammateModalSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.date.toLowerCase().includes(q) ||
          e.school.toLowerCase().includes(q) ||
          e.schoolCode.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    switch (teammateSortBy) {
      case 'date_desc':
        return list.sort((a, b) => b.date.localeCompare(a.date));
      case 'date_asc':
        return list.sort((a, b) => a.date.localeCompare(b.date));
      case 'school_asc':
        return list.sort((a, b) => (a.schoolCode || a.school).localeCompare(b.schoolCode || b.school));
      case 'school_desc':
        return list.sort((a, b) => (b.schoolCode || b.school).localeCompare(a.schoolCode || a.school));
      case 'scanned_desc':
        return list.sort((a, b) => b.scannedCount - a.scannedCount);
      case 'received_desc':
        return list.sort((a, b) => b.receivedCount - a.receivedCount);
      default:
        return list;
    }
  }, [activeModalTeammate, teammateSortBy, teammateModalSearch]);

  // Day-wise Aggregation for selected teammate
  const daywiseAggregation = useMemo(() => {
    if (!activeModalTeammate) return [];
    const map = new Map<
      string,
      { date: string; received: number; scanned: number; schools: Set<string>; count: number }
    >();
    for (const e of activeModalTeammate.entries) {
      const existing = map.get(e.date) || {
        date: e.date,
        received: 0,
        scanned: 0,
        schools: new Set<string>(),
        count: 0,
      };
      existing.received += e.receivedCount;
      existing.scanned += e.scannedCount;
      if (e.schoolCode || e.school) existing.schools.add(e.schoolCode || e.school);
      existing.count += 1;
      map.set(e.date, existing);
    }
    const list = Array.from(map.values()).map((item) => ({
      date: item.date,
      received: item.received,
      scanned: item.scanned,
      schools: Array.from(item.schools),
      batchesCount: item.count,
      backlog: item.received - item.scanned,
      completion: item.received > 0 ? (item.scanned / item.received) * 100 : 0,
    }));

    if (teammateSortBy === 'date_asc') {
      list.sort((a, b) => a.date.localeCompare(b.date));
    } else {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return list;
  }, [activeModalTeammate, teammateSortBy]);

  // School-wise Aggregation for selected teammate
  const schoolwiseAggregation = useMemo(() => {
    if (!activeModalTeammate) return [];
    const map = new Map<
      string,
      {
        schoolCode: string;
        schoolName: string;
        received: number;
        scanned: number;
        dates: Set<string>;
        count: number;
      }
    >();
    for (const e of activeModalTeammate.entries) {
      const code = e.schoolCode || e.school || 'UNKNOWN';
      const existing = map.get(code) || {
        schoolCode: code,
        schoolName: e.school || code,
        received: 0,
        scanned: 0,
        dates: new Set<string>(),
        count: 0,
      };
      existing.received += e.receivedCount;
      existing.scanned += e.scannedCount;
      if (e.date) existing.dates.add(e.date);
      existing.count += 1;
      map.set(code, existing);
    }
    const list = Array.from(map.values()).map((item) => ({
      schoolCode: item.schoolCode,
      schoolName: item.schoolName,
      received: item.received,
      scanned: item.scanned,
      dates: Array.from(item.dates),
      batchesCount: item.count,
      backlog: item.received - item.scanned,
      completion: item.received > 0 ? (item.scanned / item.received) * 100 : 0,
    }));

    if (teammateSortBy === 'school_desc') {
      list.sort((a, b) => b.schoolCode.localeCompare(a.schoolCode));
    } else {
      list.sort((a, b) => a.schoolCode.localeCompare(b.schoolCode));
    }
    return list;
  }, [activeModalTeammate, teammateSortBy]);

  // Sheet URL input state inside settings
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(googleSheetUrl);

  // Available dates and schools for matrix dropdowns
  const availableDates = useMemo(() => {
    return Array.from(new Set(matrix.map((m) => m.date))).sort().reverse();
  }, [matrix]);

  const availableSchools = useMemo(() => {
    return Array.from(new Set(matrix.map((m) => m.schoolCode))).sort();
  }, [matrix]);

  // Clean Options for Custom Dropdowns
  const dateOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: `All Dates (${availableDates.length})` },
    ...availableDates.map((d) => ({ value: d, label: d })),
  ], [availableDates]);

  const schoolOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: `All Schools (${availableSchools.length})` },
    ...availableSchools.map((s) => ({
      value: s,
      label: s,
      sublabel: SCHOOL_CODE_MAP[s] || undefined,
    })),
  ], [availableSchools]);

  const statusOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: 'All Statuses' },
    {
      value: 'discrepancy',
      label: 'Discrepancy / Backlog Only',
      badge: 'Backlog',
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    },
    {
      value: 'matched',
      label: '100% Synchronized Only',
      badge: 'All Clear',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
  ], []);

  const teammateSortOptions: DropdownOption[] = useMemo(() => [
    { value: 'date_desc', label: 'Daywise: Newest First' },
    { value: 'date_asc', label: 'Daywise: Oldest First' },
    { value: 'school_asc', label: 'School: A → Z' },
    { value: 'school_desc', label: 'School: Z → A' },
    { value: 'scanned_desc', label: 'Volume: Highest Scanned' },
    { value: 'received_desc', label: 'Volume: Highest Received' },
  ], []);

  // Portal Sorting Dropdown Options
  const portalSortOptions: DropdownOption[] = useMemo(() => [
    { value: 'date_desc', label: 'Day-wise: Newest First' },
    { value: 'date_asc', label: 'Day-wise: Oldest First' },
    { value: 'school_asc', label: 'School-wise: A → Z' },
    { value: 'school_desc', label: 'School-wise: Z → A' },
    { value: 'completed_asc', label: 'Completed: 0 First (Not Scanned)' },
    { value: 'completed_desc', label: 'Completed: Highest First' },
    { value: 'code_asc', label: 'Course Code: A → Z' },
  ], []);

  // Portal Slots with completed === 0 (Not scanned yet)
  const unscannedPortalSlots = useMemo(() => {
    return portalSlots.filter((s) => Number(s.completed) === 0);
  }, [portalSlots]);

  const scannedPortalSlots = useMemo(() => {
    return portalSlots.filter((s) => Number(s.completed) > 0);
  }, [portalSlots]);

  const unscannedTotalNotStarted = useMemo(() => {
    return unscannedPortalSlots.reduce((acc, s) => acc + (Number(s.notStarted) || 0), 0);
  }, [unscannedPortalSlots]);

  const unscannedSchoolsCount = useMemo(() => {
    return new Set(unscannedPortalSlots.map((s) => s.schoolCode)).size;
  }, [unscannedPortalSlots]);

  const unscannedDatesCount = useMemo(() => {
    return new Set(unscannedPortalSlots.map((s) => s.date)).size;
  }, [unscannedPortalSlots]);

  // Filtered and Sorted Portal Slots
  const filteredAndSortedPortalSlots = useMemo(() => {
    let list = [...portalSlots];

    // Filter by sector
    if (portalSectorFilter === 'unscanned') {
      list = list.filter((s) => Number(s.completed) === 0);
    } else if (portalSectorFilter === 'scanned') {
      list = list.filter((s) => Number(s.completed) > 0);
    }

    // Filter by search query
    if (portalSearch.trim()) {
      const q = portalSearch.toLowerCase();
      list = list.filter(
        (s) =>
          (s.scheduleId && s.scheduleId.toLowerCase().includes(q)) ||
          (s.courseCode && s.courseCode.toLowerCase().includes(q)) ||
          (s.courseTitle && s.courseTitle.toLowerCase().includes(q)) ||
          (s.schoolCode && s.schoolCode.toLowerCase().includes(q)) ||
          (s.schoolName && s.schoolName.toLowerCase().includes(q)) ||
          (s.date && s.date.includes(q)) ||
          (s.programme && s.programme.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (portalSortBy) {
      case 'date_desc':
        return list.sort(
          (a, b) =>
            (b.date || '').localeCompare(a.date || '') ||
            (a.schoolCode || '').localeCompare(b.schoolCode || '')
        );
      case 'date_asc':
        return list.sort(
          (a, b) =>
            (a.date || '').localeCompare(b.date || '') ||
            (a.schoolCode || '').localeCompare(b.schoolCode || '')
        );
      case 'school_asc':
        return list.sort(
          (a, b) =>
            (a.schoolCode || '').localeCompare(b.schoolCode || '') ||
            (b.date || '').localeCompare(a.date || '')
        );
      case 'school_desc':
        return list.sort(
          (a, b) =>
            (b.schoolCode || '').localeCompare(a.schoolCode || '') ||
            (b.date || '').localeCompare(a.date || '')
        );
      case 'completed_asc':
        return list.sort(
          (a, b) =>
            Number(a.completed) - Number(b.completed) ||
            (b.date || '').localeCompare(a.date || '')
        );
      case 'completed_desc':
        return list.sort(
          (a, b) =>
            Number(b.completed) - Number(a.completed) ||
            (b.date || '').localeCompare(a.date || '')
        );
      case 'code_asc':
        return list.sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
      default:
        return list;
    }
  }, [portalSlots, portalSectorFilter, portalSearch, portalSortBy]);

  // Day-wise Portal Aggregation
  const portalDaywiseAggregation = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        totalSlots: number;
        completed: number;
        notStarted: number;
        unscannedCount: number;
        schools: Set<string>;
      }
    >();

    for (const s of portalSlots) {
      const d = s.date || 'Unknown';
      const existing = map.get(d) || {
        date: d,
        totalSlots: 0,
        completed: 0,
        notStarted: 0,
        unscannedCount: 0,
        schools: new Set<string>(),
      };
      existing.totalSlots += 1;
      existing.completed += Number(s.completed) || 0;
      existing.notStarted += Number(s.notStarted) || 0;
      if (Number(s.completed) === 0) {
        existing.unscannedCount += 1;
      }
      if (s.schoolCode) existing.schools.add(s.schoolCode);
      map.set(d, existing);
    }

    const list = Array.from(map.values()).map((item) => ({
      date: item.date,
      totalSlots: item.totalSlots,
      completed: item.completed,
      notStarted: item.notStarted,
      unscannedCount: item.unscannedCount,
      schools: Array.from(item.schools),
    }));

    if (portalSortBy === 'date_asc') {
      list.sort((a, b) => a.date.localeCompare(b.date));
    } else {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return list;
  }, [portalSlots, portalSortBy]);

  // School-wise Portal Aggregation
  const portalSchoolwiseAggregation = useMemo(() => {
    const map = new Map<
      string,
      {
        schoolCode: string;
        schoolName: string;
        totalSlots: number;
        completed: number;
        notStarted: number;
        unscannedCount: number;
        dates: Set<string>;
      }
    >();

    for (const s of portalSlots) {
      const code = s.schoolCode || 'UNKNOWN';
      const existing = map.get(code) || {
        schoolCode: code,
        schoolName: s.schoolName || SCHOOL_CODE_MAP[code] || code,
        totalSlots: 0,
        completed: 0,
        notStarted: 0,
        unscannedCount: 0,
        dates: new Set<string>(),
      };
      existing.totalSlots += 1;
      existing.completed += Number(s.completed) || 0;
      existing.notStarted += Number(s.notStarted) || 0;
      if (Number(s.completed) === 0) {
        existing.unscannedCount += 1;
      }
      if (s.date) existing.dates.add(s.date);
      map.set(code, existing);
    }

    const list = Array.from(map.values()).map((item) => ({
      schoolCode: item.schoolCode,
      schoolName: item.schoolName,
      totalSlots: item.totalSlots,
      completed: item.completed,
      notStarted: item.notStarted,
      unscannedCount: item.unscannedCount,
      dates: Array.from(item.dates),
    }));

    if (portalSortBy === 'school_desc') {
      list.sort((a, b) => b.schoolCode.localeCompare(a.schoolCode));
    } else {
      list.sort((a, b) => a.schoolCode.localeCompare(b.schoolCode));
    }
    return list;
  }, [portalSlots, portalSortBy]);

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

          {/* Active Data Source Connections Banner */}
          <div className="bg-[#0C101C]/80 backdrop-blur-xl rounded-2xl border border-[#1A2234] p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#182030] mb-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                  Active Data Source Connections
                </span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                {teamEntries.length > 0 && portalSlots.length > 0
                  ? '2 / 2 connected'
                  : teamEntries.length > 0 || portalSlots.length > 0
                  ? '1 / 2 connected'
                  : '0 / 2 connected'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              {/* Card 1: Google Sheet */}
              <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-[#0F1626] to-[#0A0E18] border border-[#1E2638] hover:border-cyan-500/40 p-4 shadow-lg shadow-black/30 flex flex-col justify-between space-y-3 transition-all duration-200 hover:-translate-y-0.5">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        1. Team Google Sheet
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                        {teammates.length > 0
                          ? `${teammates.length} Subsheets (${teamEntries.length} logs)`
                          : 'No subsheet loaded'}
                      </span>
                    </div>
                  </div>
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#182030]">
                  <span
                    className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]"
                    title={lastSyncedTime}
                  >
                    {lastSyncedTime}
                  </span>
                  <button
                    onClick={onSyncGoogleSheet}
                    disabled={isSyncing}
                    className="text-xs px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-semibold border border-cyan-500/30 transition-all shadow-sm"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              </div>

              {/* Card 2: Portal Excel */}
              <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-[#0F1626] to-[#0A0E18] border border-[#1E2638] hover:border-emerald-500/40 p-4 shadow-lg shadow-black/30 flex flex-col justify-between space-y-3 transition-all duration-200 hover:-translate-y-0.5">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        2. Portal Excel / CSV
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                        {portalSlots.length > 0
                          ? `${portalSlots.length} Exam Slots (${metrics.totalPortalCompleted} Uploaded)`
                          : 'No portal file staged'}
                      </span>
                    </div>
                  </div>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#182030]">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    portalSlots.length > 0
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {portalSlots.length > 0 ? 'File active' : 'Awaiting file'}
                  </span>
                  <label className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/30 transition-all cursor-pointer shadow-sm">
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
              <div className={`relative group overflow-hidden rounded-2xl bg-gradient-to-b from-[#0F1626] to-[#0A0E18] border ${
                metrics.netDiscrepancy > 0 ? 'border-rose-500/30 hover:border-rose-500/50' : 'border-[#1E2638] hover:border-emerald-500/40'
              } p-4 shadow-lg shadow-black/30 flex flex-col justify-between space-y-3 transition-all duration-200 hover:-translate-y-0.5`}>
                <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${
                  metrics.netDiscrepancy > 0 ? 'via-rose-500/50' : 'via-emerald-500/50'
                } to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`w-9 h-9 rounded-xl ${
                      metrics.netDiscrepancy > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    } border flex items-center justify-center shrink-0 mt-0.5`}>
                      <AlertOctagon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        3. Matching Variance
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                        {metrics.netDiscrepancy === 0
                          ? '100% Synchronized'
                          : metrics.netDiscrepancy > 0
                          ? `${metrics.netDiscrepancy} pending in portal`
                          : `Portal exceeds by ${Math.abs(metrics.netDiscrepancy)}`}
                      </span>
                    </div>
                  </div>
                  <AlertOctagon className={`w-3.5 h-3.5 ${metrics.netDiscrepancy > 0 ? 'text-rose-400' : 'text-emerald-400'} shrink-0`} />
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#182030]">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    metrics.netDiscrepancy > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {metrics.netDiscrepancy > 0 ? 'Backlog Alert' : 'All Clear'}
                  </span>
                  <button
                    onClick={() => setStatusFilter(metrics.netDiscrepancy > 0 ? 'discrepancy' : 'all')}
                    className="text-xs text-slate-300 hover:text-white underline font-mono transition-colors"
                  >
                    Inspect
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

          {/* 4 Core Telemetry Cards (Enhanced Hardware-Telemetry Styling) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Total Physical Received */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-sky-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Physical Received
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {metrics.totalTeamReceived.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Across {teammates.length} teammate subsheets
                </span>
              </div>
            </div>

            {/* Tile 2: Total Scanned by Team */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-emerald-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Scanned by Team
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {metrics.totalTeamScanned.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Logged in Google Sheet subsheets
                </span>
              </div>
            </div>

            {/* Tile 3: Portal Uploaded */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-indigo-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Portal Uploaded (Completed)
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-indigo-200 font-mono tracking-tight">
                {metrics.totalPortalCompleted.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  From {portalSlots.length} portal exam slots
                </span>
              </div>
            </div>

            {/* Tile 4: Net Discrepancy */}
            <div className={`relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border ${
              metrics.netDiscrepancy > 0
                ? 'border-rose-500/40 hover:border-rose-500/60 bg-gradient-to-b from-rose-950/20 to-[#0A0E1A]'
                : 'border-[#1E273A] hover:border-emerald-500/40'
            } shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5`}>
              <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${
                metrics.netDiscrepancy > 0 ? 'via-rose-500' : 'via-emerald-500'
              } to-transparent opacity-50 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Net Discrepancy (Variance)
                </span>
                <div className={`w-8 h-8 rounded-xl ${
                  metrics.netDiscrepancy > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                } border flex items-center justify-center`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-3xl font-extrabold font-mono tracking-tight ${
                metrics.netDiscrepancy > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {metrics.netDiscrepancy > 0 ? `+${metrics.netDiscrepancy.toLocaleString()}` : metrics.netDiscrepancy.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className={`w-1.5 h-1.5 rounded-full ${metrics.netDiscrepancy > 0 ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-[10px] text-slate-400 font-mono">
                  {metrics.discrepancyBatchesCount} school batches flagged
                </span>
              </div>
            </div>
          </div>

          {/* Clean Dynamic Filters Bar with Custom Dropdowns */}
          <div className="bg-[#0C101C]/90 backdrop-blur-xl rounded-2xl border border-[#1A2234] p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#141A28] border border-[#222C42] flex items-center justify-center text-slate-300">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block leading-tight">Dynamic Filters</span>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                  {selectedDate !== 'all' || selectedSchool !== 'all' || statusFilter !== 'all'
                    ? 'Active Filters Applied'
                    : 'All Data Shown'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Clean Date Filter */}
              <CustomDropdown
                value={selectedDate}
                options={dateOptions}
                onChange={setSelectedDate}
                icon={Calendar}
                minMenuWidth="min-w-[190px]"
              />

              {/* Clean School Filter with Search */}
              <CustomDropdown
                value={selectedSchool}
                options={schoolOptions}
                onChange={setSelectedSchool}
                icon={GraduationCap}
                minMenuWidth="min-w-[270px]"
              />

              {/* Clean Status Filter */}
              <CustomDropdown
                value={statusFilter}
                options={statusOptions}
                onChange={(val) => setStatusFilter(val as any)}
                icon={AlertOctagon}
                minMenuWidth="min-w-[210px]"
              />

              {(selectedDate !== 'all' || selectedSchool !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
                <button
                  onClick={() => {
                    setSelectedDate('all');
                    setSelectedSchool('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 bg-[#141B2B] hover:bg-[#1E283C] text-slate-300 hover:text-white rounded-xl border border-[#253248] text-xs font-medium transition-colors"
                >
                  Reset Filters
                </button>
              )}
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
                        {teamEntries.length === 0 && portalSlots.length === 0
                          ? 'No data loaded yet. Connect your Google Sheet or upload the Central Portal Excel in Data Sources & Live Sync to begin reconciliation.'
                          : 'No reconciliation batches found matching your filter criteria.'}
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
            {/* Tile 1: Total Connected Subsheets */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-cyan-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Connected Subsheets
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Users2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">{teammates.length}</div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Discovered in Google Sheet workbook
                </span>
              </div>
            </div>

            {/* Tile 2: Active With Logged Data */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-emerald-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Active With Logged Data
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {activeTeammatesCount}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Subsheets containing script rows
                </span>
              </div>
            </div>

            {/* Tile 3: Awaiting Data (Empty) */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-amber-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Awaiting Data (Empty)
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                {emptyTeammatesCount}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Created subsheets with no rows yet
                </span>
              </div>
            </div>

            {/* Tile 4: Total Scripts Scanned */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-indigo-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Scripts Scanned
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {metrics.totalTeamScanned.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Cumulative across all teammates
                </span>
              </div>
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
                {teammates.length === 0
                  ? 'No teammate subsheets detected yet. Connect your Google Sheet or upload the workbook in Data Sources & Live Sync.'
                  : 'No teammate subsheets match your search or filter.'}
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
                    onClick={() => setSelectedTeammateModal(tm)}
                    className={`p-5 rounded-2xl border shadow-xl flex flex-col justify-between transition-all cursor-pointer group hover:border-cyan-500/50 hover:bg-[#10141F] hover:shadow-cyan-500/5 ${
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
                      <div className="p-2.5 rounded-lg bg-[#121620] border border-[#1E2430] text-[10px] text-slate-500 italic font-mono flex items-center justify-between">
                        <span>Awaiting Google Sheet rows</span>
                        <span className="text-cyan-400 font-sans not-italic text-[10px] flex items-center space-x-1">
                          <span>Inspect</span>
                          <Maximize2 className="w-3 h-3" />
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeammateModal(tm);
                          }}
                          className="w-full py-2 px-3 bg-[#161C27] hover:bg-[#202737] group-hover:border-cyan-500/40 text-slate-200 group-hover:text-cyan-300 rounded-xl border border-[#242C3D] text-[11px] font-semibold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Expand Full Sheet & Sort ({tm.entriesCount} rows)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PORTAL EXAM SCHEDULES MASTER (With Sorting, Grouping & Not Scanned Sector) */}
      {/* ========================================================================= */}
      {activeTab === 'portal_exams' && (
        <div className="space-y-6">
          {/* Dedicated Portal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Post Exam Schedules &amp; Portal Master</span>
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
                onClick={() =>
                  exportPortalSlotsToCSV(
                    filteredAndSortedPortalSlots,
                    portalSectorFilter === 'unscanned'
                      ? 'Portal_Not_Scanned_Yet.csv'
                      : 'Portal_Exam_Schedules.csv'
                  )
                }
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Portal Specific Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Total Exam Slots Staged */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-cyan-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Exam Slots
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {portalSlots.length}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Schedules in uploaded portal file
                </span>
              </div>
            </div>

            {/* Tile 2: Total Completed Uploads */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-emerald-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Completed Uploads
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {metrics.totalPortalCompleted.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Across {scannedPortalSlots.length} scanned exam slots
                </span>
              </div>
            </div>

            {/* Tile 3: NOT SCANNED YET (Special Place/Sector Highlight) */}
            <div
              onClick={() =>
                setPortalSectorFilter(portalSectorFilter === 'unscanned' ? 'all' : 'unscanned')
              }
              className={`relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-xl shadow-black/30 ${
                unscannedPortalSlots.length > 0
                  ? 'border-amber-500/40 hover:border-amber-500/70 hover:bg-amber-950/10'
                  : 'border-[#1E273A] hover:border-emerald-500/40'
              }`}
            >
              <div
                className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${
                  unscannedPortalSlots.length > 0 ? 'via-amber-500' : 'via-emerald-500'
                } to-transparent opacity-60 group-hover:opacity-100 transition-opacity`}
              />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                  <span>Not scanned yet</span>
                  {unscannedPortalSlots.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </span>
                <div
                  className={`w-8 h-8 rounded-xl ${
                    unscannedPortalSlots.length > 0
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  } border flex items-center justify-center`}
                >
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                {unscannedPortalSlots.length}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    unscannedPortalSlots.length > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[10px] text-slate-400 font-mono">
                  {unscannedPortalSlots.length > 0
                    ? `${unscannedTotalNotStarted.toLocaleString()} scripts with 0 completed (click to filter)`
                    : 'All exams have scanned scripts'}
                </span>
              </div>
            </div>

            {/* Tile 4: Examination Dates & Schools */}
            <div className="relative group overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#0F1628] to-[#0A0E1A] border border-[#1E273A] hover:border-indigo-500/40 shadow-xl shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Schools &amp; Dates
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-indigo-200 font-mono tracking-tight">
                {metrics.totalSchoolsCount}
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Schools across {metrics.totalDatesCount} exam days
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* SPECIAL SECTOR: "NOT SCANNED YET" (Featured place for completed == 0) */}
          {/* ======================================================================= */}
          {unscannedPortalSlots.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-[#0B0F1C] to-[#080B14] p-5 shadow-2xl shadow-black/40 space-y-4">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222B3D]">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                        Not Scanned Yet
                      </h2>
                      <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>{unscannedPortalSlots.length} Batches with 0 Uploads</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      The portal export shows <code className="text-amber-300 font-mono font-bold">Completed: 0</code> for these exams.
                      They represent batches awaiting physical script intake and scanning.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() =>
                      setPortalSectorFilter(portalSectorFilter === 'unscanned' ? 'all' : 'unscanned')
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                      portalSectorFilter === 'unscanned'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-[#151C2C] hover:bg-[#1E273C] text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span>{portalSectorFilter === 'unscanned' ? '✓ Showing Only Not Scanned' : 'Filter Sector Table'}</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Micro-Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#0F1524] border border-[#1E283C]">
                  <span className="text-[10px] text-slate-400 block uppercase">Unscanned Exam Batches</span>
                  <span className="text-lg font-bold text-amber-400">{unscannedPortalSlots.length}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Slots with 0 completed</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0F1524] border border-[#1E283C]">
                  <span className="text-[10px] text-slate-400 block uppercase">Candidate Scripts Pending</span>
                  <span className="text-lg font-bold text-white">{unscannedTotalNotStarted.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Registered candidates</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0F1524] border border-[#1E283C]">
                  <span className="text-[10px] text-slate-400 block uppercase">Affected Schools</span>
                  <span className="text-lg font-bold text-slate-200">{unscannedSchoolsCount}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Faculties awaiting scans</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0F1524] border border-[#1E283C]">
                  <span className="text-[10px] text-slate-400 block uppercase">Affected Dates</span>
                  <span className="text-lg font-bold text-slate-200">{unscannedDatesCount}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Exam sessions impacted</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls Toolbar: Sector Filter, Day/School-wise Grouping, Custom Sorting, Search */}
          <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            {/* Left: Sector and View Mode Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sector Filter Tabs */}
              <div className="flex items-center space-x-1 bg-[#121620] p-1 rounded-xl border border-[#212836] text-xs">
                <button
                  onClick={() => setPortalSectorFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    portalSectorFilter === 'all'
                      ? 'bg-[#1D2536] text-white border border-[#303D56] shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({portalSlots.length})
                </button>
                <button
                  onClick={() => setPortalSectorFilter('unscanned')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                    portalSectorFilter === 'unscanned'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Not Scanned Yet ({unscannedPortalSlots.length})</span>
                </button>
                <button
                  onClick={() => setPortalSectorFilter('scanned')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                    portalSectorFilter === 'scanned'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Scanned ({scannedPortalSlots.length})</span>
                </button>
              </div>

              {/* View Mode: Table vs Day-wise Grouping vs School-wise Grouping */}
              <div className="flex items-center space-x-1 bg-[#121620] p-1 rounded-xl border border-[#212836] text-xs">
                <button
                  onClick={() => setPortalViewMode('table')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    portalViewMode === 'table'
                      ? 'bg-[#1D2536] text-white border border-[#303D56]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Detailed Slot-by-Slot Table"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  onClick={() => setPortalViewMode('daywise')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    portalViewMode === 'daywise'
                      ? 'bg-[#1D2536] text-white border border-[#303D56]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Group schedules by Date"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Day-wise Grouping</span>
                </button>
                <button
                  onClick={() => setPortalViewMode('schoolwise')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    portalViewMode === 'schoolwise'
                      ? 'bg-[#1D2536] text-white border border-[#303D56]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Group schedules by School"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>School-wise Grouping</span>
                </button>
              </div>
            </div>

            {/* Right: Custom Sorting Dropdown & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <CustomDropdown
                value={portalSortBy}
                options={portalSortOptions}
                onChange={(val) => setPortalSortBy(val as any)}
                icon={ArrowUpDown}
                minMenuWidth="min-w-[240px]"
              />

              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={portalSearch}
                  onChange={(e) => setPortalSearch(e.target.value)}
                  placeholder="Search course, school, date..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                {portalSearch && (
                  <button
                    onClick={() => setPortalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* VIEW 1: DETAILED TABLE */}
          {portalViewMode === 'table' && (
            <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#1A202C] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">
                    {portalSectorFilter === 'unscanned'
                      ? 'Sector: Not Scanned Yet (Completed: 0)'
                      : portalSectorFilter === 'scanned'
                      ? 'Sector: Scanned / Completed Exams'
                      : 'Central Portal Timetable & Upload Status'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({filteredAndSortedPortalSlots.length} records shown)
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
                  Click column headers (Date / School / Completed) to sort instantly
                </div>
              </div>

              <div className="overflow-x-auto max-h-[640px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0E14] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#1A202C] sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">SCHED ID</th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-cyan-300 transition-colors"
                        onClick={() =>
                          setPortalSortBy(portalSortBy === 'date_desc' ? 'date_asc' : 'date_desc')
                        }
                      >
                        <div className="flex items-center space-x-1">
                          <span>DATE</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-cyan-300 transition-colors"
                        onClick={() =>
                          setPortalSortBy(
                            portalSortBy === 'school_asc' ? 'school_desc' : 'school_asc'
                          )
                        }
                      >
                        <div className="flex items-center space-x-1">
                          <span>SCHOOL</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-cyan-300 transition-colors"
                        onClick={() => setPortalSortBy('code_asc')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>COURSE CODE</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4">COURSE TITLE</th>
                      <th className="py-3 px-4">PROGRAMME</th>
                      <th
                        className="py-3 px-4 text-right cursor-pointer hover:text-cyan-300 transition-colors"
                        onClick={() =>
                          setPortalSortBy(
                            portalSortBy === 'completed_asc' ? 'completed_desc' : 'completed_asc'
                          )
                        }
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>COMPLETED</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">NOT STARTED</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181E29]">
                    {filteredAndSortedPortalSlots.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-slate-500 text-xs">
                          {portalSlots.length === 0
                            ? 'No portal exam records uploaded yet. Upload your central portal Excel file in Data Sources & Live Sync.'
                            : 'No records match your selected filter or search.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedPortalSlots.map((s) => {
                        const isZero = Number(s.completed) === 0;
                        return (
                          <tr
                            key={s.scheduleId}
                            className={`hover:bg-[#121620] transition-colors ${
                              isZero ? 'bg-amber-950/10' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono text-slate-400">
                              {s.scheduleId}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-300 font-semibold whitespace-nowrap">
                              {s.date}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="font-mono font-bold text-slate-200 px-1.5 py-0.5 rounded bg-[#161C27] border border-[#242C3D] text-[10px]">
                                {s.schoolCode}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-300 font-semibold">
                              {s.courseCode}
                            </td>
                            <td
                              className="py-2.5 px-4 font-medium text-white max-w-xs truncate"
                              title={s.courseTitle}
                            >
                              {s.courseTitle}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[140px]">
                              {s.programme}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold">
                              {isZero ? (
                                <span className="text-amber-400">0</span>
                              ) : (
                                <span className="text-emerald-400">
                                  {s.completed.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                              {s.notStarted}
                            </td>
                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                              {isZero ? (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                                  Not scanned yet
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Completed ({s.completed})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: DAY-WISE BREAKDOWN */}
          {portalViewMode === 'daywise' && (
            <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#1A202C] flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  Day-Wise Central Portal Schedules Summary ({portalDaywiseAggregation.length} Exam Days)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Aggregated across all scheduled slots
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0B0E14] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#1A202C]">
                    <tr>
                      <th className="py-3 px-4 font-sans">EXAMINATION DATE</th>
                      <th className="py-3 px-4 text-right">TOTAL SLOTS</th>
                      <th className="py-3 px-4 text-right">COMPLETED UPLOADS</th>
                      <th className="py-3 px-4 text-right">NOT SCANNED YET</th>
                      <th className="py-3 px-4 text-right">PENDING CANDIDATES</th>
                      <th className="py-3 px-4 font-sans">SCHOOLS INVOLVED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181E29] text-[11px]">
                    {portalDaywiseAggregation.map((day) => (
                      <tr key={day.date} className="hover:bg-[#121620] transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{day.date}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 font-bold">
                          {day.totalSlots} slots
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {day.completed.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {day.unscannedCount > 0 ? (
                            <span className="text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                              {day.unscannedCount} unscanned
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {day.notStarted.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="flex flex-wrap gap-1">
                            {day.schools.map((sch) => (
                              <span
                                key={sch}
                                className="px-1.5 py-0.5 rounded bg-[#161C27] border border-[#283244] text-[10px] text-slate-300 font-mono"
                              >
                                {sch}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: SCHOOL-WISE BREAKDOWN */}
          {portalViewMode === 'schoolwise' && (
            <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#1A202C] flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  School-Wise Central Portal Schedules Summary ({portalSchoolwiseAggregation.length} Schools / Faculties)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Aggregated across all scheduled slots
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0E14] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#1A202C]">
                    <tr>
                      <th className="py-3 px-4">SCHOOL CODE</th>
                      <th className="py-3 px-4">FACULTY NAME</th>
                      <th className="py-3 px-4 text-right">TOTAL SLOTS</th>
                      <th className="py-3 px-4 text-right">COMPLETED UPLOADS</th>
                      <th className="py-3 px-4 text-right">NOT SCANNED YET</th>
                      <th className="py-3 px-4 text-right">PENDING SCRIPTS</th>
                      <th className="py-3 px-4">EXAM DATES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181E29] text-[11px] font-mono">
                    {portalSchoolwiseAggregation.map((sch) => (
                      <tr key={sch.schoolCode} className="hover:bg-[#121620] transition-colors">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-[#161C27] border border-[#283244] text-white font-bold text-[11px]">
                            {sch.schoolCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans font-medium">
                          {sch.schoolName}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 font-bold">
                          {sch.totalSlots} slots
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {sch.completed.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {sch.unscannedCount > 0 ? (
                            <span className="text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                              {sch.unscannedCount} unscanned
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {sch.notStarted.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="flex flex-wrap gap-1">
                            {sch.dates.map((d) => (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 rounded bg-[#161C27] border border-[#283244] text-[10px] text-slate-300 font-mono"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                {portalSlots.length > 0 && onResetToDemoData && (
                  <button
                    onClick={onResetToDemoData}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline font-mono"
                  >
                    Clear Staged Data
                  </button>
                )}
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

      {/* Large Teammate Subsheet & Sorting Modal */}
      {activeModalTeammate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedTeammateModal(null)}
        >
          <div
            className="bg-[#0C0F17] border border-[#232B3A] rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1A202C] flex items-center justify-between shrink-0 bg-[#0E121C]">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-white shadow-lg text-sm">
                  {activeModalTeammate.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {activeModalTeammate.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                      Subsheet: {activeModalTeammate.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                        activeModalTeammate.entriesCount === 0
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : activeModalTeammate.totalReceived > 0 &&
                            activeModalTeammate.totalScanned >= activeModalTeammate.totalReceived
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {activeModalTeammate.entriesCount === 0
                        ? 'Awaiting Google Sheet Rows'
                        : activeModalTeammate.totalReceived > 0 &&
                          activeModalTeammate.totalScanned >= activeModalTeammate.totalReceived
                        ? '100% Reconciled'
                        : `${(
                            (activeModalTeammate.totalScanned /
                              Math.max(1, activeModalTeammate.totalReceived)) *
                            100
                          ).toFixed(0)}% Scanned`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {activeModalTeammate.entriesCount} logged entries across{' '}
                    {activeModalTeammate.datesActive.length} dates and{' '}
                    {activeModalTeammate.schoolsCovered.length} schools
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeammateModal(null)}
                className="w-8 h-8 rounded-lg bg-[#141824] hover:bg-[#1E2436] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Close Modal (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#090C12] border-b border-[#1A202C] text-xs font-mono shrink-0">
              <div className="p-3 rounded-xl bg-[#10141E] border border-[#1C2331]">
                <span className="text-slate-500 text-[10px] uppercase block">Physical Received</span>
                <span className="text-lg font-bold text-slate-100">
                  {activeModalTeammate.totalReceived.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Scripts handed over</span>
              </div>

              <div className="p-3 rounded-xl bg-[#10141E] border border-[#1C2331]">
                <span className="text-slate-500 text-[10px] uppercase block">Scanned by Teammate</span>
                <span className="text-lg font-bold text-emerald-400">
                  {activeModalTeammate.totalScanned.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-500/80 block mt-0.5">Digitized to portal</span>
              </div>

              <div className="p-3 rounded-xl bg-[#10141E] border border-[#1C2331]">
                <span className="text-slate-500 text-[10px] uppercase block">Pending Backlog</span>
                <span
                  className={`text-lg font-bold ${
                    activeModalTeammate.totalReceived - activeModalTeammate.totalScanned > 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {(
                    activeModalTeammate.totalReceived - activeModalTeammate.totalScanned
                  ).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Scripts remaining</span>
              </div>

              <div className="p-3 rounded-xl bg-[#10141E] border border-[#1C2331]">
                <span className="text-slate-500 text-[10px] uppercase block">Completion Rate</span>
                <span className="text-lg font-bold text-cyan-400">
                  {activeModalTeammate.totalReceived > 0
                    ? `${(
                        (activeModalTeammate.totalScanned / activeModalTeammate.totalReceived) *
                        100
                      ).toFixed(1)}%`
                    : '0%'}
                </span>
                <div className="w-full bg-[#181E2B] h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        activeModalTeammate.totalReceived > 0
                          ? (activeModalTeammate.totalScanned / activeModalTeammate.totalReceived) *
                              100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Controls Toolbar: Tabs, Sorting by Daywise / School, Search */}
            <div className="p-4 border-b border-[#1A202C] bg-[#0E121C] flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* View Tabs */}
              <div className="flex items-center space-x-1 bg-[#121622] p-1 rounded-xl border border-[#1F2636]">
                <button
                  onClick={() => setTeammateModalTab('entries')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    teammateModalTab === 'entries'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>All Subsheet Rows ({sortedTeammateEntries.length})</span>
                </button>

                <button
                  onClick={() => setTeammateModalTab('daywise')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    teammateModalTab === 'daywise'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Day-wise Breakdown ({daywiseAggregation.length})</span>
                </button>

                <button
                  onClick={() => setTeammateModalTab('schoolwise')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    teammateModalTab === 'schoolwise'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>School-wise Breakdown ({schoolwiseAggregation.length})</span>
                </button>
              </div>

              {/* Sort Selector & Search Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Clean Custom Sort Dropdown */}
                <CustomDropdown
                  value={teammateSortBy}
                  options={teammateSortOptions}
                  onChange={(val) => setTeammateSortBy(val as any)}
                  icon={ArrowUpDown}
                  minMenuWidth="min-w-[210px]"
                />

                {/* Filter Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={teammateModalSearch}
                    onChange={(e) => setTeammateModalSearch(e.target.value)}
                    placeholder="Search date, school..."
                    className="pl-8 pr-3 py-1.5 bg-[#121622] border border-[#1F2636] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-44"
                  />
                  {teammateModalSearch && (
                    <button
                      onClick={() => setTeammateModalSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeModalTeammate.entriesCount === 0 ? (
                <div className="py-16 text-center space-y-3 bg-[#090C12] rounded-2xl border border-[#1A202C] p-8">
                  <div className="w-12 h-12 rounded-2xl bg-[#141824] border border-[#232936] flex items-center justify-center mx-auto text-slate-400">
                    <Clock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Subsheet Connected & Awaiting Logs</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      The sheet tab <span className="font-mono text-cyan-300">"{activeModalTeammate.name}"</span> is actively tracked from your Google Sheet.
                      Once this teammate fills rows with Date, School, Received, and Scanned count, click
                      <span className="text-white font-semibold"> "Sync Sheet Data"</span> to view daywise & school logs here.
                    </p>
                  </div>
                </div>
              ) : teammateModalTab === 'entries' ? (
                /* TAB 1: ALL ROWS */
                <div className="border border-[#1E2430] rounded-xl overflow-hidden bg-[#0A0D14]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#121622] text-[10px] uppercase font-mono text-slate-400 border-b border-[#1E2430]">
                      <tr>
                        <th className="p-3">#</th>
                        <th
                          className="p-3 cursor-pointer hover:text-cyan-300"
                          onClick={() =>
                            setTeammateSortBy(
                              teammateSortBy === 'date_desc' ? 'date_asc' : 'date_desc'
                            )
                          }
                        >
                          <div className="flex items-center space-x-1">
                            <span>Date</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th
                          className="p-3 cursor-pointer hover:text-cyan-300"
                          onClick={() =>
                            setTeammateSortBy(
                              teammateSortBy === 'school_asc' ? 'school_desc' : 'school_asc'
                            )
                          }
                        >
                          <div className="flex items-center space-x-1">
                            <span>School</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="p-3 text-right">Physical Received</th>
                        <th className="p-3 text-right">Scanned Count</th>
                        <th className="p-3 text-right">Pending Backlog</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Shift / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#161B26] font-mono text-[11px]">
                      {sortedTeammateEntries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            No rows match your search filter.
                          </td>
                        </tr>
                      ) : (
                        sortedTeammateEntries.map((entry, idx) => {
                          const backlog = entry.receivedCount - entry.scannedCount;
                          return (
                            <tr
                              key={entry.id || idx}
                              className="hover:bg-[#121622]/60 transition-colors"
                            >
                              <td className="p-3 text-slate-500 text-[10px]">{idx + 1}</td>
                              <td className="p-3 text-slate-200 font-semibold">{entry.date}</td>
                              <td className="p-3">
                                <span className="px-1.5 py-0.5 rounded bg-[#161C27] border border-[#283244] text-white font-bold text-[10px] mr-1.5">
                                  {entry.schoolCode || entry.school}
                                </span>
                                {entry.school && entry.school !== entry.schoolCode && (
                                  <span className="text-slate-400 text-[10px] font-sans truncate max-w-[150px] inline-block align-middle">
                                    {entry.school}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right text-slate-200">{entry.receivedCount}</td>
                              <td className="p-3 text-right font-bold text-emerald-400">
                                {entry.scannedCount}
                              </td>
                              <td className="p-3 text-right">
                                <span
                                  className={
                                    backlog > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'
                                  }
                                >
                                  {backlog > 0 ? `+${backlog}` : backlog}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded ${
                                    backlog <= 0
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {backlog <= 0 ? 'Matched' : 'In Backlog'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 text-[10px] font-sans">
                                {entry.shift && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#1A202C] rounded mr-1">
                                    {entry.shift}
                                  </span>
                                )}
                                <span>{entry.notes || '-'}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : teammateModalTab === 'daywise' ? (
                /* TAB 2: DAY-WISE BREAKDOWN */
                <div className="space-y-3">
                  <div className="border border-[#1E2430] rounded-xl overflow-hidden bg-[#0A0D14]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#121622] text-[10px] uppercase font-mono text-slate-400 border-b border-[#1E2430]">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3 text-right">Total Received</th>
                          <th className="p-3 text-right">Total Scanned</th>
                          <th className="p-3 text-right">Day Backlog</th>
                          <th className="p-3 text-right">Completion Rate</th>
                          <th className="p-3">Schools Handled on Date</th>
                          <th className="p-3 text-right">Batches</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#161B26] font-mono text-[11px]">
                        {daywiseAggregation.map((day) => (
                          <tr key={day.date} className="hover:bg-[#121622]/60 transition-colors">
                            <td className="p-3 text-white font-bold flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span>{day.date}</span>
                            </td>
                            <td className="p-3 text-right text-slate-200">
                              {day.received.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400">
                              {day.scanned.toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={
                                  day.backlog > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'
                                }
                              >
                                {day.backlog > 0 ? `+${day.backlog}` : day.backlog}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  day.completion >= 100
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {day.completion.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {day.schools.map((sch) => (
                                  <span
                                    key={sch}
                                    className="px-1.5 py-0.5 rounded bg-[#161C27] border border-[#283244] text-[10px] text-slate-300"
                                  >
                                    {sch}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-right text-slate-400">{day.batchesCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* TAB 3: SCHOOL-WISE BREAKDOWN */
                <div className="space-y-3">
                  <div className="border border-[#1E2430] rounded-xl overflow-hidden bg-[#0A0D14]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#121622] text-[10px] uppercase font-mono text-slate-400 border-b border-[#1E2430]">
                        <tr>
                          <th className="p-3">School Code</th>
                          <th className="p-3">School Name</th>
                          <th className="p-3 text-right">Total Received</th>
                          <th className="p-3 text-right">Total Scanned</th>
                          <th className="p-3 text-right">School Backlog</th>
                          <th className="p-3 text-right">Completion Rate</th>
                          <th className="p-3">Dates Active</th>
                          <th className="p-3 text-right">Batches</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#161B26] font-mono text-[11px]">
                        {schoolwiseAggregation.map((sch) => (
                          <tr key={sch.schoolCode} className="hover:bg-[#121622]/60 transition-colors">
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-[#161C27] border border-[#283244] text-white font-bold text-[11px]">
                                {sch.schoolCode}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 font-sans">{sch.schoolName}</td>
                            <td className="p-3 text-right text-slate-200">
                              {sch.received.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400">
                              {sch.scanned.toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={
                                  sch.backlog > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'
                                }
                              >
                                {sch.backlog > 0 ? `+${sch.backlog}` : sch.backlog}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  sch.completion >= 100
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {sch.completion.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {sch.dates.map((d) => (
                                  <span
                                    key={d}
                                    className="px-1.5 py-0.5 rounded bg-[#161C27] border border-[#283244] text-[10px] text-slate-300"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-right text-slate-400">{sch.batchesCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1A202C] bg-[#0E121C] flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Google Sheet Subsheet Synchronizer</span>
              </div>
              <button
                onClick={() => setSelectedTeammateModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#181E2B] hover:bg-[#222B3D] text-white border border-[#2A3447] text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
