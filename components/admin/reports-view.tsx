'use client';

import React, { useState } from 'react';
import { User, Topic, TopicConfirmation } from '@/lib/types';
import { calculateTopicStats } from '@/lib/compliance-store';
import {
  exportMultipleTopicsReport,
  exportStaffRosterCompliance,
  exportSingleTopicReport,
} from '@/lib/export-utils';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  Building
} from 'lucide-react';

interface ReportsViewProps {
  users: User[];
  topics: Topic[];
  confirmations: TopicConfirmation[];
}

export function ReportsView({ users, topics, confirmations }: ReportsViewProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id || '');

  const statsList = topics.map(t => calculateTopicStats(t, users, confirmations));
  const totalAssignments = statsList.reduce((acc, s) => acc + s.totalEligible, 0);
  const totalConfirmed = statsList.reduce((acc, s) => acc + s.totalConfirmed, 0);
  const totalMissing = statsList.reduce((acc, s) => acc + s.totalMissing, 0);
  const overallRate = totalAssignments > 0 ? Math.round((totalConfirmed / totalAssignments) * 100) : 0;

  const selectedStats = statsList.find(s => s.topic.id === selectedTopicId) || statsList[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Compliance Audit & Export Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Download Microsoft Excel compatible CSV reports for station safety audits, regulatory oversight, and management reporting.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>UTF-8 BOM Encoded for Microsoft 365 Excel</span>
        </div>
      </div>

      {/* Audit Stats Summary - Clickable Action Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => exportMultipleTopicsReport(statsList, 'All Station Compliance Topics')}
          className="text-left bg-white border border-slate-200 hover:border-[#0078D4] hover:bg-blue-50/20 rounded-xl p-4 shadow-xs transition cursor-pointer"
          title="Click to export Master Compliance Matrix (CSV)"
        >
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Total Active Topics</span>
            <Download className="w-3.5 h-3.5 text-[#0078D4]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{topics.length}</div>
          <div className="text-[11px] text-[#0078D4] mt-0.5">Click to export matrix ↳</div>
        </button>

        <button
          type="button"
          onClick={() => exportStaffRosterCompliance(users, topics, confirmations)}
          className="text-left bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-4 shadow-xs transition cursor-pointer"
          title="Click to export Personnel Roster Compliance (CSV)"
        >
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Personnel Roster</span>
            <Download className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{users.length}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Click to export roster ↳</div>
        </button>

        <button
          type="button"
          onClick={() => exportMultipleTopicsReport(statsList, 'Signed Signatures Audit')}
          className="text-left bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-4 shadow-xs transition cursor-pointer"
          title="Click to export signed signatures log"
        >
          <div className="text-xs font-medium text-emerald-700 flex items-center justify-between">
            <span>Total Signed Signatures</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{totalConfirmed}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Logged with Timestamps ↳</div>
        </button>

        <button
          type="button"
          onClick={() => exportMultipleTopicsReport(statsList, 'Overall Station Compliance Rate')}
          className="text-left bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl p-4 shadow-xs transition cursor-pointer"
          title="Click to export overall station rate report"
        >
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Overall Station Rate</span>
            <span className="text-xs text-slate-400">↳</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{overallRate}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{totalMissing} signatures pending</div>
        </button>
      </div>

      {/* Export Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Master Bulk Report */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0078D4] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Master Compliance Matrix (All Topics)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Consolidated audit report across all {topics.length} compliance topics. Contains Executive Summary matrix and individual staff breakdown for every topic.
              </p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => exportMultipleTopicsReport(statsList, 'All Station Compliance Topics')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Master Matrix (CSV)</span>
            </button>
          </div>
        </div>

        {/* 2. Staff Roster Compliance Report */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Personnel Compliance Roster
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Complete roster of all 132 personnel (U-Number, Name, Email, ALS, Lead, Admin) with individual assignment counts, confirmed signatures, and completion percentages.
              </p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => exportStaffRosterCompliance(users, topics, confirmations)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Staff Roster (CSV)</span>
            </button>
          </div>
        </div>

        {/* 3. Single Topic Specific Report */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Single Topic Audit Report
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Select any individual topic to export a detailed list of confirmed personnel with timestamps and missing staff.
              </p>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Select Compliance Topic:
              </label>
              <select
                value={selectedTopicId}
                onChange={e => setSelectedTopicId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.targetGroup})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => {
                if (selectedStats) exportSingleTopicReport(selectedStats);
              }}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected Topic (CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
