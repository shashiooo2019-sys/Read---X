'use client';

import React, { useState, useMemo } from 'react';
import { User, Topic, TopicConfirmation, TargetGroup } from '@/lib/types';
import {
  getUserAssignedTopics,
  isTopicConfirmedByUser,
  getConfirmationRecord,
  getUserTopicStatus,
  UserTopicStatus
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
  ExternalLink
} from 'lucide-react';

interface UserDashboardProps {
  currentUser: User;
  topics: Topic[];
  confirmations: TopicConfirmation[];
  onConfirmTopic: (topicId: string, signatureText: string) => void;
  onOpenAdminConsole?: () => void;
}

export function UserDashboard({
  currentUser,
  topics,
  confirmations,
  onConfirmTopic,
  onOpenAdminConsole,
}: UserDashboardProps) {
  const [activeStatusTab, setActiveStatusTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicForModal, setSelectedTopicForModal] = useState<Topic | null>(null);

  // Topics assigned to current user based on target group rule:
  // - ALL topics visible to all
  // - ALS topics visible if currentUser.isAls
  // - Lead topics visible if currentUser.isLead
  const assignedTopics = useMemo(() => {
    return getUserAssignedTopics(currentUser, topics);
  }, [currentUser, topics]);

  // Compute pending vs completed vs re-sign required
  const { pendingList, completedList, reSignRequiredList } = useMemo(() => {
    const pending: Topic[] = [];
    const completed: Topic[] = [];
    const reSign: Topic[] = [];

    assignedTopics.forEach(t => {
      const status = getUserTopicStatus(t, currentUser.id, confirmations);
      if (status === 'confirmed') {
        completed.push(t);
      } else if (status === 're_sign_required') {
        reSign.push(t);
        pending.push(t); // Needs user action
      } else {
        pending.push(t);
      }
    });

    return { pendingList: pending, completedList: completed, reSignRequiredList: reSign };
  }, [assignedTopics, currentUser.id, confirmations]);

  // Filtered displayed list
  const displayedTopics = useMemo(() => {
    let list: Topic[] = [];
    if (activeStatusTab === 'pending') list = pendingList;
    else if (activeStatusTab === 'completed') list = completedList;
    else list = assignedTopics;

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
  }, [activeStatusTab, pendingList, completedList, assignedTopics, targetGroupFilter, searchQuery]);

  const totalAssigned = assignedTopics.length;
  const totalPending = pendingList.length;
  const totalCompleted = completedList.length;
  const complianceRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100;

  // Available target groups for this specific user
  const userEligibleGroups: TargetGroup[] = ['ALL'];
  if (currentUser.isAls) userEligibleGroups.push('ALS');
  if (currentUser.isLead) userEligibleGroups.push('Lead');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome & Target Groups Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* Metrics Row - Clickable Filter Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveStatusTab('all')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            activeStatusTab === 'all'
              ? 'bg-blue-50/50 border-[#0078D4] ring-2 ring-[#0078D4]/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Assigned Topics</span>
            {activeStatusTab === 'all' && (
              <span className="text-[10px] bg-[#0078D4] text-white px-1.5 py-0.2 rounded font-semibold">Active</span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalAssigned}</div>
          <div className="text-[11px] text-[#0078D4] mt-1 font-medium flex items-center justify-between">
            <span>Show all topics</span>
            <span className="text-slate-400">↳</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatusTab('pending')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            activeStatusTab === 'pending'
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
          }`}
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
            <span>Filter pending items</span>
            <span>↳</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatusTab('completed')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            activeStatusTab === 'completed'
              ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Completed & Signed</span>
            </div>
            {activeStatusTab === 'completed' && (
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">Active</span>
            )}
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{totalCompleted}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center justify-between">
            <span>Filter completed items</span>
            <span>↳</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (activeStatusTab === 'pending') setActiveStatusTab('completed');
            else setActiveStatusTab('pending');
          }}
          className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs transition cursor-pointer hover:shadow-sm"
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

      {/* Filter and Tab Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
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
            <button
              onClick={() => setActiveStatusTab('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeStatusTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed & Signed ({totalCompleted})
            </button>
            <button
              onClick={() => setActiveStatusTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeStatusTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Assigned ({totalAssigned})
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
                {assignedTopics.length}
              </span>
            </button>
            {userEligibleGroups.map(grp => {
              const grpCount = assignedTopics.filter(t => t.targetGroup === grp).length;
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
                : 'No compliance topics found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeStatusTab === 'pending'
                ? 'You have acknowledged and signed all required compliance items assigned to your profile.'
                : 'Try adjusting your search query or target group filter above.'}
            </p>
          </div>
        ) : (
          displayedTopics.map(topic => {
            const status = getUserTopicStatus(topic, currentUser.id, confirmations);
            const isConfirmed = status === 'confirmed';
            const isReSignRequired = status === 're_sign_required';
            const confRecord = getConfirmationRecord(topic.id, currentUser.id, confirmations);
            const isParticipation =
              topic.type === 'Training' || topic.type === 'Briefing' || topic.type === 'Role Play';

            return (
              <div
                key={topic.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition hover:border-slate-300 ${
                  isConfirmed
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
                          {topic.targetGroup}
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
                      <span className="text-[#0078D4] font-medium font-mono">
                        Published: {topic.createdAt ? topic.createdAt.slice(0, 10) : topic.effectiveDate}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Due Date:{' '}
                        <span className={`tabular-nums font-medium ${isConfirmed ? 'text-slate-600' : 'text-amber-700'}`}>
                          {topic.dueDate}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{topic.title}</h3>
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

                    {/* Confirmed timestamp if signed */}
                    {isConfirmed && confRecord && (
                      <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Confirmed on <span className="font-mono tabular-nums">{confRecord.confirmedAt.slice(0, 10)}</span> at{' '}
                          <span className="font-mono tabular-nums">{confRecord.confirmedAt.slice(11, 19)} UTC</span> (Version {confRecord.documentVersion || 'v1.0'})
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
                    {isConfirmed ? (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View Signed Receipt</span>
                      </button>
                    ) : isReSignRequired ? (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-xs flex items-center gap-1.5"
                      >
                        <span>Re-sign Updated Directive</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedTopicForModal(topic)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center gap-1.5"
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
          onConfirm={(topicId, signatureText) => {
            onConfirmTopic(topicId, signatureText);
          }}
          onClose={() => setSelectedTopicForModal(null)}
        />
      )}
    </div>
  );
}
