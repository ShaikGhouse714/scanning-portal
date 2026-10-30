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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans">
      <div className="bg-[#0E121A] rounded-2xl shadow-2xl border border-[#1E2430] w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1A202C] flex items-center justify-between bg-[#0B0E14]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Shift Log Audit &amp; Edit</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {record.userName} • {record.station}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2230] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#121620] rounded-xl border border-[#212836] text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5 text-[10px] uppercase">LOG DATE</span>
              <div className="flex items-center space-x-1.5 text-white font-mono font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{record.date}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5 text-[10px] uppercase">CENTER / STATION</span>
              <div className="truncate text-slate-200 font-medium">{record.station}</div>
            </div>
          </div>

          {/* School Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span>School / Faculty</span>
            </label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-[#121620] border border-[#212836] rounded-lg text-white focus:outline-none"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Scripts Received
              </label>
              <input
                type="number"
                min="0"
                required
                value={receivedCount}
                onChange={(e) => setReceivedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-sm font-mono font-bold px-3 py-2 bg-[#121620] border border-[#212836] rounded-lg text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Scripts Uploaded
              </label>
              <input
                type="number"
                min="0"
                required
                value={uploadedCount}
                onChange={(e) => setUploadedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-sm font-mono font-bold px-3 py-2 bg-[#121620] border border-[#212836] rounded-lg text-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Pending */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              pending > 0
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
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
                  {pending > 0 ? `${pending} Scripts Pending Upload` : '100% Uploaded (Synced)'}
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                  Completion: {completionRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                pending > 0 ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'
              }`}
            >
              {status === 'completed' ? 'SYNCED' : 'DISCREPANCY'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Shift
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full text-xs px-3 py-2 bg-[#121620] border border-[#212836] rounded-lg text-white focus:outline-none"
            >
              <option value="Morning">Morning Shift (08:00 - 14:00)</option>
              <option value="Afternoon">Afternoon Shift (14:00 - 20:00)</option>
              <option value="Night">Night Shift (20:00 - 02:00)</option>
              <option value="Full Day">Full Day Ingestion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Discrepancy Notes / Audit Reason
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 15 scripts had blurred barcodes..."
              className="w-full text-xs p-3 bg-[#121620] border border-[#212836] rounded-lg text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1A202C]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#1E2536] text-white text-xs font-medium rounded-lg hover:bg-[#283248] border border-[#303D57]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
