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
  ChevronDown,
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
  getWorkbookSheetNames,
} from '../lib/evalOpsParser';
import { FileDropzone } from './FileDropzone';
import { CustomDropdown, DropdownOption } from './CustomDropdown';
import { SCHOOL_CODE_MAP } from '../lib/mockData';

export const EvalOpsDashboard: React.FC = () => {
  // Uploaded Files State
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [schoolCode, setSchoolCode] = useState<string>('');

  // Raw Buffers & Subsheet Selection State
  const [studentBuffer, setStudentBuffer] = useState<ArrayBuffer | null>(null);
  const [studentSheetNames, setStudentSheetNames] = useState<string[]>([]);
  const [activeStudentSheet, setActiveStudentSheet] = useState<string>('');
  const [showStudentSheetModal, setShowStudentSheetModal] = useState<boolean>(false);

  const [scheduleBuffer, setScheduleBuffer] = useState<ArrayBuffer | null>(null);
  const [scheduleSheetNames, setScheduleSheetNames] = useState<string[]>([]);
  const [activeScheduleSheet, setActiveScheduleSheet] = useState<string>('');
  const [showScheduleSheetModal, setShowScheduleSheetModal] = useState<boolean>(false);

  // Parsed Raw Rows & Column Detection
  const [studentRows, setStudentRows] = useState<RawStudentRow[]>([]);
  const [studentDetection, setStudentDetection] = useState<{
    studentName: boolean;
    studentEmail: boolean;
    courseCode: boolean;
    courseName: boolean;
    schoolCode: boolean;
    examDate: boolean;
    evaluatorName: boolean;
    evaluatorEmail: boolean;
  } | null>(null);

  const [scheduleRows, setScheduleRows] = useState<RawScheduleRow[]>([]);
  const [scheduleDetection, setScheduleDetection] = useState<{
    courseCode: boolean;
    courseName: boolean;
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
  const [filterMode, setFilterMode] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [evaluatorFilter, setEvaluatorFilter] = useState<string>('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Handle Upload Student & Evaluator Excel
  const handleStudentFileUpload = async (file: File) => {
    try {
      setStudentFile(file);
      const buffer = await file.arrayBuffer();
      setStudentBuffer(buffer);

      // Read sheet names
      const sheets = getWorkbookSheetNames(buffer);
      setStudentSheetNames(sheets);

      const targetSheet = sheets.length > 0 ? sheets[0] : undefined;
      setActiveStudentSheet(targetSheet || '');

      const parsed = parseStudentEvaluatorFile(buffer, targetSheet);
      setStudentRows(parsed.rows);
      setStudentDetection(parsed.headersDetected);
      if (parsed.detectedSchoolCode) {
        setSchoolCode(parsed.detectedSchoolCode);
      }

      // If workbook contains multiple subsheets, ask user to select the required subsheet
      if (sheets.length > 1) {
        setShowStudentSheetModal(true);
      }

      // Reset previous mapping if new file uploaded
      setHasMapped(false);
      setMappedAllocations([]);
      setSummary(null);
    } catch (err) {
      console.error('Error parsing student file:', err);
      alert('Failed to parse Student & Evaluator Excel. Please ensure it is a valid .xlsx or .xls file.');
    }
  };

  // Switch student subsheet
  const handleSelectStudentSheet = (sheetName: string) => {
    if (!studentBuffer) return;
    setActiveStudentSheet(sheetName);
    try {
      const parsed = parseStudentEvaluatorFile(studentBuffer, sheetName);
      setStudentRows(parsed.rows);
      setStudentDetection(parsed.headersDetected);
      if (parsed.detectedSchoolCode) {
        setSchoolCode(parsed.detectedSchoolCode);
      }
      setHasMapped(false);
      setMappedAllocations([]);
      setSummary(null);
      setShowStudentSheetModal(false);
    } catch (err) {
      console.error('Error switching student sheet:', err);
      alert(`Could not parse sheet "${sheetName}".`);
    }
  };

  // 2. Handle Upload Test Schedule Excel
  const handleScheduleFileUpload = async (file: File) => {
    try {
      setScheduleFile(file);
      const buffer = await file.arrayBuffer();
      setScheduleBuffer(buffer);

      const sheets = getWorkbookSheetNames(buffer);
      setScheduleSheetNames(sheets);

      const targetSheet = sheets.length > 0 ? sheets[0] : undefined;
      setActiveScheduleSheet(targetSheet || '');

      const parsed = parseScheduleFile(buffer, targetSheet);
      setScheduleRows(parsed.rows);
      setScheduleDetection(parsed.headersDetected);

      if (sheets.length > 1) {
        setShowScheduleSheetModal(true);
      }

      // Reset previous mapping if new file uploaded
      setHasMapped(false);
      setMappedAllocations([]);
      setSummary(null);
    } catch (err) {
      console.error('Error parsing schedule file:', err);
      alert('Failed to parse Test Schedule Excel. Please ensure it is a valid .xlsx or .xls file.');
    }
  };

  // Switch schedule subsheet
  const handleSelectScheduleSheet = (sheetName: string) => {
    if (!scheduleBuffer) return;
    setActiveScheduleSheet(sheetName);
    try {
      const parsed = parseScheduleFile(scheduleBuffer, sheetName);
      setScheduleRows(parsed.rows);
      setScheduleDetection(parsed.headersDetected);
      setHasMapped(false);
      setMappedAllocations([]);
      setSummary(null);
      setShowScheduleSheetModal(false);
    } catch (err) {
      console.error('Error switching schedule sheet:', err);
      alert(`Could not parse sheet "${sheetName}".`);
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
    setStudentBuffer(null);
    setStudentSheetNames([]);
    setActiveStudentSheet('');
    setShowStudentSheetModal(false);

    setScheduleFile(null);
    setScheduleBuffer(null);
    setScheduleSheetNames([]);
    setActiveScheduleSheet('');
    setShowScheduleSheetModal(false);

    setStudentRows([]);
    setScheduleRows([]);
    setStudentDetection(null);
    setScheduleDetection(null);
    setMappedAllocations([]);
    setSummary(null);
    setHasMapped(false);
    setSearchQuery('');
    setFilterMode('all');
    setCourseFilter('all');
    setEvaluatorFilter('all');
    setSchoolCode('');
  };

  // Dropdown options for dynamic filters
  const courseOptions: DropdownOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const alloc of mappedAllocations) {
      if (alloc.courseCode) {
        counts[alloc.courseCode] = (counts[alloc.courseCode] || 0) + 1;
      }
    }
    const opts: DropdownOption[] = [
      { value: 'all', label: 'All Courses', sublabel: `${Object.keys(counts).length} unique courses` },
    ];
    Object.keys(counts)
      .sort()
      .forEach((code) => {
        opts.push({
          value: code,
          label: code,
          sublabel: `${counts[code]} student${counts[code] > 1 ? 's' : ''}`,
        });
      });
    return opts;
  }, [mappedAllocations]);

  const evaluatorOptions: DropdownOption[] = useMemo(() => {
    const counts: Record<string, { count: number; name: string }> = {};
    for (const alloc of mappedAllocations) {
      const email = alloc.evaluatorEmail || 'unassigned';
      if (!counts[email]) {
        counts[email] = { count: 0, name: alloc.evaluatorName };
      }
      counts[email].count++;
    }
    const opts: DropdownOption[] = [
      { value: 'all', label: 'All Evaluators', sublabel: `${Object.keys(counts).length} unique evaluators` },
    ];
    Object.keys(counts)
      .sort()
      .forEach((email) => {
        opts.push({
          value: email,
          label: counts[email].name || email,
          sublabel: email !== 'unassigned' ? `${email} (${counts[email].count})` : `${counts[email].count} students`,
        });
      });
    return opts;
  }, [mappedAllocations]);

  const statusOptions: DropdownOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Statuses', sublabel: `${mappedAllocations.length} total records` },
      { value: 'mapped', label: 'Fully Mapped', sublabel: `${summary?.successfullyMappedCount ?? 0} records`, badge: 'Mapped' },
      { value: 'issues', label: 'Action Required', sublabel: `${summary?.unmappedCount ?? 0} records`, badge: 'Issues', badgeColor: 'bg-rose-500/20 text-rose-300' },
    ];
  }, [mappedAllocations.length, summary]);

  // 5. Filtered Results List
  const filteredResults = useMemo(() => {
    let list = mappedAllocations;

    if (filterMode === 'mapped') {
      list = list.filter((item) => item.isMapped);
    } else if (filterMode === 'issues') {
      list = list.filter((item) => !item.isMapped);
    }

    if (courseFilter !== 'all') {
      list = list.filter((item) => item.courseCode === courseFilter);
    }

    if (evaluatorFilter !== 'all') {
      list = list.filter((item) => item.evaluatorEmail === evaluatorFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.studentName.toLowerCase().includes(q) ||
          item.studentEmail.toLowerCase().includes(q) ||
          item.courseCode.toLowerCase().includes(q) ||
          item.courseName.toLowerCase().includes(q) ||
          item.evaluatorName.toLowerCase().includes(q) ||
          item.evaluatorEmail.toLowerCase().includes(q) ||
          item.scheduleId.toLowerCase().includes(q)
      );
    }

    return list;
  }, [mappedAllocations, filterMode, courseFilter, evaluatorFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16 animate-in fade-in duration-200">
      {/* Module Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold">
              Eval Ops // Evaluation Assignment
            </span>
            <span className="text-xs font-mono text-zinc-500">• VLOOKUP Automator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5 flex items-center space-x-2.5">
            <FileSpreadsheet className="w-6 h-6 text-white" />
            <span>Evaluation Assignment</span>
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
            <div className="flex items-center space-x-3">
              <span className="text-[11px] font-mono text-zinc-400 hidden lg:inline">
                File: <strong className="text-white">{schoolCode || 'School'} - Evaluator assignment.xlsx</strong>
              </span>
              <button
                onClick={() => generateEvalOpsExcel(mappedAllocations, false, schoolCode)}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-md shadow-white/5 hover:scale-[1.02] active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>Download Final Excel File</span>
              </button>
            </div>
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
                    Drop clean data file here
                  </span>
                </div>
              </div>

              {studentFile && (
                <div className="flex items-center space-x-2">
                  {studentSheetNames.length > 1 && (
                    <CustomDropdown
                      value={activeStudentSheet}
                      onChange={handleSelectStudentSheet}
                      options={studentSheetNames.map((sheet, idx) => ({
                        value: sheet,
                        label: sheet,
                        sublabel: `Subsheet #${idx + 1}`,
                      }))}
                      icon={Layers}
                      placeholder="Select subsheet"
                      className="w-40"
                    />
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{studentRows.length} rows loaded</span>
                  </span>
                </div>
              )}
            </div>

            {/* Common Drag and Drop FileDropzone */}
            <FileDropzone
              className="mt-4"
              title="Drop clean data file here"
              subtitle="Supports .xlsx, .xls, .csv"
              selectedFile={studentFile}
              onFileSelect={handleStudentFileUpload}
              onClearFile={() => {
                setStudentFile(null);
                setStudentBuffer(null);
                setStudentRows([]);
                setStudentDetection(null);
                setStudentSheetNames([]);
                setActiveStudentSheet('');
                setHasMapped(false);
                setMappedAllocations([]);
                setSummary(null);
              }}
              icon={<Users2 className="w-5 h-5 text-white" />}
              statusBadge={
                studentFile && studentSheetNames.length > 1 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStudentSheetModal(true);
                    }}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <Layers className="w-3 h-3 text-zinc-400" />
                    <span>Active Sheet: <strong className="text-white">{activeStudentSheet}</strong></span>
                    <span className="text-zinc-400 font-semibold">• Change Sheet ({studentSheetNames.length} found) ▾</span>
                  </button>
                ) : null
              }
            />

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
                    <span className={studentDetection.studentEmail ? 'text-emerald-400' : 'text-zinc-500'}>
                      {studentDetection.studentEmail ? '✓' : '–'}
                    </span>
                    <span>Student Email ID</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={studentDetection.courseCode ? 'text-emerald-400' : 'text-rose-400'}>
                      {studentDetection.courseCode ? '✓' : '✗'}
                    </span>
                    <span>Course Code</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={studentDetection.courseName ? 'text-emerald-400' : 'text-zinc-500'}>
                      {studentDetection.courseName ? '✓' : '–'}
                    </span>
                    <span>Course Name</span>
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

                  {/* School Code Picked from Student File */}
                  <div className="flex items-center space-x-2 col-span-2 pt-2 mt-1 border-t border-[#222222]">
                    <span className={schoolCode ? 'text-emerald-400' : 'text-zinc-500'}>
                      {schoolCode ? '✓' : '–'}
                    </span>
                    <span className="text-zinc-400">School Code:</span>
                    <input
                      type="text"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SCE"
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-xs uppercase focus:outline-none focus:border-white w-24"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Output File: &quot;{schoolCode || 'School'} - Evaluator assignment.xlsx&quot;
                    </span>
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
                    <th className="py-2 px-2.5">Student Email ID</th>
                    <th className="py-2 px-2.5">Course Code</th>
                    <th className="py-2 px-2.5">Course Name</th>
                    <th className="py-2 px-2.5">School Code</th>
                    <th className="py-2 px-2.5">Exam Date</th>
                    <th className="py-2 px-2.5">Evaluator Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-zinc-300">
                  {studentRows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2.5 truncate max-w-[130px] text-white">{r.studentName}</td>
                      <td className="py-1.5 px-2.5 truncate max-w-[150px] text-zinc-300">{r.studentEmail || '–'}</td>
                      <td className="py-1.5 px-2.5 text-zinc-300">{r.courseCode}</td>
                      <td className="py-1.5 px-2.5 truncate max-w-[130px] text-zinc-400">{r.courseName || '–'}</td>
                      <td className="py-1.5 px-2.5 text-zinc-300 font-semibold">{r.schoolCode || schoolCode || '–'}</td>
                      <td className="py-1.5 px-2.5 text-zinc-400 whitespace-nowrap">{r.examDate || '–'}</td>
                      <td className="py-1.5 px-2.5 truncate max-w-[160px] text-zinc-400">{r.evaluatorEmail || '–'}</td>
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
                    Drop target scheduling file here
                  </span>
                </div>
              </div>

              {scheduleFile && (
                <div className="flex items-center space-x-2">
                  {scheduleSheetNames.length > 1 && (
                    <CustomDropdown
                      value={activeScheduleSheet}
                      onChange={handleSelectScheduleSheet}
                      options={scheduleSheetNames.map((sheet, idx) => ({
                        value: sheet,
                        label: sheet,
                        sublabel: `Subsheet #${idx + 1}`,
                      }))}
                      icon={Layers}
                      placeholder="Select subsheet"
                      className="w-40"
                    />
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{scheduleRows.length} schedules loaded</span>
                  </span>
                </div>
              )}
            </div>

            {/* Common Drag and Drop FileDropzone */}
            <FileDropzone
              className="mt-4"
              title="Drop target scheduling file here"
              subtitle="Supports .xlsx, .xls, .csv"
              selectedFile={scheduleFile}
              onFileSelect={handleScheduleFileUpload}
              onClearFile={() => {
                setScheduleFile(null);
                setScheduleBuffer(null);
                setScheduleRows([]);
                setScheduleDetection(null);
                setScheduleSheetNames([]);
                setActiveScheduleSheet('');
                setHasMapped(false);
                setMappedAllocations([]);
                setSummary(null);
              }}
              icon={<Calendar className="w-5 h-5 text-white" />}
              statusBadge={
                scheduleFile && scheduleSheetNames.length > 1 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowScheduleSheetModal(true);
                    }}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <Layers className="w-3 h-3 text-zinc-400" />
                    <span>Active Sheet: <strong className="text-white">{activeScheduleSheet}</strong></span>
                    <span className="text-zinc-400 font-semibold">• Change Sheet ({scheduleSheetNames.length} found) ▾</span>
                  </button>
                ) : null
              }
            />

            {/* Column Detection Indicator */}
            {scheduleDetection && (
              <div className="mt-3.5 p-3 rounded-xl bg-[#050505] border border-[#222222] text-[11px] font-mono">
                <span className="text-zinc-500 text-[10px] block uppercase mb-1.5 font-semibold">
                  Detected Column Headers:
                </span>
                <div className="grid grid-cols-3 gap-2 text-zinc-300">
                  <div className="flex items-center space-x-1.5">
                    <span className={scheduleDetection.courseCode ? 'text-emerald-400' : 'text-rose-400'}>
                      {scheduleDetection.courseCode ? '✓' : '✗'}
                    </span>
                    <span>Course Code</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={scheduleDetection.courseName ? 'text-emerald-400' : 'text-zinc-500'}>
                      {scheduleDetection.courseName ? '✓' : '–'}
                    </span>
                    <span>Course Name</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={scheduleDetection.scheduleId ? 'text-emerald-400' : 'text-rose-400'}>
                      {scheduleDetection.scheduleId ? '✓' : '✗'}
                    </span>
                    <span>Schedule ID</span>
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
                    <th className="py-2 px-2.5">Course Name</th>
                    <th className="py-2 px-2.5">Schedule ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-zinc-300">
                  {scheduleRows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2.5 text-white">{r.courseCode}</td>
                      <td className="py-1.5 px-2.5 text-zinc-300">{r.courseName || '–'}</td>
                      <td className="py-1.5 px-2.5 text-zinc-300 font-bold">{r.scheduleId || '–'}</td>
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

          {/* Dynamic Filters Bar with Custom Dropdowns (Matching Scanning Ops Style) */}
          <div className="bg-[#09090b] rounded-2xl border border-[#27272a] shadow-xl overflow-hidden">
            <div
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#121214] transition-colors border-b border-[#222222]"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <Filter className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white block leading-tight">Dynamic Filters</span>
                    {(filterMode !== 'all' || courseFilter !== 'all' || evaluatorFilter !== 'all' || searchQuery) && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-black font-bold">
                        Active Filter
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono block leading-tight mt-0.5">
                    {filterMode !== 'all' || courseFilter !== 'all' || evaluatorFilter !== 'all' || searchQuery
                      ? 'Filtered allocation view active'
                      : 'All records visible • Click to expand filter dropdowns'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                {(filterMode !== 'all' || courseFilter !== 'all' || evaluatorFilter !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterMode('all');
                      setCourseFilter('all');
                      setEvaluatorFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-[10px] font-mono px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
                <div className={`p-1 rounded text-zinc-400 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4 text-zinc-300" />
                </div>
              </div>
            </div>

            {isFiltersExpanded && (
              <div className="p-3.5 bg-[#050505] flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Status Dropdown */}
                  <CustomDropdown
                    value={filterMode}
                    options={statusOptions}
                    onChange={setFilterMode}
                    icon={CheckCircle2}
                    placeholder="All Statuses"
                    className="w-44"
                  />

                  {/* Course Code Dropdown */}
                  <CustomDropdown
                    value={courseFilter}
                    options={courseOptions}
                    onChange={setCourseFilter}
                    icon={FileSpreadsheet}
                    placeholder="All Courses"
                    className="w-44"
                  />

                  {/* Evaluator Dropdown */}
                  <CustomDropdown
                    value={evaluatorFilter}
                    options={evaluatorOptions}
                    onChange={setEvaluatorFilter}
                    icon={Users2}
                    placeholder="All Evaluators"
                    className="w-48"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Input */}
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student, email, code..."
                      className="w-full text-xs pl-8 pr-7 py-1.5 bg-[#121214] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => generateEvalOpsExcel(filteredResults, false, schoolCode)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-sm shrink-0"
                    title={`Export "${schoolCode || 'School'} - Evaluator assignment.xlsx"`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel ({filteredResults.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Master Output Preview Table (Shows the exact columns that will be exported) */}
          <div className="bg-[#09090b] rounded-2xl border border-[#27272a] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-white">
                Final Output Preview ({filteredResults.length} records)
              </span>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-mono text-zinc-400">
                  Target: <strong className="text-white">{schoolCode || 'School'} - Evaluator assignment.xlsx</strong> (Cols A to H)
                </span>
                <button
                  type="button"
                  onClick={() => generateEvalOpsExcel(filteredResults, false, schoolCode)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors shadow-sm shrink-0"
                  title={`Download "${schoolCode || 'School'} - Evaluator assignment.xlsx"`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel Final Result</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#000000] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">SCHEDULE ID</th>
                    <th className="py-3 px-4">EVALUATOR EMAIL ID</th>
                    <th className="py-3 px-4">STUDENT DETAILS</th>
                    <th className="py-3 px-4">STUDENT NAME</th>
                    <th className="py-3 px-4">COURSE CODE</th>
                    <th className="py-3 px-4">COURSE NAME</th>
                    <th className="py-3 px-4">SCHOOL CODE</th>
                    <th className="py-3 px-4">EXAM DATE</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] font-mono text-zinc-300">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-500 text-xs">
                        No records match your search or filter selection.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((item) => (
                      <tr key={item.id} className="hover:bg-[#121214] transition-colors">
                        {/* Column A: Schedule ID */}
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

                        {/* Column B: Evaluator Email ID */}
                        <td className="py-3 px-4 text-zinc-200">
                          {item.evaluatorEmail ? (
                            <span className="text-zinc-200 font-sans text-xs">{item.evaluatorEmail}</span>
                          ) : (
                            <span className="text-rose-400 text-[10px] italic">Missing Email</span>
                          )}
                        </td>

                        {/* Column C: Student Details (Student Email ID) */}
                        <td className="py-3 px-4 font-sans font-medium text-white whitespace-nowrap">
                          {item.studentEmail ? (
                            <span>{item.studentEmail}</span>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">{item.studentName || '–'}</span>
                          )}
                        </td>

                        {/* Column D: Student Name */}
                        <td className="py-3 px-4 font-sans text-zinc-300 whitespace-nowrap">
                          {item.studentName}
                        </td>

                        {/* Column E: Course Code */}
                        <td className="py-3 px-4 text-zinc-300 font-semibold whitespace-nowrap">
                          {item.courseCode}
                        </td>

                        {/* Column F: Course Name */}
                        <td className="py-3 px-4 text-zinc-400 font-sans text-[11px] truncate max-w-[180px]">
                          {item.courseName || '–'}
                        </td>

                        {/* Column G: School Code */}
                        <td className="py-3 px-4 text-zinc-300 font-semibold whitespace-nowrap">
                          {item.schoolCode || schoolCode || '–'}
                        </td>

                        {/* Column H: Exam Date */}
                        <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                          {item.examDate || '–'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
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

      {/* Subsheet Selection Modal for Student & Evaluator File */}
      {showStudentSheetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-sm font-bold text-white">Select Student Subsheet</h3>
                  <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[260px]">
                    {studentFile?.name} ({studentSheetNames.length} sheets)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStudentSheetModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This Excel file contains multiple subsheets. Please click the subsheet that contains the student and evaluator records you want to parse:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {studentSheetNames.map((sheet) => {
                const isSelected = sheet === activeStudentSheet;
                return (
                  <button
                    key={sheet}
                    type="button"
                    onClick={() => handleSelectStudentSheet(sheet)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-md font-bold'
                        : 'bg-[#121214] text-zinc-300 border-[#27272a] hover:bg-[#18181b] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
                      <span className="truncate font-mono text-xs">{sheet}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black text-white shrink-0">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#222222] flex justify-end">
              <button
                type="button"
                onClick={() => setShowStudentSheetModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subsheet Selection Modal for Test Schedule File */}
      {showScheduleSheetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-sm font-bold text-white">Select Schedule Subsheet</h3>
                  <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[260px]">
                    {scheduleFile?.name} ({scheduleSheetNames.length} sheets)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleSheetModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This Excel file contains multiple subsheets. Please click the subsheet that contains the examination schedules and schedule IDs:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {scheduleSheetNames.map((sheet) => {
                const isSelected = sheet === activeScheduleSheet;
                return (
                  <button
                    key={sheet}
                    type="button"
                    onClick={() => handleSelectScheduleSheet(sheet)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-md font-bold'
                        : 'bg-[#121214] text-zinc-300 border-[#27272a] hover:bg-[#18181b] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
                      <span className="truncate font-mono text-xs">{sheet}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black text-white shrink-0">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#222222] flex justify-end">
              <button
                type="button"
                onClick={() => setShowScheduleSheetModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

