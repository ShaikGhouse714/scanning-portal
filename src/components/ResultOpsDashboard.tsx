'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Download,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  X,
  ExternalLink,
  HelpCircle,
  AlertOctagon,
  Calendar,
  Building2,
  FileCheck,
  Settings2,
  Edit2,
  Eye,
} from 'lucide-react';

export interface SavedResultSheet {
  id: string;
  name: string;
  url: string;
  subsheetName: string;
  lastSyncedAt?: string;
  totalRecords?: number;
  actionRequiredCount?: number;
}

export interface ResultRow {
  id: string;
  scheduleId: string;
  evaluationCycle: string;
  resultOpenDate: string;
  resultCloseDate: string;
  resultCloseTime: string;
  closeTimestamp: number | null;
  schoolName: string;
  nextRoundRequired: string;
  nextRoundAssigned: string;
  isExpired: boolean;
  status: 'EXPIRED_ACTION_REQUIRED' | 'ACTIVE' | 'ASSIGNED' | 'NOT_REQUIRED';
  raw: Record<string, any>;
}

const DEFAULT_SHEETS: SavedResultSheet[] = [
  {
    id: 'sheet_kiit_midsem_2026',
    name: 'KIIT University - Sep 2026 MIDSEM',
    url: '',
    subsheetName: 'Result view',
  },
];

function formatDisplayTime(val: any): string {
  if (!val) return '–';
  const str = String(val).trim();
  const num = typeof val === 'number' ? val : Number(str);
  if (
    !isNaN(num) &&
    num >= 0 &&
    !str.includes(':') &&
    !str.includes('AM') &&
    !str.includes('PM') &&
    !str.match(/\.\d{2}\./)
  ) {
    let fraction = num % 1;
    if (fraction === 0 && num > 0 && num < 1) fraction = num;
    const totalSeconds = Math.round(fraction * 86400);
    const rawHours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    const displayHours = rawHours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
  }

  // Normalize dots to colons between digits (e.g. "10.00.00 AM" or "10.30 AM" -> "10:00:00 AM")
  const normalized = str.replace(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/g, (m, h, min, s) => {
    return `${h}:${min}:${s || '00'}`;
  });

  const match = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const s = match[3] || '00';
    const ampm = match[4] ? match[4].toUpperCase() : null;
    if (ampm) {
      return `${h}:${m}:${s} ${ampm}`;
    } else {
      const isPM = h >= 12;
      const displayH = h % 12 || 12;
      return `${displayH}:${m}:${s} ${isPM ? 'PM' : 'AM'}`;
    }
  }

  const simpleMatch = str.match(/(\d{1,2})\s*(AM|PM)/i);
  if (simpleMatch) {
    const h = parseInt(simpleMatch[1], 10);
    const ampm = simpleMatch[2].toUpperCase();
    return `${h}:00:00 ${ampm}`;
  }

  return str;
}

