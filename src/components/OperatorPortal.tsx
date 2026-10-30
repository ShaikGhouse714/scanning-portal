'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User, DailyRecord } from '../types';
import { AVAILABLE_SCHOOLS } from '../lib/mockData';
import {
  FileText,
  Clock,
  Calendar,
  Save,
  GraduationCap,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  History,
  Search,
  PlusCircle,
  Download,
  Check,
} from 'lucide-react';
import { computeStatus, exportRecordsToCSV } from '../lib/storage';

interface OperatorPortalProps {
  currentUser: User;
  records: DailyRecord[];
  onSaveRecord: (record: DailyRecord) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const OperatorPortal: React.FC<OperatorPortalProps> = ({
  currentUser,
  records,
  onSaveRecord,
  activeTab = 'intake',
  setActiveTab,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Internal tab state synced with parent sidebar
  const currentTab = activeTab || 'intake';
  const handleTabChange = (tab: string) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  // Form states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSchool, setSelectedSchool] = useState<string>(AVAILABLE_SCHOOLS[0]);
  const [shift, setShift] = useState<'Morning' | 'Afternoon' | 'Night' | 'Full Day'>('Morning');
  const [receivedInput, setReceivedInput] = useState<string>('');
  const [uploadedInput, setUploadedInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submittedFeedback, setSubmittedFeedback] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Submissions search & filter
  const [submissionsSearch, setSubmissionsSearch] = useState<string>('');
  const [submissionsSchoolFilter, setSubmissionsSchoolFilter] = useState<string>('all');

  // Check if an existing record exists for this user on the selected date AND selected school
  const existingRecord = useMemo(() => {
    return records.find(
      (r) =>
        r.userId === currentUser.id &&
        r.date === selectedDate &&
        (r.school === selectedSchool || (!r.school && selectedSchool === AVAILABLE_SCHOOLS[0]))
    );
  }, [records, currentUser.id, selectedDate, selectedSchool]);

  useEffect(() => {
    if (existingRecord) {
      setReceivedInput(String(existingRecord.receivedCount));
      setUploadedInput(String(existingRecord.uploadedCount));
      setNotes(existingRecord.notes || '');
      setShift(existingRecord.shift || 'Morning');
    } else {
      setReceivedInput('');
      setUploadedInput('');
      setNotes('');
    }
  }, [existingRecord, selectedDate, selectedSchool]);

  const receivedCount = Math.max(0, parseInt(receivedInput) || 0);
  const uploadedCount = Math.max(0, parseInt(uploadedInput) || 0);
  const pendingCount = Math.max(0, receivedCount - uploadedCount);
  const hasDiscrepancy = pendingCount > 0;
  const isOverUploaded = uploadedCount > receivedCount && receivedCount > 0;
  const completionRate =
    receivedCount > 0 ? Math.min(100, (uploadedCount / receivedCount) * 100) : 100;

  // Filter operator's own submissions
  const myRecords = useMemo(() => {
    return records
      .filter((r) => r.userId === currentUser.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, currentUser.id]);

  // Filtered submissions for My Submissions view
  const filteredMyRecords = useMemo(() => {
    return myRecords.filter((r) => {
      if (submissionsSchoolFilter !== 'all' && r.school !== submissionsSchoolFilter) return false;
      if (submissionsSearch.trim()) {
        const q = submissionsSearch.toLowerCase();
        const matchSchool = (r.school || '').toLowerCase().includes(q);
        const matchDate = r.date.includes(q);
        const matchNotes = (r.notes || '').toLowerCase().includes(q);
        if (!matchSchool && !matchDate && !matchNotes) return false;
      }
      return true;
    });
  }, [myRecords, submissionsSchoolFilter, submissionsSearch]);

  const handleEditSubmission = (r: DailyRecord) => {
    setSelectedDate(r.date);
    if (r.school) setSelectedSchool(r.school);
    if (r.shift) setShift(r.shift);
    setReceivedInput(String(r.receivedCount));
    setUploadedInput(String(r.uploadedCount));
    setNotes(r.notes || '');
    handleTabChange('intake');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedInput.trim() || !uploadedInput.trim()) {
      alert('Please fill in both Received and Uploaded counts.');
      return;
    }

    setIsSubmitting(true);

    const newRecord: DailyRecord = {
      id: existingRecord
        ? existingRecord.id
        : `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: selectedDate,
      userId: currentUser.id,
      userName: currentUser.name,
      station: currentUser.station,
      school: selectedSchool,
      receivedCount,
      uploadedCount,
      pendingCount,
      completionRate: receivedCount > 0 ? (uploadedCount / receivedCount) * 100 : 100,
      status: computeStatus(receivedCount, uploadedCount),
      notes: notes.trim(),
      shift,
      createdAt: existingRecord ? existingRecord.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRecord(newRecord);
    setIsSubmitting(false);
    setSubmittedFeedback(true);
    setTimeout(() => setSubmittedFeedback(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-12">
      {/* Top Banner matching dark matte theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Scanning Operator Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-white">{currentUser.name}</strong> • Station:{' '}
            <strong className="text-slate-200">{currentUser.station}</strong>. All logs sync live
            with Super Admin.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-2 bg-[#0E121A] p-1 rounded-xl border border-[#1E2430] self-start sm:self-auto">
          <button
            onClick={() => handleTabChange('intake')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'intake'
                ? 'bg-[#181E2B] text-white shadow-sm border border-[#273142]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Intake Entry</span>
          </button>
          <button
            onClick={() => handleTabChange('my_logs')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'my_logs'
                ? 'bg-[#181E2B] text-white shadow-sm border border-[#273142]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Submissions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#202838] text-slate-300 font-mono">
              {myRecords.length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INTAKE FORM */}
      {currentTab === 'intake' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Card (7 cols) */}
          <div className="lg:col-span-7 bg-[#0E121A] rounded-2xl border border-[#1E2430] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A202C] mb-5">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-wide flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Script Intake Entry</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select the school and log physical scripts received vs. scanned into portal.
                </p>
              </div>
              {existingRecord && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#181F2C] border border-[#273244] text-slate-300 flex items-center space-x-1 font-mono">
                  <Edit2 className="w-3 h-3 text-slate-400" />
                  <span>Editing Existing Log</span>
                </span>
              )}
            </div>

            {submittedFeedback && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Data successfully synchronized to Super Admin for{' '}
                  <strong className="text-white">{selectedSchool}</strong>!
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* School Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <span>Select School / Faculty</span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white focus:outline-none focus:border-slate-500 transition-all"
                >
                  {AVAILABLE_SCHOOLS.map((school) => (
                    <option key={school} value={school} className="bg-[#121620]">
                      {school}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Logging Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-[#121620] border border-[#212836] rounded-xl text-white focus:outline-none focus:border-slate-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Shift</span>
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full text-xs font-medium px-3 py-2 bg-[#121620] border border-[#212836] rounded-xl text-white focus:outline-none focus:border-slate-500 transition-colors"
                  >
                    <option value="Morning">Morning Shift (08:00 - 14:00)</option>
                    <option value="Afternoon">Afternoon Shift (14:00 - 20:00)</option>
                    <option value="Night">Night Shift (20:00 - 02:00)</option>
                    <option value="Full Day">Full Day Ingestion</option>
                  </select>
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-[#121620] border border-[#212836]">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    1. Scripts Received
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Total physical scripts received from {selectedSchool}.
                  </p>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 250"
                    value={receivedInput}
                    onChange={(e) => setReceivedInput(e.target.value)}
                    className="w-full text-xl font-bold px-3 py-2 bg-[#0E121A] border border-[#283244] rounded-lg text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="p-4 rounded-xl bg-[#121620] border border-[#212836]">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    2. Scripts Uploaded
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Total scripts scanned &amp; verified into portal.
                  </p>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 240"
                    value={uploadedInput}
                    onChange={(e) => setUploadedInput(e.target.value)}
                    className="w-full text-xl font-bold px-3 py-2 bg-[#0E121A] border border-[#283244] rounded-lg text-emerald-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Live Verification Box */}
              {receivedInput !== '' && uploadedInput !== '' && (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    hasDiscrepancy
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {hasDiscrepancy ? (
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <span className="text-[11px] font-semibold uppercase block text-slate-400">
                          Verification Status
                        </span>
                        <span className="text-sm font-bold">
                          {hasDiscrepancy
                            ? `${pendingCount} Scripts Pending Upload`
                            : isOverUploaded
                            ? `Uploaded exceeds Received (+${uploadedCount - receivedCount})`
                            : '100% Uploaded (Synchronized)'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-white">
                        {completionRate.toFixed(1)}%
                      </span>
                      <p className="text-[10px] text-slate-400">Completion</p>
                    </div>
                  </div>

                  {hasDiscrepancy && (
                    <p className="mt-2 text-xs text-rose-300">
                      <strong>Backlog Notice:</strong> You received {receivedCount} but uploaded{' '}
                      {uploadedCount}. Please provide a note below explaining the discrepancy.
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Discrepancy Notes / Backlog Reason {hasDiscrepancy && <span className="text-rose-400">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    hasDiscrepancy
                      ? `e.g. 10 scripts had faint barcode printing, kept for supervisor recheck...`
                      : 'Any batch notes or observations (optional)...'
                  }
                  className="w-full text-xs p-3 bg-[#121620] border border-[#212836] rounded-xl text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold rounded-xl border border-[#303D57] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? 'Syncing to Server...'
                    : existingRecord
                    ? 'Update Record'
                    : 'Save & Sync to Platform'}
                </span>
              </button>
            </form>
          </div>

          {/* Right Column: History (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1A202C]">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recent Batches</span>
                </h3>
                <button
                  onClick={() => handleTabChange('my_logs')}
                  className="text-[11px] text-slate-400 hover:text-white underline font-mono"
                >
                  View All ({myRecords.length}) →
                </button>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {myRecords.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center italic">
                    No batches submitted yet today. Enter your first school log above!
                  </p>
                ) : (
                  myRecords.slice(0, 6).map((r) => {
                    const isPending = r.pendingCount > 0;
                    const isSelected = r.date === selectedDate && r.school === selectedSchool;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedDate(r.date);
                          if (r.school) setSelectedSchool(r.school);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#3D4C6A] bg-[#161C27]'
                            : 'border-[#1E2430] bg-[#121620] hover:bg-[#151A24]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-white font-mono">{r.date}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              isPending
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {isPending ? `-${r.pendingCount} Pending` : '100% Synced'}
                          </span>
                        </div>

                        <div className="text-[11px] font-medium text-slate-300 truncate mb-1 flex items-center space-x-1">
                          <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{r.school || 'General Batch'}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                          <span>
                            Rec: <strong className="text-white">{r.receivedCount}</strong> | Up:{' '}
                            <strong className="text-emerald-400">{r.uploadedCount}</strong>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {r.completionRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED FULL "MY SUBMISSIONS" HISTORY VIEW */}
      {currentTab === 'my_logs' && (
        <div className="space-y-4">
          <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] overflow-hidden shadow-2xl">
            {/* Header with Search and School Filter */}
            <div className="p-4 border-b border-[#1A202C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-white">
                  My Submission History &amp; Logs
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({filteredMyRecords.length} submissions)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={submissionsSearch}
                    onChange={(e) => setSubmissionsSearch(e.target.value)}
                    placeholder="Search school, date, notes..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
                  />
                </div>

                {/* School Filter */}
                <select
                  value={submissionsSchoolFilter}
                  onChange={(e) => setSubmissionsSchoolFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-[#121620] border border-[#212836] rounded-lg text-slate-200 focus:outline-none"
                >
                  <option value="all">All Schools</option>
                  {AVAILABLE_SCHOOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => exportRecordsToCSV(filteredMyRecords)}
                  className="px-2.5 py-1.5 bg-[#141822] hover:bg-[#1E2433] text-slate-300 rounded-lg border border-[#242C3D] text-xs transition-colors flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export</span>
                </button>

                <button
                  onClick={() => handleTabChange('intake')}
                  className="px-3 py-1.5 bg-[#1E2536] hover:bg-[#283248] text-white rounded-lg border border-[#303D57] text-xs font-semibold transition-all flex items-center space-x-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Intake Form</span>
                </button>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0E14] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#1A202C]">
                  <tr>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">SCHOOL / FACULTY</th>
                    <th className="py-3 px-4">SHIFT</th>
                    <th className="py-3 px-4 text-right">RECEIVED</th>
                    <th className="py-3 px-4 text-right">UPLOADED</th>
                    <th className="py-3 px-4 text-right">BACKLOG</th>
                    <th className="py-3 px-4 text-center">RATE</th>
                    <th className="py-3 px-4">DISCREPANCY NOTES</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181E29]">
                  {filteredMyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                        No submissions matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMyRecords.map((r) => {
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
                              <span className="truncate max-w-[220px]" title={r.school}>
                                {r.school || 'General Batch'}
                              </span>
                            </div>
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
                              <span className="text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                                -{r.pendingCount}
                              </span>
                            ) : (
                              <span className="text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                0
                              </span>
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
                            <button
                              onClick={() => handleEditSubmission(r)}
                              className="px-2.5 py-1 rounded bg-[#1A2230] hover:bg-[#253042] text-slate-300 hover:text-white border border-[#2A364B] text-[11px] font-medium transition-colors inline-flex items-center space-x-1"
                            >
                              <Edit2 className="w-3 h-3 text-slate-400" />
                              <span>Edit</span>
                            </button>
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
    </div>
  );
};
