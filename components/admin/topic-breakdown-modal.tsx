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
  UserX
} from 'lucide-react';

interface TopicBreakdownModalProps {
  stats: TopicComplianceStats;
  onClose: () => void;
}

export function TopicBreakdownModal({ stats, onClose }: TopicBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<'missing' | 'confirmed'>('missing');
  const [searchStaff, setSearchStaff] = useState('');
  const [reminderSentStaff, setReminderSentStaff] = useState<Record<string, boolean>>({});

  const {
    topic,
    confirmedStaff,
    missingStaff,
    totalEligible,
    totalConfirmed,
    totalMissing,
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="pr-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">{topic.type}</span>
              <span aria-hidden="true">·</span>
              <span>Target: <strong className="text-slate-800">{topic.targetGroup}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Due: <span className="tabular-nums font-mono">{topic.dueDate}</span></span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{topic.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Stats & Export bar */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Eligible Personnel:</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">{totalEligible}</span>
          </div>
          <div>
            <span className="text-emerald-700 block font-medium">Confirmed / Signed:</span>
            <span className="text-lg font-bold text-emerald-800 tabular-nums">{totalConfirmed}</span>
          </div>
          <div>
            <span className="text-amber-700 block font-medium">Missing / Pending:</span>
            <span className="text-lg font-bold text-amber-800 tabular-nums">{totalMissing}</span>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span>Progress:</span>
              <span className="font-bold tabular-nums">{completionRate}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  completionRate === 100
                    ? 'bg-emerald-500'
                    : completionRate >= 50
                    ? 'bg-[#0078D4]'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab switcher, Search & Export Actions */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Segmented Tab */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg self-start">
            <button
              onClick={() => setActiveTab('missing')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'missing'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-amber-600" />
              <span>Missing / Pending Staff ({totalMissing})</span>
            </button>

            <button
              onClick={() => setActiveTab('confirmed')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'confirmed'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Confirmed Staff ({totalConfirmed})</span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
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
        <div className="p-0 overflow-y-auto flex-1 max-h-[50vh]">
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
