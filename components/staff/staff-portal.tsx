'use client';

import React, { useState } from 'react';
import { User, Topic, TopicConfirmation, WBT_TEAMS_UPLOAD_URL } from '@/lib/types';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Send,
  Building,
  Users,
  Search,
  Filter,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  UploadCloud,
  FileCheck2,
  XCircle,
} from 'lucide-react';

import { AppBanner } from '@/components/common/app-banner';
import { isUserAssignedToTopic, isTopicFuturePlanned } from '@/lib/compliance-store';

interface StaffPortalProps {
  currentUser: User;
  topics: Topic[];
  confirmations: TopicConfirmation[];
  onConfirmTopic: (
    topicId: string,
    isLate: boolean,
    lateReason?: string,
    wbtDetails?: { certificateFileName?: string; notes?: string }
  ) => Promise<void>;
  onLogout: () => void;
}

export function StaffPortal({
  currentUser,
  topics,
  confirmations,
  onConfirmTopic,
  onLogout,
}: StaffPortalProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [lateReason, setLateReason] = useState<string>('');
  const [wbtFileName, setWbtFileName] = useState<string>('');
  const [wbtNotes, setWbtNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');


  // Filter topics assigned to this user
  const userAssignedTopics = topics.filter((t) => isUserAssignedToTopic(currentUser, t));

  const userConfirmationsMap = new Map<string, TopicConfirmation>(
    confirmations
      .filter((c) => c.userId === currentUser.id || c.userEmail?.toLowerCase() === currentUser.email?.toLowerCase())
      .map((c) => [c.topicId, c])
  );

  const filteredTopics = userAssignedTopics.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchType = t.type.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchType) return false;
    }

    const conf = userConfirmationsMap.get(t.id);
    const isSigned = conf && (conf.status === 'confirmed' || conf.status === 'not_participated');

    if (filterTab === 'pending' && isSigned) return false;
    if (filterTab === 'completed' && !isSigned) return false;

    return true;
  });

  // Calculate user compliance metrics
  const totalAssigned = userAssignedTopics.length;
  const completedCount = userAssignedTopics.filter((t) => {
    const conf = userConfirmationsMap.get(t.id);
    return conf && (conf.status === 'confirmed' || conf.status === 'not_participated');
  }).length;
  const pendingCount = Math.max(0, totalAssigned - completedCount);
  const compliancePercentage = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 100;

  const handleSignOff = async (topic: Topic) => {
    setIsSubmitting(true);
    const isLate = topic.dueDate ? new Date() > new Date(topic.dueDate) : false;
    const isWbt = topic.type === 'WBT' || topic.type === 'Web-Based Training';

    try {
      await onConfirmTopic(
        topic.id,
        isLate,
        isLate ? lateReason : undefined,
        isWbt
          ? {
              certificateFileName: wbtFileName || `${currentUser.name.replace(/\s+/g, '_')}_WBT_Certificate.pdf`,
              notes: wbtNotes || 'Certificate uploaded to Microsoft Teams WBT Folder',
            }
          : undefined
      );
      setSelectedTopic(null);
      setLateReason('');
      setWbtFileName('');
      setWbtNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Read X Compliance Banner */}
      <AppBanner />
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Staff Roster Member</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Ground Operations Compliance Portal. Review assigned mandatory directives, WBT modules, and safety briefings to maintain 100% operational compliance.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              {currentUser.team || 'Ground Operations'}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              {currentUser.department || 'Operations'}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 font-mono text-slate-300">
              {currentUser.email}
            </span>
          </div>
        </div>

        {/* Compliance Score Widget */}
        <div className="w-full md:w-auto shrink-0 bg-slate-800/90 backdrop-blur-md rounded-2xl p-5 border border-slate-700 space-y-3 min-w-[240px] text-center relative z-10">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Compliance Score</p>
          <div className="text-4xl font-black text-emerald-400 tracking-tight">
            {compliancePercentage}%
          </div>
          <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${compliancePercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {completedCount} of {totalAssigned} Directives Verified
          </p>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Directives</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalAssigned}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Sign-off / WBT</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Signed &amp; Confirmed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Directives Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Directives ({topics.length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Signed ({completedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search directives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Directives List */}
      <div className="space-y-4">
        {filteredTopics.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">No Directives Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {filterTab === 'pending'
                ? 'Great job! You have no pending compliance directives or WBT modules to sign.'
                : 'No compliance topics match your current filter criteria.'}
            </p>
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const conf = userConfirmationsMap.get(topic.id);
            const isConfirmed = conf && conf.status === 'confirmed';
            const isPendingWbt = conf && conf.status === 'pending_wbt_verification';
            const isRejected = conf && conf.status === 'rejected';
            const isSigned = isConfirmed || conf?.status === 'not_participated';
            const isOverdue = topic.dueDate && new Date() > new Date(topic.dueDate) && !isSigned && !isPendingWbt;
            const isWbtTopic = topic.type === 'WBT' || topic.type === 'Web-Based Training';

            return (
              <div
                key={topic.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                  isConfirmed
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isPendingWbt
                    ? 'border-indigo-200 bg-indigo-50/20'
                    : isRejected
                    ? 'border-rose-200 bg-rose-50/20'
                    : isOverdue
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isWbtTopic ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {topic.type}
                    </span>
                    {isTopicFuturePlanned(topic) && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-700" />
                        Future Planned Topic
                      </span>
                    )}
                    {topic.isClosed && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Closed for Ack
                      </span>
                    )}

                    {isConfirmed ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Signed &amp; Verified
                      </span>
                    ) : isPendingWbt ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1 border border-indigo-200">
                        <FileCheck2 className="w-3 h-3 text-indigo-600 animate-pulse" />
                        Awaiting SuperAdmin WBT Verification
                      </span>
                    ) : isRejected ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        WBT Rejected (Re-upload required)
                      </span>
                    ) : isOverdue ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-600" />
                        Overdue Sign-off
                      </span>
                    ) : !isTopicFuturePlanned(topic) && !topic.isClosed && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Sign-off
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{topic.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {topic.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    {topic.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Due Date: <strong className="text-slate-700">{topic.dueDate}</strong>
                      </span>
                    )}
                    <span>Issued By: {topic.createdBy}</span>
                  </div>

                  {/* Pending WBT Note for Staff */}
                  {isPendingWbt && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                        <UploadCloud className="w-4 h-4 text-indigo-600" />
                        <span>WBT Certificate Uploaded to Microsoft Teams</span>
                      </p>
                      <p className="text-[11px] text-indigo-800">
                        Certificate: <strong>{conf?.wbtCertificateFileName || 'WBT Certificate'}</strong> &bull; Submitted on {new Date(conf.confirmedAt).toLocaleDateString()}. Pending final verification by Super Admin.
                      </p>
                    </div>
                  )}

                  {/* WBT Rejection Note */}
                  {isRejected && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                      <p className="font-bold text-rose-950">SuperAdmin Rejection Remark:</p>
                      <p className="text-[11px] text-rose-800">&ldquo;{conf?.wbtNotes || 'Please check your certificate file in Microsoft Teams and re-submit.'}&rdquo;</p>
                    </div>
                  )}
                </div>

                <div className="w-full md:w-auto shrink-0 flex items-center gap-3">
                  {isConfirmed ? (
                    <div className="px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified on {conf?.verifiedAt ? new Date(conf.verifiedAt).toLocaleDateString() : 'Record'}</span>
                    </div>
                  ) : isPendingWbt ? (
                    <div className="px-4 py-2.5 bg-indigo-100 text-indigo-900 rounded-xl text-xs font-bold flex items-center gap-2 border border-indigo-200">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Verification Pending</span>
                    </div>
                  ) : topic.isClosed || isTopicFuturePlanned(topic) ? (
                    <div className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200">
                      <span>{topic.isClosed ? 'Closed for Ack' : 'Future Planned'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedTopic(topic);
                        if (isWbtTopic) {
                          setWbtFileName(`${currentUser.name.replace(/\s+/g, '_')}_WBT_Certificate.pdf`);
                        }
                      }}
                      className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{isWbtTopic ? 'Upload WBT Certificate & Sign' : 'Read & Sign Document'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Read & Sign / WBT Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 space-y-0">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    {selectedTopic.type}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1 leading-tight">{selectedTopic.title}</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
                <p className="font-semibold text-slate-900">Directive Overview:</p>
                <p>{selectedTopic.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Instructions &amp; Requirements</h4>
                <div className="p-5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed space-y-3 font-sans whitespace-pre-wrap shadow-inner">
                  {selectedTopic.content || 'Please complete the assigned module and submit your acknowledgment.'}
                </div>
              </div>

              {/* WBT Specific Teams Upload Section */}
              {(selectedTopic.type === 'WBT' || selectedTopic.type === 'Web-Based Training') && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50/70 border border-purple-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <UploadCloud className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-purple-950">
                        Microsoft Teams Certificate Upload Required
                      </p>
                      <p className="text-xs text-purple-800 mt-0.5 leading-relaxed">
                        This topic requires a Web-Based Training (WBT) completion certificate. Please upload your certificate PDF to the <strong>Microsoft Teams / SharePoint</strong> folder, then confirm your upload below.
                      </p>
                    </div>
                  </div>

                  <a
                    href={WBT_TEAMS_UPLOAD_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4f52b2] hover:bg-[#44469b] text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Open Microsoft Teams / SharePoint WBT Folder</span>
                    <ExternalLink className="w-3.5 h-3.5 text-purple-200" />
                  </a>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider mb-1">
                        Certificate File Name in Teams
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Marcus_Vance_GroundSafety_Deicing_WBT_2026.pdf"
                        value={wbtFileName}
                        onChange={(e) => setWbtFileName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider mb-1">
                        Submission Remarks / Folder Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Uploaded to Teams WBT-Certificates channel folder on Oct 14"
                        value={wbtNotes}
                        onChange={(e) => setWbtNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Late Reason Section */}
              {selectedTopic.dueDate && new Date() > new Date(selectedTopic.dueDate) && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Late Submission Notice</span>
                  </div>
                  <p className="text-amber-700">
                    The due date ({selectedTopic.dueDate}) has passed. Please state the operational reason for late sign-off:
                  </p>
                  <textarea
                    value={lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                    placeholder="e.g., Shift conflict / Training module access delay"
                    className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    rows={2}
                  />
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  By clicking <strong>&quot;Submit Sign-off to Cloud&quot;</strong>, your response will be saved in live Cloud Firestore under roster email <strong>{currentUser.email}</strong>. WBT submissions will enter SuperAdmin verification queue.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
              <button
                onClick={() => setSelectedTopic(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleSignOff(selectedTopic)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Submitting to Cloud...'
                    : selectedTopic.type === 'WBT' || selectedTopic.type === 'Web-Based Training'
                    ? 'Submit WBT Certificate & Acknowledge'
                    : 'Confirm & Sign Directive'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
