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
} from 'lucide-react';
import { computeStatus } from '../lib/storage';

interface OperatorPortalProps {
  currentUser: User;
  records: DailyRecord[];
  onSaveRecord: (record: DailyRecord) => void;
}

export const OperatorPortal: React.FC<OperatorPortalProps> = ({
  currentUser,
  records,
  onSaveRecord,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSchool, setSelectedSchool] = useState<string>(AVAILABLE_SCHOOLS[0]);
  const [shift, setShift] = useState<'Morning' | 'Afternoon' | 'Night' | 'Full Day'>('Morning');
  const [receivedInput, setReceivedInput] = useState<string>('');
  const [uploadedInput, setUploadedInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submittedFeedback, setSubmittedFeedback] = useState<boolean>(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedInput.trim() || !uploadedInput.trim()) {
      alert('Please fill in both Received and Uploaded counts.');
      return;
    }

    const newRecord: DailyRecord = {
      id: existingRecord ? existingRecord.id : `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
    setSubmittedFeedback(true);
    setTimeout(() => setSubmittedFeedback(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-12">
      {/* Top Banner matching Exam Ops theme */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Post Exam Intake &amp; Upload
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Logged in as <strong className="text-white">{currentUser.name}</strong> • Station: <strong className="text-slate-200">{currentUser.station}</strong>. Select the school and submit daily counts.
        </p>
      </div>

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
                All entries sync live to the Platform Admin dashboard.
              </p>
            </div>
            {existingRecord && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#181F2C] border border-[#273244] text-slate-300 flex items-center space-x-1 font-mono">
                <Edit2 className="w-3 h-3 text-slate-400" />
                <span>Editing Record</span>
              </span>
            )}
          </div>

          {submittedFeedback && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Data successfully synced to Super Admin dashboard for <strong>{selectedSchool}</strong>!
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
                    <strong>Admin Notice:</strong> You received {receivedCount} but uploaded {uploadedCount}. Please provide a note below explaining the backlog.
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
              className="w-full py-2.5 px-4 bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold rounded-xl border border-[#303D57] transition-all flex items-center justify-center space-x-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{existingRecord ? 'Update Record' : 'Save & Sync to Platform'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0E121A] rounded-2xl border border-[#1E2430] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1A202C]">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>My Logged Batches</span>
              </h3>
              <span className="text-[11px] text-slate-500">Click to edit</span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {myRecords.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center italic">
                  No batches submitted yet today. Enter your first school log above!
                </p>
              ) : (
                myRecords.map((r) => {
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
    </div>
  );
};
