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
  Building,
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

  // Today's and Yesterday's date strings
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
      // Date filter
      if (dateFilter === 'today' && r.date !== todayStr) return false;
      if (dateFilter === 'yesterday' && r.date !== yesterdayStr) return false;
      if (dateFilter === 'week' && r.date < weekAgoStr) return false;

      // Operator filter
      if (selectedOperator !== 'all' && r.userId !== selectedOperator) return false;

      // School filter
      if (selectedSchool !== 'all' && r.school !== selectedSchool) return false;

      // Status filter
      if (statusFilter === 'pending' && r.pendingCount <= 0) return false;
      if (statusFilter === 'completed' && r.pendingCount > 0) return false;

      // Search query
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

  // Overall department metrics on filtered set
  const metrics: DepartmentMetrics = useMemo(() => {
    return calculateMetrics(filteredRecords);
  }, [filteredRecords]);

  // Operator-specific performance cards
  const operatorBreakdown = useMemo(() => {
    const operatorUsers = users.filter((u) => u.role === 'operator');
    return operatorUsers.map((op) => {
      const opRecords = records.filter((r) => r.userId === op.id);
      const totalRec = opRecords.reduce((sum, r) => sum + r.receivedCount, 0);
      const totalUp = opRecords.reduce((sum, r) => sum + r.uploadedCount, 0);
      const pending = opRecords.reduce((sum, r) => sum + Math.max(0, r.pendingCount), 0);
      const rate = totalRec > 0 ? (totalUp / totalRec) * 100 : 100;

      return {
        user: op,
        totalRec,
        totalUp,
        pending,
        rate,
        recordsCount: opRecords.length,
      };
    });
  }, [users, records]);

  // School-specific performance breakdown
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

  // Check if today has pending discrepancies
  const todayPendingRecords = useMemo(() => {
    return records.filter((r) => r.date === todayStr && r.pendingCount > 0);
  }, [records, todayStr]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
              Super Admin View
            </span>
            <span className="text-xs text-slate-400">• Scanning Dept Central Command</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Department Script Tracking &amp; School Discrepancy Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor daily received vs. uploaded scripts across all 22 schools, scanning stations, and operators.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => exportRecordsToCSV(filteredRecords)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenUserModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Team &amp; Access</span>
          </button>
          <button
            onClick={onAddRecord}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Daily Log</span>
          </button>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {todayPendingRecords.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-4 rounded-xl shadow-sm bg-white border-y border-r border-amber-200/60">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Active Backlog Alert: {todayPendingRecords.reduce((sum, r) => sum + r.pendingCount, 0)} Scripts Not Uploaded Today
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  Discrepancy detected in {todayPendingRecords.length} school submission(s). Scripts were received but have not been fully uploaded to the portal yet.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {todayPendingRecords.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center space-x-1 text-[11px] font-medium bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200"
                    >
                      <strong>{r.school || 'General'}</strong> ({r.userName}): {r.pendingCount} pending ({r.notes || 'No note'})
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
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0 hidden sm:block"
            >
              Filter Backlogs →
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Department KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scripts Received"
          value={metrics.totalReceived.toLocaleString()}
          subtitle="Physical intake across all schools"
          icon={FileText}
          variant="indigo"
          badge={`${metrics.totalRecords} Logs`}
        />
        <StatCard
          title="Total Scripts Uploaded"
          value={metrics.totalUploaded.toLocaleString()}
          subtitle="Successfully ingested to portal"
          icon={UploadCloud}
          variant="success"
          badge={`${metrics.overallCompletionRate}% Rate`}
        />
        <StatCard
          title="Pending / Missing Uploads"
          value={metrics.totalPending.toLocaleString()}
          subtitle={
            metrics.totalPending > 0
              ? 'Unprocessed scripts backlog'
              : 'Zero backlog - all synced!'
          }
          icon={AlertOctagon}
          variant={metrics.totalPending > 0 ? 'warning' : 'success'}
          badge={metrics.totalPending > 0 ? 'Backlog Exists' : 'All Clear'}
        />
        <StatCard
          title="Upload Success Rate"
          value={`${metrics.overallCompletionRate}%`}
          subtitle="Target: 100% daily completion"
          icon={TrendingUp}
          variant={metrics.overallCompletionRate >= 95 ? 'success' : 'danger'}
          badge={`${metrics.discrepancyCount} Flagged Logs`}
        />
      </div>

      {/* Navigation Switcher: Table View vs School Breakdown Matrix */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewTab('audit_table')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewTab === 'audit_table'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Day-Wise Audit Log Table</span>
          </button>
          <button
            onClick={() => setViewTab('school_matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewTab === 'school_matrix'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>School-Wise Performance Matrix (22 Schools)</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:block">
          Filtered records: <strong>{filteredRecords.length}</strong>
        </span>
      </div>

      {viewTab === 'school_matrix' ? (
        /* 22 Schools Performance Matrix */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>School-By-School Intake &amp; Discrepancy Matrix</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Real-time script synchronization breakdown across all 22 schools and faculties.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {schoolBreakdown.map((sch) => {
                const hasPending = sch.pending > 0;
                return (
                  <div
                    key={sch.name}
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasPending
                        ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-100'
                        : sch.count > 0
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={sch.name}>
                        {sch.name}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          hasPending
                            ? 'bg-amber-100 text-amber-800'
                            : sch.count > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {hasPending
                          ? `⚠️ ${sch.pending} Pending`
                          : sch.count > 0
                          ? '100% Synced'
                          : 'No Logs'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1 text-[11px] pt-2 border-t border-slate-200/60">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Rec</span>
                        <span className="font-bold text-slate-800">{sch.totalRec}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Up</span>
                        <span className="font-bold text-emerald-700">{sch.totalUp}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Sync</span>
                        <span className="font-bold text-slate-700">
                          {sch.count > 0 ? `${sch.rate.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Main Day-wise Audit Table Section */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Filters Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Quick Date Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date:</span>
              </span>
              {[
                { id: 'all', label: 'All Records' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Last 7 Days' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDateFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    dateFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dropdown Selectors: School, Operator, Status, Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* School Filter Dropdown */}
              <div className="w-full sm:w-auto">
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full sm:w-48 text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">All 22 Schools</option>
                  {AVAILABLE_SCHOOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator filter */}
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Operators</option>
                {users
                  .filter((u) => u.role === 'operator')
                  .map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">⚠️ Pending Backlogs Only</option>
                <option value="completed">✅ 100% Uploaded</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 sm:w-40">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search school, notes..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">School / Faculty</th>
                  <th className="py-3.5 px-4">Operator &amp; Station</th>
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4 text-right">Received</th>
                  <th className="py-3.5 px-4 text-right">Uploaded</th>
                  <th className="py-3.5 px-4 text-right">Pending</th>
                  <th className="py-3.5 px-4 text-center">Status / Sync</th>
                  <th className="py-3.5 px-4">Backlog Notes / Reason</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                      No scanning logs match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isPending = r.pendingCount > 0;
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isPending ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate max-w-[180px]" title={r.school}>
                              {r.school || 'General Batch'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{r.userName}</div>
                          <div className="text-[11px] text-slate-500">{r.station}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {r.shift || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {r.receivedCount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          {r.uploadedCount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          {isPending ? (
                            <span className="inline-flex items-center space-x-1 text-amber-700 font-extrabold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>+{r.pendingCount}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isPending ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>{r.completionRate.toFixed(1)}%</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>100% Synced</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          {r.notes ? (
                            <p className="text-slate-600 text-xs truncate" title={r.notes}>
                              {r.notes}
                            </p>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">No notes</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => onEditRecord(r)}
                              title="Edit or inspect log details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete record for ${r.school} on ${r.date}?`)) {
                                  onDeleteRecord(r.id);
                                }
                              }}
                              title="Delete log"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Table Summary Footer */}
              {filteredRecords.length > 0 && (
                <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 uppercase text-[11px] text-slate-500">
                      Filtered Totals ({filteredRecords.length} records)
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {metrics.totalReceived.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-emerald-700">
                      {metrics.totalUploaded.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-amber-700">
                      {metrics.totalPending.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      {metrics.overallCompletionRate}% Overall
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
