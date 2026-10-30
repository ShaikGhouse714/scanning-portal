'use client';

import React, { useState, useMemo } from 'react';
import { DailyRecord, User, DepartmentMetrics } from '../types';
import { AVAILABLE_SCHOOLS } from '../lib/mockData';
import { StatCard } from './StatCard';
import {
  FileText,
  UploadCloud,
  AlertOctagon,
  TrendingUp,
  Download,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  PlusCircle,
  Eye,
  Trash2,
  Calendar,
  Cpu,
  Layers,
} from 'lucide-react';
import { calculateMetrics, exportRecordsToCSV } from '../lib/storage';

interface AdminDashboardProps {
  records: DailyRecord[];
  users: User[];
  onOpenUserModal: () => void;
  onEditRecord: (record: DailyRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecord: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  records,
  users,
  onOpenUserModal,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
}) => {
  // Filter states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewTab, setViewTab] = useState<'audit_table' | 'school_matrix'>('audit_table');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);
  const weekAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (dateFilter === 'today' && r.date !== todayStr) return false;
      if (dateFilter === 'yesterday' && r.date !== yesterdayStr) return false;
      if (dateFilter === 'week' && r.date < weekAgoStr) return false;

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
  }, [records, dateFilter, selectedOperator, selectedSchool, statusFilter, searchQuery, todayStr, yesterdayStr, weekAgoStr]);

  const metrics: DepartmentMetrics = useMemo(() => {
    return calculateMetrics(filteredRecords);
  }, [filteredRecords]);

  // School breakdown
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

  // Today's pending
  const todayPendingRecords = useMemo(() => {
    return records.filter((r) => r.date === todayStr && r.pendingCount > 0);
  }, [records, todayStr]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Futuristic Command Header */}
      <div className="bg-[#091122] p-6 rounded-2xl border border-cyan-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-20 h-[2px] bg-cyan-400" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                COMMAND DASHBOARD // SUPER ADMIN
              </span>
              <span className="text-xs text-slate-500 font-mono">KIIT SCANNING NETWORK</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wide">
              SCRIPT INTAKE &amp; DISCREPANCY AUDIT
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Live telemetry monitoring across 22 schools and all registered scanning centers.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0 font-mono">
            <button
              onClick={() => exportRecordsToCSV(filteredRecords)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#050A16] hover:bg-slate-800 text-slate-300 border border-cyan-900/60 text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={onOpenUserModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#050A16] hover:bg-slate-800 text-slate-300 border border-cyan-900/60 text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>STATIONS ({users.filter(u => u.role === 'operator').length})</span>
            </button>
            <button
              onClick={onAddRecord}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold tracking-wider rounded-xl shadow-lg shadow-cyan-600/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>NEW LOG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {todayPendingRecords.length > 0 && (
        <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-xl shadow-lg border border-rose-500/30 font-mono">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wide">
                  ACTIVE BACKLOG: {todayPendingRecords.reduce((sum, r) => sum + r.pendingCount, 0)} SCRIPTS UN-UPLOADED TODAY
                </h3>
                <p className="text-xs text-rose-200/80 mt-1">
                  Discrepancy detected across {todayPendingRecords.length} school submission(s).
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {todayPendingRecords.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center space-x-1 text-[11px] font-mono bg-rose-950/60 text-rose-200 px-2 py-0.5 rounded border border-rose-500/30"
                    >
                      <strong>{r.school}</strong> ({r.station}): {r.pendingCount} pending ({r.notes || 'No note'})
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setDateFilter('today');
                setStatusFilter('pending');
              }}
              className="text-xs font-semibold text-rose-300 hover:text-white underline shrink-0 hidden sm:block font-mono"
            >
              FILTER BACKLOGS →
            </button>
          </div>
        </div>
      )}

      {/* 4 Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scripts Received"
          value={metrics.totalReceived.toLocaleString()}
          subtitle="Physical intake across all schools"
          icon={FileText}
          variant="cyan"
          badge={`${metrics.totalRecords} Logs`}
        />
        <StatCard
          title="Total Scripts Uploaded"
          value={metrics.totalUploaded.toLocaleString()}
          subtitle="Successfully verified into portal"
          icon={UploadCloud}
          variant="success"
          badge={`${metrics.overallCompletionRate}% Synced`}
        />
        <StatCard
          title="Pending / Discrepancy"
          value={metrics.totalPending.toLocaleString()}
          subtitle={metrics.totalPending > 0 ? 'Unprocessed backlog' : 'Zero backlog - all clear'}
          icon={AlertOctagon}
          variant={metrics.totalPending > 0 ? 'danger' : 'success'}
          badge={metrics.totalPending > 0 ? 'Backlog Alert' : 'Synchronized'}
        />
        <StatCard
          title="Department Sync Rate"
          value={`${metrics.overallCompletionRate}%`}
          subtitle="Target: 100% daily completion"
          icon={TrendingUp}
          variant={metrics.overallCompletionRate >= 95 ? 'success' : 'danger'}
          badge={`${metrics.discrepancyCount} Flagged`}
        />
      </div>

      {/* View Switcher: Table View vs School Matrix */}
      <div className="flex items-center justify-between border-b border-cyan-950 pb-2 font-mono">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewTab('audit_table')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewTab === 'audit_table'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-[#091122] text-slate-400 border border-cyan-950 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>DAY-WISE AUDIT TABLE</span>
          </button>
          <button
            onClick={() => setViewTab('school_matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewTab === 'school_matrix'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-[#091122] text-slate-400 border border-cyan-950 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>22 SCHOOLS PERFORMANCE MATRIX</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:block">
          RECORDS: <strong className="text-cyan-400">{filteredRecords.length}</strong>
        </span>
      </div>

      {viewTab === 'school_matrix' ? (
        /* 22 Schools Matrix */
        <div className="bg-[#091122] rounded-2xl border border-cyan-900/50 shadow-2xl p-5 font-mono">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>FACULTY SCRIPT RECONCILIATION MATRIX</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of intake and upload metrics across all 22 schools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {schoolBreakdown.map((sch) => {
              const hasPending = sch.pending > 0;
              return (
                <div
                  key={sch.name}
                  className={`p-3.5 rounded-xl border transition-all ${
                    hasPending
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : sch.count > 0
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-[#050A16] border-cyan-950'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-white truncate max-w-[200px]" title={sch.name}>
                      {sch.name}
                    </h4>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        hasPending
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : sch.count > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {hasPending ? `⚠️ ${sch.pending} PENDING` : sch.count > 0 ? '100% SYNC' : 'NO LOGS'}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-1 text-[11px] pt-2 border-t border-cyan-950">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">REC</span>
                      <span className="font-bold text-slate-200">{sch.totalRec}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">UP</span>
                      <span className="font-bold text-emerald-400">{sch.totalUp}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">RATE</span>
                      <span className="font-bold text-cyan-400">{sch.count > 0 ? `${sch.rate.toFixed(1)}%` : '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Audit Table */
        <div className="bg-[#091122] rounded-2xl border border-cyan-900/50 shadow-2xl overflow-hidden font-mono">
          {/* Table Filters Header */}
          <div className="p-4 border-b border-cyan-950 bg-[#070D1C] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            {/* Date filter pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 lg:pb-0">
              {[
                { id: 'all', label: 'ALL LOGS' },
                { id: 'today', label: 'TODAY' },
                { id: 'yesterday', label: 'YESTERDAY' },
                { id: 'week', label: '7 DAYS' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDateFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    dateFilter === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-[#050A16] text-slate-400 border border-cyan-950 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-[#050A16] border border-cyan-900/60 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="all">ALL 22 SCHOOLS</option>
                {AVAILABLE_SCHOOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-[#050A16] border border-cyan-900/60 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="all">ALL OPERATORS</option>
                {users
                  .filter((u) => u.role === 'operator')
                  .map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 bg-[#050A16] border border-cyan-900/60 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="all">ALL STATUSES</option>
                <option value="pending">⚠️ PENDING BACKLOGS ONLY</option>
                <option value="completed">✅ 100% COMPLETE</option>
              </select>

              <div className="relative flex-1 sm:w-36">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#050A16] border border-cyan-900/60 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050A16] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-cyan-950">
                <tr>
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">SCHOOL / FACULTY</th>
                  <th className="py-3 px-4">OPERATOR &amp; CENTER</th>
                  <th className="py-3 px-4">SHIFT</th>
                  <th className="py-3 px-4 text-right">RECEIVED</th>
                  <th className="py-3 px-4 text-right">UPLOADED</th>
                  <th className="py-3 px-4 text-right">PENDING</th>
                  <th className="py-3 px-4 text-center">SYNC %</th>
                  <th className="py-3 px-4">REASON / NOTES</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-950/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                      NO AUDIT LOGS MATCHING CRITERIA.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isPending = r.pendingCount > 0;
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-[#0D1830] transition-colors ${
                          isPending ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="py-3 px-4 font-bold text-cyan-300">
                          <div className="flex items-center space-x-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[180px]" title={r.school}>
                              {r.school || 'General Batch'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{r.userName}</div>
                          <div className="text-[10px] text-slate-400">{r.station}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                            {r.shift || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {r.receivedCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {r.uploadedCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {isPending ? (
                            <span className="inline-flex items-center space-x-1 text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>+{r.pendingCount}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPending
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {r.completionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {r.notes ? (
                            <p className="text-slate-300 text-xs truncate" title={r.notes}>
                              {r.notes}
                            </p>
                          ) : (
                            <span className="text-slate-600 italic text-[10px]">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => onEditRecord(r)}
                              title="Inspect Log"
                              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950 rounded transition-colors"
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
      )}
    </div>
  );
};
