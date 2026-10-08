'use client';

import React, { useState, useMemo } from 'react';
import { User, Topic, TopicConfirmation, TopicType, TargetGroup, DateFilterType, DateFilterOptions } from '@/lib/types';
import {
  calculateTopicStats,
  TopicComplianceStats,
  matchesDateFilter,
  getISOWeekNumber,
  getWeekDateRange,
} from '@/lib/compliance-store';
import { exportSingleTopicReport, exportMultipleTopicsReport } from '@/lib/export-utils';
import { CreateTopicModal } from './create-topic-modal';
import { TopicBreakdownModal } from './topic-breakdown-modal';
import { ApprovedUsersManager, AuditLogModal } from './admin-auth-controls';
import {
  Plus,
  Download,
  Filter,
  Search,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Eye,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Shield,
  History,
} from 'lucide-react';

interface AdminConsoleProps {
  users: User[];
  topics: Topic[];
  confirmations: TopicConfirmation[];
  currentUser: User;
  onCreateTopic: (topicData: Omit<Topic, 'id' | 'createdAt'>) => void;
  onDeleteTopic: (topicId: string) => void;
  onNavigateToRoster?: () => void;
}

const ALL_TOPIC_TYPES: TopicType[] = [
  'Document Read and Sign',
  'GPD/GPI Read and Sign',
  'AHD/AHI Read and Sign',
  'Training',
  'Briefing',
  'Role Play',
  'Others',
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023];

