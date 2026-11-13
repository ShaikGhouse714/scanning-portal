'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Layers,
  BookOpen,
  Calendar,
  LayoutList,
  SplitSquareVertical,
  UserCheck,
} from 'lucide-react';
import { MasterEvalRow } from '@/lib/evalOpsParser';
import {
  ChiefSortField,
  SortDirection,
  SchoolChiefAggregation,
  GlobalChiefStats,
  aggregateChiefBySchool,
  sortSchoolChiefAggregations,
} from '@/lib/chiefEvaluatorStats';
import { CustomDropdown } from './CustomDropdown';
import { SegmentedToggle } from './SegmentedToggle';

export type SortField = ChiefSortField;

export type ChiefCategoryFilter =
  | 'ALL'
  | 'ALL_AVAILABLE'
  | 'ANY_MISSING'
  | 'PARTIAL_MISSING'
  | 'NONE_AVAILABLE';

export type ViewLayoutMode = 'SPLIT' | 'UNIFIED';

interface ChiefEvaluatorSchoolSpaceProps {
  masterRows: MasterEvalRow[];
  precomputedSummary?: {
    schoolAggregations: SchoolChiefAggregation[];
    globalStats: GlobalChiefStats;
  };
  onInspectSchoolInOverview: (
    schoolCode: string,
    filter: 'CHIEF_AVAILABLE' | 'CHIEF_MISSING' | 'ALL'
  ) => void;
}

