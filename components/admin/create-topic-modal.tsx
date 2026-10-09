'use client';

import React, { useState, useMemo } from 'react';
import { Topic, TopicType, TargetGroup, User } from '@/lib/types';
import { X, Plus, Calendar, Link as LinkIcon, FileText, AlertCircle, Users, Search, Check } from 'lucide-react';

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
  const [publishedDate, setPublishedDate] = useState('2026-10-08');
  const [dueDate, setDueDate] = useState('2026-10-23'); // 15 days default for Document Read and Sign
  const [version, setVersion] = useState('v1.0');
  const [formError, setFormError] = useState('');

  const calculateDueDate = (t: TopicType, pubDate: string): string => {
    const d = new Date(pubDate);
    if (isNaN(d.getTime())) return pubDate;
    const days = (t === 'Document Read and Sign' || t === 'GPD/GPI Read and Sign' || t === 'AHD/AHI Read and Sign') ? 15 : 2;
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleTypeChange = (newType: TopicType) => {
    setType(newType);
    if (newType !== 'Others') setCustomTypeDesc('');
    setDueDate(calculateDueDate(newType, publishedDate));
  };

  const handlePublishedDateChange = (newPubDate: string) => {
    setPublishedDate(newPubDate);
    setDueDate(calculateDueDate(type, newPubDate));
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
              <label className="block font-semibold text-slate-800 mb-1">
                Published date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={publishedDate}
                onChange={e => handlePublishedDateChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                required
              />
              {publishedDate > '2026-10-08' ? (
                <div className="mt-1 text-[10px] text-purple-800 bg-purple-50 p-1.5 rounded border border-purple-200">
                  🗓️ <strong>Future Planned:</strong> Topic will be planned for {publishedDate} and will not appear in participants&apos; Total Assigned or Pending queues until that date.
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 mt-1">
                  Active publication date for this directive.
                </p>
              )}
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
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
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
        </form>
      </div>
    </div>
  );
}

