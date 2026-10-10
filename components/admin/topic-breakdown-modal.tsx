'use client';

import React, { useState } from 'react';
import { TopicComplianceStats } from '@/lib/compliance-store';
import { exportSingleTopicReport } from '@/lib/export-utils';
import {
  X,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Send,
  UserCheck,
  UserX,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface TopicBreakdownModalProps {
  stats: TopicComplianceStats;
  onUpdateConfirmation?: (confirmationId: string, newStatus: 'confirmed' | 'rejected', reviewNote?: string) => void;
  onCloseTopicForAcknowledgement?: (topicId: string) => void;
  onClose: () => void;
}

export function TopicBreakdownModal({
  stats,
  onUpdateConfirmation,
  onCloseTopicForAcknowledgement,
  onClose,
}: TopicBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<'missing' | 'confirmed' | 'pending_late'>('missing');
  const [searchStaff, setSearchStaff] = useState('');
  const [reminderSentStaff, setReminderSentStaff] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];
  const isPastDeadline = Boolean(stats.topic.dueDate && stats.topic.dueDate < todayStr);
  const isTrainingBriefingOrRolePlay =
    stats.topic.type === 'Training' ||
    stats.topic.type === 'Briefing' ||
    stats.topic.type === 'Role Play';

  const canCloseForAck =
    isTrainingBriefingOrRolePlay &&
    !stats.topic.isClosed &&
    (stats.totalMissing === 0 || isPastDeadline);

  const {
    topic,
    confirmedStaff,
    missingStaff,
    pendingLateStaff,
    totalEligible,
    totalConfirmed,
    totalMissing,
    totalPendingLate,
    completionRate,
  } = stats;

  const handleSendReminder = (userId: string) => {
    setReminderSentStaff(prev => ({ ...prev, [userId]: true }));
  };

  const handleSendAllReminders = () => {
    const updated: Record<string, boolean> = {};
    missingStaff.forEach(u => {
      updated[u.id] = true;
    });
    setReminderSentStaff(updated);
  };

  // Filter lists based on searchStaff query
  const filteredMissing = missingStaff.filter(u => {
    const q = searchStaff.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.uNumber.toLowerCase().includes(q)
    );
  });

  const filteredConfirmed = confirmedStaff.filter(item => {
    const q = searchStaff.toLowerCase();
    return (
      item.user.name.toLowerCase().includes(q) ||
      item.user.email.toLowerCase().includes(q) ||
      item.user.uNumber.toLowerCase().includes(q)
    );
  });

  const filteredPendingLate = pendingLateStaff.filter(item => {
    const q = searchStaff.toLowerCase();
    return (
      item.user.name.toLowerCase().includes(q) ||
      item.user.email.toLowerCase().includes(q) ||
      item.user.uNumber.toLowerCase().includes(q) ||
      (item.confirmation.lateReason && item.confirmation.lateReason.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-2 sm:p-4'} overflow-hidden`}>
      <div className={`bg-white shadow-2xl w-full border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 ${
        isFullscreen
          ? 'h-screen w-screen max-w-none max-h-none rounded-none my-0'
          : 'rounded-xl max-w-4xl my-2 sm:my-8 h-[92vh] max-h-[92vh]'
      }`}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="pr-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
              <span className="font-semibold text-slate-700">{topic.type}</span>
              <span aria-hidden="true">·</span>
              <span>Target: <strong className="text-slate-800">{topic.targetGroup}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Due: <span className="tabular-nums font-mono">{topic.dueDate}</span></span>
              {topic.isClosed && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                    ✓ Closed for Acknowledgement
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{topic.title}</h2>
              {canCloseForAck && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Close "${topic.title}" for acknowledgement?\n\nThis will:\n1. Permanently finalize and close the topic in Firestore.\n2. Mark all ${totalMissing} pending participants as confirmed/verified.\n3. Remove this topic from their pending queue.`)) {
                      onCloseTopicForAcknowledgement?.(topic.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Close topic for acknowledgement: verifies all assigned participants"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Close Topic for Acknowledgement</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
              title={isFullscreen ? "Minimize to original size" : "Show full screen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Interactive Stats & Export bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('missing')}
            className={`text-left p-2.5 rounded-xl transition cursor-pointer border shadow-xs ${
              activeTab === 'missing'
                ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
            }`}
            title="Click to view all missing / pending personnel"
          >
            <span className="text-slate-500 block text-[11px]">Eligible Personnel</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{totalEligible}</span>
            <span className="text-[10px] text-[#0078D4] block mt-0.5">View breakdown ↳</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('confirmed')}
            className={`text-left p-2.5 rounded-xl transition cursor-pointer border shadow-xs ${
              activeTab === 'confirmed'
                ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                : 'bg-slate-50/80 border-slate-200 hover:border-emerald-200'
            }`}
            title="Click to view all confirmed and signed personnel"
          >
            <span className="text-emerald-700 block font-medium text-[11px]">Confirmed / Signed</span>
            <span className="text-base sm:text-lg font-bold text-emerald-800 tabular-nums">{totalConfirmed}</span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">View signed ↳</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('missing')}
            className={`text-left p-2.5 rounded-xl transition cursor-pointer border shadow-xs ${
              activeTab === 'missing'
                ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                : 'bg-slate-50/80 border-slate-200 hover:border-amber-200'
            }`}
            title="Click to view all missing / pending staff awaiting signature"
          >
            <span className="text-amber-700 block font-medium text-[11px]">Missing / Pending</span>
            <span className="text-base sm:text-lg font-bold text-amber-800 tabular-nums">{totalMissing}</span>
            <span className="text-[10px] text-amber-700 block mt-0.5">View missing ↳</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending_late')}
            className={`text-left p-2.5 rounded-xl transition cursor-pointer border shadow-xs ${
              activeTab === 'pending_late'
                ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-300'
                : 'bg-slate-50/80 border-slate-200 hover:border-blue-200'
            }`}
            title="Click to view pending late review submissions"
          >
            <span className="text-blue-700 block font-medium text-[11px]">Late Review</span>
            <span className="text-base sm:text-lg font-bold text-blue-800 tabular-nums">{totalPendingLate}</span>
            <span className="text-[10px] text-blue-700 block mt-0.5">View late review ↳</span>
          </button>
        </div>

        {/* Streamlined Search Bar & Actions */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium flex items-center gap-2">
            <span>Currently viewing:</span>
            <span className="font-bold text-[#0078D4] capitalize bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {activeTab === 'missing' ? `Missing / Pending (${totalMissing})` : activeTab === 'confirmed' ? `Confirmed / Signed (${totalConfirmed})` : `Late Review (${totalPendingLate})`}
            </span>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search staff in this topic..."
                value={searchStaff}
                onChange={e => setSearchStaff(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              />
            </div>

            {activeTab === 'missing' && totalMissing > 0 && (
              <button
                onClick={handleSendAllReminders}
                className="px-3 py-1.5 font-medium text-[#0078D4] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded transition flex items-center gap-1 whitespace-nowrap"
              >
                <Send className="w-3 h-3" />
                <span>Nudge All ({totalMissing})</span>
              </button>
            )}

            <button
              onClick={() => exportSingleTopicReport(stats)}
              className="px-3 py-1.5 font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded transition flex items-center gap-1 whitespace-nowrap shadow-xs"
              title="Download full CSV report of confirmed and missing staff"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="p-0 overflow-y-auto flex-1">
          {activeTab === 'missing' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-2.5 px-4 font-semibold">ID / Email</th>
                  <th className="py-2.5 px-4 font-semibold">Tags</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMissing.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      {missingStaff.length === 0
                        ? '100% Compliance Achieved! All assigned staff have signed this topic.'
                        : 'No staff match the search query.'}
                    </td>
                  </tr>
                ) : (
                  filteredMissing.map(u => {
                    const isNudged = reminderSentStaff[u.id];
                    return (
                      <tr key={u.id} className="hover:bg-amber-50/30 transition">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500">{u.title || u.department || 'Ground Operations'}</div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                          <div>{u.uNumber}</div>
                          <div className="text-slate-400 font-sans">{u.email}</div>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-600">
                          {u.isAls ? 'ALS ' : ''}{u.isLead ? 'Lead ' : ''}{!u.isAls && !u.isLead ? 'ALL' : ''}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-medium">
                            Pending Signature
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleSendReminder(u.id)}
                            disabled={isNudged}
                            className={`px-2.5 py-1 text-[11px] rounded transition ${
                              isNudged
                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                : 'bg-slate-100 hover:bg-blue-50 text-[#0078D4] border border-slate-200'
                            }`}
                          >
                            {isNudged ? 'Nudge Sent ✓' : 'Send Reminder'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'confirmed' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-2.5 px-4 font-semibold">ID / Email</th>
                  <th className="py-2.5 px-4 font-semibold">Digital Signature</th>
                  <th className="py-2.5 px-4 font-semibold">Confirmed At (UTC)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConfirmed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      {confirmedStaff.length === 0
                        ? 'No staff have signed this topic yet.'
                        : 'No staff match the search query.'}
                    </td>
                  </tr>
                ) : (
                  filteredConfirmed.map(item => (
                    <tr key={item.user.id} className="hover:bg-emerald-50/20 transition">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{item.user.name}</div>
                        <div className="text-[11px] text-slate-500">{item.user.title || 'Ground Operations'}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                        <div>{item.user.uNumber}</div>
                        <div className="text-slate-400 font-sans">{item.user.email}</div>
                      </td>
                      <td className="py-2.5 px-4 font-serif italic text-slate-700">
                        {item.confirmation.signatureText || item.user.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 tabular-nums">
                        {item.confirmation.confirmedAt.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">
                          Confirmed ✓
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'pending_late' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-2.5 px-4 font-semibold">Late Reason Provided</th>
                  <th className="py-2.5 px-4 font-semibold">Submitted At</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Admin Action (Accept / Reject)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPendingLate.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No late submissions awaiting review.
                    </td>
                  </tr>
                ) : (
                  filteredPendingLate.map(item => (
                    <tr key={item.user.id} className="hover:bg-blue-50/20 transition">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{item.user.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.user.uNumber} · {item.user.email}</div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 italic bg-amber-50/50 rounded p-1.5 my-1">
                        &ldquo;{item.confirmation.lateReason || 'No reason provided'}&rdquo;
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 tabular-nums">
                        {item.confirmation.confirmedAt.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => onUpdateConfirmation && onUpdateConfirmation(item.confirmation.id, 'confirmed')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs transition cursor-pointer"
                          title="Accept late response and mark confirmed"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => onUpdateConfirmation && onUpdateConfirmation(item.confirmation.id, 'rejected')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded shadow-xs transition cursor-pointer"
                          title="Reject late response"
                        >
                          ✕ Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Records are verified against Microsoft 365 Entra ID organizational tokens.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
