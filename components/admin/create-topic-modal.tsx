'use client';

import React, { useState } from 'react';
import { Topic, TopicType, TargetGroup } from '@/lib/types';
import { X, Plus, Calendar, Link as LinkIcon, FileText, AlertCircle } from 'lucide-react';

interface CreateTopicModalProps {
  currentUserEmail: string;
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
  onSaveTopic,
  onClose,
}: CreateTopicModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TopicType>('Document Read and Sign');
  const [customTypeDesc, setCustomTypeDesc] = useState('');
  const [targetGroup, setTargetGroup] = useState<TargetGroup>('ALL');
  const [content, setContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('2026-10-08');
  const [dueDate, setDueDate] = useState('2026-10-22');
  const [version, setVersion] = useState('v1.0');
  const [formError, setFormError] = useState('');

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
    if (!effectiveDate || !dueDate) {
      setFormError('Please provide both Effective Date and Due Date.');
      return;
    }

    onSaveTopic({
      title: title.trim(),
      type,
      customTypeDesc: type === 'Others' ? customTypeDesc.trim() : undefined,
      targetGroup,
      content: content.trim(),
      attachmentUrl: attachmentUrl.trim() || undefined,
      attachmentName: attachmentName.trim() || undefined,
      effectiveDate,
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
              Issue a mandatory Read & Sign directive, briefing, or training for station personnel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition"
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
                onChange={e => setType(e.target.value as TopicType)}
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
                <option value="ALL">ALL (Mandatory for every station staff)</option>
                <option value="ALS">ALS (Only personnel marked ALS)</option>
                <option value="Lead">Lead (Only personnel marked Lead)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {targetGroup === 'ALL' && 'All 132 roster members must acknowledge.'}
                {targetGroup === 'ALS' && 'Only personnel with ALS qualification must acknowledge.'}
                {targetGroup === 'Lead' && 'Only Duty Leads / Station Leads must acknowledge.'}
              </p>
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
                Effective Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                required
              />
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
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded transition shadow-sm flex items-center gap-1.5"
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