export const ResultOpsDashboard: React.FC = () => {
  // Saved Google Sheets List (Stored in localStorage)
  const [savedSheets, setSavedSheets] = useState<SavedResultSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');

  // Active Sheet URL & Subsheet override
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [targetSubsheet, setTargetSubsheet] = useState<string>('Result view');

  // Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Loaded Records & Subsheets
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [availableSubsheets, setAvailableSubsheets] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('Result view');
  const [schoolsList, setSchoolsList] = useState<string[]>([]);

  // Filtering & Search
  const [activeTabFilter, setActiveTabFilter] = useState<'ACTION_REQUIRED' | 'ALL' | 'ACTIVE' | 'ASSIGNED' | 'NOT_REQUIRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // CSV Export & Actions State (Action Required Tab Only)
  const [showCsvMenu, setShowCsvMenu] = useState<boolean>(false);
  const [csvCopiedMessage, setCsvCopiedMessage] = useState<string | null>(null);
  const csvMenuRef = useRef<HTMLDivElement>(null);

  // Close CSV dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (csvMenuRef.current && !csvMenuRef.current.contains(event.target as Node)) {
        setShowCsvMenu(false);
      }
    };
    if (showCsvMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCsvMenu]);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newSheetName, setNewSheetName] = useState<string>('');
  const [newSheetUrl, setNewSheetUrl] = useState<string>('');
  const [newSubsheetName, setNewSubsheetName] = useState<string>('Result view');

  // Edit Current Sheet Modal
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editSheetName, setEditSheetName] = useState<string>('');
  const [editSheetUrl, setEditSheetUrl] = useState<string>('');
  const [editSubsheetName, setEditSubsheetName] = useState<string>('Result view');

  // Load Saved Sheets from localStorage on Mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('scantrack_saved_result_sheets_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedSheets(parsed);
          setSelectedSheetId(parsed[0].id);
          setSheetUrl(parsed[0].url);
          setTargetSubsheet(parsed[0].subsheetName || 'Result view');
          return;
        }
      }
    } catch {
      // ignore
    }
    // Default fallback
    setSavedSheets(DEFAULT_SHEETS);
    setSelectedSheetId(DEFAULT_SHEETS[0].id);
    setSheetUrl(DEFAULT_SHEETS[0].url);
    setTargetSubsheet(DEFAULT_SHEETS[0].subsheetName);
  }, []);

  // Save sheets to localStorage
  const persistSheets = (
    updater: SavedResultSheet[] | ((prev: SavedResultSheet[]) => SavedResultSheet[])
  ) => {
    setSavedSheets((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('scantrack_saved_result_sheets_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Switch selected sheet
  const handleSelectSheet = (sheetId: string) => {
    const found = savedSheets.find((s) => s.id === sheetId);
    if (found) {
      setSelectedSheetId(found.id);
      setSheetUrl(found.url);
      setTargetSubsheet(found.subsheetName || 'Result view');
      setRows([]);
      setSyncError(null);
      if (found.url) {
        handleSyncSheet(found.url, found.subsheetName, found.id);
      }
    }
  };

  // Sync Live Data from Google Sheets
  const handleSyncSheet = async (
    overrideUrl?: string,
    overrideSubsheet?: string,
    overrideSheetId?: string
  ) => {
    const urlToUse = (overrideUrl !== undefined ? overrideUrl : sheetUrl).trim();
    const subsheetToUse = (overrideSubsheet !== undefined ? overrideSubsheet : targetSubsheet).trim();
    const targetSheetId = overrideSheetId || selectedSheetId;

    if (!urlToUse) {
      setSyncError('Please provide a Google Sheet link or select a saved published sheet.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch('/api/result-fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToUse,
          targetSubsheet: subsheetToUse || 'Result view',
          clientTime: Date.now(),
          tzOffset: '+05:30',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to sync Google Sheet data.');
      }

      setRows(data.rows || []);
      setAvailableSubsheets(data.sheetNames || []);
      setActiveSheetName(data.activeSheetName || 'Result view');
      setSchoolsList(data.schools || []);

      const syncTimestamp = new Date().toLocaleTimeString();
      setLastSyncTime(syncTimestamp);

      // Update metadata for this saved sheet using functional updater so no other sheets are lost!
      persistSheets((prev) =>
        prev.map((s) =>
          s.id === targetSheetId
            ? {
                ...s,
                url: urlToUse,
                subsheetName: data.activeSheetName || subsheetToUse,
                lastSyncedAt: syncTimestamp,
                totalRecords: data.totalRows,
                actionRequiredCount: data.actionRequiredCount,
              }
            : s
        )
      );

      // If there are action required schedules, automatically switch to action required tab
      if (data.actionRequiredCount > 0) {
        setActiveTabFilter('ACTION_REQUIRED');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Error synchronizing result sheet.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add New Google Sheet to Saved List
  const handleAddNewSheet = () => {
    if (!newSheetName.trim() || !newSheetUrl.trim()) {
      alert('Please enter both a Sheet Name and Google Sheet URL.');
      return;
    }

    const newId = `sheet_${Date.now()}`;
    const newEntry: SavedResultSheet = {
      id: newId,
      name: newSheetName.trim(),
      url: newSheetUrl.trim(),
      subsheetName: newSubsheetName.trim() || 'Result view',
    };

    persistSheets((prev) => {
      const filtered = prev.filter((s) => s.id !== newId);
      return [...filtered, newEntry];
    });

    setSelectedSheetId(newId);
    setSheetUrl(newEntry.url);
    setTargetSubsheet(newEntry.subsheetName);

    setShowAddModal(false);
    setNewSheetName('');
    setNewSheetUrl('');
    setNewSubsheetName('Result view');

    // Auto sync newly added sheet, explicitly passing newId!
    handleSyncSheet(newEntry.url, newEntry.subsheetName, newId);
  };

  // Open Edit Current Sheet Modal
  const handleOpenEditModal = () => {
    const current = savedSheets.find((s) => s.id === selectedSheetId);
    if (current) {
      setEditSheetName(current.name);
      setEditSheetUrl(current.url);
      setEditSubsheetName(current.subsheetName || 'Result view');
      setShowEditModal(true);
    }
  };

  // Save Edited Sheet
  const handleSaveEditedSheet = () => {
    if (!editSheetName.trim()) {
      alert('Please enter a Sheet Name.');
      return;
    }

    persistSheets((prev) =>
      prev.map((s) =>
        s.id === selectedSheetId
          ? {
              ...s,
              name: editSheetName.trim(),
              url: editSheetUrl.trim(),
              subsheetName: editSubsheetName.trim() || 'Result view',
            }
          : s
      )
    );

    setSheetUrl(editSheetUrl.trim());
    setTargetSubsheet(editSubsheetName.trim() || 'Result view');
    setShowEditModal(false);

    if (editSheetUrl.trim()) {
      handleSyncSheet(editSheetUrl.trim(), editSubsheetName.trim(), selectedSheetId);
    }
  };

  // Delete Saved Sheet
  const handleDeleteSheet = (sheetId: string) => {
    if (savedSheets.length <= 1) {
      alert('You must keep at least one sheet configured.');
      return;
    }
    if (!confirm('Are you sure you want to remove this saved Google Sheet?')) return;

    const filtered = savedSheets.filter((s) => s.id !== sheetId);
    persistSheets(filtered);
    if (selectedSheetId === sheetId) {
      setSelectedSheetId(filtered[0].id);
      setSheetUrl(filtered[0].url);
      setTargetSubsheet(filtered[0].subsheetName);
      setRows([]);
    }
  };

  // Helper to dynamically calculate precise status based on client's local time & timestamps
  const getRowStatus = useCallback((r: ResultRow) => {
    const isAssigned = r.nextRoundAssigned === 'Yes';
    const isNotRequired = r.nextRoundRequired === 'Not Required';
    const expired = r.closeTimestamp ? r.closeTimestamp <= Date.now() : r.isExpired;

    if (isAssigned) return 'ASSIGNED';
    if (!expired) return 'ACTIVE';
    if (isNotRequired) return 'NOT_REQUIRED';
    return 'EXPIRED_ACTION_REQUIRED';
  }, []);

  // Action Required Schedules (Expired and re-evaluation not yet assigned)
  const actionRequiredRows = useMemo(() => {
    return rows.filter((r) => getRowStatus(r) === 'EXPIRED_ACTION_REQUIRED');
  }, [rows, getRowStatus]);

  // Active / Currently Open Schedules (Result window currently open)
  const activeRows = useMemo(() => {
    return rows.filter((r) => getRowStatus(r) === 'ACTIVE');
  }, [rows, getRowStatus]);

  // Next Round Evaluation Assigned: Yes (Completed)
  const assignedRows = useMemo(() => {
    return rows.filter((r) => r.nextRoundAssigned === 'Yes');
  }, [rows]);

  // Next Round of Evaluation Not Required
  const notRequiredRows = useMemo(() => {
    return rows.filter((r) => getRowStatus(r) === 'NOT_REQUIRED' || r.nextRoundRequired === 'Not Required');
  }, [rows, getRowStatus]);

  // Filtered rows for data table
  const displayedRows = useMemo(() => {
    let list = rows;

    if (activeTabFilter === 'ACTION_REQUIRED') {
      list = actionRequiredRows;
    } else if (activeTabFilter === 'ACTIVE') {
      list = activeRows;
    } else if (activeTabFilter === 'ASSIGNED') {
      list = assignedRows;
    } else if (activeTabFilter === 'NOT_REQUIRED') {
      list = notRequiredRows;
    }

    if (selectedSchool !== 'ALL') {
      list = list.filter((r) => r.schoolName === selectedSchool);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.scheduleId.toLowerCase().includes(q) ||
          r.schoolName.toLowerCase().includes(q) ||
          r.evaluationCycle.toLowerCase().includes(q) ||
          r.resultCloseDate.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, activeTabFilter, actionRequiredRows, activeRows, assignedRows, notRequiredRows, selectedSchool, searchQuery]);

  // Copy Action Required Schedule IDs to Clipboard
  const handleCopyActionRequiredIds = () => {
    if (actionRequiredRows.length === 0) return;
    const ids = actionRequiredRows.map((r) => r.scheduleId).join(', ');
    navigator.clipboard.writeText(ids);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Copy Action Required Test IDs as separated CSV values
  const handleCopyActionRequiredIdsCsv = (format: 'comma' | 'raw_comma' | 'newline' = 'comma') => {
    const targetRows = displayedRows;
    if (targetRows.length === 0) return;

    const ids = targetRows.map((r) => r.scheduleId);
    let text = '';
    if (format === 'comma') {
      text = ids.join(', ');
    } else if (format === 'raw_comma') {
      text = ids.join(',');
    } else {
      text = ids.join('\n');
    }

    navigator.clipboard.writeText(text);
    setCsvCopiedMessage(`Copied ${ids.length} CSV Test IDs!`);
    setTimeout(() => setCsvCopiedMessage(null), 2500);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (displayedRows.length === 0) return;

    const excelData = displayedRows.map((r) => ({
      'Schedule id': r.scheduleId,
      'Evaluation Cycle': r.evaluationCycle,
      'Result Open Date': r.resultOpenDate,
      'Result Close Date': r.resultCloseDate,
      'Result Close Time': formatDisplayTime(r.resultCloseTime),
      'School Name': r.schoolName,
      'Next Round of Evaluation Required': r.nextRoundRequired || 'Pending / Blank',
      'Next Round Evaluation Assigned': r.nextRoundAssigned || 'Pending / Blank',
      'Action Status':
        r.status === 'EXPIRED_ACTION_REQUIRED'
          ? 'Time Completed - Re-evaluation Assignment Needed'
          : r.status === 'ACTIVE'
          ? 'Active / Open'
          : r.status === 'ASSIGNED'
          ? 'Assigned & Done'
          : 'Not Required / Closed',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 42 },
      { wch: 32 },
      { wch: 28 },
      { wch: 40 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Result View');
    const filename = `Result-Reevaluation-Status-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const currentSheet = savedSheets.find((s) => s.id === selectedSheetId) || savedSheets[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-zinc-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#222222] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Result &amp; Re-evaluation Tracker
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              Result Ops Channel
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Monitors Google Sheet result closure deadlines and flags completed cycles requiring immediate re-evaluation assignment.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Google Sheet ({savedSheets.length})</span>
          </button>
        </div>
      </div>

      {/* Sync Error Alert */}
      {syncError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-3 text-xs animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-200">Sync Notice</span>
            <span>{syncError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MULTI-SHEET SELECTOR & LIVE SYNC CONTROL BAR */}
      <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#222222] gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-xs font-mono font-bold">
              01
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Active Google Sheet &amp; Subsheet Selector
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono block">
                Switch between your 4–5 saved Google Sheets without having to re-enter links
              </span>
            </div>
          </div>

          {lastSyncTime && (
            <span className="text-[11px] font-mono text-zinc-400">
              Last synced: <strong className="text-white">{lastSyncTime}</strong>
            </span>
          )}
        </div>

        {/* Sheet Selector & Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Saved Sheets Dropdown */}
          <div className="md:col-span-5">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">
              Select Saved Google Sheet ({savedSheets.length} Available)
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={selectedSheetId}
                onChange={(e) => handleSelectSheet(e.target.value)}
                className="flex-1 bg-[#000000] border border-[#27272a] focus:border-white focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold transition-colors"
              >
                {savedSheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.totalRecords ? `(${s.totalRecords} records)` : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleOpenEditModal}
                className="p-2.5 rounded-xl border border-[#27272a] hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Edit name, URL, or target subsheet of this saved sheet"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subsheet Selector / Input */}
          <div className="md:col-span-3">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">
              Target Subsheet
            </label>
            {availableSubsheets.length > 1 ? (
              <select
                value={targetSubsheet}
                onChange={(e) => {
                  setTargetSubsheet(e.target.value);
                  handleSyncSheet(sheetUrl, e.target.value);
                }}
                className="w-full bg-[#000000] border border-[#27272a] focus:border-white focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono transition-colors"
              >
                {availableSubsheets.map((sn) => (
                  <option key={sn} value={sn}>
                    {sn}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={targetSubsheet}
                onChange={(e) => setTargetSubsheet(e.target.value)}
                placeholder="e.g. Result view"
                className="w-full bg-[#000000] border border-[#27272a] focus:border-white focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono transition-colors placeholder-zinc-500"
              />
            )}
          </div>

          {/* Sync Button & Delete Action */}
          <div className="md:col-span-4 flex items-center space-x-2 pt-4 md:pt-0">
            <button
              type="button"
              onClick={() => handleSyncSheet()}
              disabled={isSyncing}
              className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Live Sheet'}</span>
            </button>

            {savedSheets.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteSheet(selectedSheetId)}
                className="p-2.5 rounded-xl border border-[#27272a] hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-500 hover:text-rose-400 transition-colors"
                title="Remove this saved sheet from list"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* URL Display and Edit toggle */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-zinc-500 gap-2 border-t border-[#1a1a1a]">
          <div className="flex items-center space-x-2 truncate">
            <span className="text-zinc-400">Sheet URL:</span>
            <span className="text-zinc-400 truncate max-w-lg">{sheetUrl || 'No URL configured'}</span>
          </div>
          {currentSheet?.lastSyncedAt && (
            <span className="text-zinc-400 shrink-0">
              Subsheet: <strong className="text-white">{activeSheetName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CRITICAL ALERT BANNER (Triggers if close date/time is expired & unassigned) */}
      {/* ========================================================================= */}
      {actionRequiredRows.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 shadow-2xl animate-in fade-in duration-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>Time is completed! Please check re-evaluations and assign.</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold">
                    {actionRequiredRows.length} PENDING
                  </span>
                </h3>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  Result Close Date and Time has elapsed for these schedules with next round required, but evaluation is not yet assigned.
                </p>
              </div>
            </div>

            {/* Quick Actions for Expired Schedules */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyActionRequiredIds}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors shadow-md"
                title="Copy all expired schedule IDs as comma-separated list"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? 'Copied IDs!' : 'Copy Pending Schedule IDs'}</span>
              </button>
            </div>
          </div>

          {/* Quick Pill list of the expired schedule IDs */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-rose-300 font-semibold uppercase tracking-wider block">
              Expired Schedules Awaiting Re-evaluation Assignment:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {actionRequiredRows.map((r) => (
                <span
                  key={r.id}
                  className="font-mono text-xs px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-100 font-bold"
                >
                  {r.scheduleId} <span className="text-[10px] text-rose-400 font-normal">({r.schoolName ? r.schoolName.split(' ')[2] || r.schoolName.slice(0, 10) : ''})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Action Required */}
        <div
          onClick={() => setActiveTabFilter('ACTION_REQUIRED')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            activeTabFilter === 'ACTION_REQUIRED'
              ? 'bg-rose-500/15 border-2 border-rose-500 shadow-lg'
              : 'bg-[#09090b] border border-[#27272a] hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block font-semibold">
              Action Required
            </span>
            {actionRequiredRows.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <span className="text-2xl font-bold font-mono text-white block mt-1">
            {actionRequiredRows.length}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
            Time expired &amp; unassigned
          </span>
        </div>

        {/* KPI 2: Active / Ongoing */}
        <div
          onClick={() => setActiveTabFilter('ACTIVE')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            activeTabFilter === 'ACTIVE'
              ? 'bg-sky-500/15 border-2 border-sky-400 text-white shadow-lg'
              : 'bg-[#09090b] border border-[#27272a] hover:border-zinc-500'
          }`}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block font-semibold">
            Result Open (Active)
          </span>
          <span className="text-2xl font-bold font-mono text-white block mt-1">
            {activeRows.length}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
            Closes in future
          </span>
        </div>

        {/* KPI 3: Assigned & Closed */}
        <div
          onClick={() => setActiveTabFilter('ASSIGNED')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            activeTabFilter === 'ASSIGNED'
              ? 'bg-emerald-500/15 border-2 border-emerald-500 text-white shadow-lg'
              : 'bg-[#09090b] border border-[#27272a] hover:border-emerald-500/40'
          }`}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block font-semibold">
            Assigned (Completed)
          </span>
          <span className="text-2xl font-bold font-mono text-white block mt-1">
            {assignedRows.length}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
            Next round assigned: Yes
          </span>
        </div>

        {/* KPI 4: Not Required */}
        <div
          onClick={() => setActiveTabFilter('NOT_REQUIRED')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            activeTabFilter === 'NOT_REQUIRED'
              ? 'bg-zinc-800 border-2 border-zinc-400 text-white shadow-lg'
              : 'bg-[#09090b] border border-[#27272a] hover:border-zinc-500'
          }`}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
            Not Required
          </span>
          <span className="text-2xl font-bold font-mono text-white block mt-1">
            {notRequiredRows.length}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
            Re-evaluation not needed
          </span>
        </div>

        {/* KPI 5: Total Tracked */}
        <div
          onClick={() => setActiveTabFilter('ALL')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            activeTabFilter === 'ALL'
              ? 'bg-zinc-800 border-2 border-white text-white shadow-lg'
              : 'bg-[#09090b] border border-[#27272a] hover:border-zinc-500'
          }`}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
            Total Tracked Schedules
          </span>
          <span className="text-2xl font-bold font-mono text-white block mt-1">
            {rows.length}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
            Subsheet: {activeSheetName}
          </span>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <div className="bg-[#09090b] rounded-2xl border border-[#27272a] overflow-hidden shadow-2xl space-y-3">
        {/* Table Controls */}
        <div className="p-4 border-b border-[#27272a] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                activeTabFilter === 'ALL'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-[#27272a]'
              }`}
            >
              All Records ({rows.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('ACTION_REQUIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTabFilter === 'ACTION_REQUIRED'
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
              }`}
            >
              <span>Action Required ({actionRequiredRows.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                activeTabFilter === 'ACTIVE'
                  ? 'bg-sky-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-[#27272a]'
              }`}
            >
              Active / Open ({activeRows.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('ASSIGNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                activeTabFilter === 'ASSIGNED'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              Assigned ({assignedRows.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('NOT_REQUIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                activeTabFilter === 'NOT_REQUIRED'
                  ? 'bg-zinc-300 text-black font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-[#27272a]'
              }`}
            >
              Not Required ({notRequiredRows.length})
            </button>
          </div>

          {/* Search, School Filter & Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schedules..."
                className="bg-[#000000] border border-[#27272a] focus:border-zinc-400 focus:outline-none rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono w-44"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* School Filter Dropdown */}
            {schoolsList.length > 1 && (
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-[#000000] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none font-mono max-w-[160px] truncate"
              >
                <option value="ALL">All Schools ({schoolsList.length})</option>
                {schoolsList.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            )}

            {/* ONLY FOR ACTION REQUIRED TAB: Copy separated CSV values of Test IDs right there */}
            {activeTabFilter === 'ACTION_REQUIRED' && (
              <div className="relative inline-flex items-center shrink-0" ref={csvMenuRef}>
                {/* 1-Click Copy CSV Test IDs Button */}
                <button
                  type="button"
                  onClick={() => handleCopyActionRequiredIdsCsv('comma')}
                  disabled={displayedRows.length === 0}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-l-lg font-semibold text-xs transition-colors shadow-sm border-r ${
                    csvCopiedMessage
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white border-rose-700/60'
                  }`}
                  title="Click to copy comma-separated test IDs directly to clipboard"
                >
                  {csvCopiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>{csvCopiedMessage}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy CSV Test IDs ({displayedRows.length})</span>
                    </>
                  )}
                </button>

                {/* Dropdown / Popover toggle to view and take data directly */}
                <button
                  type="button"
                  onClick={() => setShowCsvMenu((prev) => !prev)}
                  disabled={displayedRows.length === 0}
                  className={`px-2 py-1.5 rounded-r-lg text-xs transition-colors shadow-sm ${
                    csvCopiedMessage
                      ? 'bg-emerald-700 text-white'
                      : 'bg-rose-700 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white'
                  }`}
                  title="View and take CSV separated test IDs directly from here"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCsvMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* In-place Popover showing CSV values right there */}
                {showCsvMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-[#111114] border border-[#27272a] rounded-xl shadow-2xl p-3 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                      <div>
                        <span className="text-xs font-bold text-white block">Action Required Test IDs (CSV)</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {displayedRows.length} separated test ID{displayedRows.length === 1 ? '' : 's'} available
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {displayedRows.length} IDs
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider block mb-1">
                        Separated CSV Values (Click to select &amp; copy directly):
                      </label>
                      <textarea
                        readOnly
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        value={displayedRows.map((r) => r.scheduleId).join(', ')}
                        className="w-full h-24 bg-[#000000] border border-[#27272a] rounded-lg p-2 font-mono text-[11px] text-zinc-200 focus:outline-none focus:border-rose-500 selection:bg-rose-500 selection:text-white resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyActionRequiredIdsCsv('comma')}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy CSV (comma-separated)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyActionRequiredIdsCsv('newline')}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-[11px] transition-colors border border-zinc-700"
                        title="Copy as column (one per line)"
                      >
                        <Copy className="w-3 h-3" />
                        <span>One per line</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={displayedRows.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-sm shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel ({displayedRows.length})</span>
            </button>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#000000] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a] sticky top-0 z-10 font-mono">
              <tr>
                <th className="py-3 px-3.5">Schedule ID</th>
                <th className="py-3 px-3">Evaluation Cycle</th>
                <th className="py-3 px-3">Result Open Date</th>
                <th className="py-3 px-3">Result Close Date</th>
                <th className="py-3 px-3">Result Close Time</th>
                <th className="py-3 px-3">School Name</th>
                <th className="py-3 px-3">Next Round Required</th>
                <th className="py-3 px-3">Next Round Assigned</th>
                <th className="py-3 px-3.5 text-center">Alert Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] font-mono text-zinc-300">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 text-xs">
                    {rows.length === 0
                      ? 'No data synchronized yet. Click "Sync Live Sheet" above to fetch Result view rows.'
                      : 'No records match your selected filter or search.'}
                  </td>
                </tr>
              ) : (
                displayedRows.map((r) => {
                  const currentStatus = getRowStatus(r);
                  const isAction = currentStatus === 'EXPIRED_ACTION_REQUIRED';
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isAction ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'hover:bg-[#121214]'
                      }`}
                    >
                      {/* Schedule ID */}
                      <td className="py-3 px-3.5 font-bold text-white whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            isAction
                              ? 'bg-rose-500/20 text-rose-200 border-rose-500/40 font-mono'
                              : 'bg-zinc-800 text-white border-zinc-700'
                          }`}
                        >
                          {r.scheduleId}
                        </span>
                      </td>

                      {/* Evaluation Cycle */}
                      <td className="py-3 px-3 text-purple-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[11px]">
                          {r.evaluationCycle}
                        </span>
                      </td>

                      {/* Result Open Date */}
                      <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                        {r.resultOpenDate || '–'}
                      </td>

                      {/* Result Close Date */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-white">
                        {r.resultCloseDate || '–'}
                      </td>

                      {/* Result Close Time */}
                      <td className="py-3 px-3 whitespace-nowrap text-zinc-300 font-semibold font-mono text-xs">
                        {formatDisplayTime(r.resultCloseTime)}
                      </td>

                      {/* School Name */}
                      <td className="py-3 px-3 font-sans text-zinc-300 text-[11px] truncate max-w-[220px]">
                        {r.schoolName || '–'}
                      </td>

                      {/* Next Round Required */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {r.nextRoundRequired === 'Required' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/30 text-rose-300">
                            Required
                          </span>
                        ) : r.nextRoundRequired === 'Not Required' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                            Not Required
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-500">
                            Blank / Pending
                          </span>
                        )}
                      </td>

                      {/* Next Round Assigned */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {r.nextRoundAssigned === 'Yes' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400">
                            Blank / Pending
                          </span>
                        )}
                      </td>

                      {/* Alert Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {isAction ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500 text-white shadow-md inline-flex items-center space-x-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-white" />
                            <span>Time Expired — Check &amp; Assign!</span>
                          </span>
                        ) : currentStatus === 'ASSIGNED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            Assigned &amp; Done
                          </span>
                        ) : currentStatus === 'NOT_REQUIRED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
                            Not Required / Closed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 border border-sky-500/25 text-sky-400">
                            Active / Open
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD NEW GOOGLE SHEET MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold text-white">Add New Google Sheet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Sheet Name / Label
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="e.g. KIIT University - Sep 2026 MIDSEM"
                  className="w-full bg-[#000000] border border-[#27272a] rounded-xl px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Google Sheet URL / Published Web Link
                </label>
                <input
                  type="text"
                  value={newSheetUrl}
                  onChange={(e) => setNewSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-[#000000] border border-[#27272a] rounded-xl px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Ensure sheet link sharing is set to "Anyone with link" or published to web.
                </span>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Target Subsheet Name
                </label>
                <input
                  type="text"
                  value={newSubsheetName}
                  onChange={(e) => setNewSubsheetName(e.target.value)}
                  placeholder="Result view"
                  className="w-full bg-[#000000] border border-[#27272a] rounded-xl px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-[#27272a] text-zinc-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewSheet}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold"
              >
                Save &amp; Select Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CURRENT GOOGLE SHEET MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <Edit2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold text-white">Edit Sheet Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Sheet Name / Label
                </label>
                <input
                  type="text"
                  value={editSheetName}
                  onChange={(e) => setEditSheetName(e.target.value)}
                  placeholder="e.g. KIIT University - Sep 2026 MIDSEM"
                  className="w-full bg-[#000000] border border-[#27272a] rounded-xl px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Google Sheet URL / Published Web Link
                </label>
                <input
                  type="text"
                  value={editSheetUrl}
                  onChange={(e) => setEditSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-[#000000] border border-[#27272a] rounded-xl px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Target Subsheet Name
                </label>
                <input
                  type="text"
                  value={editSubsheetName}
                  onChange={(e) => setEditSubsheetName(e.target.value)}
                  placeholder="Result view"
                  className="w-full bg-[#000000] border border-[#27272a] rounded-xl px-3 py-2 text-white font-mono focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl border border-[#27272a] text-zinc-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedSheet}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold"
              >
                Save Changes &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