export function AdminConsole({
  users,
  topics,
  confirmations,
  currentUser,
  onCreateTopic,
  onDeleteTopic,
  onNavigateToRoster,
}: AdminConsoleProps) {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTopicForBreakdown, setSelectedTopicForBreakdown] = useState<TopicComplianceStats | null>(null);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_action' | 'fully_completed'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 0-indexed: 9 = October
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(41); // Current week in Oct 2026
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-31');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>('all');

  // Multi-select for bulk actions
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

  // Quick counts for clickable filter boxes
  const targetGroupCounts = useMemo(() => {
    return {
      all: topics.length,
      ALL: topics.filter(t => t.targetGroup === 'ALL').length,
      ALS: topics.filter(t => t.targetGroup === 'ALS').length,
      Lead: topics.filter(t => t.targetGroup === 'Lead').length,
    };
  }, [topics]);

  const topicTypeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    topics.forEach(t => {
      map[t.type] = (map[t.type] || 0) + 1;
    });
    return map;
  }, [topics]);

  // Reference date for date filtering is October 7, 2026 (local runtime time)
  const referenceDate = useMemo(() => new Date(2026, 9, 7), []);

  // Generate 52 weeks options for current selected year
  const weekOptions = useMemo(() => {
    const currentWeek = getISOWeekNumber(referenceDate);
    const weeks: { weekNum: number; label: string; isCurrent: boolean }[] = [];
    for (let w = 52; w >= 1; w--) {
      const range = getWeekDateRange(w, selectedYear);
      weeks.push({
        weekNum: w,
        label: range.label + (selectedYear === 2026 && w === currentWeek ? ' · Current Week' : ''),
        isCurrent: selectedYear === 2026 && w === currentWeek,
      });
    }
    return weeks;
  }, [selectedYear, referenceDate]);

  // Compute stats for all topics
  const allTopicStats = useMemo(() => {
    return topics.map(t => calculateTopicStats(t, users, confirmations));
  }, [topics, users, confirmations]);

  // Filtered topic stats based on publication date and criteria
  const filteredTopicStats = useMemo(() => {
    const dateOptions: DateFilterOptions = {
      type: dateFilter,
      customStartDate,
      customEndDate,
      selectedMonth,
      selectedYear,
      selectedWeekNum,
    };

    return allTopicStats.filter(item => {
      const { topic } = item;

      // 1. Topic Type Filter
      if (typeFilter !== 'all' && topic.type !== typeFilter) {
        return false;
      }

      // 2. Target Group Filter (ALL, ALS, Lead)
      if (targetGroupFilter !== 'all' && topic.targetGroup !== targetGroupFilter) {
        return false;
      }

      // 3. Filter by Date Published (topic.createdAt or effectiveDate)
      const publicationDateStr = topic.createdAt || topic.effectiveDate;
      const matchesDate = matchesDateFilter(
        publicationDateStr,
        dateOptions,
        customStartDate,
        customEndDate,
        referenceDate
      );
      if (!matchesDate) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          topic.title.toLowerCase().includes(q) ||
          topic.content.toLowerCase().includes(q) ||
          (topic.customTypeDesc && topic.customTypeDesc.toLowerCase().includes(q)) ||
          topic.createdBy.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 5. Completion Status Filter from Clickable Overview Boxes
      if (statusFilter === 'needs_action' && item.totalMissing === 0) {
        return false;
      }
      if (statusFilter === 'fully_completed' && item.totalMissing > 0) {
        return false;
      }

      return true;
    });
  }, [
    allTopicStats,
    typeFilter,
    targetGroupFilter,
    dateFilter,
    statusFilter,
    selectedMonth,
    selectedYear,
    selectedWeekNum,
    customStartDate,
    customEndDate,
    referenceDate,
    searchQuery,
  ]);

  // Aggregate metrics
  const totalTopics = filteredTopicStats.length;
  const totalAssignments = filteredTopicStats.reduce((sum, s) => sum + s.totalEligible, 0);
  const totalConfirmed = filteredTopicStats.reduce((sum, s) => sum + s.totalConfirmed, 0);
  const totalMissing = filteredTopicStats.reduce((sum, s) => sum + s.totalMissing, 0);
  const aggregateRate = totalAssignments > 0 ? Math.round((totalConfirmed / totalAssignments) * 100) : 100;

  // Toggle topic selection for multi-export
  const toggleSelectTopic = (id: string) => {
    const next = new Set(selectedTopicIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTopicIds(next);
  };

  const toggleSelectAllFiltered = () => {
    if (selectedTopicIds.size === filteredTopicStats.length && filteredTopicStats.length > 0) {
      setSelectedTopicIds(new Set());
    } else {
      setSelectedTopicIds(new Set(filteredTopicStats.map(s => s.topic.id)));
    }
  };

  // Bulk export handler
  const handleBulkExport = () => {
    // If specific items selected, export those; otherwise export all currently filtered items
    const toExport =
      selectedTopicIds.size > 0
        ? filteredTopicStats.filter(s => selectedTopicIds.has(s.topic.id))
        : filteredTopicStats;

    if (toExport.length === 0) return;

    const filterDesc = `Date: ${dateFilter} | Type: ${typeFilter} | Target: ${targetGroupFilter} (${toExport.length} topics)`;
    exportMultipleTopicsReport(toExport, filterDesc);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar with primary CTAs */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Station Administrator Console</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">✓ Cryptographic Magic Link & Identity Lock Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Read & Sign Compliance Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Create compliance topics, track staff acknowledgments across ALL, ALS, and Lead personnel, and export audit reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowApprovedModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
            title="Pre-approve external private email addresses (Gmail, Outlook)"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approved Users Whitelist</span>
          </button>

          <button
            onClick={() => setShowAuditModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
            title="Inspect authentication, email changes, and session audit logs"
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Auth Audit Trail</span>
          </button>

          {onNavigateToRoster && (
            <button
              onClick={onNavigateToRoster}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
              title="Add, amend, delete or import staff members (XLSX, CSV, PDF)"
            >
              <Users className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>Manage Staff ({users.length})</span>
            </button>
          )}

          <button
            onClick={handleBulkExport}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
            title="Export compliance data across filtered or selected topics"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {selectedTopicIds.size > 0
                ? `Export Selected (${selectedTopicIds.size})`
                : `Export Filtered (${filteredTopicStats.length})`}
            </span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Topic</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Metrics - Clickable Filter Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            statusFilter === 'all'
              ? 'bg-blue-50/50 border-[#0078D4] ring-2 ring-[#0078D4]/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
          title="Click to view all active compliance topics"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Topics</span>
            {statusFilter === 'all' && (
              <span className="text-[10px] bg-[#0078D4] text-white px-1.5 py-0.2 rounded font-semibold">Active</span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalTopics}</div>
          <div className="text-[11px] text-[#0078D4] mt-1 font-medium flex items-center justify-between">
            <span>Show all topics</span>
            <span className="text-slate-400">↳</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'fully_completed' ? 'all' : 'fully_completed')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            statusFilter === 'fully_completed'
              ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
          title="Click to filter topics with 100% staff acknowledgment"
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Confirmed Signatures</span>
            </div>
            {statusFilter === 'fully_completed' && (
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">Filtered</span>
            )}
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{totalConfirmed}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center justify-between">
            <span>{statusFilter === 'fully_completed' ? '100% Complete Only' : 'Filter 100% Complete'}</span>
            <span>↳</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'needs_action' ? 'all' : 'needs_action')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            statusFilter === 'needs_action'
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
          }`}
          title="Click to filter topics that have missing staff awaiting signature"
        >
          <div className="flex items-center justify-between text-xs font-medium text-amber-700">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Missing / Pending Staff</span>
            </div>
            {statusFilter === 'needs_action' && (
              <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-semibold">Filtered</span>
            )}
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1 tabular-nums">{totalMissing}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium flex items-center justify-between">
            <span>{statusFilter === 'needs_action' ? 'Pending Action Only' : 'Filter Pending Staff'}</span>
            <span>↳</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'needs_action' ? 'fully_completed' : 'needs_action')}
          className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs transition cursor-pointer hover:shadow-sm"
          title="Click to toggle between Pending action vs Completed topics"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Overall Station Rate</span>
            <span className="text-[10px] text-slate-400">Toggle</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{aggregateRate}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                aggregateRate === 100 ? 'bg-emerald-500' : aggregateRate >= 70 ? 'bg-[#0078D4]' : 'bg-amber-500'
              }`}
              style={{ width: `${aggregateRate}%` }}
            />
          </div>
        </button>
      </div>

      {/* COMPREHENSIVE FILTER SYSTEM */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-900 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0078D4]" />
            <span>Compliance Filters & Reporting Criteria</span>
          </div>
          {(dateFilter !== 'all' || typeFilter !== 'all' || targetGroupFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setDateFilter('all');
                setTypeFilter('all');
                setTargetGroupFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-[#0078D4] hover:underline font-normal text-xs"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* 1. Date Published Filters Row - Interactive Clickable Filter Boxes */}
        <div>
          <div className="text-slate-700 font-semibold mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>Filter Topics by Date Published:</span>
            </div>
            {dateFilter !== 'all' && (
              <span className="text-[11px] font-normal text-slate-500">
                {dateFilter === 'this_month' && 'Topics published in This Month (October 2026)'}
                {dateFilter === 'last_one_month' && 'Topics published in Last 1 Month (September – October 2026)'}
                {dateFilter === 'week_this_year' && `Topics published in Week ${selectedWeekNum}, ${selectedYear}`}
                {dateFilter === 'select_month_year' && `Topics published in ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                {dateFilter === 'last_one_year' && 'Topics published in Last 1 Year (past 12 months)'}
                {dateFilter === 'custom' && `Published between ${customStartDate} and ${customEndDate}`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {/* 1. This Month */}
            <button
              type="button"
              onClick={() => setDateFilter('this_month')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                dateFilter === 'this_month'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Filters topics published in the current calendar month (October 2026)"
            >
              <span className="text-[10px] text-slate-500 font-mono">this_month</span>
              <span className="text-xs font-bold text-slate-900 mt-1">This Month</span>
              <span className="text-[10px] text-slate-400 mt-0.5">October 2026</span>
            </button>

            {/* 2. In Last One Month */}
            <button
              type="button"
              onClick={() => setDateFilter('last_one_month')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                dateFilter === 'last_one_month'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Filters topics published within the last 30–31 days or preceding month"
            >
              <span className="text-[10px] text-slate-500 font-mono">last_one_month</span>
              <span className="text-xs font-bold text-slate-900 mt-1">In Last One Month</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Past 30–31 days</span>
            </button>

            {/* 3. Week This Year */}
            <button
              type="button"
              onClick={() => setDateFilter('week_this_year')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                dateFilter === 'week_this_year'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Interactive dropdown allowing admins to select any ISO week (Weeks 1 to 52)"
            >
              <span className="text-[10px] text-slate-500 font-mono">week_this_year</span>
              <span className="text-xs font-bold text-slate-900 mt-1">Week This Year</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Week {selectedWeekNum}</span>
            </button>

            {/* 4. Select Month & Year */}
            <button
              type="button"
              onClick={() => setDateFilter('select_month_year')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                dateFilter === 'select_month_year'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Independent dropdowns to pick Month (Jan-Dec) and Year (2023-2026)"
            >
              <span className="text-[10px] text-slate-500 font-mono">select_month_year</span>
              <span className="text-xs font-bold text-slate-900 mt-1">Select Month & Year</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}</span>
            </button>

            {/* 5. In Last One Year */}
            <button
              type="button"
              onClick={() => setDateFilter('last_one_year')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                dateFilter === 'last_one_year'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Filters topics published within rolling 12-month period (past 365 days)"
            >
              <span className="text-[10px] text-slate-500 font-mono">last_one_year</span>
              <span className="text-xs font-bold text-slate-900 mt-1">In Last One Year</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Past 365 days</span>
            </button>

            {/* 6. Custom Dates */}
            <button
              type="button"
              onClick={() => setDateFilter('custom')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                dateFilter === 'custom'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Dual calendar date pickers with interactive calendar popups"
            >
              <span className="text-[10px] text-slate-500 font-mono">custom</span>
              <span className="text-xs font-bold text-slate-900 mt-1">Custom Dates</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Calendar Pickers</span>
            </button>

            {/* 7. All Published */}
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                dateFilter === 'all'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Clears the publication date constraint to view all compliance topics"
            >
              <span className="text-[10px] text-slate-500 font-mono">all</span>
              <span className="text-xs font-bold text-slate-900 mt-1">All Published</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Clear filter</span>
            </button>
          </div>

          {/* Sub-controls based on active filter */}
          {dateFilter === 'week_this_year' && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-700 font-semibold">Select ISO Week of {selectedYear}:</span>
                <select
                  value={selectedWeekNum}
                  onChange={e => setSelectedWeekNum(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800 shadow-xs focus:ring-1 focus:ring-[#0078D4]"
                >
                  {weekOptions.map(w => (
                    <option key={w.weekNum} value={w.weekNum}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWeekNum(getISOWeekNumber(referenceDate))}
                className="px-3 py-1.5 text-xs text-[#0078D4] bg-white hover:bg-blue-50 border border-blue-200 rounded-md font-semibold transition shadow-xs flex items-center gap-1.5"
                title="Jump directly to current calendar week (Week 41)"
              >
                <span>Jump to Current Week (Week {getISOWeekNumber(referenceDate)})</span>
              </button>
            </div>
          )}

          {dateFilter === 'select_month_year' && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-semibold">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800 shadow-xs focus:ring-1 focus:ring-[#0078D4]"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-semibold">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800 shadow-xs focus:ring-1 focus:ring-[#0078D4]"
                  >
                    {AVAILABLE_YEARS.map(yr => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Confirmation Banner */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0078D4] shrink-0" />
                <span>
                  <strong>Active Target Confirmation:</strong> Currently filtering topics published in{' '}
                  <span className="font-semibold text-[#0078D4] underline underline-offset-2">
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </span>.
                </span>
              </div>
            </div>
          )}

          {dateFilter === 'custom' && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-semibold">From Date:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-mono shadow-xs focus:ring-1 focus:ring-[#0078D4]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-semibold">To Date:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-mono shadow-xs focus:ring-1 focus:ring-[#0078D4]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('2026-10-01');
                    setCustomEndDate('2026-10-07');
                  }}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-700 font-medium transition shadow-xs"
                >
                  Past 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('2026-09-07');
                    setCustomEndDate('2026-10-07');
                  }}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-700 font-medium transition shadow-xs"
                >
                  Past 30 Days
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Target Group Filter Boxes - Clickable */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-slate-700 font-semibold mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>Filter by Target Group (Click to filter):</span>
            </div>
            {targetGroupFilter !== 'all' && (
              <span className="text-[11px] font-normal text-slate-500">
                Active Group: <strong>{targetGroupFilter}</strong>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setTargetGroupFilter('all')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                targetGroupFilter === 'all'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Click to show topics for all target categories"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">All Target Groups</div>
                <div className="text-[10px] text-slate-500">All topics</div>
              </div>
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700 tabular-nums">
                {targetGroupCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetGroupFilter('ALL')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                targetGroupFilter === 'ALL'
                  ? 'bg-blue-50/80 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Click to filter topics mandatory for ALL staff"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">ALL Staff</div>
                <div className="text-[10px] text-slate-500">Mandatory for all 132</div>
              </div>
              <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-[#0078D4] tabular-nums">
                {targetGroupCounts.ALL}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetGroupFilter('ALS')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                targetGroupFilter === 'ALS'
                  ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
              }`}
              title="Click to filter topics assigned to ALS qualified staff"
            >
              <div>
                <div className="text-xs font-bold text-emerald-900">ALS Qualified</div>
                <div className="text-[10px] text-slate-500">ALS certified only</div>
              </div>
              <span className="text-xs font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-700 tabular-nums">
                {targetGroupCounts.ALS}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetGroupFilter('Lead')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                targetGroupFilter === 'Lead'
                  ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20'
                  : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50'
              }`}
              title="Click to filter topics assigned to Station Leads"
            >
              <div>
                <div className="text-xs font-bold text-purple-900">Station Leads</div>
                <div className="text-[10px] text-slate-500">Duty & Station Leads</div>
              </div>
              <span className="text-xs font-bold bg-purple-100 px-2 py-0.5 rounded text-purple-700 tabular-nums">
                {targetGroupCounts.Lead}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Topic Type Filter Boxes - Clickable */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-slate-700 font-semibold mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>Filter by Topic Type (Click box to filter):</span>
            </div>
            {typeFilter !== 'all' && (
              <span className="text-[11px] font-normal text-slate-500">
                Active Type: <strong>{typeFilter}</strong>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>All Types</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${typeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {topics.length}
              </span>
            </button>

            {ALL_TOPIC_TYPES.map(t => {
              const count = topicTypeCounts[t] || 0;
              const isActive = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(isActive ? 'all' : t)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0078D4] text-white border-[#0078D4] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50 hover:border-blue-200'
                  }`}
                  title={`Click to filter by ${t}`}
                >
                  <span>{t}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded tabular-nums ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Keyword Search Row */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search topic title, description, or author..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 border rounded"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Table of Topics with Completion Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Table header toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAllFiltered}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium"
            >
              {selectedTopicIds.size === filteredTopicStats.length && filteredTopicStats.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#0078D4]" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All Visible ({filteredTopicStats.length})</span>
            </button>
            {selectedTopicIds.size > 0 && (
              <span className="text-[11px] text-slate-500">
                ({selectedTopicIds.size} topics selected for bulk export)
              </span>
            )}
          </div>

          <div className="text-slate-500 text-[11px]">
            Showing <strong className="text-slate-900">{filteredTopicStats.length}</strong> topics
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-8 text-center"></th>
                <th className="py-3 px-4 font-semibold">Topic & Directive Title</th>
                <th className="py-3 px-4 font-semibold">Type & Category</th>
                <th className="py-3 px-4 font-semibold">Target Group</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold">Staff Progress</th>
                <th className="py-3 px-4 font-semibold text-center">Confirmed</th>
                <th className="py-3 px-4 font-semibold text-center">Missing</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTopicStats.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No compliance topics match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTopicStats.map(stat => {
                  const {
                    topic,
                    totalEligible,
                    totalConfirmed,
                    totalMissing,
                    completionRate,
                  } = stat;
                  const isSelected = selectedTopicIds.has(topic.id);

                  return (
                    <tr
                      key={topic.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTopic(topic.id)}
                          className="w-3.5 h-3.5 text-[#0078D4] rounded border-slate-300"
                        />
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div
                          className="font-semibold text-slate-900 hover:text-[#0078D4] cursor-pointer"
                          onClick={() => setSelectedTopicForBreakdown(stat)}
                        >
                          {topic.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const date = new Date(topic.createdAt || topic.effectiveDate);
                              setSelectedMonth(date.getMonth());
                              setSelectedYear(date.getFullYear());
                              setDateFilter('select_month_year');
                            }}
                            className="font-mono text-[#0078D4] font-medium bg-blue-50/70 hover:bg-blue-100 px-1.5 py-0.2 rounded border border-blue-100 transition cursor-pointer text-left"
                            title="Click to filter topics published in this month and year"
                          >
                            Published: {topic.createdAt ? topic.createdAt.slice(0, 10) : topic.effectiveDate}
                          </button>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-slate-500">By {topic.createdBy}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <button
                          type="button"
                          onClick={() => setTypeFilter(topic.type)}
                          className="font-medium text-slate-800 hover:text-[#0078D4] text-left hover:underline cursor-pointer"
                          title={`Click to filter by topic type: ${topic.type}`}
                        >
                          {topic.type}
                        </button>
                        {topic.customTypeDesc && (
                          <div className="text-[11px] text-slate-500 italic">
                            {topic.customTypeDesc}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setTargetGroupFilter(topic.targetGroup)}
                          className={`font-semibold px-2 py-0.5 rounded text-xs transition cursor-pointer inline-block ${
                            topic.targetGroup === 'ALL'
                              ? 'bg-blue-50 text-[#0078D4] hover:bg-blue-100 border border-blue-200'
                              : topic.targetGroup === 'ALS'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                          }`}
                          title={`Click to filter by target group: ${topic.targetGroup}`}
                        >
                          {topic.targetGroup}
                        </button>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {topic.targetGroup === 'ALL'
                            ? 'All 132 Staff'
                            : topic.targetGroup === 'ALS'
                            ? 'ALS Roster'
                            : 'Lead Roster'}
                        </div>
                      </td>

                      <td className="py-3 px-4 tabular-nums font-medium text-slate-800">
                        {topic.dueDate}
                      </td>

                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span>{completionRate}%</span>
                          <span className="text-slate-400">({totalConfirmed}/{totalEligible})</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              completionRate === 100
                                ? 'bg-emerald-500'
                                : completionRate >= 60
                                ? 'bg-[#0078D4]'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTopicForBreakdown(stat)}
                          className="font-bold text-emerald-700 tabular-nums hover:underline hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                          title={`Click to inspect ${totalConfirmed} confirmed signatures`}
                        >
                          {totalConfirmed}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTopicForBreakdown(stat)}
                          className="font-bold text-amber-700 tabular-nums hover:underline hover:bg-amber-50 px-2 py-1 rounded transition cursor-pointer"
                          title={`Click to inspect ${totalMissing} pending / missing staff`}
                        >
                          {totalMissing}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {/* Breakdown drill-down */}
                        <button
                          onClick={() => setSelectedTopicForBreakdown(stat)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition inline-flex items-center gap-1"
                          title="View list of confirmed and missing staff for this topic"
                        >
                          <Users className="w-3 h-3 text-[#0078D4]" />
                          <span>Staff List</span>
                        </button>

                        {/* Export Single Topic CSV */}
                        <button
                          onClick={() => exportSingleTopicReport(stat)}
                          className="px-2 py-1 text-[11px] text-[#0078D4] hover:bg-blue-50 border border-slate-200 rounded transition inline-flex items-center gap-1"
                          title="Export single topic compliance report (CSV)"
                        >
                          <Download className="w-3 h-3" />
                          <span>CSV</span>
                        </button>

                        {/* Delete topic */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${topic.title}"?`)) {
                              onDeleteTopic(topic.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                          title="Delete compliance topic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Topic Creation Modal */}
      {showCreateModal && (
        <CreateTopicModal
          currentUserEmail={currentUser.email}
          onSaveTopic={onCreateTopic}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Topic Staff Breakdown Drill-down Modal */}
      {selectedTopicForBreakdown && (
        <TopicBreakdownModal
          stats={selectedTopicForBreakdown}
          onClose={() => setSelectedTopicForBreakdown(null)}
        />
      )}

      {/* Admin Approved Users Whitelist Modal */}
      {showApprovedModal && (
        <ApprovedUsersManager
          onClose={() => setShowApprovedModal(false)}
          onRefreshRoster={() => {
            window.dispatchEvent(new Event('read_and_sign_data_changed'));
          }}
        />
      )}

      {/* Admin Audit Log Modal */}
      {showAuditModal && (
        <AuditLogModal
          onClose={() => setShowAuditModal(false)}
        />
      )}
    </div>
  );
}
