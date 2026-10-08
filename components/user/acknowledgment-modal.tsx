'use client';

import React, { useState } from 'react';
import { Topic, User, TopicConfirmation } from '@/lib/types';
import {
  FileText,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  X,
  FileCheck2,
  Info,
  AlertTriangle
} from 'lucide-react';

interface AcknowledgmentModalProps {
  topic: Topic;
  currentUser: User;
  existingConfirmation?: TopicConfirmation;
  onConfirm: (topicId: string, signatureText: string, lateReason?: string) => void;
  onClose: () => void;
}

export function AcknowledgmentModal({
  topic,
  currentUser,
  existingConfirmation,
  onConfirm,
  onClose,
}: AcknowledgmentModalProps) {
  const isPastDeadline = topic.dueDate < '2026-10-07';
  const isPendingLate = existingConfirmation?.status === 'pending_late_approval';
  const isRejected = existingConfirmation?.status === 'rejected';

  // Check if re-sign is required due to document version update
  const isVersionMismatch =
    !!existingConfirmation &&
    existingConfirmation.status === 'confirmed' &&
    !!topic.version &&
    !!existingConfirmation.documentVersion &&
    existingConfirmation.documentVersion !== topic.version;

  const isAlreadyConfirmed = !!existingConfirmation && existingConfirmation.status === 'confirmed' && !isVersionMismatch;

  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [lateReason, setLateReason] = useState(existingConfirmation?.lateReason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<string | null>(
    isAlreadyConfirmed ? existingConfirmation.id : null
  );

  const isParticipationType =
    topic.type === 'Training' || topic.type === 'Briefing' || topic.type === 'Role Play';

  const actionButtonText = isVersionMismatch
    ? 'Acknowledge Updated Version (Re-sign)'
    : isPastDeadline
    ? 'Submit Late Response for Admin Review'
    : isParticipationType
    ? 'Confirm Participation & Understanding'
    : 'Read and Sign Directive';

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreedTerms) return;
    if (isPastDeadline && !lateReason.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onConfirm(topic.id, currentUser.name, isPastDeadline ? lateReason.trim() : undefined);
      setSuccessReceipt(`ACK-${Date.now().toString(36).toUpperCase()}`);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="pr-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">{topic.type}</span>
              {topic.customTypeDesc && <span>({topic.customTypeDesc})</span>}
              <span aria-hidden="true">·</span>
              <span>Target: <strong className="text-slate-800">{topic.targetGroup}</strong></span>
              {topic.version && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-600">{topic.version}</span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {topic.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Metadata timeline bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500 text-[11px]">Effective Date</div>
              <div className="font-medium text-slate-800 tabular-nums">{topic.effectiveDate}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px]">Mandatory Due Date</div>
              <div className="font-medium text-amber-700 tabular-nums">{topic.dueDate}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-slate-500 text-[11px]">Issuing Officer</div>
              <div className="font-medium text-slate-800 truncate">{topic.createdBy}</div>
            </div>
          </div>

          {/* Topic Operational Content */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operational Instructions & Full Content
            </h3>
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-line text-sm max-h-60 overflow-y-auto font-sans">
              {topic.content}
            </div>
          </div>

          {/* Attachment Reference if any */}
          {topic.attachmentUrl && (
            <div className="p-3 border border-blue-100 bg-blue-50/50 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0078D4]" />
                <span className="font-medium text-slate-800">
                  {topic.attachmentName || 'Referenced Compliance Document (PDF)'}
                </span>
              </div>
              <a
                href={topic.attachmentUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[#0078D4] hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Open Resource</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* If already confirmed: show confirmation badge & receipt details */}
          {(isAlreadyConfirmed || successReceipt) && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Compliance Verified & Signed</span>
              </div>
              <p className="text-xs text-emerald-700">
                You have confirmed acknowledgment and understanding of this topic under your Microsoft 365
                authenticated identity.
              </p>
              <div className="pt-2 border-t border-emerald-200 grid grid-cols-2 gap-2 text-xs text-emerald-900">
                <div>
                  <span className="text-emerald-700 block text-[11px]">Staff Name:</span>
                  <span className="font-medium">{currentUser.name} ({currentUser.uNumber})</span>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[11px]">Confirmation Timestamp:</span>
                  <span className="font-mono tabular-nums">
                    {existingConfirmation?.confirmedAt || new Date().toISOString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form for Acknowledgment & Signing (if not already confirmed) */}
          {!isAlreadyConfirmed && !successReceipt && (
            <form onSubmit={handleSignSubmit} className="space-y-4 pt-2 border-t border-slate-200">
              {/* If deadline passed, require late reason */}
              {isPastDeadline && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Deadline Passed ({topic.dueDate}): Late Submission Justification Required</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    The mandatory due date for this directive has passed. You may still respond and confirm, but you must provide a reason for the late response. This will be submitted to the station administrator for review and approval.
                  </p>
                  <textarea
                    rows={3}
                    value={lateReason}
                    onChange={e => setLateReason(e.target.value)}
                    placeholder="Enter reason for missing deadline (e.g. on leave, operational delay, sickness)..."
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              )}

              {isPendingLate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                  <strong className="block font-semibold">Late Response Pending Admin Review</strong>
                  <span>Your late response and reason (&ldquo;{existingConfirmation?.lateReason}&rdquo;) have been submitted and are awaiting review by the administrator.</span>
                </div>
              )}

              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasAgreedTerms}
                    onChange={e => setHasAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#0078D4] rounded border-slate-300 focus:ring-[#0078D4]"
                    required
                  />
                  <div className="text-xs text-slate-800 leading-normal">
                    <span className="font-semibold text-slate-900">
                      Acknowledgment Declaration:
                    </span>{' '}
                    I hereby confirm that I have accessed, reviewed, and fully understood the contents of this{' '}
                    <strong>{topic.type}</strong> ({topic.title}) - Version {topic.version || '1.0'}. I acknowledge my responsibility to comply with
                    these directives during station duty.
                  </div>
                </label>
              </div>

              {/* Locked Read-Only Identity Fields (Requirement 10 & 11: Non-editable identity) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Signatory Legal Identity (Server-Verified)
                  </label>
                  <div className="px-3 py-2 text-xs bg-white border border-slate-200 rounded font-medium text-slate-900">
                    {currentUser.name}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Staff ID & Permanent Registered Email
                  </label>
                  <div className="px-3 py-2 text-xs bg-white border border-slate-200 rounded text-slate-700 font-mono">
                    {currentUser.uNumber} · {currentUser.email}
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Identity permanently bound from authenticated server session. Field editing disabled.</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition"
                >
                  Exit / Review Later
                </button>

                <button
                  type="submit"
                  disabled={!hasAgreedTerms || isSubmitting}
                  className={`px-5 py-2 text-xs font-medium text-white rounded transition shadow-sm flex items-center gap-2 ${
                    hasAgreedTerms && !isSubmitting
                      ? 'bg-[#0078D4] hover:bg-[#106EBE]'
                      : 'bg-slate-300 cursor-not-allowed text-slate-500'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Recording Signature...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>{actionButtonText}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer if already confirmed or success */}
        {(isAlreadyConfirmed || successReceipt) && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Receipt verified under organizational Entra ID audit log.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition"
            >
              Exit to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
