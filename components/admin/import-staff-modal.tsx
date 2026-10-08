'use client';

import React, { useState, useRef } from 'react';
import { User } from '@/lib/types';
import {
  parseStaffFile,
  parseCSVOrText,
  analyzeStaffImport,
  StaffImportAnalysis,
  generateSampleCSV,
  generateSampleExcelBlob,
} from '@/lib/staff-importer';
import { downloadFile } from '@/lib/export-utils';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  RefreshCw,
  Plus,
  Users,
  Info
} from 'lucide-react';

interface ImportStaffModalProps {
  existingUsers: User[];
  onApplyImport: (updatedUserList: User[], summaryMessage: string) => void;
  onClose: () => void;
}

export function ImportStaffModal({
  existingUsers,
  onApplyImport,
  onClose,
}: ImportStaffModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StaffImportAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [importMode, setImportMode] = useState<'all' | 'new_only' | 'changes_only'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);
    setErrorMessage('');

    try {
      const parsedRows = await parseStaffFile(file);
      if (parsedRows.length === 0) {
        setErrorMessage(
          'Could not parse any staff rows from file. Please ensure it contains columns: UNUMBER, NAMES, Email, ALS, Lead.'
        );
        setIsProcessing(false);
        return;
      }
      const analyzed = analyzeStaffImport(parsedRows, existingUsers);
      setAnalysis(analyzed);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        `Failed to parse file: ${err?.message || 'Unsupported format. Please upload XLSX or CSV.'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle pasted text parse
  const handleParsePastedText = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Please paste staff roster text or CSV data.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const parsedRows = parseCSVOrText(pasteText);
      if (parsedRows.length === 0) {
        setErrorMessage(
          'No valid staff rows found. Ensure the text contains columns UNUMBER, NAMES, Email, ALS, Lead (separated by tabs, commas, or spaces).'
        );
        setIsProcessing(false);
        return;
      }
      const analyzed = analyzeStaffImport(parsedRows, existingUsers);
      setAnalysis(analyzed);
    } catch (err: any) {
      setErrorMessage(`Failed to parse text: ${err?.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download sample CSV
  const handleDownloadSampleCSV = () => {
    const csvContent = generateSampleCSV();
    downloadFile(csvContent, 'Staff_Import_Template.csv');
  };

  // Download sample Excel (.xlsx)
  const handleDownloadSampleXLSX = () => {
    const blob = generateSampleExcelBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Staff_Import_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Execute import
  const handleConfirmImport = () => {
    if (!analysis) return;

    const { newStaff, changedStaff } = analysis;

    // Build map of current users
    const userMap = new Map<string, User>();
    existingUsers.forEach(u => userMap.set(u.id, { ...u }));

    let appliedUpdatesCount = 0;
    let appliedNewCount = 0;

    // Apply changes to existing users if mode allows
    if (importMode === 'all' || importMode === 'changes_only') {
      changedStaff.forEach(rec => {
        userMap.set(rec.original.id, rec.updated);
        appliedUpdatesCount++;
      });
    }

    // Add new users if mode allows
    if (importMode === 'all' || importMode === 'new_only') {
      newStaff.forEach(newUser => {
        userMap.set(newUser.id, newUser);
        appliedNewCount++;
      });
    }

    const finalList = Array.from(userMap.values());
    const summaryMsg = `Successfully processed: ${appliedNewCount} new staff added, ${appliedUpdatesCount} existing profiles amended. Total roster: ${finalList.length} staff.`;

    onApplyImport(finalList, summaryMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Import Staff Roster (XLSX, CSV, PDF / Text)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Differential import: updates changes to existing personnel and adds new staff without disrupting compliance records.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Header Requirements & Template Download Banner */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#0078D4]" />
                <span>Required Column Headers</span>
              </div>
              <div className="text-[11px] text-blue-800 mt-1 flex flex-wrap gap-1 font-mono">
                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">UNUMBER</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">NAMES</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">Email</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">ALS</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">Lead</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-slate-500">Admin (Optional)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadSampleXLSX}
                className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-100/60 text-[#0078D4] font-medium rounded transition flex items-center gap-1 text-[11px]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (.xlsx) Template</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-100/60 text-[#0078D4] font-medium rounded transition flex items-center gap-1 text-[11px]"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CSV Template</span>
              </button>
            </div>
          </div>

          {/* If no analysis yet: show Upload or Paste options */}
          {!analysis && (
            <div className="space-y-4">
              {/* Tab selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                    activeTab === 'upload'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upload File (.xlsx, .xls, .csv, .txt, .pdf)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                    activeTab === 'paste'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paste Table Text / PDF Content
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {activeTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#0078D4] rounded-xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0078D4] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    Click to select file or drag and drop
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Microsoft Excel (<span className="font-mono">.xlsx</span>, <span className="font-mono">.xls</span>), Adobe PDF (<span className="font-mono">.pdf</span>), Comma-Separated (<span className="font-mono">.csv</span>), or text export.
                  </p>
                  {isProcessing && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#0078D4]">
                      <div className="w-3.5 h-3.5 border-2 border-[#0078D4] border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing file and calculating differentials...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick load sample test data */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="text-slate-600">Quick Test: Load sample differential data with both new staff and modified records:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sampleText = `UNUMBER\tNAMES\tEmail\tALS\tLead\tAdmin
U086936\tShashi Srivastava\tshashi.srivastava@dlh.de\tY\tY\tY
U194888\tElena Rostova\telena.rostova@dlh.de\tY\tN\tN
U194889\tMarcus Vance\tmarcus.vance@lhgroup.de\tN\tY\tY
U194890\tChloe Dubois\tchloe.dubois@swiss.com\tY\tY\tN
U102450\tDeepak Kumar\tdeepak.kumar@dlh.de\tY\tY\tN`;
                    setPasteText(sampleText);
                    setActiveTab('paste');
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-blue-50 text-[#0078D4] font-medium rounded transition"
                >
                  Load Sample Roster with Differential Changes
                </button>
              </div>

              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={`Paste tabular content copied from PDF, Excel, or CSV. Example:
UNUMBER\tNAMES\tEmail\tALS\tLead
U194999\tJOHN DOE\tjohn.doe@dlh.de\tY\tY
U195000\tMARY SMITH\tmary.smith@lhgroup.de\tN\tY`}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded font-mono leading-relaxed bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      disabled={isProcessing}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded transition flex items-center gap-1.5 shadow-xs"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Analyze Pasted Data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Differential Analysis Results & Preview */}
          {analysis && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Differential Import Analysis</h3>
                  <p className="text-slate-500 text-[11px]">
                    Source: {fileName || 'Pasted Table'} · Total Parsed Rows:{' '}
                    <strong className="text-slate-900 tabular-nums">{analysis.totalParsed}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnalysis(null);
                    setFileName(null);
                    setPasteText('');
                  }}
                  className="text-xs text-[#0078D4] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Choose Another File</span>
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Staff to Add</span>
                  </div>
                  <div className="text-xl font-bold text-emerald-900 mt-1 tabular-nums">
                    {analysis.newStaff.length}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Not previously in roster</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-[11px] font-medium text-blue-800 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Existing with Changes</span>
                  </div>
                  <div className="text-xl font-bold text-blue-900 mt-1 tabular-nums">
                    {analysis.changedStaff.length}
                  </div>
                  <div className="text-[10px] text-blue-700 mt-0.5">Updated fields detected</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unchanged Staff</span>
                  </div>
                  <div className="text-xl font-bold text-slate-800 mt-1 tabular-nums">
                    {analysis.unchangedStaff.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Identical records</div>
                </div>
              </div>

              {/* Import Mode Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <span className="font-semibold text-slate-900 block">Select Import Execution Mode:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 border rounded bg-white cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="importMode"
                      value="all"
                      checked={importMode === 'all'}
                      onChange={() => setImportMode('all')}
                      className="text-[#0078D4]"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Add New & Apply Changes</div>
                      <div className="text-[10px] text-slate-500">Recommended full sync</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded bg-white cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="importMode"
                      value="changes_only"
                      checked={importMode === 'changes_only'}
                      onChange={() => setImportMode('changes_only')}
                      className="text-[#0078D4]"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Apply Changes Only</div>
                      <div className="text-[10px] text-slate-500">Updates existing {analysis.changedStaff.length} staff</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 border rounded bg-white cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="importMode"
                      value="new_only"
                      checked={importMode === 'new_only'}
                      onChange={() => setImportMode('new_only')}
                      className="text-[#0078D4]"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Add New Names Only</div>
                      <div className="text-[10px] text-slate-500">Registers {analysis.newStaff.length} new staff</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Detailed Diff Previews */}
              <div className="space-y-3">
                {/* Changes Only List */}
                {analysis.changedStaff.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-3 py-2 font-semibold text-blue-900 text-xs flex items-center justify-between">
                      <span>Detected Field Changes ({analysis.changedStaff.length} Personnel)</span>
                      <span className="text-[11px] font-normal text-blue-700">Existing records will be amended</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {analysis.changedStaff.map(item => (
                        <div key={item.original.id} className="p-2.5 flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {item.original.name}{' '}
                              <span className="font-mono text-slate-400 font-normal">
                                ({item.original.uNumber})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">{item.original.email}</div>
                          </div>
                          <div className="text-right space-y-1">
                            {item.changes.map(chg => (
                              <div key={chg.field} className="text-[11px]">
                                <span className="font-medium text-slate-700">{chg.fieldLabel}:</span>{' '}
                                <span className="line-through text-red-600 font-mono">
                                  {String(chg.from)}
                                </span>{' '}
                                <span className="text-emerald-700 font-bold font-mono">
                                  → {String(chg.to)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Staff List */}
                {analysis.newStaff.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 px-3 py-2 font-semibold text-emerald-900 text-xs flex items-center justify-between">
                      <span>New Personnel to Register ({analysis.newStaff.length} Staff)</span>
                      <span className="text-[11px] font-normal text-emerald-700">Will be appended to roster</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {analysis.newStaff.map(u => (
                        <div key={u.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {u.name} <span className="font-mono text-slate-400">({u.uNumber})</span>
                            </div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            {u.isAls ? 'ALS ' : ''}
                            {u.isLead ? 'Lead ' : ''}
                            {!u.isAls && !u.isLead ? 'ALL ' : ''}
                            {u.isAdmin ? '· Admin' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.changedStaff.length === 0 && analysis.newStaff.length === 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-600">
                    All {analysis.totalParsed} staff records in the import file match the current system exactly. No changes are required.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition"
          >
            Cancel
          </button>

          {analysis && (analysis.newStaff.length > 0 || analysis.changedStaff.length > 0) ? (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded transition shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importMode === 'all'
                  ? `Apply ${analysis.changedStaff.length} Changes & Add ${analysis.newStaff.length} New`
                  : importMode === 'changes_only'
                  ? `Apply ${analysis.changedStaff.length} Changes Only`
                  : `Add ${analysis.newStaff.length} New Staff Only`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
