'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Link2,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Layers,
  Copy,
  Check,
  ClipboardPaste,
  Trash2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface ExtractedRow {
  id: string;
  scheduleId: string;
  evaluatorEmail: string;
  studentEmail: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  schoolCode: string;
  examDate: string;
  raw: Record<string, any>;
}

export const EvalScheduleExtractor: React.FC = () => {
  // Google Sheet URL State
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Master Sheet Loaded Data
  const [masterRows, setMasterRows] = useState<ExtractedRow[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [allAvailableScheduleIds, setAllAvailableScheduleIds] = useState<string[]>([]);
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Schedule IDs Input
  const [scheduleIdsInput, setScheduleIdsInput] = useState<string>('');
  const [hasExtracted, setHasExtracted] = useState<boolean>(false);

  // Table Filter & Search
  const [tableSearch, setTableSearch] = useState<string>('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Load saved Google Sheet URL from localStorage on mount
  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem('eval_ops_master_sheet_url');
      if (savedUrl) {
        setSheetUrl(savedUrl);
      }
    } catch {
      // localStorage fallback
    }
  }, []);

  // Parse Schedule IDs from input (handles commas, spaces, newlines, semicolons)
  const parsedTargetScheduleIds = useMemo(() => {
    if (!scheduleIdsInput.trim()) return [];
    const tokens = scheduleIdsInput
      .split(/[\s,;]+/)
      .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter((t) => t.length > 0);
    // Unique list preserving order
    return Array.from(new Set(tokens));
  }, [scheduleIdsInput]);

  // Connect & Fetch Master Sheet
  const handleFetchSheet = async (overrideUrl?: string) => {
    const urlToFetch = (overrideUrl || sheetUrl).trim();
    if (!urlToFetch) {
      setSheetError('Please enter a Google Sheet URL or Published Web link.');
      return;
    }

    setIsLoadingSheet(true);
    setSheetError(null);

    try {
      const res = await fetch('/api/eval-fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch Google Sheet data.');
      }

      setMasterRows(data.rows || []);
      setSheetName(data.sheetName || 'Master Sheet');
      setAllAvailableScheduleIds(data.uniqueScheduleIds || []);
      setAvailableSchools(data.uniqueSchools || []);
      setLastSyncTime(new Date().toLocaleTimeString());

      // Save to localStorage
      try {
        localStorage.setItem('eval_ops_master_sheet_url', urlToFetch);
      } catch {
        // ignore
      }
    } catch (err: any) {
      setSheetError(err.message || 'Failed to connect to Google Sheet.');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // Perform Extraction Filtering
  const handleExtractEntries = () => {
    if (masterRows.length === 0) {
      setSheetError('Please connect and fetch the master Google Sheet first.');
      return;
    }
    if (parsedTargetScheduleIds.length === 0) {
      setSheetError('Please enter at least one Schedule ID to extract.');
      return;
    }
    setSheetError(null);
    setHasExtracted(true);
  };

  // Matched records: rows matching any target Schedule ID
  const targetIdsSet = useMemo(
    () => new Set(parsedTargetScheduleIds.map((id) => id.toUpperCase())),
    [parsedTargetScheduleIds]
  );

  const matchedEntries = useMemo(() => {
    if (!hasExtracted || targetIdsSet.size === 0) return [];
    return masterRows.filter((r) => r.scheduleId && targetIdsSet.has(r.scheduleId.toUpperCase()));
  }, [hasExtracted, targetIdsSet, masterRows]);

  // Which requested Schedule IDs were actually found in the master sheet
  const foundScheduleIds = useMemo(() => {
    const found = new Set<string>();
    matchedEntries.forEach((r) => {
      if (r.scheduleId) found.add(r.scheduleId);
    });
    return Array.from(found);
  }, [matchedEntries]);

  // Which requested Schedule IDs are MISSING from the master sheet
  const missingScheduleIds = useMemo(() => {
    const foundUpper = new Set(foundScheduleIds.map((id) => id.toUpperCase()));
    return parsedTargetScheduleIds.filter((id) => !foundUpper.has(id.toUpperCase()));
  }, [parsedTargetScheduleIds, foundScheduleIds]);

  // Filtered entries according to search query & school filter
  const displayedEntries = useMemo(() => {
    let list = matchedEntries;

    if (selectedSchoolFilter !== 'ALL') {
      list = list.filter((r) => (r.schoolCode || '').toUpperCase() === selectedSchoolFilter.toUpperCase());
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.scheduleId.toLowerCase().includes(q) ||
          r.evaluatorEmail.toLowerCase().includes(q) ||
          r.studentEmail.toLowerCase().includes(q) ||
          r.studentName.toLowerCase().includes(q) ||
          r.courseCode.toLowerCase().includes(q) ||
          r.courseName.toLowerCase().includes(q) ||
          r.schoolCode.toLowerCase().includes(q) ||
          r.examDate.toLowerCase().includes(q)
      );
    }

    return list;
  }, [matchedEntries, selectedSchoolFilter, tableSearch]);

  // Format comma separated neatly
  const handleCleanFormatInput = () => {
    if (parsedTargetScheduleIds.length === 0) return;
    setScheduleIdsInput(parsedTargetScheduleIds.join(', '));
  };

  // Paste from Clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setScheduleIdsInput((prev) => (prev ? `${prev}, ${text}` : text));
      }
    } catch {
      // ignore
    }
  };

  // Load sample Schedule IDs from master sheet for quick testing
  const handleLoadSampleIds = () => {
    if (allAvailableScheduleIds.length === 0) return;
    const samples = allAvailableScheduleIds.slice(0, 5);
    setScheduleIdsInput(samples.join(', '));
  };

  // Export Filtered Excel File
  const handleExportFilteredExcel = () => {
    if (displayedEntries.length === 0) return;

    // Export strictly the first three columns: Schedule ID, Evaluator Email ID, Student Details
    const excelRows = displayedEntries.map((item) => ({
      'Schedule ID': item.scheduleId,
      'Evaluator Email ID': item.evaluatorEmail,
      'Student Details': item.studentEmail || item.studentName,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows, {
      header: [
        'Schedule ID',
        'Evaluator Email ID',
        'Student Details',
      ],
    });

    ws['!cols'] = [
      { wch: 18 }, // Col A: Schedule ID
      { wch: 34 }, // Col B: Evaluator Email ID
      { wch: 34 }, // Col C: Student Details
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Evaluation Assignment');

    const filename = `Evaluation assignment.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Copy table to clipboard (First 3 columns only)
  const handleCopyTable = () => {
    if (displayedEntries.length === 0) return;
    const header = [
      'Schedule ID',
      'Evaluator Email ID',
      'Student Details',
    ].join('\t');

    const lines = displayedEntries.map((r) =>
      [
        r.scheduleId,
        r.evaluatorEmail,
        r.studentEmail || r.studentName,
      ].join('\t')
    );

    const fullText = [header, ...lines].join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-zinc-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#222222] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Schedule ID Extractor
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              Eval Ops Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Connect multi-school published Google Sheets and extract entries for specified comma-separated Schedule IDs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] hover:bg-[#121214] text-zinc-300 hover:text-white text-xs transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to Publish</span>
          </button>

          {lastSyncTime && (
            <div className="text-right font-mono text-[11px] text-zinc-400">
              <span>Synced at: </span>
              <strong className="text-white">{lastSyncTime}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {sheetError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-3 text-xs animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-200">Notice</span>
            <span>{sheetError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSheetError(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: Connect Published Google Sheet */}
      <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#222222] gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-xs font-mono font-bold">
              01
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Connect Master Published Google Sheet
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono block">
                Paste the web URL or Published CSV link containing compiled data from all schools
              </span>
            </div>
          </div>

          {masterRows.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{masterRows.length.toLocaleString()} Total Records</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="e.g. https://docs.google.com/spreadsheets/d/e/.../pub?output=csv OR https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-[#000000] border border-[#27272a] focus:border-white focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 transition-colors font-mono"
            />
          </div>

          <button
            type="button"
            onClick={() => handleFetchSheet()}
            disabled={isLoadingSheet}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`} />
            <span>{isLoadingSheet ? 'Connecting...' : masterRows.length > 0 ? 'Sync & Refresh' : 'Connect & Fetch'}</span>
          </button>
        </div>

        {/* Master Sheet Metadata & Stats Pill */}
        {masterRows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block">Sheet Title</span>
              <span className="text-xs font-semibold text-white truncate block mt-0.5">{sheetName}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block">Master Rows</span>
              <span className="text-xs font-mono font-bold text-white block mt-0.5">{masterRows.length.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block">Schools Included</span>
              <span className="text-xs font-mono font-semibold text-zinc-300 block mt-0.5">
                {availableSchools.length > 0 ? availableSchools.join(', ') : '–'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block">Available Schedule IDs</span>
              <span className="text-xs font-mono font-bold text-zinc-300 block mt-0.5">
                {allAvailableScheduleIds.length} Unique IDs
              </span>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: Input Comma-Separated Schedule IDs */}
      <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#222222] gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-xs font-mono font-bold">
              02
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Target Schedule IDs
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono block">
                Provide comma-separated Schedule IDs to extract only matching student allocations
              </span>
            </div>
          </div>

          {/* Quick Helper Actions */}
          <div className="flex items-center space-x-2">
            {allAvailableScheduleIds.length > 0 && (
              <button
                type="button"
                onClick={handleLoadSampleIds}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#27272a] hover:bg-[#121214] text-zinc-300 hover:text-white transition-colors"
                title="Fill with 5 sample Schedule IDs from master sheet"
              >
                Load Sample IDs
              </button>
            )}

            <button
              type="button"
              onClick={handlePasteClipboard}
              className="inline-flex items-center space-x-1 text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#27272a] hover:bg-[#121214] text-zinc-300 hover:text-white transition-colors"
              title="Paste from Clipboard"
            >
              <ClipboardPaste className="w-3 h-3" />
              <span>Paste</span>
            </button>

            {parsedTargetScheduleIds.length > 0 && (
              <button
                type="button"
                onClick={handleCleanFormatInput}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#27272a] hover:bg-[#121214] text-zinc-300 hover:text-white transition-colors"
                title="Reformat cleanly as comma separated"
              >
                Format
              </button>
            )}

            {scheduleIdsInput && (
              <button
                type="button"
                onClick={() => {
                  setScheduleIdsInput('');
                  setHasExtracted(false);
                }}
                className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Textarea for Schedule IDs */}
        <div>
          <textarea
            rows={4}
            value={scheduleIdsInput}
            onChange={(e) => setScheduleIdsInput(e.target.value)}
            placeholder="e.g. 6251, 6252, 6289, 7102, 7103, 8041... (Comma, space, or newline separated)"
            className="w-full bg-[#000000] border border-[#27272a] focus:border-white focus:outline-none rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 font-mono transition-colors"
          />
        </div>

        {/* Input Bar Summary & Primary Extract Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
            <span>Detected:</span>
            <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {parsedTargetScheduleIds.length} Schedule IDs
            </span>
            {parsedTargetScheduleIds.length > 0 && (
              <span className="text-[11px] text-zinc-500 truncate max-w-md hidden md:inline">
                ({parsedTargetScheduleIds.slice(0, 8).join(', ')}
                {parsedTargetScheduleIds.length > 8 ? ` +${parsedTargetScheduleIds.length - 8} more` : ''})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExtractEntries}
            disabled={parsedTargetScheduleIds.length === 0 || masterRows.length === 0}
            className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            <span>Fetch &amp; Extract Entries</span>
          </button>
        </div>
      </div>

      {/* STEP 3: Extraction Summary & KPI Cards (Shows only after extraction) */}
      {hasExtracted && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* KPI 1 */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Target IDs Requested
              </span>
              <span className="text-xl font-bold font-mono text-white block mt-1">
                {parsedTargetScheduleIds.length}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Unique schedule IDs entered</span>
            </div>

            {/* KPI 2 */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                Schedule IDs Found
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 block mt-1">
                {foundScheduleIds.length} <span className="text-xs text-emerald-500 font-normal">/ {parsedTargetScheduleIds.length}</span>
              </span>
              <span className="text-[10px] text-emerald-400/70 font-mono block mt-0.5">Found in master sheet</span>
            </div>

            {/* KPI 3 */}
            <div className={`p-4 rounded-2xl bg-[#09090b] border ${missingScheduleIds.length > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-[#27272a]'}`}>
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${missingScheduleIds.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                Missing Schedule IDs
              </span>
              <span className={`text-xl font-bold font-mono block mt-1 ${missingScheduleIds.length > 0 ? 'text-amber-300' : 'text-zinc-400'}`}>
                {missingScheduleIds.length}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Not present in sheet</span>
            </div>

            {/* KPI 4 */}
            <div className="p-4 rounded-2xl bg-[#09090b] border border-white/20">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Extracted Student Entries
              </span>
              <span className="text-xl font-bold font-mono text-white block mt-1">
                {matchedEntries.length.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">Ready for operations</span>
            </div>
          </div>

          {/* Missing IDs Warning Box */}
          {missingScheduleIds.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{missingScheduleIds.length} Requested Schedule ID(s) Not Found in Master Sheet:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {missingScheduleIds.map((id) => (
                  <span
                    key={id}
                    className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200"
                  >
                    {id}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-amber-300/80 pt-0.5">
                Please verify if these schedule IDs belong to a different examination sheet or if they were miskeyed.
              </p>
            </div>
          )}

          {/* Extracted Data Table Card */}
          <div className="bg-[#09090b] rounded-2xl border border-[#27272a] overflow-hidden shadow-2xl space-y-3">
            {/* Table Control Bar */}
            <div className="p-4 border-b border-[#27272a] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Extracted Records ({displayedEntries.length.toLocaleString()})
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Cols A to C (Evaluation assignment.xlsx)
                </span>
              </div>

              {/* Table Filters & Export Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search extracted..."
                    className="bg-[#000000] border border-[#27272a] focus:border-zinc-400 focus:outline-none rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono w-48"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => setTableSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* School Filter Dropdown */}
                {availableSchools.length > 1 && (
                  <select
                    value={selectedSchoolFilter}
                    onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                    className="bg-[#000000] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none font-mono"
                  >
                    <option value="ALL">All Schools ({availableSchools.length})</option>
                    {availableSchools.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}

                {/* Copy Table */}
                <button
                  type="button"
                  onClick={handleCopyTable}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] hover:bg-[#121214] text-zinc-300 hover:text-white text-xs font-mono transition-colors"
                  title="Copy 3 columns to clipboard"
                >
                  {copiedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSuccess ? 'Copied!' : 'Copy'}</span>
                </button>

                {/* Export Excel Button */}
                <button
                  type="button"
                  onClick={handleExportFilteredExcel}
                  disabled={displayedEntries.length === 0}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-sm shrink-0"
                  title="Download 'Evaluation assignment.xlsx' (First 3 columns: Schedule ID, Evaluator Email, Student Details)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel ({displayedEntries.length})</span>
                </button>
              </div>
            </div>

            {/* Master Table (Strictly 3 columns) */}
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#000000] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">SCHEDULE ID</th>
                    <th className="py-3 px-4">EVALUATOR EMAIL ID</th>
                    <th className="py-3 px-4">STUDENT DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] font-mono text-zinc-300">
                  {displayedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-zinc-500 text-xs">
                        No entries match your target Schedule IDs or search filters.
                      </td>
                    </tr>
                  ) : (
                    displayedEntries.map((item) => (
                      <tr key={item.id} className="hover:bg-[#121214] transition-colors">
                        {/* Column A: Schedule ID */}
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          <span className="text-white bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700">
                            {item.scheduleId}
                          </span>
                        </td>

                        {/* Column B: Evaluator Email ID */}
                        <td className="py-3 px-4 text-zinc-200">
                          {item.evaluatorEmail ? (
                            <span className="text-zinc-200 font-sans text-xs">{item.evaluatorEmail}</span>
                          ) : (
                            <span className="text-rose-400 text-[10px] italic">Missing Email</span>
                          )}
                        </td>

                        {/* Column C: Student Details (Email ID) */}
                        <td className="py-3 px-4 font-sans font-medium text-white whitespace-nowrap">
                          {item.studentEmail}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal: How to Publish Google Sheet to Web */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold text-white">How to Publish Master Google Sheet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                To enable live extraction across multiple schools without logging in each time:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-zinc-300">
                <li>
                  Open your consolidated Google Sheet containing the compiled rows from all schools.
                </li>
                <li>
                  Click <strong className="text-white">File &gt; Share &gt; Publish to web</strong>.
                </li>
                <li>
                  In the dialog, choose either <strong className="text-white">Web page</strong>, <strong className="text-white">Comma-separated values (.csv)</strong>, or <strong className="text-white">Microsoft Excel (.xlsx)</strong>.
                </li>
                <li>
                  Click <strong className="text-white">Publish</strong> and copy the generated link.
                </li>
                <li>
                  Paste that link into the URL input above. Alternatively, normal Google Sheet sharing links with <em className="text-zinc-400">"Anyone with the link can view"</em> are also supported!
                </li>
              </ol>
            </div>

            <div className="pt-2 flex justify-end border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

