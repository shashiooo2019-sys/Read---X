'use client';

import React, { useState, useRef } from 'react';
import {
  TopicParticipationImportResult,
  parseTopicParticipationBuffer,
  getProvidedSheetData,
  TopicParticipationSummary,
} from '@/lib/topic-participation-importer';
import * as XLSX from 'xlsx';
import { User } from '@/lib/types';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Search,
  Cloud,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Database,
  FileCheck,
  ShieldCheck,
  Filter,
} from 'lucide-react';

interface ImportTopicParticipationModalProps {
  users?: User[];
  onCommitImport: (result: TopicParticipationImportResult) => Promise<void>;
  onClose: () => void;
}

export function ImportTopicParticipationModal({
  users,
  onCommitImport,
  onClose,
}: ImportTopicParticipationModalProps) {
  const [importResult, setImportResult] = useState<TopicParticipationImportResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Navigation & Drilldown states
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'topics' | 'flat'>('topics');
  const [participantFilter, setParticipantFilter] = useState<'all' | 'confirmed' | 'missing'>('all');
  const [participantSearch, setParticipantSearch] = useState('');
  
  // Search & filter for flat view / topic list
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [flatFilterStatus, setFlatFilterStatus] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [flatSearchQuery, setFlatSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle uploaded file (Excel .xlsx, .xls, or .csv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseTopicParticipationBuffer(buffer, users);
      if (result.rows.length === 0) {
        throw new Error('No valid topic participation rows found in file.');
      }
      setImportResult(result);
      setSelectedTopicId(null);
    } catch (err: any) {
      console.error('Failed to parse topic participation file:', err);
      setParseError(err.message || 'Failed to read Excel/CSV file. Please ensure columns match the required matrix.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Instant load of provided dataset
  const handleLoadProvidedSheet = () => {
    setIsParsing(true);
    setParseError(null);
    try {
      const result = getProvidedSheetData(users);
      setImportResult(result);
      setSelectedTopicId(null);
    } catch (err: any) {
      setParseError(err.message || 'Failed to load provided sheet data.');
    } finally {
      setIsParsing(false);
    }
  };

  // Download sample blank template with the exact 12 columns
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'TOPIC ID',
      'TOPIC TITLE',
      'TOPIC TYPE',
      'TARGET GROUP',
      'UNUMBER',
      'STAFF NAME',
      'EMAIL',
      'ALS',
      'LEAD',
      'STATUS',
      'CONFIRMED AT',
      'SIGNATURE',
    ];

    const sampleRows = [
      [
        'top-example01',
        'Aircraft Turnaround & Ramp Safety Protocol',
        'Document Read and Sign',
        'ALL',
        'U125316',
        'ABHAY TIWARI',
        'u125316.sp@lhgroup.de',
        'N',
        'Y',
        'CONFIRMED',
        new Date().toISOString(),
        'ABHAY TIWARI',
      ],
      [
        'top-example01',
        'Aircraft Turnaround & Ramp Safety Protocol',
        'Document Read and Sign',
        'ALL',
        'U193966',
        'ANKITA DUTTA',
        'ankita.dutta.sp@dlh.de',
        'Y',
        'Y',
        'MISSING / PENDING',
        '',
        '',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Topic_Participation');
    XLSX.writeFile(wb, 'Topic_Participation_Template.xlsx');
  };

  // Handle final commit to Firestore
  const handleCommit = async () => {
    if (!importResult) return;
    setIsCommitting(true);
    try {
      await onCommitImport(importResult);
      onClose();
    } catch (err: any) {
      console.error('Error committing imported topic participation:', err);
      setParseError(err.message || 'Failed to commit data to Firestore.');
      setIsCommitting(false);
    }
  };

  // List of topic summaries
  const topicSummaries: TopicParticipationSummary[] = importResult?.topicSummaries || (importResult?.topics.map(t => {
    const topicRows = importResult.rows.filter(r => r.topicId === t.id);
    const participated = topicRows.filter(r => r.status === 'confirmed');
    const missing = topicRows.filter(r => r.status !== 'confirmed');
    return {
      topic: t,
      rows: topicRows,
      participatedRows: participated,
      missingRows: missing,
      totalAssigned: topicRows.length,
      totalConfirmed: participated.length,
      totalPending: missing.length,
      completionRate: topicRows.length > 0 ? Math.round((participated.length / topicRows.length) * 100) : 0,
    };
  }) || []);

  // Filtered topic summaries
  const filteredTopicSummaries = topicSummaries.filter(s => {
    if (topicSearchQuery.trim()) {
      const q = topicSearchQuery.toLowerCase();
      return (
        s.topic.title.toLowerCase().includes(q) ||
        s.topic.id.toLowerCase().includes(q) ||
        s.topic.type.toLowerCase().includes(q) ||
        s.topic.targetGroup.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Selected topic summary for participant drill-down
  const activeSummary = topicSummaries.find(s => s.topic.id === selectedTopicId) || null;

  // Filtered participants within selected topic
  const filteredParticipants = activeSummary?.rows.filter(r => {
    if (participantFilter === 'confirmed' && r.status !== 'confirmed') return false;
    if (participantFilter === 'missing' && r.status === 'confirmed') return false;
    if (participantSearch.trim()) {
      const q = participantSearch.toLowerCase();
      return (
        r.staffName.toLowerCase().includes(q) ||
        r.uNumber.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  // Filtered flat rows (raw matrix view)
  const filteredFlatRows = importResult?.rows.filter(r => {
    if (flatFilterStatus === 'confirmed' && r.status !== 'confirmed') return false;
    if (flatFilterStatus === 'pending' && r.status !== 'pending') return false;
    if (flatSearchQuery.trim()) {
      const q = flatSearchQuery.toLowerCase();
      return (
        r.topicTitle.toLowerCase().includes(q) ||
        r.topicId.toLowerCase().includes(q) ||
        r.staffName.toLowerCase().includes(q) ||
        r.uNumber.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-slate-800 to-[#0078D4] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Import Topic Participation Matrix
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Excel &amp; CSV
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ingest topics, staff assignments, and digital confirmation signatures directly into Cloud Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {parseError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-xs">Import Parsing Error:</span>
                <p className="text-xs text-rose-800 leading-relaxed">{parseError}</p>
              </div>
            </div>
          )}

          {/* Upload Controls & Quick Presets */}
          {!importResult && (
            <div className="space-y-5">
              {/* Drag and Drop Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#0078D4] bg-slate-50 hover:bg-blue-50/40 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-[#0078D4] group-hover:scale-105 transition flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7 text-[#0078D4]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#0078D4] transition">
                    Upload Topic Participation Spreadsheet (.xlsx, .xls, .csv)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Select an Excel or CSV file matching the 12 standard columns: Topic ID, Title, Type, Target Group, UNUMBER, Staff Name, Email, ALS, Lead, Status, Confirmed At, and Signature.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Action Buttons: Load Provided Sheet & Download Template */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLoadProvidedSheet}
                  disabled={isParsing}
                  className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-left transition flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-[#0078D4] text-white shrink-0 group-hover:scale-105 transition">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0078D4] flex items-center gap-1.5">
                      <span>Load Current Provided Sheet Data</span>
                      <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-semibold">Ready</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Instantly load topics and verified participation records from the master ledger into the preview.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0 group-hover:scale-105 transition">
                    <Download className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Download 12-Column Matrix Template
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Download empty Excel spreadsheet with pre-configured headers matching the required station format.
                    </p>
                  </div>
                </button>
              </div>

              {/* Schema Spec Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#0078D4]" />
                  <span>Expected Column Structure &amp; Automatic Rules:</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="block text-slate-800">1. TOPIC ID &amp; TITLE</strong>
                    <span>Extracts unique topic identifier and headline</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="block text-slate-800">2. TYPE &amp; GROUP</strong>
                    <span>Briefing, GPD/GPI, etc. Maps CUTOM to CUSTOM</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="block text-slate-800">3. UNUMBER &amp; STAFF</strong>
                    <span>Binds employee ID, name, email &amp; qualifications</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="block text-slate-800">4. STATUS &amp; SIGNATURE</strong>
                    <span>Captures timestamp &amp; legal signature if confirmed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Results Preview State */}
          {importResult && (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <span className="text-[10px] text-purple-800 font-medium block">Topics Detected</span>
                  <span className="text-xl font-bold text-purple-950 font-mono tabular-nums">
                    {importResult.topics.length}
                  </span>
                  <span className="text-[10px] text-purple-700 block mt-0.5">One row per topic</span>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <span className="text-[10px] text-blue-800 font-medium block">Total Records</span>
                  <span className="text-xl font-bold text-blue-950 font-mono tabular-nums">
                    {importResult.stats.totalRows}
                  </span>
                  <span className="text-[10px] text-blue-700 block mt-0.5">Participation rows</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-600 font-medium block">Staff Assigned</span>
                  <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                    {importResult.stats.totalStaff}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Station personnel</span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] text-emerald-800 font-medium block">Confirmed Signatures</span>
                  <span className="text-xl font-bold text-emerald-950 font-mono tabular-nums">
                    {importResult.stats.totalConfirmed}
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">Verified signed</span>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="text-[10px] text-amber-800 font-medium block">Pending / Missing</span>
                  <span className="text-xl font-bold text-amber-950 font-mono tabular-nums">
                    {importResult.stats.totalPending}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">Awaiting signature</span>
                </div>
              </div>

              {/* View Mode Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('topics');
                      setSelectedTopicId(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'topics'
                        ? 'bg-[#0078D4] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Topics Overview ({importResult.topics.length} Directives)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'flat'
                        ? 'bg-[#0078D4] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Flat Matrix Rows ({importResult.rows.length})</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500">
                  {viewMode === 'topics' && !selectedTopicId && (
                    <span>Click any topic row below to inspect all assigned participants.</span>
                  )}
                </div>
              </div>

              {/* MODE 1: TOPICS OVERVIEW (ONE ROW PER TOPIC) */}
              {viewMode === 'topics' && !selectedTopicId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Layers className="w-3.5 h-3.5 text-[#0078D4]" />
                      <span>Topics to be Imported into Firestore (1 row per topic):</span>
                    </span>

                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={topicSearchQuery}
                        onChange={e => setTopicSearchQuery(e.target.value)}
                        placeholder="Search topics by title, ID, type..."
                        className="w-full pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Topic Directive</th>
                          <th className="py-2.5 px-3 font-semibold">Type</th>
                          <th className="py-2.5 px-3 font-semibold">Target Group</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Assigned</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Confirmed / Signed</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Missing</th>
                          <th className="py-2.5 px-3 font-semibold">Compliance Rate</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Participants</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTopicSummaries.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-500">
                              No topics match your search query.
                            </td>
                          </tr>
                        ) : (
                          filteredTopicSummaries.map(s => (
                            <tr
                              key={s.topic.id}
                              onClick={() => setSelectedTopicId(s.topic.id)}
                              className="hover:bg-blue-50/40 transition cursor-pointer group"
                            >
                              <td className="py-2.5 px-3 max-w-[240px]">
                                <div className="font-semibold text-slate-900 group-hover:text-[#0078D4] transition truncate" title={s.topic.title}>
                                  {s.topic.title}
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">{s.topic.id}</span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  {s.topic.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0078D4] border border-blue-200">
                                  {s.topic.targetGroup}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                                {s.totalAssigned}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 tabular-nums">
                                  {s.totalConfirmed}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                                  s.totalPending === 0
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {s.totalPending}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 min-w-[120px]">
                                <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
                                  <span className="font-bold">{s.completionRate}%</span>
                                  <span className="text-slate-400">({s.totalConfirmed}/{s.totalAssigned})</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      s.completionRate === 100
                                        ? 'bg-emerald-500'
                                        : s.completionRate >= 50
                                        ? 'bg-[#0078D4]'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${s.completionRate}%` }}
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTopicId(s.topic.id);
                                  }}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#0078D4] rounded-md font-semibold text-[11px] transition flex items-center gap-1 ml-auto cursor-pointer"
                                >
                                  <span>View Participants ({s.totalAssigned})</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODE 1.B: SELECTED TOPIC PARTICIPANTS DRILLDOWN */}
              {viewMode === 'topics' && selectedTopicId && activeSummary && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Topic Title Bar with Back Button */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTopicId(null)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 mt-0.5 shadow-xs"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All Topics</span>
                      </button>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            {activeSummary.topic.title}
                          </h3>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-[#0078D4]">
                            {activeSummary.topic.targetGroup}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ID: {activeSummary.topic.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Showing all participants assigned to this topic directive with signature status.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {activeSummary.totalConfirmed} Participated
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {activeSummary.totalPending} Missing
                      </span>
                    </div>
                  </div>

                  {/* Filter Pills and Participant Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start">
                      <button
                        type="button"
                        onClick={() => setParticipantFilter('all')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                          participantFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Participants ({activeSummary.totalAssigned})
                      </button>
                      <button
                        type="button"
                        onClick={() => setParticipantFilter('confirmed')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          participantFilter === 'confirmed'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Participated ({activeSummary.totalConfirmed})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setParticipantFilter('missing')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          participantFilter === 'missing'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-700 hover:text-amber-900'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>Missing ({activeSummary.totalPending})</span>
                      </button>
                    </div>

                    <div className="relative flex-1 sm:max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={participantSearch}
                        onChange={e => setParticipantSearch(e.target.value)}
                        placeholder="Search participant by name, ID, email..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                      />
                    </div>
                  </div>

                  {/* Participant Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Staff Member</th>
                          <th className="py-2.5 px-3 font-semibold">Employee ID</th>
                          <th className="py-2.5 px-3 font-semibold">Email Address</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Qualifications</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Confirmed At &amp; Signature</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredParticipants.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              No participants match the selected filter or search criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredParticipants.map((r, i) => (
                            <tr key={`${r.uNumber}_${i}`} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {r.staffName}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {r.uNumber}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                {r.email || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {r.isAls && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      ALS
                                    </span>
                                  )}
                                  {r.isLead && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                      Lead
                                    </span>
                                  )}
                                  {!r.isAls && !r.isLead && (
                                    <span className="text-slate-400 text-[10px]">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {r.status === 'confirmed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>PARTICIPATED</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>MISSING</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px]">
                                {r.status === 'confirmed' ? (
                                  <div>
                                    <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                                      {r.signature || r.staffName}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                                      {r.confirmedAt?.slice(0, 19).replace('T', ' ')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[10px]">Awaiting signature</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODE 2: FLAT MATRIX ROWS PREVIEW */}
              {viewMode === 'flat' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start">
                      <button
                        type="button"
                        onClick={() => setFlatFilterStatus('all')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                          flatFilterStatus === 'all'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Rows ({importResult.rows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlatFilterStatus('confirmed')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          flatFilterStatus === 'confirmed'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Confirmed ({importResult.stats.totalConfirmed})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlatFilterStatus('pending')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          flatFilterStatus === 'pending'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-700 hover:text-amber-900'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>Pending ({importResult.stats.totalPending})</span>
                      </button>
                    </div>

                    <div className="relative flex-1 sm:max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={flatSearchQuery}
                        onChange={e => setFlatSearchQuery(e.target.value)}
                        placeholder="Search staff, UNUMBER, or topic..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Topic Directive</th>
                          <th className="py-2.5 px-3 font-semibold">Target</th>
                          <th className="py-2.5 px-3 font-semibold">Staff Name &amp; ID</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Qualifications</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Confirmed At &amp; Signature</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredFlatRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              No rows match your filter or search query.
                            </td>
                          </tr>
                        ) : (
                          filteredFlatRows.map((r, i) => (
                            <tr key={`${r.topicId}_${r.uNumber}_${i}`} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 max-w-[200px]">
                                <div className="font-semibold text-slate-900 truncate" title={r.topicTitle}>
                                  {r.topicTitle}
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">{r.topicId}</span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {r.targetGroup}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="font-semibold text-slate-900">{r.staffName}</div>
                                <span className="font-mono text-[10px] text-slate-500">{r.uNumber}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {r.isAls && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      ALS
                                    </span>
                                  )}
                                  {r.isLead && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                      Lead
                                    </span>
                                  )}
                                  {!r.isAls && !r.isLead && (
                                    <span className="text-slate-400 text-[10px]">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {r.status === 'confirmed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>CONFIRMED</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>PENDING</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px]">
                                {r.status === 'confirmed' ? (
                                  <div>
                                    <span className="font-semibold text-slate-900 block truncate max-w-[160px]">
                                      {r.signature || r.staffName}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                                      {r.confirmedAt?.slice(0, 19).replace('T', ' ')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[10px]">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Target Database: <strong className="text-slate-800 font-mono text-[11px]">ai-studio-readsigncomplian...</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            {importResult && (
              <button
                type="button"
                onClick={() => {
                  setImportResult(null);
                  setSelectedTopicId(null);
                }}
                disabled={isCommitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition cursor-pointer"
              >
                Choose Different File
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isCommitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>

            {importResult && (
              <button
                type="button"
                onClick={handleCommit}
                disabled={isCommitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isCommitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>Commit {importResult.topics.length} Topics &amp; {importResult.rows.length} Records</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
