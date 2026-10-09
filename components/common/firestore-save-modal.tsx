'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, Database, X, ShieldCheck, ArrowRight, Layers } from 'lucide-react';

export interface FirestoreConfirmationDetails {
  title: string;
  recordType: 'acknowledgment' | 'topic_created' | 'topic_deleted' | 'roster_sync' | 'admin_review' | 'topic_closed';
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
  const [timeLeft, setTimeLeft] = useState(6);

  useEffect(() => {
    if (!confirmation) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 6;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [confirmation, onClose]);

  if (!confirmation) return null;

  const isAck = confirmation.recordType === 'acknowledgment';
  const isTopic = confirmation.recordType === 'topic_created';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header gradient banner */}
        <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-[#0078D4] p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
              <Cloud className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">Saved to Firestore</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Cloud Live
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Data committed directly to Firestore database · Zero browser storage
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
          <div className="flex items-start gap-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-950 text-sm">
                {confirmation.title}
              </h4>
              <p className="text-emerald-800 text-xs leading-relaxed">
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
              <span className="text-slate-500 font-medium">Browser Storage:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Bypassed (Zero saved in browser)
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
