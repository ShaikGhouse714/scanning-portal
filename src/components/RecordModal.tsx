'use client';

import React, { useState } from 'react';
import { DailyRecord } from '../types';
import { X, Calendar, User, FileText, CheckCircle2, AlertTriangle, Save, Clock } from 'lucide-react';
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

  // Reset internal state when record changes
  React.useEffect(() => {
    if (record) {
      setReceivedCount(record.receivedCount);
      setUploadedCount(record.uploadedCount);
      setNotes(record.notes || '');
      setShift(record.shift || 'Morning');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Shift Log Details &amp; Audit</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.userName} • {record.station}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Log Date</span>
              <div className="flex items-center space-x-1.5 text-slate-900 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{record.date}</span>
              </div>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Workstation</span>
              <div className="truncate text-slate-900 font-medium">{record.station}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scripts Received
              </label>
              <input
                type="number"
                min="0"
                required
                value={receivedCount}
                onChange={(e) => setReceivedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-sm font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scripts Uploaded
              </label>
              <input
                type="number"
                min="0"
                required
                value={uploadedCount}
                onChange={(e) => setUploadedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-sm font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Pending & Rate Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              pending > 0
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {pending > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {pending > 0 ? `${pending} Scripts Pending Upload` : '100% Uploaded (No Backlog)'}
                </span>
                <p className="text-[11px] opacity-80">
                  Efficiency: {completionRate.toFixed(1)}% of received scripts processed
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                pending > 0 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {status === 'completed' ? 'Synchronized' : 'Discrepancy'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shift Assigned
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Morning">Morning Shift (08:00 - 14:00)</option>
              <option value="Afternoon">Afternoon Shift (14:00 - 20:00)</option>
              <option value="Night">Night Shift (20:00 - 02:00)</option>
              <option value="Full Day">Full Day Ingestion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Notes / Reason for Backlog
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 15 scripts had blurred barcodes, sent for manual verification..."
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
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

