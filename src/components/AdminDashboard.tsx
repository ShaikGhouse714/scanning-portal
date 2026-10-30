'use client';

import React, { useState, useMemo } from 'react';
import { DailyRecord, User, DepartmentMetrics } from '../types';
import { AVAILABLE_SCHOOLS } from '../lib/mockData';
import {
  FileText,
  RotateCw,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Download,
  Eye,
  Trash2,
  Search,
  PlusCircle,
  AlertOctagon,
  TrendingUp,
  UploadCloud,
  Building2,
  LayoutDashboard,
  ClipboardList,
} from 'lucide-react';
import { calculateMetrics, exportRecordsToCSV } from '../lib/storage';

interface AdminDashboardProps {
  records: DailyRecord[];
  users: User[];
  onOpenUserModal: () => void;
  onEditRecord: (record: DailyRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecord: () => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  records,
  users,
  onOpenUserModal,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onRefresh,
  isSyncing = false,
  activeTab = 'dashboard',
  setActiveTab,
}) => {
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');

  const currentTab = activeTab || 'dashboard';
  const handleTabChange = (tab: string) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  // Filter records for Audit Table & Metrics
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedOperator !== 'all' && r.userId !== selectedOperator) return false;
      if (selectedSchool !== 'all' && r.school !== selectedSchool) return false;
      if (statusFilter === 'pending' && r.pendingCount <= 0) return false;
      if (statusFilter === 'completed' && r.pendingCount > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.userName.toLowerCase().includes(q);
        const matchStation = r.station.toLowerCase().includes(q);
        const matchSchool = (r.school || '').toLowerCase().includes(q);
        const matchNotes = (r.notes || '').toLowerCase().includes(q);
        const matchDate = r.date.includes(q);
        if (!matchName && !matchStation && !matchSchool && !matchNotes && !matchDate) return false;
      }

      return true;
    });
  }, [records, selectedOperator, selectedSchool, statusFilter, searchQuery]);

  const metrics: DepartmentMetrics = useMemo(() => {
    return calculateMetrics(filteredRecords);
  }, [filteredRecords]);

  // 22 School breakdown data
  const schoolBreakdown = useMemo(() => {
    return AVAILABLE_SCHOOLS.map((schoolName) => {
      const schoolRecs = records.filter((r) => r.school === schoolName);
      const totalRec = schoolRecs.reduce((sum, r) => sum + r.receivedCount, 0);
      const totalUp = schoolRecs.reduce((sum, r) => sum + r.uploadedCount, 0);
      const pending = schoolRecs.reduce((sum, r) => sum + Math.max(0, r.pendingCount), 0);
      const rate = totalRec > 0 ? (totalUp / totalRec) * 100 : 100;

      return {
        name: schoolName,
        totalRec,
        totalUp,
        pending,
        rate,
        count: schoolRecs.length,
      };
    });
  }, [records]);

  // Filtered 22 schools for schools view
  const filteredSchoolBreakdown = useMemo(() => {
    if (!schoolSearchQuery.trim()) return schoolBreakdown;
    const q = schoolSearchQuery.toLowerCase();
    return schoolBreakdown.filter((s) => s.name.toLowerCase().includes(q));
  }, [schoolBreakdown, schoolSearchQuery]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayPendingRecords = useMemo(() => {
    return records.filter((r) => r.date === todayStr && r.pendingCount > 0);
  }, [records, todayStr]);

  const operatorsCount = users.filter((u) => u.role === 'operator').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Scanning Department Intake &amp; Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Live cross-device monitoring of physical script intake vs. portal uploads across all 22
            schools and centers.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
              title="Sync latest logs from all centers"
            >
              <RotateCw
                className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-white' : ''}`}
              />
              <span>{isSyncing ? 'Syncing...' : 'Sync Server'}</span>
            </button>
          )}

          <button
            onClick={() => exportRecordsToCSV(filteredRecords)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenUserModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-300 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Operators ({operatorsCount})</span>
          </button>

          <button
            onClick={onAddRecord}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D2434] hover:bg-[#283248] text-white text-xs font-semibold border border-[#313E57] shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-300" />
            <span>New Daily Log</span>
          </button>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex items-center space-x-2 bg-[#0E121A] p-1 rounded-xl border border-[#1E2430] w-fit">
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === 'dashboard'
              ? 'bg-[#181E2B] text-white shadow-sm border border-[#273142]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => handleTabChange('schools')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === 'schools'
              ? 'bg-[#181E2B] text-white shadow-sm border border-[#273142]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>22 Schools Breakdown</span>
        </button>

        <button
          onClick={() => handleTabChange('audit_log')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === 'audit_log'
              ? 'bg-[#181E2B] text-white shadow-sm border border-[#273142]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Day-Wise Audit Log</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#202838] text-slate-300 font-mono">
            {records.length}
          </span>
        </button>
      </div>

      {/* Discrepancy Alert Banner */}
      {todayPendingRecords.length > 0 && (
        <div className="bg-rose-950/20 border-l-4 border-rose-500 p-4 rounded-xl shadow-lg border border-rose-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-rose-200 uppercase tracking-wide">
                  ACTIVE BACKLOG ALERT:{' '}
                  {todayPendingRecords.reduce((sum, r) => sum + r.pendingCount, 0)} SCRIPTS UN-UPLOADED TODAY
                </h3>
                <p className="text-xs text-rose-300/80 mt-1">
                  Scripts received at scanning centers but not yet uploaded to portal.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {todayPendingRecords.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center space-x-1 text-[11px] bg-rose-950/60 text-rose-200 px-2 py-0.5 rounded border border-rose-500/30 font-mono"
                    >
                      <strong>{r.school}</strong> ({r.station}): {r.pendingCount} pending (
                      {r.notes || 'No note'})
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setStatusFilter('pending');
                handleTabChange('audit_log');
              }}
              className="text-xs font-semibold text-rose-300 hover:text-white underline shrink-0 hidden sm:block font-mono"
            >
              Filter Backlogs →
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Total Scripts Received
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics.totalReceived.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Across {filteredRecords.length} intake submissions
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Total Scripts Uploaded
            </span>
            <UploadCloud className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {metrics.totalUploaded.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Ingested to central portal
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Pending / Discrepancy
            </span>
            <AlertOctagon
              className={`w-4 h-4 ${metrics.totalPending > 0 ? 'text-rose-400' : 'text-slate-500'}`}
            />
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              metrics.totalPending > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {metrics.totalPending.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            {metrics.totalPending > 0 ? 'Missing scripts backlog' : 'Zero backlog - all clear'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430] shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Department Sync Rate
            </span>
            <TrendingUp className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-2xl font-bold text-slate-200 font-mono">
            {metrics.overallCompletionRate}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            {metrics.discrepancyCount} flagged batches
          </span>
        </div>
      </div>

      {/* VIEW: 22 SCHOOLS FOCUS */}
      {currentTab === 'schools' && (
        <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-[#1A202C]">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                <span>22 Schools Intake &amp; Discrepancy Matrix</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cumulative script synchronization status for each faculty across all scanning centers.
              </p>
            </div>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={schoolSearchQuery}
                onChange={(e) => setSchoolSearchQuery(e.target.value)}
                placeholder="Search 22 schools..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSchoolBreakdown.map((sch) => {
              const hasPending = sch.pending > 0;
              return (
                <div
                  key={sch.name}
                  onClick={() => {
                    setSelectedSchool(sch.name);
                    handleTabChange('audit_log');
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:border-slate-500 ${
                    hasPending
                      ? 'bg-rose-950/15 border-rose-500/30'
                      : sch.count > 0
                      ? 'bg-[#121620] border-[#252D3D]'
                      : 'bg-[#0B0E14] border-[#181E29]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4
                      className="text-xs font-semibold text-slate-200 truncate max-w-[200px]"
                      title={sch.name}
                    >
                      {sch.name}
                    </h4>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        hasPending
                          ? 'bg-rose-500/20 text-rose-300'
                          : sch.count > 0
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {hasPending
                        ? `-${sch.pending} Pending`
                        : sch.count > 0
                        ? '100% Synced'
                        : 'No Logs'}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-1 text-[11px] pt-2 border-t border-[#181E29] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">REC</span>
                      <span className="font-bold text-slate-300">{sch.totalRec}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">UP</span>
                      <span className="font-bold text-emerald-400">{sch.totalUp}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">RATE</span>
                      <span className="font-bold text-slate-200">
                        {sch.count > 0 ? `${sch.rate.toFixed(0)}%` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: AUDIT LOG & DASHBOARD OVERVIEW */}
      {(currentTab === 'dashboard' || currentTab === 'audit_log') && (
        <>
          {/* Dynamic Filters Bar */}
          <div className="bg-[#0E121A] rounded-xl border border-[#1E2430] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Dynamic Filters</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#181F2C] border border-[#2A3447] text-[11px] text-slate-300 font-mono">
                {selectedSchool !== 'all' || selectedOperator !== 'all' || statusFilter !== 'all'
                  ? 'Filters active'
                  : '1 active / 1 total'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* School filter (22 schools) */}
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              >
                <option value="all">All 22 Schools</option>
                {AVAILABLE_SCHOOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Operator filter */}
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              >
                <option value="all">All Centers / Operators</option>
                {users
                  .filter((u) => u.role === 'operator')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.station})
                    </option>
                  ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Discrepancy Only</option>
                <option value="completed">100% Synced Only</option>
              </select>

              <button
                onClick={() => {
                  setSelectedSchool('all');
                  setSelectedOperator('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 bg-[#161C27] hover:bg-[#202737] text-slate-300 rounded-lg border border-[#283244] text-xs transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>

          {/* Main Audit Table Section */}
          <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1A202C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-white">
                  Scanning Intake Audit Table
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({filteredRecords.length} records)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative w-52">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search school, center, notes..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0E14] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#1A202C]">
                  <tr>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">SCHOOL / FACULTY</th>
                    <th className="py-3 px-4">CENTER / OPERATOR</th>
                    <th className="py-3 px-4">SHIFT</th>
                    <th className="py-3 px-4 text-right">RECEIVED</th>
                    <th className="py-3 px-4 text-right">UPLOADED</th>
                    <th className="py-3 px-4 text-right">PENDING</th>
                    <th className="py-3 px-4 text-center">RATE</th>
                    <th className="py-3 px-4">DISCREPANCY NOTES</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181E29]">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-500 text-xs">
                        No scanning batches logged yet. When operators submit intake from any center,
                        they will reflect here live.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const isPending = r.pendingCount > 0;
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-[#121620] transition-colors ${
                            isPending ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="py-3 px-4 font-medium text-white">
                            <div className="flex items-center space-x-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]" title={r.school}>
                                {r.school || 'General Batch'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{r.userName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.station}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-[#161C27] border border-[#242C3D] text-[10px] text-slate-400 font-mono">
                              {r.shift || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {r.receivedCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            {r.uploadedCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {isPending ? (
                              <span className="inline-flex items-center space-x-1 text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                                <span>+{r.pendingCount}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isPending
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {r.completionRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-400 text-xs">
                            {r.notes ? (
                              <span className="truncate block" title={r.notes}>
                                {r.notes}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic text-[10px]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => onEditRecord(r)}
                                title="Inspect / Edit"
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1A2230] rounded transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete record for ${r.school} on ${r.date}?`)) {
                                    onDeleteRecord(r.id);
                                  }
                                }}
                                title="Delete Record"
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 22 Schools Mini-Matrix in Dashboard View */}
          {currentTab === 'dashboard' && (
            <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1A202C]">
                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span>22 Schools Intake &amp; Discrepancy Breakdown</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click any school to view full audit logs.
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange('schools')}
                  className="text-xs text-slate-400 hover:text-white underline font-mono"
                >
                  Expand All 22 Schools →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {schoolBreakdown.slice(0, 9).map((sch) => {
                  const hasPending = sch.pending > 0;
                  return (
                    <div
                      key={sch.name}
                      onClick={() => {
                        setSelectedSchool(sch.name);
                        handleTabChange('audit_log');
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:border-slate-500 ${
                        hasPending
                          ? 'bg-rose-950/15 border-rose-500/30'
                          : sch.count > 0
                          ? 'bg-[#121620] border-[#252D3D]'
                          : 'bg-[#0B0E14] border-[#181E29]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h4
                          className="text-xs font-semibold text-slate-200 truncate max-w-[200px]"
                          title={sch.name}
                        >
                          {sch.name}
                        </h4>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            hasPending
                              ? 'bg-rose-500/20 text-rose-300'
                              : sch.count > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {hasPending
                            ? `-${sch.pending} Pending`
                            : sch.count > 0
                            ? '100% Synced'
                            : 'No Logs'}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 gap-1 text-[11px] pt-2 border-t border-[#181E29] font-mono">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">REC</span>
                          <span className="font-bold text-slate-300">{sch.totalRec}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">UP</span>
                          <span className="font-bold text-emerald-400">{sch.totalUp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">RATE</span>
                          <span className="font-bold text-slate-200">
                            {sch.count > 0 ? `${sch.rate.toFixed(0)}%` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
