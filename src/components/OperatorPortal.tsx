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
  Building2,
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Operator Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Scanning Operator Station</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
            Assigned to: <strong className="text-white">{currentUser.station}</strong>. Select the school and submit your daily count of scripts received vs. successfully uploaded.
          </p>
        </div>

        {/* Decorative circle glow */}
        <div className="absolute -right-8 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: The Daily Logging Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>School-Wise Script Intake &amp; Upload Form</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record your daily totals by school. Super Admin monitors these logs for department sync.
              </p>
            </div>
            {existingRecord && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
                <Edit2 className="w-3 h-3" />
                <span>Editing Log</span>
              </span>
            )}
          </div>

          {submittedFeedback && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Daily log for <strong>{selectedSchool}</strong> successfully saved and transmitted to Super Admin dashboard!
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* School Selector (Prominent) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Select School / Faculty</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
              >
                {AVAILABLE_SCHOOLS.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Select which school these scripts belong to before entering the counts.
              </p>
            </div>

            {/* Date & Shift Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Logging Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Work Shift</span>
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors"
                >
                  <option value="Morning">Morning Shift (08:00 - 14:00)</option>
                  <option value="Afternoon">Afternoon Shift (14:00 - 20:00)</option>
                  <option value="Night">Night Shift (20:00 - 02:00)</option>
                  <option value="Full Day">Full Day Ingestion</option>
                </select>
              </div>
            </div>

            {/* Counts: Received and Uploaded */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Scripts Received
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Total physical scripts received for {selectedSchool}.
                </p>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 250"
                  value={receivedInput}
                  onChange={(e) => setReceivedInput(e.target.value)}
                  className="w-full text-lg font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full text-lg font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Calculation Feedback Card */}
            {receivedInput !== '' && uploadedInput !== '' && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  hasDiscrepancy
                    ? 'bg-amber-50/70 border-amber-200'
                    : isOverUploaded
                    ? 'bg-blue-50/70 border-blue-200'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {hasDiscrepancy ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block text-slate-700">
                        {selectedSchool} Status
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          hasDiscrepancy
                            ? 'text-amber-900'
                            : isOverUploaded
                            ? 'text-blue-900'
                            : 'text-emerald-900'
                        }`}
                      >
                        {hasDiscrepancy
                          ? `⚠️ ${pendingCount} Scripts Pending Upload`
                          : isOverUploaded
                          ? `Notice: Uploaded exceeds Received (+${uploadedCount - receivedCount})`
                          : '100% Uploaded (All Received Scripts Synchronized)'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700">
                      {completionRate.toFixed(1)}%
                    </span>
                    <p className="text-[10px] text-slate-500">Completion</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full h-2 bg-white/80 rounded-full overflow-hidden border border-black/5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      completionRate >= 100
                        ? 'bg-emerald-500'
                        : completionRate >= 90
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, completionRate)}%` }}
                  />
                </div>

                {hasDiscrepancy && (
                  <p className="mt-2 text-xs text-amber-800">
                    <strong>Super Admin Notice:</strong> You received {receivedCount} for {selectedSchool} but uploaded {uploadedCount}. Please provide a reason below so management knows the cause of the backlog.
                  </p>
                )}
              </div>
            )}

            {/* Notes / Reason for Backlog */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shift Notes / Backlog Explanation {hasDiscrepancy && <span className="text-amber-600">* (Recommended)</span>}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  hasDiscrepancy
                    ? `e.g. 10 scripts from ${selectedSchool} had missing barcode sheets, kept for supervisor recheck...`
                    : 'Any batch notes or observations (optional)...'
                }
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>
                  {existingRecord ? `Update Log for ${selectedSchool}` : `Submit Daily Log for ${selectedSchool}`}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Workstation Info & Operator's Recent History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Station Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Workstation Details
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Hardware / Station:</span>
                <span className="font-semibold text-slate-900">{currentUser.station}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold text-slate-900">{currentUser.department}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">System Role:</span>
                <span className="font-semibold text-emerald-700 uppercase">Scanning Operator</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Total Logs Recorded:</span>
                <span className="font-semibold text-slate-900">{myRecords.length} Entries</span>
              </div>
            </div>
          </div>

          {/* Operator's Personal Past Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>My Past Logs</span>
              </h3>
              <span className="text-[11px] text-slate-400">Click to load</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {myRecords.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center italic">
                  No previous logs found. Submit your first school log for today!
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
                          ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">{r.date}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isPending ? `${r.pendingCount} Pending` : '100% Uploaded'}
                        </span>
                      </div>

                      {/* School badge */}
                      <div className="text-[11px] font-semibold text-indigo-700 truncate mb-1 flex items-center space-x-1">
                        <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{r.school || 'General Batch'}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                        <span>
                          Rec: <strong className="text-slate-900">{r.receivedCount}</strong> | Up:{' '}
                          <strong className="text-emerald-700">{r.uploadedCount}</strong>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {r.completionRate.toFixed(1)}%
                        </span>
                      </div>

                      {r.notes && (
                        <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-1 italic">
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
