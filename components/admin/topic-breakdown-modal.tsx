'use client';

import React, { useState } from 'react';
import { Topic, User, TopicConfirmation, TopicCloseOption } from '@/lib/types';
import { TopicComplianceStats, getEligibleUsersForTopic } from '@/lib/compliance-store';
import {
  X,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Lock,
  Unlock,
  Trash2,
} from 'lucide-react';

interface TopicBreakdownModalProps {
  isOpen?: boolean;
  onClose: () => void;
  topic?: Topic;
  stats?: TopicComplianceStats;
  users?: User[];
  confirmations?: TopicConfirmation[];
  initialStatusFilter?: 'all' | 'confirmed' | 'missing';
  onUpdateConfirmation?: (confirmationId: string, newStatus: 'confirmed' | 'rejected', note?: string) => void;
  onCloseTopicForAcknowledgement?: (topicId: string, option: TopicCloseOption) => void;
  onReopenTopicForAcknowledgement?: (topicId: string) => void;
  onDeleteTopic?: (topicId: string) => void;
  currentUser?: User;
}

export function TopicBreakdownModal({
  isOpen = true,
  onClose,
  topic,
  stats,
  users = [],
  confirmations = [],
  initialStatusFilter = 'all',
  onCloseTopicForAcknowledgement,
  onReopenTopicForAcknowledgement,
  onDeleteTopic,
}: TopicBreakdownModalProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'missing'>(initialStatusFilter);
  const [nameFilter, setNameFilter] = useState('');

  if (!isOpen || !topic) return null;

  // Process user status items for assigned/eligible staff only
  const eligibleUsers = getEligibleUsersForTopic(topic, users);
  const userStatuses = eligibleUsers.map((user) => {
    const conf = confirmations.find(
      (c) => c.userId === user.id && c.topicId === topic.id
    );
    const isConfirmed = conf?.status === 'confirmed';
    return { user, conf, isConfirmed };
  });

  const totalCount = userStatuses.length;
  const confirmedCount = userStatuses.filter((item) => item.isConfirmed).length;
  const missingCount = totalCount - confirmedCount;
  const percentage = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

  // Filter users by status and name
  const filteredItems = userStatuses.filter(({ user, isConfirmed }) => {
    // 1. Filter for confirmed vs missing
    if (statusFilter === 'confirmed') return isConfirmed;
    if (statusFilter === 'missing') return !isConfirmed;
    return true; // 'all' shows everyone

    // 2. Filter for names (or email / U-number / ALS station)
    if (nameFilter.trim() !== '') {
      const term = nameFilter.toLowerCase().trim();
      const nameStr = (user.name || '').toLowerCase();
      const emailStr = (user.email || '').toLowerCase();
      const uNumStr = (user.uNumber || '').toLowerCase();
      const alsStr = (user.ALS || '').toLowerCase();

      const matches =
        nameStr.includes(term) ||
        emailStr.includes(term) ||
        uNumStr.includes(term) ||
        alsStr.includes(term);

      if (!matches) return false;
    }

    return true;
  });

  const isFiltered = statusFilter !== 'all' || nameFilter.trim() !== '';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {topic.type}
              </span>
              <span className="text-xs text-slate-400">Target: {topic.targetGroup}</span>
            </div>
            <h2 className="text-xl font-bold">{topic.title}</h2>
            {topic.dueDate && (
              <p className="text-xs text-slate-400 mt-1">Due Date: {topic.dueDate}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-slate-50/50">
          {/* Progress Bar & Interactive KPI Summary */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-left group cursor-pointer"
                title="Click to reset status filter to All Staff"
              >
                <h3 className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                  Compliance Rate
                </h3>
                <p className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                  {percentage}%
                </p>
              </button>

              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm font-medium">
                {/* All Filter Card */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer font-semibold ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All ({totalCount})</span>
                </button>

                {/* Confirmed Quick Filter Card */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('confirmed')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer font-semibold ${
                    statusFilter === 'confirmed'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span>Confirmed ({confirmedCount})</span>
                </button>

                {/* Missing Quick Filter Card */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('missing')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer font-semibold ${
                    statusFilter === 'missing'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span>Missing ({missingCount})</span>
                </button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(100 - percentage, totalCount > 0 ? (missingCount / totalCount) * 100 : 0)}%` }}
              />
            </div>
          </div>

          {/* User Status List & Filter Controls */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Filter Toolbar Header */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500 shrink-0" />
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                  Staff Breakdown ({filteredItems.length} / {totalCount})
                </h3>
              </div>

              {/* Status Filter Buttons + Name Search Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                {/* Filter for Confirmed & Missing Buttons */}
                <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      statusFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('confirmed')}
                    className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                      statusFilter === 'confirmed'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-emerald-700 hover:bg-emerald-100/50'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('missing')}
                    className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                      statusFilter === 'missing'
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'text-amber-700 hover:bg-amber-100/50'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    Missing
                  </button>
                </div>

                {/* Filter for Names Input */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Filter by name..."
                    className="pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  {nameFilter && (
                    <button
                      type="button"
                      onClick={() => setNameFilter('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      title="Clear name filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Bar */}
            {isFiltered && (
              <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap text-blue-900 font-medium">
                  <span className="font-bold text-slate-600">Active Filters:</span>
                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800 font-semibold text-[11px]">
                      Status: {statusFilter === 'confirmed' ? 'Confirmed Only' : 'Missing Only'}
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="hover:text-red-600 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {nameFilter.trim() !== '' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800 font-semibold text-[11px]">
                      Name: &quot;{nameFilter}&quot;
                      <button
                        type="button"
                        onClick={() => setNameFilter('')}
                        className="hover:text-red-600 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setNameFilter('');
                  }}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* List of Users */}
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">No staff found matching filters</p>
                  <p className="text-xs text-slate-400">
                    Try clearing the name search or changing the status filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setNameFilter('');
                    }}
                    className="mt-2 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredItems.map(({ user, conf, isConfirmed }) => {
                  const displayName = user.name || user.email || 'User';

                  return (
                    <div
                      key={user.id}
                      className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {displayName}
                            </p>
                            {user.uNumber && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {user.uNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            <span>{user.email || ''}</span>
                            {user.ALS && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 font-semibold">ALS: {user.ALS}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Confirmed ({conf?.confirmedAt ? conf.confirmedAt.split('T')[0] : 'Completed'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Missing / Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {topic.status === 'active' ? (
              <button
                onClick={() => {
                  if (onCloseTopicForAcknowledgement) {
                    onCloseTopicForAcknowledgement(topic.id, 'mark_participated');
                  }
                  onClose();
                }}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                Close for Acknowledgement
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onReopenTopicForAcknowledgement) {
                    onReopenTopicForAcknowledgement(topic.id);
                  }
                  onClose();
                }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Unlock className="w-3.5 h-3.5" />
                Re-open Topic
              </button>
            )}

            {onDeleteTopic && (
              <button
                type="button"
                onClick={() => {
                  onDeleteTopic(topic.id);
                  onClose();
                }}
                className="px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Permanently delete this compliance topic"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Topic</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