function getCategoryBadge(category: SchoolChiefAggregation['category']) {
  if (category === 'ALL_AVAILABLE') {
    return (
      <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/70 whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        <span>All Chief Available</span>
      </span>
    );
  }
  if (category === 'NONE_AVAILABLE') {
    return (
      <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/80 whitespace-nowrap">
        <ShieldAlert className="w-3 h-3 shrink-0" />
        <span>None Available (0%)</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/80 whitespace-nowrap">
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>Partial Missing</span>
    </span>
  );
}

interface SchoolChiefTableProps {
  title?: string;
  subtitle?: string;
  accent?: 'emerald' | 'amber' | 'neutral';
  schools: SchoolChiefAggregation[];
  sortField: SortField;
  sortDir: SortDirection;
  onSortColumn: (field: SortField) => void;
  expandedSchools: Set<string>;
  onToggleExpand: (schoolCode: string) => void;
  copiedKey: string | null;
  onCopyText: (key: string, text: string) => void;
  onInspectSchool: (schoolCode: string, filter: 'CHIEF_AVAILABLE' | 'CHIEF_MISSING' | 'ALL') => void;
  onExportSingleSchool: (school: SchoolChiefAggregation) => void;
  emptyMessage: string;
}

const SchoolChiefTable: React.FC<SchoolChiefTableProps> = ({
  title,
  subtitle,
  accent = 'neutral',
  schools,
  sortField,
  sortDir,
  onSortColumn,
  expandedSchools,
  onToggleExpand,
  copiedKey,
  onCopyText,
  onInspectSchool,
  onExportSingleSchool,
  emptyMessage,
}) => {
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600 inline ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-purple-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-purple-400 inline ml-1" />
    );
  };

  const borderAccent =
    accent === 'emerald'
      ? 'border-emerald-900/50'
      : accent === 'amber'
      ? 'border-amber-900/50'
      : 'border-[#222222]';

  return (
    <div className={`rounded-2xl bg-[#09090b] border ${borderAccent} overflow-hidden`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-[#1c1c20] bg-[#0c0c0f] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            {accent === 'emerald' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : accent === 'amber' ? (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
            )}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
              {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <span
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
              accent === 'emerald'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : accent === 'amber'
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                : 'bg-[#141418] text-zinc-300 border-[#27272a]'
            }`}
          >
            {schools.length} {schools.length === 1 ? 'School' : 'Schools'}
          </span>
        </div>
      )}

      {schools.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-500 font-mono">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[#1f1f23] bg-[#0c0c0e] text-[10px] font-mono uppercase text-zinc-400 select-none">
                <th className="py-3 pl-4 pr-2 w-8"></th>
                <th
                  onClick={() => onSortColumn('schoolCode')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                  title="Sort by School Code"
                >
                  School {renderSortIcon('schoolCode')}
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Chief Status</th>
                <th
                  onClick={() => onSortColumn('totalStudents')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap"
                  title="Sort by Total Students"
                >
                  Total Students {renderSortIcon('totalStudents')}
                </th>
                <th
                  onClick={() => onSortColumn('chiefAvailableStudents')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap text-emerald-400"
                  title="Sort by Students With Chief Available"
                >
                  Chief Available {renderSortIcon('chiefAvailableStudents')}
                </th>
                <th
                  onClick={() => onSortColumn('chiefMissingStudents')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap text-amber-400"
                  title="Sort by Students Missing Chief Details"
                >
                  Details Missing {renderSortIcon('chiefMissingStudents')}
                </th>
                <th
                  onClick={() => onSortColumn('coveragePct')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap min-w-[140px]"
                  title="Sort by Chief Coverage %"
                >
                  Coverage % {renderSortIcon('coveragePct')}
                </th>
                <th
                  onClick={() => onSortColumn('uniqueChiefCount')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors text-right whitespace-nowrap"
                  title="Sort by Unique Chief Evaluators"
                >
                  Chiefs {renderSortIcon('uniqueChiefCount')}
                </th>
                <th
                  onClick={() => onSortColumn('schedulesWithMissingChief')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                  title="Sort by Schedules Missing Chief"
                >
                  Schedules {renderSortIcon('schedulesWithMissingChief')}
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181b]">
              {schools.map((school) => {
                const isExpanded = expandedSchools.has(school.schoolCode);
                const missingPct =
                  school.totalStudents > 0
                    ? Number((100 - school.coveragePct).toFixed(1))
                    : 0;
                const copySchedKey = `sched-${school.schoolCode}`;
                const copyEmailsKey = `emails-${school.schoolCode}`;
                const chiefEmailsCsv = school.chiefRoster
                  .map((c) => c.email)
                  .filter((e) => e && e !== 'No Email Listed')
                  .join(', ');

                return (
                  <React.Fragment key={school.schoolCode}>
                    <tr
                      onClick={() => onToggleExpand(school.schoolCode)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? 'bg-[#121218]' : 'hover:bg-[#111114]'
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2 text-zinc-500">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-purple-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-[#18181d] text-purple-300 border border-[#2d2d35]">
                            {school.schoolCode}
                          </span>
                          <span className="text-zinc-200 font-semibold text-xs line-clamp-1">
                            {school.schoolName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">{getCategoryBadge(school.category)}</td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {school.totalStudents.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {school.chiefAvailableStudents.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        {school.chiefMissingStudents > 0 ? (
                          <div>
                            <span className="font-bold text-amber-400">
                              {school.chiefMissingStudents.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-zinc-500 ml-1">
                              ({missingPct}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-[#18181b] h-1.5 rounded-full overflow-hidden min-w-[65px]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                school.category === 'ALL_AVAILABLE'
                                  ? 'bg-emerald-500'
                                  : school.category === 'NONE_AVAILABLE'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${school.coveragePct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-zinc-200 w-12 text-right">
                            {school.coveragePct}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-purple-300">
                          {school.uniqueChiefCount}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div className="flex items-center space-x-1.5 whitespace-nowrap">
                          <span className="text-zinc-300">{school.totalSchedules} total</span>
                          {school.schedulesWithMissingChief > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/70 text-[10px]">
                              {school.schedulesWithMissingChief} missing
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/70 text-[10px]">
                              all covered
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center space-x-1.5">
                          {school.missingScheduleIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onCopyText(copySchedKey, school.missingScheduleIds.join(', '))
                              }
                              className="px-2 py-1 rounded-md bg-[#16161b] hover:bg-[#1f1f27] border border-[#27272a] text-[10px] font-mono text-amber-300 hover:text-amber-200 transition-colors inline-flex items-center space-x-1"
                              title="Copy all missing Schedule IDs for this school"
                            >
                              {copiedKey === copySchedKey ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>
                                {copiedKey === copySchedKey ? 'Copied!' : 'Copy Missing IDs'}
                              </span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onToggleExpand(school.schoolCode)}
                            className="px-2.5 py-1 rounded-md bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-[10px] font-semibold text-purple-200 transition-colors"
                          >
                            {isExpanded ? 'Hide Details' : 'Elaborate'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Elaborated School Drawer */}
                    {isExpanded && (
                      <tr className="bg-[#070709]">
                        <td colSpan={10} className="p-4 sm:p-5 border-t border-[#1e1e24]">
                          <div className="space-y-4">
                            {/* Quick Summary Pills for Expanded School */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                              <div className="p-3 rounded-xl bg-[#0e0e12] border border-[#222228] flex items-center space-x-2.5">
                                <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
                                <div>
                                  <span className="text-[10px] text-zinc-500 block uppercase">
                                    Unique Chief Evaluators
                                  </span>
                                  <span className="font-bold text-white">
                                    {school.uniqueChiefCount} Faculty
                                    {school.uniqueChiefCount > 0 && (
                                      <span className="text-zinc-400 font-normal ml-1">
                                        (~
                                        {Math.round(
                                          school.chiefAvailableStudents / school.uniqueChiefCount
                                        )}
                                        /chief)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-[#0e0e12] border border-[#222228] flex items-center space-x-2.5">
                                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                                <div>
                                  <span className="text-[10px] text-zinc-500 block uppercase">
                                    Schedules Covered / Missing
                                  </span>
                                  <span className="font-bold text-white">
                                    <span className="text-emerald-400">
                                      {school.schedulesAllCovered}
                                    </span>{' '}
                                    /{' '}
                                    <span className="text-amber-400">
                                      {school.schedulesWithMissingChief}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-[#0e0e12] border border-[#222228] flex items-center space-x-2.5">
                                <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                                <div>
                                  <span className="text-[10px] text-zinc-500 block uppercase">
                                    Courses With Missing Chief
                                  </span>
                                  <span className="font-bold text-white">
                                    {school.coursesWithMissingChief} / {school.totalCourses} Courses
                                  </span>
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-[#0e0e12] border border-[#222228] flex items-center space-x-2.5">
                                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                                <div>
                                  <span className="text-[10px] text-zinc-500 block uppercase">
                                    Distinct Exam Dates
                                  </span>
                                  <span className="font-bold text-white">
                                    {school.examDatesCount} Dates
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Two-Column Breakdown: Assigned Chiefs vs Missing Schedules */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Left: Assigned Chief Evaluators Roster */}
                              <div className="rounded-xl bg-[#0b0b0f] border border-[#1f1f26] overflow-hidden flex flex-col">
                                <div className="px-4 py-2.5 border-b border-[#1c1c22] flex items-center justify-between bg-[#0f0f14]">
                                  <div className="flex items-center space-x-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold text-white">
                                      Chief Evaluators Assigned ({school.chiefRoster.length})
                                    </span>
                                  </div>
                                  {chiefEmailsCsv && (
                                    <button
                                      type="button"
                                      onClick={() => onCopyText(copyEmailsKey, chiefEmailsCsv)}
                                      className="text-[10px] font-mono px-2 py-1 rounded bg-[#18181d] hover:bg-[#222229] border border-[#2a2a33] text-zinc-300 flex items-center space-x-1"
                                    >
                                      {copiedKey === copyEmailsKey ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>
                                        {copiedKey === copyEmailsKey
                                          ? 'Copied Emails'
                                          : 'Copy Chief Emails'}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {school.chiefRoster.length === 0 ? (
                                  <div className="p-6 text-center text-xs text-rose-300/80 font-mono">
                                    No Chief Evaluator details are available for {school.schoolCode}.
                                  </div>
                                ) : (
                                  <div className="max-h-64 overflow-y-auto divide-y divide-[#17171c]">
                                    {school.chiefRoster.map((chief) => (
                                      <div
                                        key={chief.key}
                                        className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#111116]"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-xs font-mono text-purple-300 truncate">
                                            {chief.email}
                                          </p>
                                          {chief.name && chief.name !== chief.email && (
                                            <p className="text-[11px] text-zinc-400 truncate">
                                              {chief.name}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2 shrink-0 font-mono text-[10px]">
                                          <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
                                            {chief.studentCount.toLocaleString()} students
                                          </span>
                                          <span className="px-2 py-0.5 rounded bg-[#16161c] text-zinc-300 border border-[#272730]">
                                            {chief.scheduleCount} sched • {chief.courseCount} subj
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Right: Missing Chief Details Breakdown */}
                              <div className="rounded-xl bg-[#0b0b0f] border border-[#1f1f26] overflow-hidden flex flex-col">
                                <div className="px-4 py-2.5 border-b border-[#1c1c22] flex items-center justify-between bg-[#0f0f14]">
                                  <div className="flex items-center space-x-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs font-bold text-white">
                                      Missing Chief Details ({school.missingSchedules.length} Schedules)
                                    </span>
                                  </div>
                                  {school.missingScheduleIds.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onCopyText(
                                          `${copySchedKey}-drawer`,
                                          school.missingScheduleIds.join(', ')
                                        )
                                      }
                                      className="text-[10px] font-mono px-2 py-1 rounded bg-amber-950/50 hover:bg-amber-900/50 border border-amber-800/70 text-amber-300 flex items-center space-x-1"
                                    >
                                      {copiedKey === `${copySchedKey}-drawer` ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>
                                        {copiedKey === `${copySchedKey}-drawer`
                                          ? 'Copied!'
                                          : 'Copy Missing IDs'}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {school.chiefMissingStudents === 0 ? (
                                  <div className="p-6 text-center text-xs text-emerald-400 font-mono">
                                    100% Covered — No missing Chief Evaluator entries in {school.schoolCode}.
                                  </div>
                                ) : (
                                  <div className="flex-1 flex flex-col">
                                    {school.missingCourseCodes.length > 0 && (
                                      <div className="px-4 py-2 border-b border-[#17171c] flex flex-wrap items-center gap-1">
                                        <span className="text-[10px] font-mono text-zinc-500 mr-1">
                                          Courses Missing:
                                        </span>
                                        {school.missingCourseCodes.slice(0, 12).map((cc) => (
                                          <span
                                            key={cc}
                                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50"
                                          >
                                            {cc}
                                          </span>
                                        ))}
                                        {school.missingCourseCodes.length > 12 && (
                                          <span className="text-[10px] font-mono text-zinc-400">
                                            +{school.missingCourseCodes.length - 12} more
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {school.unscheduledMissingStudents > 0 && (
                                      <div className="px-4 py-1.5 bg-rose-950/20 border-b border-[#17171c] text-[10px] font-mono text-rose-300">
                                        Note: {school.unscheduledMissingStudents} missing rows have no Schedule ID.
                                      </div>
                                    )}

                                    <div className="max-h-56 overflow-y-auto divide-y divide-[#17171c]">
                                      {school.missingSchedules.slice(0, 40).map((ms) => (
                                        <div
                                          key={ms.scheduleId}
                                          className="px-4 py-2 flex items-center justify-between gap-3 text-xs hover:bg-[#111116]"
                                        >
                                          <div className="flex items-center space-x-2 min-w-0">
                                            <span className="font-mono font-bold text-white bg-[#18181d] px-2 py-0.5 rounded border border-[#272730]">
                                              {ms.scheduleId}
                                            </span>
                                            <div className="min-w-0">
                                              <span className="font-mono text-zinc-300 text-[11px] block">
                                                {ms.courseCode || '―'}
                                              </span>
                                              {ms.courseName && (
                                                <span className="text-[10px] text-zinc-500 block truncate max-w-[200px]">
                                                  {ms.courseName}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2 shrink-0 font-mono text-[10px]">
                                            <span className="px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/60">
                                              {ms.missingCount} / {ms.totalStudents} missing
                                            </span>
                                            {ms.examDate && (
                                              <span className="text-zinc-500">{ms.examDate}</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {school.missingSchedules.length > 40 && (
                                        <div className="px-4 py-2 text-[10px] font-mono text-zinc-400 text-center">
                                          Showing top 40 of {school.missingSchedules.length} missing schedules. Export Excel to view all.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <span className="text-[11px] text-zinc-500 font-mono">
                                School Summary: {school.schoolName} ({school.schoolCode})
                              </span>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => onExportSingleSchool(school)}
                                  className="px-3 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1c1c22] border border-[#2a2a32] text-xs font-semibold text-zinc-200 inline-flex items-center space-x-1.5"
                                >
                                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Export {school.schoolCode} Report (.xlsx)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onInspectSchool(
                                      school.schoolCode,
                                      school.chiefMissingStudents > 0
                                        ? 'CHIEF_MISSING'
                                        : 'CHIEF_AVAILABLE'
                                    )
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white inline-flex items-center space-x-1.5"
                                >
                                  <span>Open Student Rows in Overview</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const ChiefEvaluatorSchoolSpace: React.FC<ChiefEvaluatorSchoolSpaceProps> = ({
  masterRows,
  precomputedSummary,
  onInspectSchoolInOverview,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<ChiefCategoryFilter>('ALL');
  const [viewLayout, setViewLayout] = useState<ViewLayoutMode>('SPLIT');
  const [sortField, setSortField] = useState<SortField>('schoolCode');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { schoolAggregations, globalStats } = useMemo(
    () => precomputedSummary ?? aggregateChiefBySchool(masterRows),
    [precomputedSummary, masterRows]
  );

  // Apply Search + Category Filter + Sort
  const filteredAndSortedSchools = useMemo(() => {
    let list = schoolAggregations;

    if (categoryFilter === 'ALL_AVAILABLE') {
      list = list.filter((s) => s.category === 'ALL_AVAILABLE');
    } else if (categoryFilter === 'ANY_MISSING') {
      list = list.filter((s) => s.category !== 'ALL_AVAILABLE');
    } else if (categoryFilter === 'PARTIAL_MISSING') {
      list = list.filter((s) => s.category === 'PARTIAL_MISSING');
    } else if (categoryFilter === 'NONE_AVAILABLE') {
      list = list.filter((s) => s.category === 'NONE_AVAILABLE');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.schoolCode.toLowerCase().includes(q) ||
          s.schoolName.toLowerCase().includes(q) ||
          s.chiefRoster.some(
            (c) => c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
          ) ||
          s.missingCourseCodes.some((cc) => cc.toLowerCase().includes(q)) ||
          s.missingScheduleIds.some((sid) => sid.toLowerCase().includes(q))
      );
    }

    return sortSchoolChiefAggregations(list, sortField, sortDir);
  }, [schoolAggregations, categoryFilter, searchQuery, sortField, sortDir]);

  const splitAvailableSchools = useMemo(
    () => filteredAndSortedSchools.filter((s) => s.category === 'ALL_AVAILABLE'),
    [filteredAndSortedSchools]
  );

  const splitMissingSchools = useMemo(
    () => filteredAndSortedSchools.filter((s) => s.category !== 'ALL_AVAILABLE'),
    [filteredAndSortedSchools]
  );

  const handleSortColumn = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Numeric metrics default to descending, text labels to ascending
      setSortDir(field === 'schoolCode' || field === 'schoolName' ? 'asc' : 'desc');
    }
  };

  const handleToggleExpand = (schoolCode: string) => {
    setExpandedSchools((prev) => {
      const next = new Set(prev);
      if (next.has(schoolCode)) next.delete(schoolCode);
      else next.add(schoolCode);
      return next;
    });
  };

  const handleCopyText = async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const buildSummaryExportRows = (list: SchoolChiefAggregation[]) =>
    list.map((s, idx) => ({
      '#': idx + 1,
      'School Code': s.schoolCode,
      'School Name': s.schoolName,
      'Chief Status Category':
        s.category === 'ALL_AVAILABLE'
          ? 'All Chief Values Available'
          : s.category === 'NONE_AVAILABLE'
          ? 'No Chief Values Available (0%)'
          : 'Partial Details Missing',
      'Total Students': s.totalStudents,
      'Chief Available (Students)': s.chiefAvailableStudents,
      'Chief Details Missing (Students)': s.chiefMissingStudents,
      'Coverage %': `${s.coveragePct}%`,
      'Unique Chief Evaluators': s.uniqueChiefCount,
      'Total Schedules': s.totalSchedules,
      'Schedules Covered': s.schedulesAllCovered,
      'Schedules Missing Chief': s.schedulesWithMissingChief,
      'Total Courses': s.totalCourses,
      'Courses Missing Chief': s.coursesWithMissingChief,
      'Missing Schedule IDs': s.missingScheduleIds.join(', '),
    }));

  const handleExportMasterExcel = () => {
    if (filteredAndSortedSchools.length === 0) return;
    const wb = XLSX.utils.book_new();

    const allRows = buildSummaryExportRows(filteredAndSortedSchools);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), 'School-Wise Chief Summary');

    const availableRows = buildSummaryExportRows(
      sortSchoolChiefAggregations(
        schoolAggregations.filter((s) => s.category === 'ALL_AVAILABLE'),
        sortField,
        sortDir
      )
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        availableRows.length > 0 ? availableRows : [{ Status: 'No 100% covered schools found' }]
      ),
      'All Chief Available'
    );

    const missingRows = buildSummaryExportRows(
      sortSchoolChiefAggregations(
        schoolAggregations.filter((s) => s.category !== 'ALL_AVAILABLE'),
        sortField,
        sortDir
      )
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        missingRows.length > 0 ? missingRows : [{ Status: 'No schools with missing chief details' }]
      ),
      'Chief Missing Schools'
    );

    const directoryRows: Record<string, any>[] = [];
    for (const s of filteredAndSortedSchools) {
      for (const c of s.chiefRoster) {
        directoryRows.push({
          'School Code': s.schoolCode,
          'School Name': s.schoolName,
          'Chief Evaluator Email': c.email,
          'Chief Evaluator Name': c.name,
          'Assigned Students': c.studentCount,
          'Schedules Covered': c.scheduleCount,
          'Courses Covered': c.courseCount,
          Courses: c.courses.join(', '),
        });
      }
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        directoryRows.length > 0 ? directoryRows : [{ Status: 'No Chief Evaluators found' }]
      ),
      'Chief Evaluator Roster'
    );

    XLSX.writeFile(
      wb,
      `Chief_Evaluator_School_Breakdown_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleExportCsv = () => {
    if (filteredAndSortedSchools.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(buildSummaryExportRows(filteredAndSortedSchools));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chief_Evaluator_School_Breakdown_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSingleSchool = (school: SchoolChiefAggregation) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(buildSummaryExportRows([school])),
      'Summary'
    );

    const rosterRows = school.chiefRoster.map((c, idx) => ({
      '#': idx + 1,
      'Chief Evaluator Email': c.email,
      'Chief Evaluator Name': c.name,
      'Assigned Students': c.studentCount,
      'Schedules Covered': c.scheduleCount,
      'Courses Covered': c.courseCount,
      Courses: c.courses.join(', '),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rosterRows.length > 0 ? rosterRows : [{ Status: 'No Chief Evaluators assigned' }]
      ),
      'Chief Roster'
    );

    const missingSchedRows = school.missingSchedules.map((ms, idx) => ({
      '#': idx + 1,
      'Schedule ID': ms.scheduleId,
      'Course Code': ms.courseCode,
      'Course Name': ms.courseName,
      'Exam Date': ms.examDate,
      'Missing Students': ms.missingCount,
      'Total Students': ms.totalStudents,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        missingSchedRows.length > 0 ? missingSchedRows : [{ Status: 'No missing schedules' }]
      ),
      'Missing Schedules'
    );

    XLSX.writeFile(
      wb,
      `Chief_Report_${school.schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const sortOptions = [
    { value: 'schoolCode', label: 'School Code (A-Z)' },
    { value: 'schoolName', label: 'School Name (A-Z)' },
    { value: 'coveragePct', label: 'Chief Coverage %' },
    { value: 'chiefAvailableStudents', label: 'Chief Available (Students)' },
    { value: 'chiefMissingStudents', label: 'Chief Missing (Students)' },
    { value: 'totalStudents', label: 'Total Students' },
    { value: 'uniqueChiefCount', label: 'Unique Chief Count' },
    { value: 'schedulesWithMissingChief', label: 'Missing Schedules Count' },
  ];

  return (
    <div className="space-y-5">
      {/* Top KPI Cards (Clickable Quick Categorization) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Schools Overview */}
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            categoryFilter === 'ALL'
              ? 'bg-purple-500/[0.08] border-purple-500/60 shadow-lg shadow-purple-950/20'
              : 'bg-[#09090b] border-[#27272a] hover:border-zinc-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                Total Schools Analyzed
              </span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-black text-white font-mono">
                {globalStats.totalSchools}
              </p>
              <span className="text-xs font-mono text-purple-300 font-bold">
                ({globalStats.totalUniqueChiefsGlobal} Unique Chiefs)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 pt-2.5 border-t border-[#1f1f23] font-mono">
            Overall Coverage: <strong className="text-white">{globalStats.globalCoveragePct}%</strong>{' '}
            ({globalStats.totalChiefAvailableStudents.toLocaleString()} /{' '}
            {globalStats.totalStudentsAll.toLocaleString()} students)
          </p>
        </button>

        {/* KPI 2: Schools with ALL Chief Values Available */}
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL_AVAILABLE')}
          className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            categoryFilter === 'ALL_AVAILABLE'
              ? 'bg-emerald-500/[0.08] border-emerald-500/60 shadow-lg shadow-emerald-950/20'
              : 'bg-[#09090b] border-[#27272a] hover:border-emerald-500/35'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-emerald-400">
                All Chief Values Available
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-black text-emerald-400 font-mono">
                {globalStats.schoolsAllAvailable}
              </p>
              <span className="text-xs font-bold text-emerald-300 font-mono">Schools (100%)</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 pt-2.5 border-t border-[#1f1f23]">
            Schools where every single student has Chief Evaluator details
          </p>
        </button>

        {/* KPI 3: Schools with Chief Details Not Available / Missing */}
        <button
          type="button"
          onClick={() => setCategoryFilter('ANY_MISSING')}
          className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            categoryFilter === 'ANY_MISSING'
              ? 'bg-amber-500/[0.08] border-amber-500/60 shadow-lg shadow-amber-950/20'
              : 'bg-[#09090b] border-[#27272a] hover:border-amber-500/35'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-400">
                Chief Details Missing
              </span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-black text-amber-400 font-mono">
                {globalStats.schoolsAnyMissing}
              </p>
              <span className="text-xs font-bold text-amber-300 font-mono">
                Schools ({globalStats.totalChiefMissingStudents.toLocaleString()} Students)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 pt-2.5 border-t border-[#1f1f23] font-mono">
            {globalStats.schoolsPartialMissing} partial missing • {globalStats.schoolsNoneAvailable}{' '}
            completely missing
          </p>
        </button>

        {/* KPI 4: Schools with ZERO Chief Details Available */}
        <button
          type="button"
          onClick={() => setCategoryFilter('NONE_AVAILABLE')}
          className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            categoryFilter === 'NONE_AVAILABLE'
              ? 'bg-rose-500/[0.08] border-rose-500/60 shadow-lg shadow-rose-950/20'
              : 'bg-[#09090b] border-[#27272a] hover:border-rose-500/35'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-rose-400">
                Zero Chief Values (0%)
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-black text-rose-400 font-mono">
                {globalStats.schoolsNoneAvailable}
              </p>
              <span className="text-xs font-bold text-rose-300 font-mono">Schools</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 pt-2.5 border-t border-[#1f1f23]">
            Schools where 0 students have a Chief Evaluator assigned
          </p>
        </button>
      </div>

      {/* Control Toolbar: Categorization Filters, Layout Mode, Sorting & Exports */}
      <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a] space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Unified Category Segmented Toggle */}
          <SegmentedToggle
            size="sm"
            wrap
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            options={[
              { value: 'ALL', label: 'All Schools', count: globalStats.totalSchools },
              {
                value: 'ALL_AVAILABLE',
                label: 'All Chief Available',
                count: globalStats.schoolsAllAvailable,
                tone: 'emerald',
              },
              {
                value: 'ANY_MISSING',
                label: 'Not Available / Missing',
                count: globalStats.schoolsAnyMissing,
                tone: 'amber',
              },
              {
                value: 'PARTIAL_MISSING',
                label: 'Partial Only',
                count: globalStats.schoolsPartialMissing,
                tone: 'purple',
              },
              {
                value: 'NONE_AVAILABLE',
                label: '0% Assigned',
                count: globalStats.schoolsNoneAvailable,
                tone: 'rose',
              },
            ]}
          />

          {/* Search & Export Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative min-w-[210px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search school, chief email, course..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black border border-[#27272a] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white transition-all"
            >
              CSV
            </button>

            <button
              type="button"
              onClick={handleExportMasterExcel}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-sm"
              title="Download multi-sheet Excel breakdown (Summary, All Available, Missing Schools, Chief Roster)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Chief Matrix (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* School-Wise Sorting & View Layout Strip */}
        <div className="pt-2.5 border-t border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {/* View Layout Toggle */}
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Display Mode</span>
            <SegmentedToggle
              size="sm"
              value={viewLayout}
              onChange={(val) => setViewLayout(val)}
              options={[
                {
                  value: 'SPLIT',
                  label: 'Categorized (Available vs Missing)',
                  icon: SplitSquareVertical,
                  tone: 'purple',
                  title: 'Separate into (1) All Chief Available Schools and (2) Missing Chief Schools',
                },
                {
                  value: 'UNIFIED',
                  label: 'Unified Table',
                  icon: LayoutList,
                  title: 'Combined sortable table of all schools',
                },
              ]}
            />
          </div>

          {/* Dedicated School-Wise Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Sort By</span>
            <CustomDropdown
              size="sm"
              menuAlign="right"
              value={sortField}
              onChange={(val) => setSortField(val as SortField)}
              options={sortOptions}
              icon={ArrowUpDown}
              minMenuWidth="min-w-[235px]"
            />

            <SegmentedToggle
              size="sm"
              value={sortDir}
              onChange={(val) => setSortDir(val as SortDirection)}
              options={[
                { value: 'asc', label: 'Asc', icon: ArrowUp, tone: 'purple' },
                { value: 'desc', label: 'Desc', icon: ArrowDown, tone: 'purple' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Render Either Split Categorized Sections or Unified Table */}
      {categoryFilter === 'ALL' && viewLayout === 'SPLIT' ? (
        <div className="space-y-5">
          {/* SECTION 1: Schools where ALL Chief Evaluator values are available */}
          <SchoolChiefTable
            title="1. School-Wise Data — All Chief Values Available (100%)"
            subtitle="Schools where every student record has valid Chief Evaluator details assigned."
            accent="emerald"
            schools={splitAvailableSchools}
            sortField={sortField}
            sortDir={sortDir}
            onSortColumn={handleSortColumn}
            expandedSchools={expandedSchools}
            onToggleExpand={handleToggleExpand}
            copiedKey={copiedKey}
            onCopyText={handleCopyText}
            onInspectSchool={onInspectSchoolInOverview}
            onExportSingleSchool={handleExportSingleSchool}
            emptyMessage="No schools currently have 100% Chief Evaluator details available matching your search."
          />

          {/* SECTION 2: Schools where Chief Evaluator details are NOT available / Missing */}
          <SchoolChiefTable
            title="2. School-Wise Data — Chief Details Not Available / Missing"
            subtitle="Schools having missing Chief Evaluator assignments (either partial missing or completely missing)."
            accent="amber"
            schools={splitMissingSchools}
            sortField={sortField}
            sortDir={sortDir}
            onSortColumn={handleSortColumn}
            expandedSchools={expandedSchools}
            onToggleExpand={handleToggleExpand}
            copiedKey={copiedKey}
            onCopyText={handleCopyText}
            onInspectSchool={onInspectSchoolInOverview}
            onExportSingleSchool={handleExportSingleSchool}
            emptyMessage="Great news! No schools have missing Chief Evaluator details matching your search."
          />
        </div>
      ) : (
        <SchoolChiefTable
          title={
            categoryFilter === 'ALL_AVAILABLE'
              ? 'Schools — All Chief Values Available (100% Covered)'
              : categoryFilter === 'ANY_MISSING'
              ? 'Schools — Chief Evaluator Details Not Available / Missing'
              : categoryFilter === 'PARTIAL_MISSING'
              ? 'Schools — Partially Missing Chief Evaluator Details'
              : categoryFilter === 'NONE_AVAILABLE'
              ? 'Schools — Zero Chief Evaluator Values Available (0%)'
              : 'All Schools — Chief Evaluator Breakdown'
          }
          subtitle="Click any school row to expand its Chief Evaluator roster and missing Schedule IDs breakdown."
          accent={
            categoryFilter === 'ALL_AVAILABLE'
              ? 'emerald'
              : categoryFilter === 'ALL'
              ? 'neutral'
              : 'amber'
          }
          schools={filteredAndSortedSchools}
          sortField={sortField}
          sortDir={sortDir}
          onSortColumn={handleSortColumn}
          expandedSchools={expandedSchools}
          onToggleExpand={handleToggleExpand}
          copiedKey={copiedKey}
          onCopyText={handleCopyText}
          onInspectSchool={onInspectSchoolInOverview}
          onExportSingleSchool={handleExportSingleSchool}
          emptyMessage="No schools match the current filter and search criteria."
        />
      )}
    </div>
  );
};
