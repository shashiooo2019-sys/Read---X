'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, Database, X, ShieldCheck, ArrowRight, Layers, ExternalLink } from 'lucide-react';
import { WBT_TEAMS_UPLOAD_URL } from '@/lib/types';

export interface FirestoreConfirmationDetails {
  title: string;
  recordType: 'acknowledgment' | 'topic_created' | 'topic_deleted' | 'roster_sync' | 'admin_review' | 'topic_closed' | 'topic_reopened';
  topicTitle?: string;
  userName?: string;
  uNumber?: string;
  assignedCount?: number;
  collections: string[];
  timestamp?: string;
  statusText?: string;
}

interface FirestoreSaveModalProps {
  confirmation: FirestoreConfirmationDetails | null;
  onClose: () => void;
}

export function FirestoreSaveModal({ confirmation, onClose }: FirestoreSaveModalProps) {
  const isWbt = confirmation
    ? Boolean(confirmation.title.includes('WBT') || (confirmation.statusText && confirmation.statusText.includes('Teams')))
    : false;

  const [timeLeft, setTimeLeft] = useState(isWbt ? 15 : 6);
  const onCloseRef = React.useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Countdown timer: safely trigger onCloseRef in useEffect when timer reaches 0
  useEffect(() => {
    if (!confirmation) return;

    if (timeLeft <= 0) {
      onCloseRef.current();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [confirmation, timeLeft]);

  if (!confirmation) return null;

  const isAck = confirmation.recordType === 'acknowledgment';
  const isTopic = confirmation.recordType === 'topic_created';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header gradient banner */}
        <div className={`p-5 text-white flex items-start justify-between ${
          isWbt
            ? 'bg-linear-to-r from-blue-700 via-indigo-600 to-[#0078D4]'
            : 'bg-linear-to-r from-emerald-600 via-teal-600 to-[#0078D4]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
              <Cloud className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">
                  {isWbt ? 'WBT Acknowledgment Logged' : 'Saved to Firestore'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {isWbt ? 'Action Required' : 'Cloud Live'}
                </span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                {isWbt
                  ? 'Directive acknowledgment logged · Certificate verification pending'
                  : 'Data committed directly to Firestore database · Zero browser storage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Close confirmation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Main Success Banner */}
          <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${
            isWbt
              ? 'bg-blue-50/90 border-blue-200'
              : 'bg-emerald-50/80 border-emerald-200'
          }`}>
            <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${isWbt ? 'text-blue-600' : 'text-emerald-600'}`} />
            <div className="space-y-1">
              <h4 className={`font-bold text-sm ${isWbt ? 'text-blue-950' : 'text-emerald-950'}`}>
                {confirmation.title}
              </h4>
              <p className={`text-xs leading-relaxed ${isWbt ? 'text-blue-900' : 'text-emerald-800'}`}>
                {confirmation.statusText || (
                  isAck
                    ? 'Your read & sign acknowledgment and digital signature were permanently recorded in Firestore.'
                    : isTopic
                    ? `The topic directive and all assignments for ${confirmation.assignedCount || 1} staff member(s) were stored in Firestore.`
                    : 'Your updates have been permanently committed to Cloud Firestore.'
                )}
              </p>
            </div>
          </div>

          {/* WBT Teams Upload Notice & Link */}
          {isWbt && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                  <span>Mandatory Certificate Upload via Teams / SharePoint</span>
                </span>
                <span className="text-[10px] font-semibold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                  Step 2 of 2
                </span>
              </div>
              <p className="text-indigo-900 text-xs leading-relaxed">
                Please upload your certificate of participation to the dedicated <strong>Teams &amp; SharePoint &quot;Upload Certificates here&quot;</strong> folder immediately. The SuperAdmin will inspect your certificate in this folder to complete your verification and confirmation.
              </p>
              <div className="pt-1.5">
                <a
                  href={WBT_TEAMS_UPLOAD_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4f52b2] hover:bg-[#44469b] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer group"
                >
                  <span>Open Teams / SharePoint Upload Folder</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          )}

          {/* Details Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-150 space-y-2 text-xs">
            {confirmation.topicTitle && (
              <div className="flex justify-between items-center py-1.5 first:pt-0">
                <span className="text-slate-500 font-medium">Topic / Directive:</span>
                <span className="text-slate-900 font-semibold text-right max-w-[260px] truncate" title={confirmation.topicTitle}>
                  {confirmation.topicTitle}
                </span>
              </div>
            )}

            {confirmation.userName && (
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">Staff Member:</span>
                <span className="text-slate-900 font-semibold">
                  {confirmation.userName} {confirmation.uNumber ? `(${confirmation.uNumber})` : ''}
                </span>
              </div>
            )}

            {confirmation.assignedCount !== undefined && (
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">Staff Assigned:</span>
                <span className="text-blue-700 font-bold">
                  {confirmation.assignedCount} Personnel
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Firestore Database:</span>
              <span className="text-slate-800 font-mono text-[10px] bg-slate-200/60 px-2 py-0.5 rounded border border-slate-200 font-medium truncate max-w-[240px]" title="ai-studio-readsigncomplian-4208e69d-667a-430c-961f-7e6d635d1298">
                ai-studio-readsigncomplian...
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Target Collection(s):</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {confirmation.collections.map(col => (
                  <span
                    key={col}
                    className="px-2 py-0.5 bg-blue-100 text-[#0078D4] rounded font-mono text-[11px] font-semibold"
                  >
                    /{col}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Recorded At:</span>
              <span className="text-slate-700 font-mono tabular-nums text-[11px]">
                {confirmation.timestamp || new Date().toISOString()}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 last:pb-0">
              <span className="text-slate-500 font-medium">Sync State:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Committed & Verified in Cloud Firestore
              </span>
            </div>
          </div>

          {/* Footer with Auto-dismiss */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-150">
            <span className="text-[11px] text-slate-400">
              Auto-dismissing in {timeLeft}s...
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Done</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FirestoreLiveToast({
  lastUpdate,
  onDismiss,
}: {
  lastUpdate: { title: string; collections: string[]; timestamp: string } | null;
  onDismiss: () => void;
}) {
  if (!lastUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-300">
      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white tracking-tight">Firebase Updated</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase">Live</span>
        </div>
        <p className="text-slate-300 text-[11px] mt-0.5 truncate font-medium">
          {lastUpdate.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
          <span>Synced:</span>
          <span className="font-mono text-emerald-400">{lastUpdate.collections.map(c => `/${c}`).join(' ')}</span>
          <span>·</span>
          <span className="tabular-nums font-mono">{lastUpdate.timestamp.slice(11, 19)} UTC</span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
        aria-label="Dismiss toast"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

