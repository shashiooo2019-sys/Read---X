'use client';

import React, { useState } from 'react';
import { Topic, TopicType, TargetGroup, User } from '@/lib/types';
import { X, FileText, Users, Calendar, Sparkles } from 'lucide-react';
import { SelectStaffModal } from './select-staff-modal';

interface CreateTopicModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onCreate?: (topic: Omit<Topic, 'id' | 'createdAt'>) => void;
  onSaveTopic?: (topic: Omit<Topic, 'id' | 'createdAt'>) => void;
  currentUserEmail?: string;
  users?: User[];
  topicToEdit?: Topic;
}

const TOPIC_TYPES: TopicType[] = [
  'WBT',
  'Web-Based Training',
  'Document Read and Sign',
  'GPD/GPI Read and Sign',
  'AHD/AHI Read and Sign',
  'Training',
  'Briefing',
  'Role Play',
  'Teams Calls',
  'Ground Ops Community Calls',
  'Vitero Sessions',
  'Others',
];

const TARGET_GROUPS: { label: string; value: TargetGroup }[] = [
  { label: 'All Staff', value: 'All' },
  { label: 'ALS Qualified', value: 'ALS' },
  { label: 'Station Leads', value: 'Lead' },
  { label: 'ALS & Station Leads', value: 'ALS_AND_LEAD' },
  { label: 'By Team', value: 'Team' },
  { label: 'By Department', value: 'Department' },
  { label: 'Individual Staff (Custom)', value: 'CUSTOM' },
];

export function CreateTopicModal({
  isOpen = true,
  onClose,
  onCreate,
  onSaveTopic,
  currentUserEmail = 'admin@example.com',
  users = [],
  topicToEdit,
}: CreateTopicModalProps) {
  const [title, setTitle] = useState(topicToEdit?.title || '');
  const [description, setDescription] = useState(topicToEdit?.description || '');
  const [content, setContent] = useState(topicToEdit?.content || '');
  const [type, setType] = useState<TopicType>(topicToEdit?.type || 'Document Read and Sign');
  const [targetGroup, setTargetGroup] = useState<TargetGroup>(topicToEdit?.targetGroup || 'All');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(topicToEdit?.assignedUserIds || []);
  const [assignedTeams, setAssignedTeams] = useState<string[]>(topicToEdit?.targetTeams || []);
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>(topicToEdit?.targetDepartments || []);
  const [showSelectStaffModal, setShowSelectStaffModal] = useState(false);
  const [publishedDate, setPublishedDate] = useState(topicToEdit?.publishedDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(topicToEdit?.dueDate || '');

  const uniqueTeams = React.useMemo(() => Array.from(new Set(users.map(u => u.team).filter((t): t is string => !!t))), [users]);
  const uniqueDepartments = React.useMemo(() => Array.from(new Set(users.map(u => u.department).filter((t): t is string => !!t))), [users]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const topicData: Omit<Topic, 'id' | 'createdAt'> = {
      title,
      description,
      content: content || description || 'Please review and acknowledge this topic.',
      type,
      targetGroup: targetGroup === 'CUSTOM' ? 'CUSTOM' : targetGroup,
      assignedUserIds: targetGroup === 'CUSTOM' ? assignedUserIds : undefined,
      assignedUserNames: targetGroup === 'CUSTOM' ? users.filter(u => assignedUserIds.includes(u.id)).map(u => u.name) : undefined,
      targetTeams: targetGroup === 'Team' ? assignedTeams : undefined,
      targetDepartments: targetGroup === 'Department' ? assignedDepartments : undefined,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdBy: currentUserEmail,
      publishedDate: publishedDate || new Date().toISOString().split('T')[0],
      status: 'active',
    };

    if (onCreate) onCreate(topicToEdit ? { ...topicData, id: topicToEdit.id } as any : topicData);
    if (onSaveTopic) onSaveTopic(topicToEdit ? { ...topicData, id: topicToEdit.id } as any : topicData);
    
    setTitle('');
    setDescription('');
    setContent('');
    setAssignedTeams([]);
    setAssignedDepartments([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-200" />
            <h2 className="text-xl font-bold">Create New Compliance Topic</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Topic Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 2026 Flight Operations & Safety Protocol Directive"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Type & Target Group Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Topic Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TopicType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {TOPIC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Target Group
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={targetGroup}
                  onChange={(e) => {
                    const val = e.target.value as TargetGroup;
                    setTargetGroup(val);
                    if (val === 'CUSTOM') {
                      setShowSelectStaffModal(true);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  {TARGET_GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Target UI */}
              {targetGroup === 'CUSTOM' && (
                <div className="mt-2 flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                  <span className="font-semibold text-blue-900">
                    {assignedUserIds.length} staff member(s) selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSelectStaffModal(true)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition cursor-pointer"
                  >
                    Select Staff...
                  </button>
                </div>
              )}

              {targetGroup === 'Team' && (
                <div className="mt-2 space-y-1">
                  {uniqueTeams.map(team => (
                    <label key={team} className="flex items-center gap-2 text-xs text-slate-700 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={assignedTeams.includes(team)}
                        onChange={(e) => setAssignedTeams(prev => e.target.checked ? [...prev, team] : prev.filter(t => t !== team))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {team}
                    </label>
                  ))}
                </div>
              )}

              {targetGroup === 'Department' && (
                <div className="mt-2 space-y-1">
                  {uniqueDepartments.map(dept => (
                    <label key={dept} className="flex items-center gap-2 text-xs text-slate-700 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={assignedDepartments.includes(dept)}
                        onChange={(e) => setAssignedDepartments(prev => e.target.checked ? [...prev, dept] : prev.filter(d => d !== dept))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {dept}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date Published & Due Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Date Published
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Acknowledgement Due Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Short Summary
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary for team members..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Full Content */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Full Content & Instructions
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter comprehensive instructions, mandatory safety steps, or policy text to be read and signed..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              Publish Topic
            </button>
          </div>
        </form>
      </div>

      {/* Select Staff Names Modal */}
      <SelectStaffModal
        isOpen={showSelectStaffModal}
        onClose={() => setShowSelectStaffModal(false)}
        users={users}
        initiallySelectedIds={assignedUserIds}
        onConfirmSelection={(ids) => setAssignedUserIds(ids)}
      />
    </div>
  );
}
