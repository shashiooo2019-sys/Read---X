'use client';

import React, { useState, useMemo } from 'react';
import { User, Topic, TopicType, TargetGroup } from '@/lib/types';
import { X, FileText, Users, Calendar, Sparkles, Search, CheckSquare, Square, CheckCircle2 } from 'lucide-react';

interface SelectStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  initiallySelectedIds: string[];
  onConfirmSelection: (selectedIds: string[]) => void;
}

export function SelectStaffModal({
  isOpen,
  onClose,
  users,
  initiallySelectedIds,
  onConfirmSelection,
}: SelectStaffModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initiallySelectedIds));
  const [searchQuery, setSearchQuery] = useState('');

  // Sort users alphabetically by name
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [users]);

  // Filtered users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return sortedUsers;
    const q = searchQuery.toLowerCase().trim();
    return sortedUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.uNumber && u.uNumber.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.ALS && u.ALS.toLowerCase().includes(q))
    );
  }, [sortedUsers, searchQuery]);

  if (!isOpen) return null;

  const toggleUser = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    const allFilteredIds = filteredUsers.map((u) => u.id);
    const allSelected = allFilteredIds.every((id) => next.has(id));

    if (allSelected) {
      allFilteredIds.forEach((id) => next.delete(id));
    } else {
      allFilteredIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white text-center relative border-b border-slate-800 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Select Individual Staff Members</h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose specific staff members for custom topic targeting &bull; {selectedIds.size} selected
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search & Selection Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search staff by name, U-Number, email, or ALS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 transition cursor-pointer"
          >
            {filteredUsers.every((u) => selectedIds.has(u.id)) && filteredUsers.length > 0
              ? 'Deselect All Visible'
              : 'Select All Visible'}
          </button>
        </div>

        {/* Staff List (Alphabetical) */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No staff members found matching your search.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedIds.has(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`p-3 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-blue-50/80 border border-blue-200 shadow-2xs' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {u.uNumber || 'UNUMBER'} &bull; {u.email} {u.ALS ? `• ${u.ALS}` : ''}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase shrink-0 ${
                      u.isSuperAdmin
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {u.isSuperAdmin ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Staff'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirmSelection(Array.from(selectedIds));
              onClose();
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Selection ({selectedIds.size} staff)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
