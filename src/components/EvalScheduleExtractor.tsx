'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Link2,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Copy,
  Check,
  ClipboardPaste,
  Trash2,
  HelpCircle,
  Filter,
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
  // Google Sheet URL & State
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Master Sheet Loaded Data
  const [masterRows, setMasterRows] = useState<ExtractedRow[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [isTotalDataSheet, setIsTotalDataSheet] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
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
    return Array.from(new Set(tokens));
  }, [scheduleIdsInput]);

  // Connect & Fetch Master Sheet ("Total Data" subsheet priority)
  const handleFetchSheet = async (overrideUrl?: string, targetSheetName?: string, isExplicitRefresh: boolean = false) => {
    const urlToFetch = (overrideUrl || sheetUrl).trim();
    if (!urlToFetch) {
      setSheetError('Please enter a Google Sheet URL or Published Web link.');
      return;
    }

    setIsLoadingSheet(true);
    setSheetError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch('/api/eval-fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToFetch,
          targetSheet: targetSheetName,
          forceRefresh: isExplicitRefresh,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch Google Sheet data.');
      }

      setMasterRows(data.rows || []);
      setSheetName(data.sheetName || 'Total Data');
      setIsTotalDataSheet(Boolean(data.isTotalDataSheet));
      setAvailableSheets(data.sheetNames || []);
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
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      setSheetError(
        isTimeout
          ? 'Sync timed out. Google Sheets took too long to respond. Please check your link or try again.'
          : err.message || 'Failed to connect to Google Sheet.'
      );
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

  // Export Filtered Excel File (Strictly 3 Columns: Schedule ID, Evaluator Email ID, Student Details)
  const handleExportFilteredExcel = () => {
    if (displayedEntries.length === 0) return;

    const excelRows = displayedEntries.map((item) => ({
      'Schedule ID': item.scheduleId,
      'Evaluator Email ID': item.evaluatorEmail || 'No details are available',
      'Student Details': item.studentEmail || item.studentName,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows, {
      header: ['Schedule ID', 'Evaluator Email ID', 'Student Details'],
    });

    ws['!cols'] = [
      { wch: 18 }, // Col A: Schedule ID
      { wch: 34 }, // Col B: Evaluator Email ID
      { wch: 34 }, // Col C: Student Details
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Evaluation Assignment');
    XLSX.writeFile(wb, 'Evaluation assignment.xlsx');
  };

  // Copy table to clipboard (Strictly 3 columns)
  const handleCopyTable = () => {
    if (displayedEntries.length === 0) return;
    const header = ['Schedule ID', 'Evaluator Email ID', 'Student Details'].join('\t');

    const lines = displayedEntries.map((r) =>
      [r.scheduleId, r.evaluatorEmail || 'No details are available', r.studentEmail || r.studentName].join('\t')
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
              Evaluator Details Only
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Connect published Google Sheet (auto-targeting <strong className="text-white">"Total Data"</strong> subsheet) and extract exclusively <strong className="text-white">Evaluator allocations</strong> for given Schedule IDs.
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
            <div className="text-right font-mono text-[11px] text-zinc-400 hidden sm:block">
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

      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* CARD 02: TARGET SCHEDULE IDS */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-2xl flex flex-col justify-between space-y-4 order-1">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#222222] gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center text-xs font-mono font-bold shadow-md">
                  02
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Target Schedule IDs
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white font-semibold">
                      Evaluator Extraction
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                    Enter comma, space, or newline-separated Schedule IDs to extract matching student allocations
                  </span>
                </div>
              </div>

              {/* Quick Helper Actions */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {allAvailableScheduleIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLoadSampleIds}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#27272a] hover:bg-[#121214] text-zinc-300 hover:text-white transition-colors"
                    title="Fill with 5 sample Schedule IDs"
                  >
                    Sample IDs
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
                    title="Reformat cleanly as comma-separated"
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
                    className="text-zinc-500 hover:text-rose-400 p-1.5 rounded transition-colors"
                    title="Clear input"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Textarea for Schedule IDs */}
            <div className="mt-3.5">
              <textarea
                rows={6}
                value={scheduleIdsInput}
                onChange={(e) => setScheduleIdsInput(e.target.value)}
                placeholder="e.g. 6251, 6252, 6289, 7102, 7103, 8041... (Comma, space, or newline separated)"
                className="w-full bg-[#000000] border border-[#27272a] focus:border-white focus:outline-none rounded-xl p-4 text-xs text-white placeholder-zinc-500 font-mono transition-colors resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Input Bar Summary & Primary Extract Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1a1a1a]">
            <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
              <span>Detected:</span>
              <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                {parsedTargetScheduleIds.length} Schedule IDs
              </span>
              {parsedTargetScheduleIds.length > 0 && (
                <span className="text-[11px] text-zinc-500 truncate max-w-xs hidden sm:inline">
                  ({parsedTargetScheduleIds.slice(0, 5).join(', ')}
                  {parsedTargetScheduleIds.length > 5 ? ` +${parsedTargetScheduleIds.length - 5} more` : ''})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleExtractEntries}
              disabled={parsedTargetScheduleIds.length === 0 || masterRows.length === 0}
              className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Fetch &amp; Extract Entries</span>
            </button>
          </div>
        </div>

        {/* CARD 01: SOURCE GOOGLE SHEET */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl flex flex-col justify-between space-y-4 order-2">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#222222]">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-mono font-bold">
                  01
                </div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Source Google Sheet
                </h3>
              </div>

              {masterRows.length > 0 ? (
                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-500">Not Connected</span>
              )}
            </div>

            <div className="text-[11px] text-zinc-400">
              <span>Google Sheet URL:</span>
            </div>

            {/* URL Input */}
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Paste published CSV/web URL..."
                className="w-full bg-[#000000] border border-[#27272a] focus:border-white focus:outline-none rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 transition-colors font-mono"
              />
            </div>

            {/* Subsheet info */}
            {sheetName && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
                <span className="text-zinc-400">Target Subsheet:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    isTotalDataSheet
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-white'
                  }`}
                >
                  {sheetName} {isTotalDataSheet && '✓'}
                </span>
              </div>
            )}

            {/* Connect Button */}
            <button
              type="button"
              onClick={() => handleFetchSheet(undefined, undefined, true)}
              disabled={isLoadingSheet}
              className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`} />
              <span>
                {isLoadingSheet
                  ? 'Syncing Google Sheet...'
                  : masterRows.length > 0
                  ? 'Re-sync Live Sheet'
                  : 'Connect Sheet'}
              </span>
            </button>

            {/* Compact Sheet Stats if Connected */}
            {masterRows.length > 0 && (
              <div className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-2 text-[11px] font-mono text-zinc-400">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Subsheet:</span>
                  <strong className="text-emerald-400 font-semibold">{sheetName}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Total Rows:</span>
                  <strong className="text-white">{masterRows.length.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Available IDs:</span>
                  <strong className="text-white">{allAvailableScheduleIds.length}</strong>
                </div>
                {availableSchools.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Schools:</span>
                    <span className="text-zinc-300 truncate max-w-[130px]" title={availableSchools.join(', ')}>
                      {availableSchools.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#222222]">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center space-x-1.5 font-mono transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How to publish "Total Data"?</span>
            </button>
          </div>
        </div>
      </div>

      {/* EXTRACTION RESULTS */}
      {hasExtracted && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Target IDs Requested
              </span>
              <span className="text-xl font-bold font-mono text-white block mt-1">
                {parsedTargetScheduleIds.length}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Unique schedule IDs entered</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#09090b] border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                Schedule IDs Found
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 block mt-1">
                {foundScheduleIds.length}{' '}
                <span className="text-xs text-emerald-500 font-normal">
                  / {parsedTargetScheduleIds.length}
                </span>
              </span>
              <span className="text-[10px] text-emerald-400/70 font-mono block mt-0.5">Found in master sheet</span>
            </div>

            <div
              className={`p-4 rounded-2xl bg-[#09090b] border ${
                missingScheduleIds.length > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-[#27272a]'
              }`}
            >
              <span
                className={`text-[10px] font-mono uppercase tracking-wider block ${
                  missingScheduleIds.length > 0 ? 'text-amber-400' : 'text-zinc-500'
                }`}
              >
                Missing Schedule IDs
              </span>
              <span
                className={`text-xl font-bold font-mono block mt-1 ${
                  missingScheduleIds.length > 0 ? 'text-amber-300' : 'text-zinc-400'
                }`}
              >
                {missingScheduleIds.length}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Not present in sheet</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#09090b] border border-white/20">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Extracted Student Entries
              </span>
              <span className="text-xl font-bold font-mono text-white block mt-1">
                {matchedEntries.length.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">Allocations ready</span>
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
            </div>
          )}

          {/* Extracted Data Table Card (Strictly 3 Columns) */}
          <div className="bg-[#09090b] rounded-2xl border border-[#27272a] overflow-hidden shadow-2xl space-y-3">
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
                  title="Download 'Evaluation assignment.xlsx' (Schedule ID, Evaluator Email, Student Details)"
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
                            <span className="text-amber-400 text-[11px] font-sans px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              No details are available
                            </span>
                          )}
                        </td>

                        {/* Column C: Student Details */}
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

      {/* Help Modal */}
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
                To enable live extraction of Evaluator details:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-zinc-300">
                <li>
                  Open your consolidated Google Sheet containing the compiled rows.
                </li>
                <li>
                  Click <strong className="text-white">File &gt; Share &gt; Publish to web</strong> (or set sharing to <em className="text-zinc-400">"Anyone with the link can view"</em>).
                </li>
                <li>
                  Paste that link into the URL input above and click <strong className="text-white">Connect Sheet</strong>.
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
