'use client';

import React, { useState, useMemo } from 'react';
import { DailyRecord, User, DepartmentMetrics } from '../types';
import { AVAILABLE_SCHOOLS } from '../lib/mockData';
import {
  FileText,
  Clock,
  RotateCw,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Download,
  Eye,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Upload,
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
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  records,
  users,
  onOpenUserModal,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onRefresh,
}) => {
  const [showDataSources, setShowDataSources] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'school_matrix'>('table');

  // Filter records
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

  // 22 School breakdown
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

  const activeBacklogs = useMemo(() => {
    return records.filter((r) => r.pendingCount > 0);
  }, [records]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Title & Subtitle Matching Screenshot */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Post Exam Tracking
          </h1>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] border border-[#242C3D] text-xs font-medium text-slate-300 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Sync Server Data</span>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-4xl">
          Track Shadow QP preparation, QP linking, booklet scanning monitoring, evaluator allocation, and evaluation progress across examination cycles.
        </p>
      </div>

      {/* Data Source Connections Card (Direct match from screenshot) */}
      <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1A202C]">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded flex items-center justify-center text-slate-300">
              <Upload className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-xs font-semibold text-white tracking-wide">
              Data Source Connections
            </span>
            <Info className="w-3.5 h-3.5 text-slate-500 cursor-pointer" />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#151B26] border border-[#232B3B]">
              {records.length > 0 ? '4 / 4 connected' : '0 / 4 connected'}
            </span>
            <button
              onClick={() => setShowDataSources(!showDataSources)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              {showDataSources ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {showDataSources && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            {/* Box 1 */}
            <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                    1
                  </div>
                  <span className="text-xs font-medium text-slate-200">
                    1. All Exam Schedules
                  </span>
                </div>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-2">
                <span className="text-slate-500">
                  {records.length > 0 ? `${records.length} Batches Staged` : 'No file staged'}
                </span>
                <button
                  onClick={onAddRecord}
                  className="px-2.5 py-1 rounded-md bg-[#1B2230] hover:bg-[#252E40] text-slate-300 text-[11px] border border-[#2A3447] transition-colors"
                >
                  Choose
                </button>
              </div>
            </div>

            {/* Box 2 */}
            <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                    2
                  </div>
                  <span className="text-xs font-medium text-slate-200">
                    2. Assigned Status
                  </span>
                </div>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-2">
                <span className="text-slate-500">
                  {users.length} Centers Active
                </span>
                <button
                  onClick={onOpenUserModal}
                  className="px-2.5 py-1 rounded-md bg-[#1B2230] hover:bg-[#252E40] text-slate-300 text-[11px] border border-[#2A3447] transition-colors"
                >
                  Choose
                </button>
              </div>
            </div>

            {/* Box 3 */}
            <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                    3
                  </div>
                  <span className="text-xs font-medium text-slate-200">
                    3. Unassigned Report
                  </span>
                </div>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-2">
                <span className="text-amber-400/90 font-medium">
                  {metrics.totalPending > 0 ? `${metrics.totalPending} Unassigned` : 'Clean Sync'}
                </span>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className="px-2.5 py-1 rounded-md bg-[#1B2230] hover:bg-[#252E40] text-slate-300 text-[11px] border border-[#2A3447] transition-colors"
                >
                  Choose
                </button>
              </div>
            </div>

            {/* Box 4 */}
            <div className="p-3 rounded-xl bg-[#121620] border border-[#212836] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">
                    4
                  </div>
                  <span className="text-xs font-medium text-slate-200">
                    4. Published Google Sheet
                  </span>
                </div>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-2">
                <span className="text-slate-400">Ready to sync</span>
                <button
                  onClick={() => exportRecordsToCSV(records)}
                  className="px-2.5 py-1 rounded-md bg-[#1B2230] hover:bg-[#252E40] text-slate-300 text-[11px] border border-[#2A3447] transition-colors flex items-center space-x-1"
                >
                  <RotateCw className="w-3 h-3 text-purple-400" />
                  <span>Sync</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Filters Bar matching screenshot */}
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
          {/* School Filter */}
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

          {/* Operator Filter */}
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Discrepancy Only</option>
            <option value="completed">100% Completed Only</option>
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

      {/* KPI Telemetry Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
            Total Scripts Received
          </span>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics.totalReceived.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Across {filteredRecords.length} recorded batches
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
            Total Scripts Uploaded
          </span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {metrics.totalUploaded.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Ingested to central portal
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
            Unprocessed / Pending Delta
          </span>
          <div className={`text-2xl font-bold font-mono ${metrics.totalPending > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {metrics.totalPending.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            {metrics.totalPending > 0 ? 'Missing scripts backlog' : 'Zero backlog'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E121A] border border-[#1E2430]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
            Department Completion Rate
          </span>
          <div className="text-2xl font-bold text-slate-200 font-mono">
            {metrics.overallCompletionRate}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Target: 100% daily completion
          </span>
        </div>
      </div>

      {/* Main Table or School Matrix Toggle */}
      <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#1A202C] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-[#1C2332] text-white border border-[#2D384F]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Master Audit Table ({filteredRecords.length})
            </button>
            <button
              onClick={() => setViewMode('school_matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'school_matrix'
                  ? 'bg-[#1C2332] text-white border border-[#2D384F]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              22 Schools Breakdown
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
              />
            </div>
            <button
              onClick={() => exportRecordsToCSV(filteredRecords)}
              className="p-1.5 rounded-lg bg-[#141822] hover:bg-[#1E2433] text-slate-300 border border-[#242C3D] text-xs transition-colors"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === 'school_matrix' ? (
          /* 22 Schools Matrix */
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {schoolBreakdown.map((sch) => {
                const hasPending = sch.pending > 0;
                return (
                  <div
                    key={sch.name}
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasPending
                        ? 'bg-rose-950/15 border-rose-500/30'
                        : sch.count > 0
                        ? 'bg-[#121620] border-[#252D3D]'
                        : 'bg-[#0B0E14] border-[#181E29]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-semibold text-slate-200 truncate max-w-[200px]" title={sch.name}>
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
                        {hasPending ? `-${sch.pending}` : sch.count > 0 ? '100%' : 'None'}
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
                        <span className="font-bold text-slate-200">{sch.count > 0 ? `${sch.rate.toFixed(0)}%` : '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Master Audit Table */
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
                      No scanning batches submitted yet. When operators log their daily intake, they will appear here live.
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
        )}
      </div>
    </div>
  );
};
