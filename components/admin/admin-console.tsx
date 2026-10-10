'use client';

import React, { useState, useMemo } from 'react';
import { User, Topic, TopicConfirmation, TopicType, TargetGroup, DateFilterType, DateFilterOptions } from '@/lib/types';
import {
  calculateTopicStats,
  TopicComplianceStats,
  matchesDateFilter,
  getISOWeekNumber,
  getWeekDateRange,
  isTopicFuturePlanned,
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart2,
  Settings,
  Cloud,
  X,
} from 'lucide-react';
import { saveAllTopicsAndAssignmentsToFirestore } from '@/lib/firebase';

interface AdminConsoleProps {
  users: User[];
  topics: Topic[];
  confirmations: TopicConfirmation[];
  currentUser: User;
  onCreateTopic: (topicData: Omit<Topic, 'id' | 'createdAt'>) => void;
  onDeleteTopic: (topicId: string) => void;
  onCloseTopicForAcknowledgement?: (topicId: string) => void;
  onUpdateConfirmation?: (confirmationId: string, newStatus: 'confirmed' | 'rejected', reviewNote?: string) => void;
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
  onCloseTopicForAcknowledgement,
  onUpdateConfirmation,
  onNavigateToRoster,
}: AdminConsoleProps) {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTopicForBreakdown, setSelectedTopicForBreakdown] = useState<TopicComplianceStats | null>(null);
  const [topicToClose, setTopicToClose] = useState<{ topic: Topic; stat: TopicComplianceStats } | null>(null);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_action' | 'fully_completed' | 'future_planned'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 0-indexed: 9 = October
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(41); // Current week in Oct 2026
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-31');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>('all');

  // Multi-select for bulk actions
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const tableScrollRef = React.useRef<HTMLDivElement>(null);

  // Firestore sync feedback state
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSyncFirestore = async () => {
    setIsSyncingFirebase(true);
    setSyncMessage(null);
    try {
      const result = await saveAllTopicsAndAssignmentsToFirestore(topics, users);
      if (result.success) {
        setSyncMessage(`✓ Synced ${result.topicsCount} topic(s) and ${result.assignmentsCount} staff assignment(s) to Firestore`);
        setTimeout(() => setSyncMessage(null), 4500);
      } else {
        setSyncMessage('⚠️ Could not complete Firestore sync');
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } catch {
      setSyncMessage('⚠️ Firestore sync encountered an error');
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // Collapsible section states (default as collapsed)
  const [showHeaderBar, setShowHeaderBar] = useState(false);
  const [showOverviewMetrics, setShowOverviewMetrics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Quick counts for clickable filter boxes
  const targetGroupCounts = useMemo(() => {
    return {
      all: topics.length,
      ALL: topics.filter(t => t.targetGroup === 'ALL').length,
      ALS: topics.filter(t => t.targetGroup === 'ALS').length,
      Lead: topics.filter(t => t.targetGroup === 'Lead').length,
      ALS_AND_LEAD: topics.filter(t => t.targetGroup === 'ALS_AND_LEAD').length,
      CUSTOM: topics.filter(t => t.targetGroup === 'CUSTOM' || (t.assignedUserIds && t.assignedUserIds.length > 0)).length,
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

  // Partition stats into active and future planned
  const activeTopicStats = useMemo(() => {
    return allTopicStats.filter(s => !isTopicFuturePlanned(s.topic));
  }, [allTopicStats]);

  const futurePlannedStats = useMemo(() => {
    return allTopicStats.filter(s => isTopicFuturePlanned(s.topic));
  }, [allTopicStats]);

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
      const isFuture = isTopicFuturePlanned(topic);

      // Future Planned vs Active filter separation
      if (statusFilter === 'future_planned') {
        if (!isFuture) return false;
      } else {
        // Active overview filters exclude future planned topics
        if (isFuture) return false;
      }

      // 1. Topic Type Filter
      if (typeFilter !== 'all' && topic.type !== typeFilter) {
        return false;
      }

      // 2. Target Group Filter (ALL, ALS, Lead, ALS_AND_LEAD, CUSTOM)
      if (targetGroupFilter !== 'all') {
        if (targetGroupFilter === 'CUSTOM') {
          if (topic.targetGroup !== 'CUSTOM' && (!topic.assignedUserIds || topic.assignedUserIds.length === 0)) {
            return false;
          }
        } else if (topic.targetGroup !== targetGroupFilter) {
          return false;
        }
      }

      // 3. Filter by Date Published (topic.publishedDate, topic.createdAt, or effectiveDate)
      const publicationDateStr = topic.publishedDate || topic.effectiveDate || topic.createdAt;
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
  const totalActiveTopics = activeTopicStats.length;
  const totalFutureTopics = futurePlannedStats.length;
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
      {/* Firestore Sync Notification */}
      {syncMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition animate-in fade-in">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>{syncMessage}</span>
          </div>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs px-2 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Header bar with primary CTAs (Collapsible, default collapsed) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setShowHeaderBar(prev => !prev)}
          className="w-full p-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0078D4]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">Station Administrator Console</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {showHeaderBar ? 'Expanded' : 'Collapsed'}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">✓ Identity Lock Active</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {showHeaderBar
                  ? 'Manage compliance directives, staff acknowledgments, whitelist, and audit logs'
                  : 'Compliance tools, staff roster access, CSV bulk export, and new topic creation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0078D4]">
              {showHeaderBar ? 'Collapse Header' : 'Expand Header & Tools (5)'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showHeaderBar ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Collapsible Body */}
        {showHeaderBar && (
          <div className="p-6 pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Pre-approve external private email addresses (Gmail, Outlook)"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Approved Users Whitelist</span>
              </button>

              <button
                onClick={() => setShowAuditModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Inspect authentication, email changes, and session audit logs"
              >
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span>Auth Audit Trail</span>
              </button>

              {onNavigateToRoster && (
                <button
                  onClick={onNavigateToRoster}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Add, amend, delete or import staff members (XLSX, CSV, PDF)"
                >
                  <Users className="w-3.5 h-3.5 text-[#0078D4]" />
                  <span>Manage Staff ({users.length})</span>
                </button>
              )}

              <button
                onClick={handleSyncFirestore}
                disabled={isSyncingFirebase}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                title="Save all created topics and staff assignments to Firebase Firestore"
              >
                <Cloud className={`w-3.5 h-3.5 ${isSyncingFirebase ? 'text-blue-500 animate-pulse' : 'text-blue-600'}`} />
                <span>{isSyncingFirebase ? 'Syncing...' : 'Sync Firestore'}</span>
              </button>

              <button
                onClick={handleBulkExport}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Topic</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Aggregate Overview Metrics - Clickable Filter Boxes (Permanently Expanded) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition">
        {/* Non-collapsible Header */}
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0078D4]">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">Compliance Overview &amp; Station Metrics</span>
                {statusFilter !== 'all' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#0078D4] text-white">
                    Filter: {statusFilter}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click any metric card below to filter compliance topics
              </p>
            </div>
          </div>
        </div>

        {/* Permanently Expanded Body */}
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`text-left p-3.5 rounded-xl shadow-xs transition cursor-pointer border ${
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
                <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalActiveTopics}</div>
                <div className="text-[11px] text-[#0078D4] mt-1 font-medium flex items-center justify-between">
                  <span>Show active topics</span>
                  <span className="text-slate-400">↳</span>
                </div>
              </button>

              <div
                className="text-left p-3.5 rounded-xl shadow-xs border bg-white border-slate-200"
              >
                <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Confirmed Signatures</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{totalConfirmed}</div>
                <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center justify-between">
                  <span>100% Complete</span>
                </div>
              </div>

              <div
                className="text-left p-3.5 rounded-xl shadow-xs border bg-white border-slate-200"
              >
                <div className="flex items-center justify-between text-xs font-medium text-amber-700">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Missing / Pending Staff</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-800 mt-1 tabular-nums">{totalMissing}</div>
                <div className="text-[11px] text-amber-700 mt-1 font-medium flex items-center justify-between">
                  <span>Pending Action</span>
                </div>
              </div>

              <div
                className="text-left p-3.5 rounded-xl shadow-xs border bg-white border-slate-200"
              >
                <div className="flex items-center justify-between text-xs font-medium text-purple-700">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Future Planned Topics</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-900 mt-1 tabular-nums">{totalFutureTopics}</div>
                <div className="text-[11px] text-purple-700 mt-1 font-medium flex items-center justify-between">
                  <span>Scheduled</span>
                </div>
              </div>

              <div
                className="text-left bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Overall Station Rate</span>
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
              </div>
            </div>
          </div>
      </div>

      {/* COMPREHENSIVE FILTER SYSTEM (Collapsible, default collapsed) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden text-xs">
        {/* Collapsible Header */}
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white">
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className="flex items-center gap-2.5 text-left hover:opacity-85 transition cursor-pointer flex-1"
          >
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0078D4]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">Compliance Filters &amp; Reporting Criteria</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {showFilters ? 'Filters Expanded' : 'Collapsed'}
                </span>
                {(dateFilter !== 'all' || typeFilter !== 'all' || targetGroupFilter !== 'all' || searchQuery) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#0078D4] text-white">
                    Active Filters
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {showFilters
                  ? 'Filter by Date Published, Target Group, Topic Type, or Search keyword'
                  : `Active: Date (${dateFilter === 'all' ? 'All' : dateFilter}) · Target (${targetGroupFilter}) · Type (${typeFilter}) · Query (${searchQuery || 'None'})`}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {(dateFilter !== 'all' || typeFilter !== 'all' || targetGroupFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setTypeFilter('all');
                  setTargetGroupFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="text-[#0078D4] hover:underline font-normal text-xs cursor-pointer"
              >
                Reset all filters
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFilters(prev => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0078D4] hover:text-[#106EBE] cursor-pointer"
            >
              <span>{showFilters ? 'Collapse Filters' : 'Expand Filters'}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {showFilters && (
          <div className="p-5 pt-0 border-t border-slate-100 space-y-4 pt-4">

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
                <div className="text-[10px] text-slate-500">All categories</div>
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
                <div className="text-[10px] text-slate-500">Duty &amp; Station Leads</div>
              </div>
              <span className="text-xs font-bold bg-purple-100 px-2 py-0.5 rounded text-purple-700 tabular-nums">
                {targetGroupCounts.Lead}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetGroupFilter('ALS_AND_LEAD')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                targetGroupFilter === 'ALS_AND_LEAD'
                  ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
              title="Click to filter topics assigned to ALS and Lead together"
            >
              <div>
                <div className="text-xs font-bold text-indigo-900">ALS &amp; Lead</div>
                <div className="text-[10px] text-slate-500">Combined group</div>
              </div>
              <span className="text-xs font-bold bg-indigo-100 px-2 py-0.5 rounded text-indigo-700 tabular-nums">
                {targetGroupCounts.ALS_AND_LEAD}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetGroupFilter('CUSTOM')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                targetGroupFilter === 'CUSTOM'
                  ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50'
              }`}
              title="Click to filter topics with individually assigned staff"
            >
              <div>
                <div className="text-xs font-bold text-amber-900">Individual Staff</div>
                <div className="text-[10px] text-slate-500">Custom selection</div>
              </div>
              <span className="text-xs font-bold bg-amber-100 px-2 py-0.5 rounded text-amber-700 tabular-nums">
                {targetGroupCounts.CUSTOM}
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
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 border rounded cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>
    )}
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

        {/* Horizontal Scroll Controls for non-touch screens */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Topic & Directive Title column is frozen. Use buttons to scroll horizontally:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left: -250, behavior: 'smooth' });
              }}
              className="p-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer flex items-center justify-center transition"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left: 250, behavior: 'smooth' });
              }}
              className="p-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer flex items-center justify-center transition"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div ref={tableScrollRef} className="overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-8 text-center"></th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 font-semibold sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[140px] min-w-[140px] max-w-[140px] sm:w-auto sm:min-w-[280px] sm:max-w-xs break-words">
                  Topic &amp; Directive Title
                </th>
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

                      <td className="py-2.5 sm:py-3 px-2 sm:px-4 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[140px] min-w-[140px] max-w-[140px] sm:w-auto sm:min-w-[280px] sm:max-w-xs">
                        <div className="flex flex-col gap-1">
                          <div
                            className="font-semibold text-slate-900 hover:text-[#0078D4] cursor-pointer break-words line-clamp-3 sm:line-clamp-none leading-snug"
                            onClick={() => setSelectedTopicForBreakdown(stat)}
                          >
                            {topic.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {isTopicFuturePlanned(topic) && (
                              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 w-fit">
                                <Calendar className="w-2.5 h-2.5 text-purple-700 shrink-0" />
                                <span>Future Planned</span>
                              </span>
                            )}
                            {topic.isClosed && (
                              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 w-fit">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                                <span>Closed for Ack</span>
                              </span>
                            )}
                            {!topic.isClosed && topic.dueDate && topic.dueDate < new Date().toISOString().split('T')[0] && (
                              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200 w-fit">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-700 shrink-0" />
                                <span>Overdue</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const date = new Date(topic.publishedDate || topic.effectiveDate || topic.createdAt);
                              setSelectedMonth(date.getMonth());
                              setSelectedYear(date.getFullYear());
                              setDateFilter('select_month_year');
                            }}
                            className="font-mono text-[#0078D4] font-medium bg-blue-50/70 hover:bg-blue-100 px-1 sm:px-1.5 py-0.2 rounded border border-blue-100 transition cursor-pointer text-left truncate max-w-full"
                            title="Click to filter topics published in this month and year"
                          >
                            Pub: {topic.publishedDate || topic.effectiveDate || topic.createdAt?.slice(0, 10)}
                          </button>
                          <span aria-hidden="true" className="hidden sm:inline text-slate-300">·</span>
                          <span className="text-slate-500 truncate text-[10px] sm:text-[11px]">By {topic.createdBy.split('@')[0]}</span>
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
                              : topic.targetGroup === 'Lead'
                              ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                              : topic.targetGroup === 'ALS_AND_LEAD'
                              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                          title={`Click to filter by target group: ${topic.targetGroup}`}
                        >
                          {topic.targetGroup === 'ALS_AND_LEAD'
                            ? 'ALS & Lead'
                            : topic.targetGroup === 'CUSTOM'
                            ? `Custom Staff (${topic.assignedUserIds?.length || 0})`
                            : topic.targetGroup}
                        </button>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {topic.targetGroup === 'ALL'
                            ? 'All 132 Staff'
                            : topic.targetGroup === 'ALS'
                            ? 'ALS Roster'
                            : topic.targetGroup === 'Lead'
                            ? 'Lead Roster'
                            : topic.targetGroup === 'ALS_AND_LEAD'
                            ? 'ALS & Lead Combined'
                            : `${topic.assignedUserIds?.length || 0} Individual Staff`}
                        </div>
                      </td>

                      <td className="py-3 px-4 tabular-nums font-medium text-slate-800">
                        {topic.dueDate}
                      </td>

                      <td className="py-3 px-4 min-w-[140px]">
                        {isTopicFuturePlanned(topic) ? (
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-purple-700 mb-1 font-medium">
                              <span>Scheduled</span>
                              <span className="text-purple-500">({totalEligible} staff assigned)</span>
                            </div>
                            <div className="w-full bg-purple-100 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-400 w-full" />
                            </div>
                            <div className="text-[10px] text-purple-600 mt-0.5">
                              Release date: {topic.publishedDate || topic.effectiveDate}
                            </div>
                          </div>
                        ) : (
                          <div>
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
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isTopicFuturePlanned(topic) ? (
                          <span className="text-slate-400 text-xs font-mono">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedTopicForBreakdown(stat)}
                            className="font-bold text-emerald-700 tabular-nums hover:underline hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                            title={`Click to inspect ${totalConfirmed} confirmed signatures`}
                          >
                            {totalConfirmed}
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isTopicFuturePlanned(topic) ? (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                            Scheduled
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedTopicForBreakdown(stat)}
                            className="font-bold text-amber-700 tabular-nums hover:underline hover:bg-amber-50 px-2 py-1 rounded transition cursor-pointer"
                            title={`Click to inspect ${totalMissing} pending / missing staff`}
                          >
                            {totalMissing}
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {/* Close for acknowledgement if Training/Briefing/Role Play */}
                        {topic.isClosed ? (
                          <span className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Closed</span>
                          </span>
                        ) : (topic.type === 'Training' || topic.type === 'Briefing' || topic.type === 'Role Play') &&
                          (totalMissing === 0 || (topic.dueDate && topic.dueDate < new Date().toISOString().split('T')[0])) ? (
                          <button
                            onClick={() => setTopicToClose({ topic, stat })}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Close topic for acknowledgement: verifies all assigned participants"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Close for Ack</span>
                          </button>
                        ) : null}

                        {/* Breakdown drill-down */}
                        <button
                          onClick={() => setSelectedTopicForBreakdown(stat)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition inline-flex items-center gap-1 cursor-pointer"
                          title="View list of confirmed and missing staff for this topic"
                        >
                          <Users className="w-3 h-3 text-[#0078D4]" />
                          <span>Staff List</span>
                        </button>

                        {/* Export Single Topic CSV */}
                        <button
                          onClick={() => exportSingleTopicReport(stat)}
                          className="px-2 py-1 text-[11px] text-[#0078D4] hover:bg-blue-50 border border-slate-200 rounded transition inline-flex items-center gap-1 cursor-pointer"
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
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
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
          users={users}
          onSaveTopic={onCreateTopic}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Topic Staff Breakdown Drill-down Modal */}
      {selectedTopicForBreakdown && (
        <TopicBreakdownModal
          stats={selectedTopicForBreakdown}
          onUpdateConfirmation={onUpdateConfirmation}
          onCloseTopicForAcknowledgement={onCloseTopicForAcknowledgement}
          onClose={() => setSelectedTopicForBreakdown(null)}
        />
      )}

      {/* Topic Close for Acknowledgement Confirmation Modal */}
      {topicToClose && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-700 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>Close Topic for Acknowledgement</span>
              </div>
              <button onClick={() => setTopicToClose(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to close <strong>&ldquo;{topicToClose.topic.title}&rdquo;</strong> for acknowledgement?
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span>Directive Type:</span>
                <span className="font-semibold">{topicToClose.topic.type}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Target Personnel:</span>
                <span className="font-semibold">{topicToClose.stat.totalEligible} staff</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Confirmed so far:</span>
                <span className="font-semibold text-emerald-700">{topicToClose.stat.totalConfirmed}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Pending / Missing:</span>
                <span className="font-semibold text-amber-700">{topicToClose.stat.totalMissing}</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] text-indigo-900 space-y-1">
              <strong className="block font-semibold">Immediate Closeout Actions:</strong>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Topic will be marked as Closed for Acknowledgement in Cloud Firestore.</li>
                <li>Participation will be verified and marked confirmed for all remaining {topicToClose.stat.totalMissing} participant(s).</li>
                <li>Item will be permanently cleared from each individual staff member&apos;s pending tasks queue.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setTopicToClose(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onCloseTopicForAcknowledgement) {
                    onCloseTopicForAcknowledgement(topicToClose.topic.id);
                  }
                  setTopicToClose(null);
                  if (selectedTopicForBreakdown?.topic.id === topicToClose.topic.id) {
                    setSelectedTopicForBreakdown(null);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs cursor-pointer"
              >
                Confirm Close &amp; Verify All Participations
              </button>
            </div>
          </div>
        </div>
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
