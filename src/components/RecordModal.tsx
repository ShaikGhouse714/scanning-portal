'use client';

import React, { useState } from 'react';
import { DailyRecord } from '../types';
import { AVAILABLE_SCHOOLS } from '../lib/mockData';
import { X, Calendar, GraduationCap, FileText, CheckCircle2, AlertTriangle, Save, Clock } from 'lucide-react';
import { computeStatus } from '../lib/storage';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DailyRecord | null;
  onSave: (record: DailyRecord) => void;
  isAdmin: boolean;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
  isAdmin,
}) => {
  const [receivedCount, setReceivedCount] = useState<number>(record?.receivedCount || 0);
  const [uploadedCount, setUploadedCount] = useState<number>(record?.uploadedCount || 0);
  const [notes, setNotes] = useState<string>(record?.notes || '');
  const [shift, setShift] = useState(record?.shift || 'Morning');
  const [school, setSchool] = useState(record?.school || AVAILABLE_SCHOOLS[0]);

  React.useEffect(() => {
    if (record) {
      setReceivedCount(record.receivedCount);
      setUploadedCount(record.uploadedCount);
      setNotes(record.notes || '');
      setShift(record.shift || 'Morning');
      setSchool(record.school || AVAILABLE_SCHOOLS[0]);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const pending = Math.max(0, receivedCount - uploadedCount);
  const completionRate = receivedCount > 0 ? (uploadedCount / receivedCount) * 100 : 100;
  const status = computeStatus(receivedCount, uploadedCount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DailyRecord = {
      ...record,
      school,
      receivedCount,
      uploadedCount,
      pendingCount: pending,
      completionRate,
      status,
      notes: notes.trim(),
      shift: shift as any,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
      <div className="bg-[#091122] rounded-2xl shadow-2xl border border-cyan-900/60 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-950 flex items-center justify-between bg-[#060C1A]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>LOG AUDIT // RECORD INSPECTOR</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {record.userName} • {record.station}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#050A16] rounded-xl border border-cyan-950 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5 text-[10px] uppercase">LOG DATE</span>
              <div className="flex items-center space-x-1.5 text-white font-bold">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{record.date}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5 text-[10px] uppercase">CENTER / STATION</span>
              <div className="truncate text-cyan-300 font-bold">{record.station}</div>
            </div>
          </div>

          {/* School Selector */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1 flex items-center space-x-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              <span>SCHOOL / FACULTY</span>
            </label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 bg-[#050A16] border border-cyan-950 rounded-lg text-white focus:outline-none focus:border-cyan-400"
            >
              {AVAILABLE_SCHOOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">
                SCRIPTS RECEIVED
              </label>
              <input
                type="number"
                min="0"
                required
                value={receivedCount}
                onChange={(e) => setReceivedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-sm font-bold px-3 py-2 bg-[#050A16] border border-cyan-950 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">
                SCRIPTS UPLOADED
              </label>
              <input
                type="number"
                min="0"
                required
                value={uploadedCount}
                onChange={(e) => setUploadedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-sm font-bold px-3 py-2 bg-[#050A16] border border-cyan-950 rounded-lg text-emerald-400 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Dynamic Pending */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              pending > 0
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {pending > 0 ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {pending > 0 ? `${pending} SCRIPTS PENDING` : '100% SYNCHRONIZED'}
                </span>
                <p className="text-[10px] text-slate-400">
                  Rate: {completionRate.toFixed(1)}% processed
                </p>
              </div>
            </div>
            <span
              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                pending > 0 ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'
              }`}
            >
              {status === 'completed' ? 'COMPLETE' : 'DISCREPANCY'}
            </span>
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              WORK SHIFT
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full text-xs px-3 py-2 bg-[#050A16] border border-cyan-950 rounded-lg text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="Morning">Morning (08:00 - 14:00)</option>
              <option value="Afternoon">Afternoon (14:00 - 20:00)</option>
              <option value="Night">Night (20:00 - 02:00)</option>
              <option value="Full Day">Full Day Ingestion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              DISCREPANCY REASON / AUDIT NOTES
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 15 scripts had blurred barcodes..."
              className="w-full text-xs p-3 bg-[#050A16] border border-cyan-950 rounded-lg text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-cyan-950">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE CHANGES</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
