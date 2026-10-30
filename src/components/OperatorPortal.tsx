'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User, DailyRecord } from '../types';
import { AVAILABLE_SCHOOLS } from '../lib/mockData';
import {
  FileText,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Save,
  Clock,
  History,
  GraduationCap,
  Edit2,
  Radio,
  ScanLine,
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

  // When date/school changes, populate form if existing record found
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

  // Numerical calculations
  const receivedCount = Math.max(0, parseInt(receivedInput) || 0);
  const uploadedCount = Math.max(0, parseInt(uploadedInput) || 0);
  const pendingCount = Math.max(0, receivedCount - uploadedCount);
  const hasDiscrepancy = pendingCount > 0;
  const isOverUploaded = uploadedCount > receivedCount && receivedCount > 0;
  const completionRate =
    receivedCount > 0 ? Math.min(100, (uploadedCount / receivedCount) * 100) : 100;

  // Filter operator's own submissions only
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
      id: existingRecord ? existingRecord.id : `rec_${Date.now()}`,
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
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Workstation HUD Banner */}
      <div className="bg-[#091122] rounded-2xl p-6 border border-cyan-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-16 h-1 bg-cyan-400" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 tracking-widest mb-2 uppercase">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>TERMINAL ACTIVE // {currentUser.station}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wide">
              OPERATOR: {currentUser.name}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">
              KIIT SCANNING BRANCH · SCRIPT INTAKE &amp; DISCREPANCY LOGGING
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-[#050A16] px-4 py-2 rounded-xl border border-cyan-900/60 font-mono text-right">
              <span className="text-[10px] text-slate-500 uppercase block">Total Submissions</span>
              <span className="text-base font-bold text-cyan-300">{myRecords.length} ENTRIES</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#091122] rounded-2xl border border-cyan-900/50 shadow-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-cyan-950 mb-5">
            <div>
              <h2 className="text-sm font-bold font-mono tracking-wider text-white uppercase flex items-center space-x-2">
                <ScanLine className="w-4 h-4 text-cyan-400" />
                <span>DAILY SCRIPT INTAKE FORM</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select target school and input intake vs. upload counts.
              </p>
            </div>
            {existingRecord && (
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1">
                <Edit2 className="w-3 h-3" />
                <span>LOG LOADED</span>
              </span>
            )}
          </div>

          {submittedFeedback && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs font-mono text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                DATA TRANSMITTED // Record for {selectedSchool} synced to Central Command.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* School Selector */}
            <div>
              <label className="block text-xs font-mono font-bold text-cyan-300/80 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                <span>SELECT FACULTY / SCHOOL</span>
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full text-xs font-mono px-3 py-3 bg-[#050A16] border border-cyan-900/70 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
              >
                {AVAILABLE_SCHOOLS.map((school) => (
                  <option key={school} value={school} className="bg-[#050A16] text-white">
                    {school}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Shift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-cyan-300/80 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LOGGING DATE</span>
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2.5 bg-[#050A16] border border-cyan-900/70 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-cyan-300/80 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>WORK SHIFT</span>
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full text-xs font-mono px-3 py-2.5 bg-[#050A16] border border-cyan-900/70 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors"
                >
                  <option value="Morning" className="bg-[#050A16]">Morning (08:00 - 14:00)</option>
                  <option value="Afternoon" className="bg-[#050A16]">Afternoon (14:00 - 20:00)</option>
                  <option value="Night" className="bg-[#050A16]">Night (20:00 - 02:00)</option>
                  <option value="Full Day" className="bg-[#050A16]">Full Day Operations</option>
                </select>
              </div>
            </div>

            {/* Counts: Received vs Uploaded */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-[#050A16] border border-cyan-900/50">
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                  1. SCRIPTS RECEIVED
                </label>
                <p className="text-[10px] font-mono text-slate-500 mb-2">
                  Total physical scripts received from branch.
                </p>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={receivedInput}
                  onChange={(e) => setReceivedInput(e.target.value)}
                  className="w-full text-xl font-mono font-bold px-3 py-2 bg-[#091122] border border-cyan-900/70 rounded-lg text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#050A16] border border-cyan-900/50">
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
                  2. SCRIPTS UPLOADED
                </label>
                <p className="text-[10px] font-mono text-slate-500 mb-2">
                  Total scanned &amp; verified into portal.
                </p>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={uploadedInput}
                  onChange={(e) => setUploadedInput(e.target.value)}
                  className="w-full text-xl font-mono font-bold px-3 py-2 bg-[#091122] border border-cyan-900/70 rounded-lg text-emerald-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            {/* Live Telemetry Meter */}
            {receivedInput !== '' && uploadedInput !== '' && (
              <div
                className={`p-4 rounded-xl border font-mono transition-all ${
                  hasDiscrepancy
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
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
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
                        TELEMETRY VERIFICATION
                      </span>
                      <span className="text-sm font-bold">
                        {hasDiscrepancy
                          ? `⚠️ DELTA: ${pendingCount} SCRIPTS PENDING UPLOAD`
                          : 'SYNCHRONIZED // 100% COMPLETE'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      {completionRate.toFixed(1)}%
                    </span>
                    <p className="text-[9px] text-slate-400 uppercase">SYNC RATE</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full h-1.5 bg-[#050A16] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      completionRate >= 100
                        ? 'bg-emerald-400'
                        : completionRate >= 90
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, completionRate)}%` }}
                  />
                </div>

                {hasDiscrepancy && (
                  <p className="mt-2 text-xs text-rose-300/90 font-mono">
                    Attention: You have {pendingCount} un-uploaded scripts. Please provide a reason below for Super Admin audit.
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                DISCREPANCY NOTES / REASON {hasDiscrepancy && <span className="text-rose-400">* REQUIRED</span>}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  hasDiscrepancy
                    ? `e.g. 10 scripts had faint barcode printing, kept for manual review...`
                    : 'Any batch notes or observations (optional)...'
                }
                className="w-full text-xs font-mono p-3 bg-[#050A16] border border-cyan-900/70 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold tracking-widest uppercase rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {existingRecord ? 'UPDATE RECORD' : 'TRANSMIT LOG TO COMMAND'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#091122] rounded-2xl border border-cyan-900/50 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3 border-b border-cyan-950 pb-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>MY LOGGED BATCHES</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">CLICK TO LOAD</span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {myRecords.length === 0 ? (
                <p className="text-xs font-mono text-slate-500 py-8 text-center">
                  NO BATCHES RECORDED YET. SUBMIT FIRST ENTRY ABOVE.
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
                      className={`p-3 rounded-xl border font-mono cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 shadow-md shadow-cyan-500/10'
                          : 'border-cyan-950 bg-[#050A16] hover:border-cyan-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-white">{r.date}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isPending
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isPending ? `⚠️ ${r.pendingCount} PENDING` : '100% SYNC'}
                        </span>
                      </div>

                      <div className="text-[11px] font-semibold text-cyan-300 truncate mb-1 flex items-center space-x-1">
                        <GraduationCap className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{r.school || 'General Batch'}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>
                          REC: <strong className="text-white">{r.receivedCount}</strong> | UP:{' '}
                          <strong className="text-emerald-400">{r.uploadedCount}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {r.completionRate.toFixed(1)}%
                        </span>
                      </div>

                      {r.notes && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 italic">
                          &quot;{r.notes}&quot;
                        </p>
                      )}
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
