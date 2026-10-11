'use client';

import React, { useState, useMemo } from 'react';
import { Topic, TopicType, TargetGroup, User } from '@/lib/types';
import { getSystemDateString } from '@/lib/compliance-store';
import {
  X,
  Plus,
  Calendar,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  Users,
  Search,
  Check,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface CreateTopicModalProps {
  currentUserEmail: string;
  users: User[];
  onSaveTopic: (topic: Omit<Topic, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const TOPIC_TYPES: TopicType[] = [
  'Document Read and Sign',
  'GPD/GPI Read and Sign',
  'AHD/AHI Read and Sign',
  'Training',
  'Briefing',
  'Role Play',
  'Others',
];

export function CreateTopicModal({
  currentUserEmail,
  users,
  onSaveTopic,
  onClose,
}: CreateTopicModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TopicType>('Document Read and Sign');
  const [customTypeDesc, setCustomTypeDesc] = useState('');
  const [targetGroup, setTargetGroup] = useState<TargetGroup>('ALL');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [content, setContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Calculate system date as today for default published date and reference
  const todayStr = useMemo(() => getSystemDateString(), []);

  const calculateDueDate = (t: TopicType, pubDate: string): string => {
    const d = new Date(pubDate);
    if (isNaN(d.getTime())) return pubDate;
    const days =
      t === 'Document Read and Sign' || t === 'GPD/GPI Read and Sign' || t === 'AHD/AHI Read and Sign'
        ? 15
        : 2;
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [publishedDate, setPublishedDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(() =>
    calculateDueDate('Document Read and Sign', todayStr)
  );
  const [version, setVersion] = useState('v1.0');
  const [formError, setFormError] = useState('');

  // State for acknowledging past publication date alert
  const [hasAcknowledgedPastDate, setHasAcknowledgedPastDate] = useState(false);
  const [showPastDateAlertModal, setShowPastDateAlertModal] = useState(false);

  // Calculate whether published date is in the future, past, or today based on system date
  const isFuture = Boolean(publishedDate && publishedDate > todayStr);
  const isPast = Boolean(publishedDate && publishedDate < todayStr);
  const isToday = Boolean(publishedDate && publishedDate === todayStr);

  const daysDiff = useMemo(() => {
    if (!publishedDate) return 0;
    const pub = new Date(publishedDate + 'T00:00:00');
    const sys = new Date(todayStr + 'T00:00:00');
    const diffTime = pub.getTime() - sys.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }, [publishedDate, todayStr]);

  const handleTypeChange = (newType: TopicType) => {
    setType(newType);
    if (newType !== 'Others') setCustomTypeDesc('');
    setDueDate(calculateDueDate(newType, publishedDate));
  };

  const handlePublishedDateChange = (newPubDate: string) => {
    setPublishedDate(newPubDate);
    setDueDate(calculateDueDate(type, newPubDate));
    // Reset acknowledgment whenever date is changed
    setHasAcknowledgedPastDate(false);
    setFormError('');
  };

  // Filter roster for individual staff selection
  const filteredRosterStaff = useMemo(() => {
    if (!staffSearchQuery.trim()) return users;
    const q = staffSearchQuery.toLowerCase();
    return users.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.uNumber.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }, [users, staffSearchQuery]);

  const doSaveTopic = () => {
    onSaveTopic({
      title: title.trim(),
      type,
      customTypeDesc: type === 'Others' ? customTypeDesc.trim() : undefined,
      targetGroup,
      assignedUserIds: selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
      content: content.trim(),
      attachmentUrl: attachmentUrl.trim() || undefined,
      attachmentName: attachmentName.trim() || undefined,
      publishedDate,
      effectiveDate: publishedDate, // Synced for consistency
      dueDate,
      createdBy: currentUserEmail,
      version: version.trim() || 'v1.0',
    });

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please enter a Topic Name / Title.');
      return;
    }
    if (type === 'Others' && !customTypeDesc.trim()) {
      setFormError('Please specify the custom description for type "Others".');
      return;
    }
    if (!content.trim()) {
      setFormError('Please enter the content / operational instructions.');
      return;
    }
    if (!publishedDate || !dueDate) {
      setFormError('Please provide both Published Date and Due Date.');
      return;
    }
    if (targetGroup === 'CUSTOM' && selectedStaffIds.length === 0) {
      setFormError('Please select at least one individual staff member from the roster.');
      return;
    }

    // If published date is in the past, an alert must be acknowledged
    if (isPast && !hasAcknowledgedPastDate) {
      setShowPastDateAlertModal(true);
      setFormError(
        'Acknowledgment required: This topic has a published date in the past. Please review and acknowledge the alert before publishing.'
      );
      return;
    }

    doSaveTopic();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create New Compliance Topic</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue a mandatory Read &amp; Sign directive, briefing, or training for station personnel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Topic Title */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Topic Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. GPD/GPI 2026-12: Aircraft Pushback & Tug Operation Protocol"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              required
            />
          </div>

          {/* Row: Type & Target Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Type (Dropdown) <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value as TopicType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              >
                {TOPIC_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Target Group Category <span className="text-red-500">*</span>
              </label>
              <select
                value={targetGroup}
                onChange={e => setTargetGroup(e.target.value as TargetGroup)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              >
                <option value="ALL">ALL (Mandatory for every station staff - {users.length} members)</option>
                <option value="ALS">ALS (Only personnel marked ALS)</option>
                <option value="Lead">Lead (Only personnel marked Lead)</option>
                <option value="ALS_AND_LEAD">ALS and Lead together (ALS qualified &amp; Station Leads)</option>
                <option value="CUSTOM">Specific Individual Staff Members Only</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {targetGroup === 'ALL' && `All ${users.length} roster members must acknowledge.`}
                {targetGroup === 'ALS' && 'Only personnel with ALS qualification must acknowledge.'}
                {targetGroup === 'Lead' && 'Only Duty Leads / Station Leads must acknowledge.'}
                {targetGroup === 'ALS_AND_LEAD' && 'Both ALS qualified personnel and Station Leads must acknowledge.'}
                {targetGroup === 'CUSTOM' && 'Only the individual staff members selected below must acknowledge.'}
              </p>
            </div>
          </div>

          {/* Individual Staff Selection Widget */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                <Users className="w-3.5 h-3.5 text-[#0078D4]" />
                <span>Choose Individual Staff Members from Roster:</span>
                <span className="text-[11px] bg-blue-100 text-[#0078D4] px-1.5 py-0.2 rounded font-mono font-bold">
                  {selectedStaffIds.length} selected
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const alsIds = users.filter(u => u.isAls).map(u => u.id);
                    setSelectedStaffIds(Array.from(new Set([...selectedStaffIds, ...alsIds])));
                  }}
                  className="text-[#0078D4] hover:underline cursor-pointer font-medium"
                >
                  + Add All ALS
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    const leadIds = users.filter(u => u.isLead).map(u => u.id);
                    setSelectedStaffIds(Array.from(new Set([...selectedStaffIds, ...leadIds])));
                  }}
                  className="text-[#0078D4] hover:underline cursor-pointer font-medium"
                >
                  + Add All Leads
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    const alsAndLeadIds = users.filter(u => u.isAls || u.isLead).map(u => u.id);
                    setSelectedStaffIds(Array.from(new Set([...selectedStaffIds, ...alsAndLeadIds])));
                  }}
                  className="text-purple-700 hover:underline cursor-pointer font-medium"
                >
                  + Add All ALS &amp; Leads
                </button>
                {selectedStaffIds.length > 0 && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffIds([])}
                      className="text-red-600 hover:underline cursor-pointer font-medium"
                    >
                      Clear Selection
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              {targetGroup === 'CUSTOM'
                ? 'Since Target Group is set to specific staff, this topic will show up in assigned topics ONLY for checked staff.'
                : targetGroup === 'ALS_AND_LEAD'
                ? 'This topic will show up for all ALS and Lead personnel, plus any additionally checked staff below.'
                : 'You can check individual staff to assign this topic specifically, or supplement the chosen group.'}
            </p>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search staff by name, U-number, or email..."
                value={staffSearchQuery}
                onChange={e => setStaffSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              />
            </div>

            {/* Scrollable list */}
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded bg-white">
              {filteredRosterStaff.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs">No staff found matching search.</div>
              ) : (
                filteredRosterStaff.map(u => {
                  const isSelected = selectedStaffIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 hover:bg-blue-50/50 cursor-pointer text-xs transition ${
                        isSelected ? 'bg-blue-50/80 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedStaffIds(selectedStaffIds.filter(id => id !== u.id));
                            } else {
                              setSelectedStaffIds([...selectedStaffIds, u.id]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-[#0078D4] focus:ring-[#0078D4]"
                        />
                        <span className="text-slate-900 font-semibold">{u.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">({u.uNumber})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {u.isAls && <span className="bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold">ALS</span>}
                        {u.isLead && <span className="bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-semibold">Lead</span>}
                        <span className="text-slate-400 truncate max-w-[140px]">{u.email}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Conditional field for type "Others" */}
          {type === 'Others' && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
              <label className="block font-semibold text-amber-900 mb-1">
                Others: Custom Free-Text Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customTypeDesc}
                onChange={e => setCustomTypeDesc(e.target.value)}
                placeholder="e.g. Special Cargo Screening Protocol, CISF Security Guideline"
                className="w-full px-3 py-2 text-xs border border-amber-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                required={type === 'Others'}
              />
            </div>
          )}

          {/* Row: Dates & Version */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-800">
                  Published date <span className="text-red-500">*</span>
                </label>
                {isToday && (
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Today (System)
                  </span>
                )}
                {isFuture && (
                  <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                    Future (+{daysDiff}d)
                  </span>
                )}
                {isPast && (
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                    ⚠️ Past (-{Math.abs(daysDiff)}d)
                  </span>
                )}
              </div>
              <input
                type="date"
                value={publishedDate}
                onChange={e => handlePublishedDateChange(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 ${
                  isPast
                    ? 'border-amber-400 bg-amber-50/30 focus:ring-amber-500'
                    : 'border-slate-300 focus:ring-[#0078D4]'
                }`}
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                System Date: <span className="font-mono font-medium">{todayStr}</span>
              </p>
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Mandatory Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {type === 'Document Read and Sign' || type === 'GPD/GPI Read and Sign' || type === 'AHD/AHI Read and Sign'
                  ? 'Auto set to 15 days from published date (Read & Sign).'
                  : 'Auto set to 2 days from published date (Training/Briefing/Role Play/Others).'}
              </p>
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Version Tag
              </label>
              <input
                type="text"
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="v1.0"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              />
            </div>
          </div>

          {/* Dynamic Date Notice or Past Alert */}
          {isFuture && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs">🗓️ Future Planned Directive</div>
                <p className="text-[11px] text-purple-800 mt-0.5 leading-normal">
                  Topic is scheduled for future release on <strong>{publishedDate}</strong> ({daysDiff} {daysDiff === 1 ? 'day' : 'days'} in the future from system date <strong>{todayStr}</strong>).
                  It will remain scheduled and will not appear in participants&apos; active or pending queues until {publishedDate}.
                </p>
              </div>
            </div>
          )}

          {isPast && (
            <div className="p-3.5 bg-amber-50/90 border-2 border-amber-400 rounded-lg text-amber-950 space-y-2.5 shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-200 border border-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-800" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-amber-900">
                      ⚠️ Alert: Published Date is in the Past (Backdated Topic)
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                      {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'day' : 'days'} before system date
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 leading-normal">
                    The chosen publication date (<strong>{publishedDate}</strong>) is earlier than today&apos;s system date (<strong>{todayStr}</strong>).
                    Publishing a directive with a past published date impacts station compliance workflows:
                  </p>
                  <ul className="text-[10px] text-amber-800 list-disc list-inside mt-1.5 space-y-0.5 leading-relaxed">
                    <li>
                      <strong>Immediate Visibility:</strong> Topic will become immediately active and visible in assigned staff compliance dashboards.
                    </li>
                    <li>
                      <strong>Due Date Timeline:</strong> Mandatory due date is calculated as <strong>{dueDate}</strong>. If already past or imminent, staff compliance will immediately register as overdue.
                    </li>
                    <li>
                      <strong>Audit Trail:</strong> Both the backdated publication date ({publishedDate}) and the system creation timestamp ({todayStr}) will be recorded.
                    </li>
                  </ul>
                </div>
              </div>

              {/* In-form Acknowledgment Checkbox */}
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition ${
                  hasAcknowledgedPastDate
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium'
                    : 'bg-amber-100 border-amber-400 text-amber-950 font-medium hover:bg-amber-100/90'
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasAcknowledgedPastDate}
                  onChange={e => {
                    setHasAcknowledgedPastDate(e.target.checked);
                    if (e.target.checked) setFormError('');
                  }}
                  className="w-4 h-4 mt-0.5 rounded text-amber-700 focus:ring-amber-500 cursor-pointer shrink-0"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold">Mandatory Acknowledgment:</span> I acknowledge that this topic has a published date in the past ({publishedDate}) and confirm backdating this compliance directive.
                </div>
              </label>
            </div>
          )}

          {/* Content / Instructions */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Content / Description / Directives <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Provide full text or executive instructions that staff must read, comprehend, and acknowledge..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4] leading-relaxed"
              required
            />
          </div>

          {/* Attachment Link / Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Attachment URL or Document Link (Optional)
              </label>
              <input
                type="url"
                value={attachmentUrl}
                onChange={e => setAttachmentUrl(e.target.value)}
                placeholder="https://operations.dlh.de/docs/directive.pdf"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Attachment File Label (Optional)
              </label>
              <input
                type="text"
                value={attachmentName}
                onChange={e => setAttachmentName(e.target.value)}
                placeholder="e.g. Ramp-Operating-Handbook-2026.pdf"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Topic &amp; staff assignments will be saved to Firestore</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Topic</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Past Publication Date Alert Dialog */}
      {showPastDateAlertModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-amber-400 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Past Publication Date Alert</h3>
                <p className="text-[11px] text-amber-800 font-medium">Acknowledgment Required to Proceed</p>
              </div>
            </div>

            <div className="p-5 text-xs text-slate-700 space-y-3">
              <p className="leading-relaxed">
                You are publishing <strong className="text-slate-900">&quot;{title.trim() || 'Untitled Topic'}&quot;</strong> with a publication date of{' '}
                <strong className="text-amber-900 font-mono">{publishedDate}</strong>, which is{' '}
                <strong className="text-amber-900">{Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'day' : 'days'} in the past</strong>{' '}
                compared to today&apos;s system date (<span className="font-mono text-slate-800">{todayStr}</span>).
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">System Date (Today):</span>
                  <span className="font-mono font-semibold text-slate-900">{todayStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Published Date:</span>
                  <span className="font-mono font-bold text-amber-800">{publishedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calculated Due Date:</span>
                  <span className="font-mono font-semibold text-slate-900">{dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Compliance Status:</span>
                  <span className="font-semibold text-amber-700">{Math.abs(daysDiff)} days backdated</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-normal">
                Publishing a backdated topic makes it active immediately and may affect staff compliance records and overdue timelines.
                Please acknowledge to confirm publication.
              </p>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPastDateAlertModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition cursor-pointer"
              >
                Change Date
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasAcknowledgedPastDate(true);
                  setShowPastDateAlertModal(false);
                  setFormError('');
                  doSaveTopic();
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Acknowledge &amp; Publish Topic</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

