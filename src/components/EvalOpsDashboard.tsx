'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCw,
  Search,
  Filter,
  Check,
  AlertOctagon,
  Users2,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  X,
  FileCheck2,
} from 'lucide-react';
import {
  RawStudentRow,
  RawScheduleRow,
  MappedStudentAllocation,
  EvalOpsValidationSummary,
  parseStudentEvaluatorFile,
  parseScheduleFile,
  mapStudentEvaluatorSchedules,
  generateEvalOpsExcel,
} from '../lib/evalOpsParser';

export const EvalOpsDashboard: React.FC = () => {
  // Uploaded Files State
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);

  // Parsed Raw Rows & Column Detection
  const [studentRows, setStudentRows] = useState<RawStudentRow[]>([]);
  const [studentDetection, setStudentDetection] = useState<{
    studentName: boolean;
    courseCode: boolean;
    evaluatorName: boolean;
    evaluatorEmail: boolean;
  } | null>(null);

  const [scheduleRows, setScheduleRows] = useState<RawScheduleRow[]>([]);
  const [scheduleDetection, setScheduleDetection] = useState<{
    courseCode: boolean;
    scheduleId: boolean;
  } | null>(null);

  // Preview Drawer Toggles
  const [showStudentPreview, setShowStudentPreview] = useState<boolean>(false);
  const [showSchedulePreview, setShowSchedulePreview] = useState<boolean>(false);

  // Mapping Output & Status
  const [mappedAllocations, setMappedAllocations] = useState<MappedStudentAllocation[]>([]);
  const [summary, setSummary] = useState<EvalOpsValidationSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasMapped, setHasMapped] = useState<boolean>(false);

  // Filter & Search in Results
  const [filterMode, setFilterMode] = useState<'all' | 'mapped' | 'issues'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // File Input Refs
  const studentInputRef = useRef<HTMLInputElement>(null);
  const scheduleInputRef = useRef<HTMLInputElement>(null);

  // 1. Handle Upload Student & Evaluator Excel
  const handleStudentFileUpload = async (file: File) => {
    try {
      setStudentFile(file);
      const buffer = await file.arrayBuffer();
      const parsed = parseStudentEvaluatorFile(buffer);
      setStudentRows(parsed.rows);
      setStudentDetection(parsed.headersDetected);
      // Reset previous mapping if new file uploaded
      setHasMapped(false);
      setMappedAllocations([]);
      setSummary(null);
    } catch (err) {
      console.error('Error parsing student file:', err);
      alert('Failed to parse Student & Evaluator Excel. Please ensure it is a valid .xlsx or .xls file.');
    }
  };

  // 2. Handle Upload Test Schedule Excel
  const handleScheduleFileUpload = async (file: File) => {
    try {
      setScheduleFile(file);
      const buffer = await file.arrayBuffer();
      const parsed = parseScheduleFile(buffer);
      setScheduleRows(parsed.rows);
      setScheduleDetection(parsed.headersDetected);
      // Reset previous mapping if new file uploaded
      setHasMapped(false);
      setMappedAllocations([]);
      setSummary(null);
    } catch (err) {
      console.error('Error parsing schedule file:', err);
      alert('Failed to parse Test Schedule Excel. Please ensure it is a valid .xlsx or .xls file.');
    }
  };

  // 3. Trigger Data Mapping Logic
  const handleProcessAndMap = () => {
    if (studentRows.length === 0 || scheduleRows.length === 0) {
      alert('Please upload both the Student & Evaluator Excel file and the Test Schedule Excel file.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const { mappedAllocations: result, summary: sum } = mapStudentEvaluatorSchedules(
        studentRows,
        scheduleRows
      );
      setMappedAllocations(result);
      setSummary(sum);
      setHasMapped(true);
      setIsProcessing(false);
    }, 150);
  };

  // 4. Reset All
  const handleReset = () => {
    setStudentFile(null);
    setScheduleFile(null);
    setStudentRows([]);
    setScheduleRows([]);
    setStudentDetection(null);
    setScheduleDetection(null);
    setMappedAllocations([]);
    setSummary(null);
    setHasMapped(false);
    setSearchQuery('');
    setFilterMode('all');
    if (studentInputRef.current) studentInputRef.current.value = '';
    if (scheduleInputRef.current) scheduleInputRef.current.value = '';
  };

  // 5. Filtered Results List
  const filteredResults = useMemo(() => {
    let list = mappedAllocations;

    if (filterMode === 'mapped') {
      list = list.filter((item) => item.isMapped);
    } else if (filterMode === 'issues') {
      list = list.filter((item) => !item.isMapped);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.studentName.toLowerCase().includes(q) ||
          item.courseCode.toLowerCase().includes(q) ||
          item.evaluatorName.toLowerCase().includes(q) ||
          item.evaluatorEmail.toLowerCase().includes(q) ||
          item.scheduleId.toLowerCase().includes(q)
      );
    }

    return list;
  }, [mappedAllocations, filterMode, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16 animate-in fade-in duration-200">
      {/* Module Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold">
              Evaluation Operations
            </span>
            <span className="text-xs font-mono text-zinc-500">• VLOOKUP Automator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5 flex items-center space-x-2.5">
            <FileSpreadsheet className="w-6 h-6 text-white" />
            <span>Eval Ops // Schedule &amp; Evaluator Mapper</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Automates mapping of student records, evaluator assignments, and examination schedule IDs using{' '}
            <code className="text-white font-mono font-semibold">Course Code</code> as the matching key.
            Eliminates manual Excel VLOOKUP and outputs ready-to-use 3-column allocation sheets.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {(studentFile || scheduleFile) && (
            <button
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-medium text-zinc-300 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset Files</span>
            </button>
          )}

          {hasMapped && (
            <button
              onClick={() => generateEvalOpsExcel(mappedAllocations, false)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-md shadow-white/5 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Download Final Excel File</span>
            </button>
          )}
        </div>
      </div>

      {/* Step 1 & Step 2 File Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* FILE 1: Student & Evaluator File */}
        <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-xs font-mono font-bold">
                  01
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Step 1: Student &amp; Evaluator Details
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono block">
                    Upload Student Name, Course Code &amp; Evaluator Email
                  </span>
                </div>
              </div>

              {studentFile && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{studentRows.length} rows loaded</span>
                </span>
              )}
            </div>

            {/* Dropzone */}
            <div
              onClick={() => studentInputRef.current?.click()}
              className={`mt-4 p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                studentFile
                  ? 'border-zinc-700 bg-[#0e0e11] hover:border-zinc-500'
                  : 'border-zinc-800 bg-[#050505] hover:border-zinc-600 hover:bg-[#0c0c0e]'
              }`}
            >
              <input
                ref={studentInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleStudentFileUpload(f);
                }}
              />

              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-2 text-zinc-300">
                <Users2 className="w-5 h-5 text-white" />
              </div>

              <div className="text-xs font-semibold text-white">
                {studentFile ? studentFile.name : 'Select Student & Evaluator Excel'}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                {studentFile
                  ? `${(studentFile.size / 1024).toFixed(1)} KB • Click to choose another file`
                  : 'Supports .xlsx, .xls, .csv'}
              </p>
            </div>

            {/* Column Detection Indicator */}
            {studentDetection && (
              <div className="mt-3.5 p-3 rounded-xl bg-[#050505] border border-[#222222] text-[11px] font-mono">
                <span className="text-zinc-500 text-[10px] block uppercase mb-1.5 font-semibold">
                  Detected Column Headers:
                </span>
                <div className="grid grid-cols-2 gap-2 text-zinc-300">
                  <div className="flex items-center space-x-1.5">
                    <span className={studentDetection.studentName ? 'text-emerald-400' : 'text-rose-400'}>
                      {studentDetection.studentName ? '✓' : '✗'}
                    </span>
                    <span>Student Name</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={studentDetection.courseCode ? 'text-emerald-400' : 'text-rose-400'}>
                      {studentDetection.courseCode ? '✓' : '✗'}
                    </span>
                    <span>Course Code</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={studentDetection.evaluatorName ? 'text-emerald-400' : 'text-zinc-500'}>
                      {studentDetection.evaluatorName ? '✓' : '–'}
                    </span>
                    <span>Evaluator Name</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={studentDetection.evaluatorEmail ? 'text-emerald-400' : 'text-rose-400'}>
                      {studentDetection.evaluatorEmail ? '✓' : '✗'}
                    </span>
                    <span>Evaluator Email ID</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preview Button */}
          {studentRows.length > 0 && (
            <div className="pt-2 border-t border-[#222222] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowStudentPreview(!showStudentPreview)}
                className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center space-x-1.5 font-mono"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showStudentPreview ? 'Hide Preview' : `Preview First 5 Rows (${studentRows.length} Total)`}</span>
              </button>
            </div>
          )}

          {/* Inline Preview Table */}
          {showStudentPreview && studentRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[#27272a] bg-[#050505]">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-[#121214] text-zinc-400 border-b border-[#27272a]">
                  <tr>
                    <th className="py-2 px-2.5">Student Name</th>
                    <th className="py-2 px-2.5">Course Code</th>
                    <th className="py-2 px-2.5">Evaluator Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-zinc-300">
                  {studentRows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2.5 truncate max-w-[140px] text-white">{r.studentName}</td>
                      <td className="py-1.5 px-2.5 text-zinc-300">{r.courseCode}</td>
                      <td className="py-1.5 px-2.5 truncate max-w-[180px] text-zinc-400">{r.evaluatorEmail || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FILE 2: Test Schedule File */}
        <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-xs font-mono font-bold">
                  02
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Step 2: Test Schedule Details
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono block">
                    Upload Course Code &amp; Schedule ID (e.g. Reason Column)
                  </span>
                </div>
              </div>

              {scheduleFile && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{scheduleRows.length} schedules loaded</span>
                </span>
              )}
            </div>

            {/* Dropzone */}
            <div
              onClick={() => scheduleInputRef.current?.click()}
              className={`mt-4 p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                scheduleFile
                  ? 'border-zinc-700 bg-[#0e0e11] hover:border-zinc-500'
                  : 'border-zinc-800 bg-[#050505] hover:border-zinc-600 hover:bg-[#0c0c0e]'
              }`}
            >
              <input
                ref={scheduleInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleScheduleFileUpload(f);
                }}
              />

              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-2 text-zinc-300">
                <Calendar className="w-5 h-5 text-white" />
              </div>

              <div className="text-xs font-semibold text-white">
                {scheduleFile ? scheduleFile.name : 'Select Test Schedule Excel'}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                {scheduleFile
                  ? `${(scheduleFile.size / 1024).toFixed(1)} KB • Click to choose another file`
                  : 'Supports .xlsx, .xls, .csv'}
              </p>
            </div>

            {/* Column Detection Indicator */}
            {scheduleDetection && (
              <div className="mt-3.5 p-3 rounded-xl bg-[#050505] border border-[#222222] text-[11px] font-mono">
                <span className="text-zinc-500 text-[10px] block uppercase mb-1.5 font-semibold">
                  Detected Column Headers:
                </span>
                <div className="grid grid-cols-2 gap-2 text-zinc-300">
                  <div className="flex items-center space-x-1.5">
                    <span className={scheduleDetection.courseCode ? 'text-emerald-400' : 'text-rose-400'}>
                      {scheduleDetection.courseCode ? '✓' : '✗'}
                    </span>
                    <span>Course Code</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={scheduleDetection.scheduleId ? 'text-emerald-400' : 'text-rose-400'}>
                      {scheduleDetection.scheduleId ? '✓' : '✗'}
                    </span>
                    <span>Schedule ID / Reason</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preview Button */}
          {scheduleRows.length > 0 && (
            <div className="pt-2 border-t border-[#222222] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center space-x-1.5 font-mono"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showSchedulePreview ? 'Hide Preview' : `Preview First 5 Rows (${scheduleRows.length} Total)`}</span>
              </button>
            </div>
          )}

          {/* Inline Preview Table */}
          {showSchedulePreview && scheduleRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[#27272a] bg-[#050505]">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-[#121214] text-zinc-400 border-b border-[#27272a]">
                  <tr>
                    <th className="py-2 px-2.5">Course Code</th>
                    <th className="py-2 px-2.5">Extracted Schedule ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-zinc-300">
                  {scheduleRows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2.5 text-white">{r.courseCode}</td>
                      <td className="py-1.5 px-2.5 text-zinc-300">{r.scheduleId || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Process and Map Button Bar */}
      <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-white block">Automated Data Mapping</span>
          <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
            {studentRows.length > 0 && scheduleRows.length > 0
              ? `Both files ready: ${studentRows.length} student records and ${scheduleRows.length} test schedules staged.`
              : 'Please upload both Excel files above to enable automated mapping.'}
          </span>
        </div>

        <button
          type="button"
          disabled={studentRows.length === 0 || scheduleRows.length === 0 || isProcessing}
          onClick={handleProcessAndMap}
          className={`inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shrink-0 ${
            studentRows.length > 0 && scheduleRows.length > 0
              ? 'bg-white hover:bg-zinc-200 text-black hover:scale-[1.02] active:scale-[0.99]'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Processing Mapping...</span>
            </>
          ) : (
            <>
              <span>Process and Map Data</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Mapping Summary & Telemetry Cards */}
      {summary && hasMapped && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a]">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Total Student Records</span>
              <span className="text-2xl font-bold text-white font-mono mt-1 block">
                {summary.totalStudentRecords.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">From File 1</span>
            </div>

            <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a]">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Unique Courses</span>
              <span className="text-2xl font-bold text-white font-mono mt-1 block">
                {summary.totalUniqueCoursesStudentFile}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                {summary.totalUniqueCoursesScheduleFile} in schedule file
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a]">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Total Evaluators</span>
              <span className="text-2xl font-bold text-white font-mono mt-1 block">
                {summary.totalUniqueEvaluators}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Distinct email IDs</span>
            </div>

            <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a]">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Successfully Mapped</span>
              <span className="text-2xl font-bold text-white font-mono mt-1 block">
                {summary.successfullyMappedCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                {Math.round((summary.successfullyMappedCount / (summary.totalStudentRecords || 1)) * 100)}% complete
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a]">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Unmatched Records</span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${summary.unmappedCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                {summary.unmappedCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Missing schedule / email</span>
            </div>
          </div>

          {/* Validation Error & Warning Banners */}
          {(summary.coursesMissingFromScheduleFile.length > 0 ||
            summary.coursesMissingFromStudentFile.length > 0 ||
            summary.missingEvaluatorEmailCount > 0 ||
            summary.duplicateScheduleCourses.length > 0) && (
            <div className="p-4 rounded-2xl bg-[#0e0e11] border border-amber-500/30 space-y-3">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Validation &amp; Discrepancy Diagnostics
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {summary.coursesMissingFromScheduleFile.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#050505] border border-zinc-800 text-zinc-300">
                    <strong className="text-amber-300 block mb-1">
                      ⚠️ {summary.coursesMissingFromScheduleFile.length} Course Code(s) present in Student File but missing in Test Schedule File:
                    </strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {summary.coursesMissingFromScheduleFile.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] border border-zinc-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {summary.coursesMissingFromStudentFile.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#050505] border border-zinc-800 text-zinc-400">
                    <span className="text-zinc-300 block mb-1">
                      ℹ️ {summary.coursesMissingFromStudentFile.length} Course Code(s) in Schedule File with no registered students:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {summary.coursesMissingFromStudentFile.slice(0, 15).map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px] border border-zinc-700">
                          {c}
                        </span>
                      ))}
                      {summary.coursesMissingFromStudentFile.length > 15 && (
                        <span className="text-[10px] text-zinc-500 font-mono py-0.5">+ {summary.coursesMissingFromStudentFile.length - 15} more</span>
                      )}
                    </div>
                  </div>
                )}

                {summary.missingEvaluatorEmailCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#050505] border border-zinc-800 text-zinc-300">
                    <span className="text-rose-400 font-semibold">
                      ⚠️ {summary.missingEvaluatorEmailCount} student record(s) have missing Evaluator Email IDs.
                    </span>
                  </div>
                )}

                {summary.duplicateScheduleCourses.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#050505] border border-zinc-800 text-zinc-300">
                    <strong className="text-amber-300 block mb-1">
                      ⚠️ Multiple conflicting Schedule IDs detected for the same course:
                    </strong>
                    {summary.duplicateScheduleCourses.map((d) => (
                      <span key={d.courseCode} className="text-[11px] font-mono text-zinc-400 block">
                        Course {d.courseCode}: Schedules ({d.scheduleIds.join(', ')})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Table Toolbar */}
          <div className="bg-[#09090b] rounded-2xl border border-[#27272a] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 bg-[#121214] p-1 rounded-xl border border-[#27272a] text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterMode === 'all' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Records ({mappedAllocations.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('mapped')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                  filterMode === 'mapped' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Mapped ({summary.successfullyMappedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('issues')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                  filterMode === 'issues' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Unmapped / Issues ({summary.unmappedCount})</span>
              </button>
            </div>

            {/* Search Input & Download Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student, course, email..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121214] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => generateEvalOpsExcel(mappedAllocations, filterMode === 'mapped')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Output Excel</span>
              </button>
            </div>
          </div>

          {/* Master Output Preview Table (Shows the exact columns that will be exported) */}
          <div className="bg-[#09090b] rounded-2xl border border-[#27272a] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between text-xs">
              <span className="font-semibold text-white">
                Final Output Preview ({filteredResults.length} records shown)
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                Format: <strong className="text-white">Schedule ID</strong> • <strong className="text-white">Evaluator Email ID</strong> • <strong className="text-white">Student Details</strong>
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#000000] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">SCHEDULE ID</th>
                    <th className="py-3 px-4">EVALUATOR EMAIL ID</th>
                    <th className="py-3 px-4">STUDENT DETAILS</th>
                    <th className="py-3 px-4">COURSE CODE</th>
                    <th className="py-3 px-4">EVALUATOR NAME</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] font-mono text-zinc-300">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500 text-xs">
                        No records match your search or filter selection.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((item) => (
                      <tr key={item.id} className="hover:bg-[#121214] transition-colors">
                        {/* Column 1: Schedule ID */}
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {item.scheduleId === 'UNMAPPED' ? (
                            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[10px]">
                              UNMAPPED
                            </span>
                          ) : (
                            <span className="text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                              {item.scheduleId}
                            </span>
                          )}
                        </td>

                        {/* Column 2: Evaluator Email ID */}
                        <td className="py-3 px-4 text-zinc-200">
                          {item.evaluatorEmail ? (
                            <span className="text-zinc-200 font-sans text-xs">{item.evaluatorEmail}</span>
                          ) : (
                            <span className="text-rose-400 text-[10px] italic">Missing Email</span>
                          )}
                        </td>

                        {/* Column 3: Student Details */}
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          {item.studentName}
                        </td>

                        {/* Course Code */}
                        <td className="py-3 px-4 text-zinc-400 font-semibold">
                          {item.courseCode}
                        </td>

                        {/* Evaluator Name */}
                        <td className="py-3 px-4 text-zinc-400 font-sans text-[11px]">
                          {item.evaluatorName}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${
                              item.isMapped
                                ? 'bg-zinc-800 text-white border border-zinc-700'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {item.isMapped ? 'Mapped' : 'Action Required'}
                          </span>
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
    </div>
  );
};

