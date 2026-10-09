'use client';

import React, { useState, useMemo } from 'react';
import { User, Topic, TopicConfirmation, TargetGroup } from '@/lib/types';
import {
  getUserAssignedTopics,
  isTopicConfirmedByUser,
  getConfirmationRecord,
  getUserTopicStatus,
  UserTopicStatus,
  isTopicFuturePlanned,
  APP_REFERENCE_DATE,
} from '@/lib/compliance-store';
import { AcknowledgmentModal } from './acknowledgment-modal';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Sparkles,
  ExternalLink,
  Eye,
  ChevronDown,
  BarChart2,
  UserCheck,
} from 'lucide-react';

interface UserDashboardProps {
  currentUser: User;
  topics: Topic[];
  confirmations: TopicConfirmation[];
  onConfirmTopic: (topicId: string, signatureText: string, lateReason?: string) => void;
  onOpenAdminConsole?: () => void;
}

export function UserDashboard({
  currentUser,
  topics,
  confirmations,
  onConfirmTopic,
  onOpenAdminConsole,
}: UserDashboardProps) {
  const [activeStatusTab, setActiveStatusTab] = useState<'pending' | 'overdue' | 'completed' | 'all' | 'future_planned'>('pending');
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicForModal, setSelectedTopicForModal] = useState<Topic | null>(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [showOverviewMetrics, setShowOverviewMetrics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Topics assigned to current user based on target group and custom assignment rules
  const allAssignedTopics = useMemo(() => {
    return getUserAssignedTopics(currentUser, topics);
  }, [currentUser, topics]);

  // Separate active topics from future planned topics (published date in the future)
  const { activeAssignedTopics, futurePlannedTopics } = useMemo(() => {
    const active: Topic[] = [];
    const future: Topic[] = [];
    allAssignedTopics.forEach(t => {
      if (isTopicFuturePlanned(t)) {
        future.push(t);
      } else {
        active.push(t);
      }
    });
    return { activeAssignedTopics: active, futurePlannedTopics: future };
  }, [allAssignedTopics]);

  // Compute pending vs completed vs re-sign required exclusively from ACTIVE topics
  const { pendingList, completedList, reSignRequiredList, overdueList } = useMemo(() => {
    const pending: Topic[] = [];
    const completed: Topic[] = [];
    const reSign: Topic[] = [];
    const overdue: Topic[] = [];

    activeAssignedTopics.forEach(t => {
      const status = getUserTopicStatus(t, currentUser.id, confirmations);
      if (status === 'confirmed') {
        completed.push(t);
      } else if (status === 're_sign_required') {
        reSign.push(t);
        pending.push(t); // Needs user action
      } else {
        pending.push(t);
      }

      // Overdue check for Read & Sign documents
      const isReadAndSign =
        t.type === 'Document Read and Sign' ||
        t.type === 'GPD/GPI Read and Sign' ||
        t.type === 'AHD/AHI Read and Sign';
      if (isReadAndSign && status !== 'confirmed' && t.dueDate && t.dueDate < todayStr && !t.isClosed) {
        overdue.push(t);
      }
    });

    return { pendingList: pending, completedList: completed, reSignRequiredList: reSign, overdueList: overdue };
  }, [activeAssignedTopics, currentUser.id, confirmations, todayStr]);

  // Filtered displayed list
  const displayedTopics = useMemo(() => {
    let list: Topic[] = [];
    if (activeStatusTab === 'pending') list = pendingList;
    else if (activeStatusTab === 'overdue') list = overdueList;
    else if (activeStatusTab === 'completed') list = completedList;
    else if (activeStatusTab === 'future_planned') list = futurePlannedTopics;
    else list = activeAssignedTopics;

    return list.filter(t => {
      // Target group sub-filter
      if (targetGroupFilter !== 'all' && t.targetGroup !== targetGroupFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeStatusTab, pendingList, overdueList, completedList, activeAssignedTopics, futurePlannedTopics, targetGroupFilter, searchQuery]);

  const totalAssigned = activeAssignedTopics.length;
  const totalPending = pendingList.length;
  const totalCompleted = completedList.length;
  const totalFuturePlanned = futurePlannedTopics.length;
  const complianceRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100;

  // Available target groups for this specific user
  const userEligibleGroups: TargetGroup[] = ['ALL'];
  if (currentUser.isAls) userEligibleGroups.push('ALS');
  if (currentUser.isLead) userEligibleGroups.push('Lead');

  // If user is Admin, they should not see the staff compliance dashboard
  if (currentUser.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Section 1: Welcome Banner (Collapsible, default collapsed) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setShowWelcomeBanner(prev => !prev)}
          className="w-full p-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0078D4]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Microsoft 365 Verified: {currentUser.name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {showWelcomeBanner ? 'Expanded' : 'Collapsed'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">{currentUser.uNumber}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {showWelcomeBanner
                  ? 'Personalized queue filtered for your assigned staff groups'
                  : `Assigned Groups: ${userEligibleGroups.join(' · ')} · Account: ${currentUser.email}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0078D4]">
              {showWelcomeBanner ? 'Collapse Profile' : 'Expand Profile & Groups'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showWelcomeBanner ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Collapsible Body */}
        {showWelcomeBanner && (
          <div className="p-6 pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>Microsoft 365 Verified Identity</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{currentUser.uNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{currentUser.email}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome, {currentUser.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Your personalized compliance queue automatically filters directives for your assigned groups:{' '}
                <strong className="text-slate-900">{userEligibleGroups.join(' · ')}</strong>.
              </p>
            </div>

            {currentUser.isAdmin && onOpenAdminConsole && (
              <div className="shrink-0">
                <button
                  onClick={onOpenAdminConsole}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center gap-2"
                >
                  <span>Open Admin Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metrics Row - Clickable Filter Boxes (Collapsible, default collapsed) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setShowOverviewMetrics(prev => !prev)}
          className="w-full p-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0078D4]">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">Personal Compliance Overview</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {showOverviewMetrics ? '5 Metric Cards' : 'Collapsed'}
                </span>
                {activeStatusTab !== 'pending' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#0078D4] text-white">
                    Tab: {activeStatusTab}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {showOverviewMetrics
                  ? 'Click any metric card below to filter your assigned topics'
                  : `Summary: ${totalAssigned} Assigned · ${totalPending} Pending · ${totalCompleted} Signed · ${totalFuturePlanned} Scheduled · ${complianceRate}% Compliance Rate`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0078D4]">
              {showOverviewMetrics ? 'Collapse Overview' : 'Expand Metrics (5)'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showOverviewMetrics ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Collapsible Body */}
        {showOverviewMetrics && (
          <div className="p-4 pt-0 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
              <button
                type="button"
                onClick={() => setActiveStatusTab('all')}
                className={`text-left p-3.5 rounded-xl shadow-xs transition cursor-pointer border ${
                  activeStatusTab === 'all'
                    ? 'bg-blue-50/50 border-[#0078D4] ring-2 ring-[#0078D4]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
                title="Click to view all active compliance topics assigned to you"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Total Assigned Topics</span>
                  {activeStatusTab === 'all' && (
                    <span className="text-[10px] bg-[#0078D4] text-white px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalAssigned}</div>
                <div className="text-[11px] text-[#0078D4] mt-1 font-medium flex items-center justify-between">
                  <span>Active topics</span>
                  <span className="text-slate-400">↳</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveStatusTab('pending')}
                className={`text-left p-3.5 rounded-xl shadow-xs transition cursor-pointer border ${
                  activeStatusTab === 'pending'
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
                }`}
                title="Click to filter topics requiring your acknowledgment"
              >
                <div className="flex items-center justify-between text-xs font-medium text-amber-700">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pending Action</span>
                  </div>
                  {activeStatusTab === 'pending' && (
                    <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </div>
                <div className="text-2xl font-bold text-amber-800 mt-1 tabular-nums">{totalPending}</div>
                <div className="text-[11px] text-amber-700 mt-1 font-medium flex items-center justify-between">
                  <span>Needs signature</span>
                  <span>↳</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveStatusTab('completed')}
                className={`text-left p-3.5 rounded-xl shadow-xs transition cursor-pointer border ${
                  activeStatusTab === 'completed'
                    ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                }`}
                title="Click to view already acknowledged directives"
              >
                <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completed &amp; Signed</span>
                  </div>
                  {activeStatusTab === 'completed' && (
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </div>
                <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{totalCompleted}</div>
                <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center justify-between">
                  <span>Signed items</span>
                  <span>↳</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveStatusTab(activeStatusTab === 'future_planned' ? 'all' : 'future_planned')}
                className={`text-left p-3.5 rounded-xl shadow-xs transition cursor-pointer border ${
                  activeStatusTab === 'future_planned'
                    ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20'
                    : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
                }`}
                title="Click to view future planned topics scheduled for release"
              >
                <div className="flex items-center justify-between text-xs font-medium text-purple-700">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Future Planned</span>
                  </div>
                  {activeStatusTab === 'future_planned' && (
                    <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-semibold">Active</span>
                  )}
                </div>
                <div className="text-2xl font-bold text-purple-900 mt-1 tabular-nums">{totalFuturePlanned}</div>
                <div className="text-[11px] text-purple-700 mt-1 font-medium flex items-center justify-between">
                  <span>Upcoming topics</span>
                  <span>↳</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeStatusTab === 'pending') setActiveStatusTab('completed');
                  else setActiveStatusTab('pending');
                }}
                className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 shadow-xs transition cursor-pointer hover:shadow-sm"
                title="Click to toggle between Pending and Completed"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Personal Compliance</span>
                  <span className="text-[10px] text-slate-400">Toggle</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{complianceRate}%</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      complianceRate === 100 ? 'bg-emerald-500' : complianceRate > 50 ? 'bg-[#0078D4]' : 'bg-amber-500'
                    }`}
                    style={{ width: `${complianceRate}%` }}
                  />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Tab Controls (Collapsible, default collapsed) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition">
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
                <span className="text-xs sm:text-sm font-bold text-slate-900">Topic Filters &amp; Status Tabs</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {showFilters ? 'Filters Expanded' : 'Collapsed'}
                </span>
                {(searchQuery || targetGroupFilter !== 'all') && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#0078D4] text-white">
                    Active Filters
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {showFilters
                  ? 'Switch status tabs, search topics, or filter by target category'
                  : `Active Tab: ${activeStatusTab} · Category: ${targetGroupFilter} · Search: ${searchQuery || 'None'}`}
              </p>
            </div>
          </button>

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

        {/* Collapsible Body */}
        {showFilters && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              onClick={() => setActiveStatusTab('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeStatusTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Acknowledgment ({totalPending})
            </button>
            {overdueList.length > 0 && (
              <button
                onClick={() => setActiveStatusTab('overdue')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  activeStatusTab === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs font-semibold'
                    : 'text-rose-700 hover:text-rose-900 bg-rose-50'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                <span>Overdue Read &amp; Sign ({overdueList.length})</span>
              </button>
            )}
            <button
              onClick={() => setActiveStatusTab('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeStatusTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed &amp; Signed ({totalCompleted})
            </button>
            <button
              onClick={() => setActiveStatusTab('future_planned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeStatusTab === 'future_planned'
                  ? 'bg-purple-600 text-white shadow-xs font-semibold'
                  : 'text-purple-700 hover:text-purple-900'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Future Planned ({totalFuturePlanned})</span>
            </button>
            <button
              onClick={() => setActiveStatusTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeStatusTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Active Assigned ({totalAssigned})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by title or type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
            />
          </div>
        </div>

        {/* Target Group Filter row - Clickable Filter Boxes */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Filter by Target Category:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTargetGroupFilter('all')}
              className={`px-3 py-1 text-xs rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                targetGroupFilter === 'all'
                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All My Topics</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${targetGroupFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}>
                {activeAssignedTopics.length}
              </span>
            </button>
            {userEligibleGroups.map(grp => {
              const grpCount = activeAssignedTopics.filter(t => t.targetGroup === grp).length;
              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setTargetGroupFilter(grp)}
                  className={`px-3 py-1 text-xs rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    targetGroupFilter === grp
                      ? 'bg-slate-900 text-white font-medium shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`Click to filter by ${grp} category`}
                >
                  <span>{grp} Group</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${targetGroupFilter === grp ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}>
                    {grpCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </div>

      {/* Overdue Attention Banner */}
      {overdueList.length > 0 && activeStatusTab !== 'overdue' && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-rose-950 flex items-center gap-2">
                <span>Action Required: {overdueList.length} Overdue Read &amp; Sign Directive(s)</span>
                <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">
                  Past Deadline
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                The mandatory due date has passed. Acknowledgment is still permitted and required, with a mandatory explanation remark explaining the reason for delay.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveStatusTab('overdue')}
            className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shrink-0 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            Review Overdue ({overdueList.length})
          </button>
        </div>
      )}

      {/* Topics List */}
      <div className="space-y-3">
        {displayedTopics.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {activeStatusTab === 'pending'
                ? 'All Caught Up!'
                : activeStatusTab === 'overdue'
                ? 'No Overdue Directives!'
                : 'No compliance topics found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeStatusTab === 'pending'
                ? 'You have acknowledged and signed all required compliance items assigned to your profile.'
                : activeStatusTab === 'overdue'
                ? 'You have zero overdue read and sign items. Excellent compliance status.'
                : 'Try adjusting your search query or target group filter above.'}
            </p>
          </div>
        ) : (
          displayedTopics.map(topic => {
            const isFuture = isTopicFuturePlanned(topic);
            const status = getUserTopicStatus(topic, currentUser.id, confirmations);
            const isConfirmed = !isFuture && status === 'confirmed';
            const isReSignRequired = !isFuture && status === 're_sign_required';
            const confRecord = getConfirmationRecord(topic.id, currentUser.id, confirmations);
            const isParticipation =
              topic.type === 'Training' || topic.type === 'Briefing' || topic.type === 'Role Play';

            const isReadAndSign =
              topic.type === 'Document Read and Sign' ||
              topic.type === 'GPD/GPI Read and Sign' ||
              topic.type === 'AHD/AHI Read and Sign';
            const isOverdue =
              !isFuture && !isConfirmed && isReadAndSign && Boolean(topic.dueDate && topic.dueDate < todayStr && !topic.isClosed);

            return (
              <div
                key={topic.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition hover:border-slate-300 ${
                  isFuture
                    ? 'border-purple-300 bg-purple-50/15'
                    : isOverdue
                    ? 'border-rose-300 bg-rose-50/20 shadow-xs'
                    : isConfirmed
                    ? 'border-slate-200'
                    : isReSignRequired
                    ? 'border-amber-400 bg-amber-50/20 shadow-xs'
                    : 'border-amber-200/80 bg-amber-50/10'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Metadata line with clickable filter tags */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => setSearchQuery(topic.type)}
                        className="font-semibold text-slate-700 hover:text-[#0078D4] hover:underline cursor-pointer"
                        title={`Filter by type: ${topic.type}`}
                      >
                        {topic.type}
                      </button>
                      {topic.customTypeDesc && <span>({topic.customTypeDesc})</span>}
                      <span aria-hidden="true">·</span>
                      <span>
                        Target Group:{' '}
                        <button
                          type="button"
                          onClick={() => setTargetGroupFilter(topic.targetGroup)}
                          className="font-bold text-slate-800 hover:text-[#0078D4] hover:underline cursor-pointer"
                          title={`Filter by target group: ${topic.targetGroup}`}
                        >
                          {topic.targetGroup === 'ALS_AND_LEAD' ? 'ALS & Lead' : topic.targetGroup}
                        </button>
                      </span>
                      {topic.version && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            Version {topic.version}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className={`${isFuture ? 'text-purple-700 font-bold' : 'text-[#0078D4] font-medium'} font-mono`}>
                        {isFuture ? '🗓️ Published Date:' : 'Published:'} {topic.publishedDate || topic.effectiveDate}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Due Date:{' '}
                        <span className={`tabular-nums font-medium ${isConfirmed ? 'text-slate-600' : isOverdue ? 'text-rose-700 font-bold' : isFuture ? 'text-purple-800' : 'text-amber-700'}`}>
                          {topic.dueDate}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{topic.title}</h3>
                      {isFuture && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                          <Calendar className="w-3 h-3 text-purple-700" />
                          <span>Future Planned (Publishes {topic.publishedDate || topic.effectiveDate})</span>
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>OVERDUE (Deadline was {topic.dueDate})</span>
                        </span>
                      )}
                      {topic.isClosed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Participation Verified &amp; Confirmed (Admin Closed)</span>
                        </span>
                      )}
                      {isReSignRequired && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Re-sign Required</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {topic.content}
                    </p>

                    {/* Overdue Callout Notice */}
                    {isOverdue && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          <strong>Overdue Notice:</strong> Past mandatory deadline ({topic.dueDate}). Acknowledgment is still allowed and recorded, with a mandatory explanation remark explaining the reason for delay.
                        </span>
                      </div>
                    )}

                    {/* Future Planned Notice */}
                    {isFuture && (
                      <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-900 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>
                          <strong>Advance Notification:</strong> This directive is planned for release on{' '}
                          <span className="font-semibold">{topic.publishedDate || topic.effectiveDate}</span>. It is not currently active and does not count towards your pending compliance.
                        </span>
                      </div>
                    )}

                    {/* Confirmed timestamp if signed */}
                    {isConfirmed && confRecord && (
                      <div className="text-[11px] text-emerald-700 flex flex-wrap items-center gap-2 pt-1">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Confirmed on <span className="font-mono tabular-nums">{confRecord.confirmedAt.slice(0, 10)}</span> at{' '}
                            <span className="font-mono tabular-nums">{confRecord.confirmedAt.slice(11, 19)} UTC</span> (Version {confRecord.documentVersion || 'v1.0'})
                          </span>
                        </span>
                        {confRecord.lateReason && (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                            Late Remark: &ldquo;{confRecord.lateReason}&rdquo;
                          </span>
                        )}
                      </div>
                    )}

                    {/* Closed session confirmation if no direct confRecord */}
                    {isConfirmed && !confRecord && topic.isClosed && (
                      <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Participation verified &amp; confirmed by station administrator upon session closure ({topic.closedAt?.slice(0, 10) || 'Verified'})
                        </span>
                      </div>
                    )}

                    {/* Version mismatch notice */}
                    {isReSignRequired && confRecord && (
                      <div className="text-[11px] text-amber-800 flex items-center gap-1.5 pt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          Previous signature was for Version {confRecord.documentVersion || 'v1.0'}. You must re-acknowledge newly published Version {topic.version}.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isFuture ? (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                        <span>Preview Topic</span>
                      </button>
                    ) : isConfirmed ? (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View Verified Receipt</span>
                      </button>
                    ) : isOverdue ? (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Acknowledge Overdue Document</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : isReSignRequired ? (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Re-sign Updated Directive</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{isParticipation ? 'Confirm Participation' : 'Read and Sign'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Acknowledgment Modal */}
      {selectedTopicForModal && (
        <AcknowledgmentModal
          topic={selectedTopicForModal}
          currentUser={currentUser}
          existingConfirmation={getConfirmationRecord(selectedTopicForModal.id, currentUser.id, confirmations)}
          onConfirm={(topicId, signatureText, lateReason) => {
            onConfirmTopic(topicId, signatureText, lateReason);
          }}
          onClose={() => setSelectedTopicForModal(null)}
        />
      )}
    </div>
  );
}
