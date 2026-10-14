'use client';

import React, { useState } from 'react';
import { User, Topic } from '@/lib/types';
import {
  parseParticipationFileContent,
  TopicParticipationImportResult,
  generateSampleParticipationCSV,
} from '@/lib/topic-participation-importer';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Check,
  Download,
  Info,
  Layers,
} from 'lucide-react';

interface ImportTopicParticipationModalProps {
  users?: User[];
  topics?: Topic[];
  onCommitImport?: (result: TopicParticipationImportResult) => Promise<void> | void;
  onClose?: () => void;
}

export function ImportTopicParticipationModal({
  users = [],
  topics = [],
  onCommitImport,
  onClose,
}: ImportTopicParticipationModalProps) {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseResult, setParseResult] = useState<TopicParticipationImportResult | null>(null);
  const [importCompletedMessage, setImportCompletedMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    await processFile(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      await processFile(droppedFile);
    }
  };

  const processFile = async (f: File) => {
    setIsParsing(true);
    setParseResult(null);
    setImportCompletedMessage(null);
    try {
      const buffer = await f.arrayBuffer();
      const res = parseParticipationFileContent(buffer, users, topics);
      setParseResult(res);
    } catch (err: any) {
      setParseResult({
        records: [],
        matchedStaffCount: 0,
        matchedTopicsCount: 0,
        unmatchedStaff: [],
        unmatchedTopics: [],
        totalRowsProcessed: 0,
        errors: [`Failed to read file: ${err?.message || String(err)}`],
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    setIsParsing(true);
    setParseResult(null);
    setImportCompletedMessage(null);
    try {
      const res = parseParticipationFileContent(pastedText, users, topics);
      setParseResult(res);
    } catch (err: any) {
      setParseResult({
        records: [],
        matchedStaffCount: 0,
        matchedTopicsCount: 0,
        unmatchedStaff: [],
        unmatchedTopics: [],
        totalRowsProcessed: 0,
        errors: [`Failed to parse CSV text: ${err?.message || String(err)}`],
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!parseResult || parseResult.records.length === 0) return;
    setIsSubmitting(true);
    try {
      if (onCommitImport) {
        await onCommitImport(parseResult);
      }
      setImportCompletedMessage(
        `✓ Successfully imported ${parseResult.records.length} topic sign-offs across ${parseResult.matchedTopicsCount} topics for ${parseResult.matchedStaffCount} staff members.`
      );
    } catch (err: any) {
      alert(`Import error: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadSample = (type: 'matrix' | 'flat') => {
    const csvContent = generateSampleParticipationCSV(type, users, topics);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sample_Topic_Participation_${type.toUpperCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Bulk Import Topic Participation
              </h2>
              <p className="text-xs text-slate-500">
                Import training &amp; directive completion records from Excel (.xlsx/.xls) or CSV matrix/flat lists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Sample Download Bar */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800">Supported Formats:</span>
                <p className="text-slate-600">
                  <strong>Flat List Headers:</strong> TOPIC ID, TOPIC TITLE, TOPIC TYPE, TARGET GROUP, UNUMBER, STAFF NAME, EMAIL, ALS, LEAD, STATUS, CONFIRMED AT, SIGNATURE. (Also supports Excel/CSV Matrix layout).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadSample('flat')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition flex items-center gap-1.5 text-[11px] shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Standard CSV Template (12 Headers)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSample('matrix')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition flex items-center gap-1.5 text-[11px] shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Download Matrix CSV Template</span>
              </button>
            </div>
          </div>

          {/* Input Method Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveInputTab('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeInputTab === 'upload'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File (.xlsx, .xls, .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInputTab('paste')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeInputTab === 'paste'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Tab / CSV Text</span>
            </button>
          </div>

          {activeInputTab === 'upload' ? (
            /* File Upload Zone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {file ? file.name : 'Drag and drop your Excel or CSV file here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Header order: TOPIC ID, TOPIC TITLE, TOPIC TYPE, TARGET GROUP, UNUMBER, STAFF NAME, EMAIL, ALS, LEAD, STATUS, CONFIRMED AT, SIGNATURE
                </p>
              </div>

              <label className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Select File from Computer</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            /* Paste CSV Text Zone */
            <div className="space-y-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`TOPIC ID\tTOPIC TITLE\tTOPIC TYPE\tTARGET GROUP\tUNUMBER\tSTAFF NAME\tEMAIL\tALS\tLEAD\tSTATUS\tCONFIRMED AT\tSIGNATURE\ntopic-1\tInfection Control Policy\tRead & Sign\tAll Staff\tU1001\tSarah Jenkins\tsarah.jenkins@groundops.com\tALS 1\tTeam Alpha\tCONFIRMED\t2026-10-14 10:00:00\tDigitally Signed`}
                rows={7}
                className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition whitespace-pre overflow-x-auto"
              />
              <button
                type="button"
                onClick={handleParsePastedText}
                disabled={!pastedText.trim() || isParsing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isParsing ? 'Parsing Text...' : 'Parse & Validate Text Data'}
              </button>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-6 text-center text-xs text-slate-600 space-y-2">
              <span className="w-6 h-6 border-3 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin inline-block" />
              <p className="font-semibold text-slate-800">Reading and validating participation matrix against staff roster and topic catalog...</p>
            </div>
          )}

          {/* Success Banner after Commit */}
          {importCompletedMessage && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>{importCompletedMessage}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs rounded-lg transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}

          {/* Parse Result Preview */}
          {parseResult && !importCompletedMessage && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Errors List */}
              {parseResult.errors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>File Parsing Errors Found:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sign-offs Ready</span>
                  </div>
                  <div className="text-xl font-extrabold text-emerald-900 mt-1">
                    {parseResult.records.length}
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-blue-700 font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Matched Staff</span>
                  </div>
                  <div className="text-xl font-extrabold text-blue-900 mt-1">
                    {parseResult.matchedStaffCount}
                  </div>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-purple-700 font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Matched Topics</span>
                  </div>
                  <div className="text-xl font-extrabold text-purple-900 mt-1">
                    {parseResult.matchedTopicsCount}
                  </div>
                </div>

                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                  <div className="text-slate-600 font-semibold">Rows Processed</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">
                    {parseResult.totalRowsProcessed}
                  </div>
                </div>
              </div>

              {/* Unmatched Warnings */}
              {(parseResult.unmatchedStaff.length > 0 || parseResult.unmatchedTopics.length > 0) && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Unmatched Items Warning (Will be skipped safely):</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-amber-800">
                    {parseResult.unmatchedStaff.length > 0 && (
                      <div>
                        <strong>Unmatched Staff ({parseResult.unmatchedStaff.length}):</strong>
                        <div className="max-h-20 overflow-y-auto mt-1 p-1.5 bg-white/80 rounded border border-amber-200 font-mono">
                          {parseResult.unmatchedStaff.slice(0, 8).join(', ')}
                          {parseResult.unmatchedStaff.length > 8 && ` +${parseResult.unmatchedStaff.length - 8} more`}
                        </div>
                      </div>
                    )}
                    {parseResult.unmatchedTopics.length > 0 && (
                      <div>
                        <strong>Unmatched Header Topics ({parseResult.unmatchedTopics.length}):</strong>
                        <div className="max-h-20 overflow-y-auto mt-1 p-1.5 bg-white/80 rounded border border-amber-200 font-mono">
                          {parseResult.unmatchedTopics.slice(0, 8).join(', ')}
                          {parseResult.unmatchedTopics.length > 8 && ` +${parseResult.unmatchedTopics.length - 8} more`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Parsed Sign-offs Table Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Sign-off Records Preview ({parseResult.records.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Showing all 12 mapped columns for records to be committed
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64">
                  <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">Topic ID</th>
                        <th className="py-2 px-2.5">Topic Title</th>
                        <th className="py-2 px-2.5">Topic Type</th>
                        <th className="py-2 px-2.5">Target Group</th>
                        <th className="py-2 px-2.5">UNumber</th>
                        <th className="py-2 px-2.5">Staff Name</th>
                        <th className="py-2 px-2.5">Email</th>
                        <th className="py-2 px-2.5">ALS</th>
                        <th className="py-2 px-2.5">Lead</th>
                        <th className="py-2 px-2.5">Status</th>
                        <th className="py-2 px-2.5">Confirmed At</th>
                        <th className="py-2 px-2.5">Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.records.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-6 text-center text-slate-400">
                            No valid matching participation records found in the uploaded file. Check headers or staff roster.
                          </td>
                        </tr>
                      ) : (
                        parseResult.records.map((rec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-600">{rec.topicId}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-slate-800 max-w-xs truncate">{rec.topicTitle}</td>
                            <td className="py-1.5 px-2.5 text-slate-600">{rec.topicType || 'Read & Sign'}</td>
                            <td className="py-1.5 px-2.5 text-slate-600">{rec.targetGroup || 'All Staff'}</td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-700">{rec.uNumber || '-'}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-slate-800">{rec.userName}</td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-600">{rec.userEmail}</td>
                            <td className="py-1.5 px-2.5 text-slate-600">{rec.als || '-'}</td>
                            <td className="py-1.5 px-2.5 text-slate-600">{rec.lead || '-'}</td>
                            <td className="py-1.5 px-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'missing'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-500 font-mono">
                              {new Date(rec.confirmedAt).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 italic">
                              {rec.signature || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          {parseResult && parseResult.records.length > 0 && !importCompletedMessage && (
            <button
              type="button"
              onClick={handleCommit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  <span>Committing {parseResult.records.length} records to Cloud...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Commit Import ({parseResult.records.length} Sign-offs)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
