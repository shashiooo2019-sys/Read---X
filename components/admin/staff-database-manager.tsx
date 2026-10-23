'use client';

import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { User, Topic, TopicConfirmation } from '@/lib/types';
import { isUserAssignedToTopic } from '@/lib/compliance-store';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit3,
  KeyRound,
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Clock,
  Check,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface StaffDatabaseManagerProps {
  users: User[];
  topics?: Topic[];
  confirmations?: TopicConfirmation[];
  currentUser?: User;
  onSaveUser: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetUserPassword: (userId: string) => Promise<void>;
  onBulkImportUsers: (importedUsers: Omit<User, 'id'>[]) => Promise<void>;
  onClose?: () => void;
  onManualConfirmParticipant?: (topicId: string, userId: string) => Promise<void> | void;
  onUnconfirmParticipant?: (topicId: string, userId: string) => Promise<void> | void;
}

export function StaffDatabaseManager({
  users,
  topics = [],
  confirmations = [],
  currentUser,
  onSaveUser,
  onDeleteUser,
  onResetUserPassword,
  onBulkImportUsers,
  onClose,
  onManualConfirmParticipant,
  onUnconfirmParticipant,
}: StaffDatabaseManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Filter States by ALS and Lead
  const [alsFilter, setAlsFilter] = useState<string>('all');
  const [leadFilter, setLeadFilter] = useState<string>('all');

  // Ref for table scroll container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Scroll function for chevrons
  const scrollTable = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Extract unique ALS options
  const uniqueAlsOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.ALS) set.add(u.ALS);
    });
    return Array.from(set).sort();
  }, [users]);

  // Extract unique Lead options
  const uniqueLeadOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.Lead) set.add(u.Lead);
    });
    return Array.from(set).sort();
  }, [users]);

  // Add / Edit Modal State
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUNumber, setFormUNumber] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAls, setFormAls] = useState('ALS-1');
  const [formLead, setFormLead] = useState('No');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formIsSuperAdmin, setFormIsSuperAdmin] = useState(false);
  const [formTeam, setFormTeam] = useState('Ramp Operations');
  const [formDepartment, setFormDepartment] = useState('Ground Operations');
  const [isSaving, setIsSaving] = useState(false);

  // Deduplication state
  const [showDeduplicateModal, setShowDeduplicateModal] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [colMapUNumber, setColMapUNumber] = useState<number>(-1);
  const [colMapName, setColMapName] = useState<number>(-1);
  const [colMapEmail, setColMapEmail] = useState<number>(-1);
  const [colMapAls, setColMapAls] = useState<number>(-1);
  const [colMapLead, setColMapLead] = useState<number>(-1);
  const [duplicateOption, setDuplicateOption] = useState<'overwrite' | 'ignore'>('overwrite');
  const [isImporting, setIsImporting] = useState(false);

  // Password reset state
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  // Staff details modal state
  const [selectedStaffForDetails, setSelectedStaffForDetails] = useState<User | null>(null);
  const [isConfirmingAllForStaff, setIsConfirmingAllForStaff] = useState(false);

  // Staff member deletion confirmation modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Calculate duplicate groups by U Number
  const duplicateInfo = useMemo(() => {
    const map = new Map<string, User[]>();
    users.forEach((u) => {
      const key = (u.uNumber || '').trim().toUpperCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    });

    const groups: { uNumber: string; users: User[]; canonicalUser: User; duplicateUsers: User[] }[] = [];
    let totalDuplicates = 0;

    map.forEach((userGroup, key) => {
      if (userGroup.length > 1) {
        // Sort to determine canonical user (priority: SuperAdmin > Admin > PasswordSet > First created)
        const sorted = [...userGroup].sort((a, b) => {
          if (a.isSuperAdmin && !b.isSuperAdmin) return -1;
          if (!a.isSuperAdmin && b.isSuperAdmin) return 1;
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          if (a.isPasswordSet && !b.isPasswordSet) return -1;
          if (!a.isPasswordSet && b.isPasswordSet) return 1;
          return 0;
        });

        const canonicalUser = sorted[0];
        const duplicateUsers = sorted.slice(1);
        groups.push({
          uNumber: key,
          users: userGroup,
          canonicalUser,
          duplicateUsers,
        });
        totalDuplicates += duplicateUsers.length;
      }
    });

    return { groups, totalDuplicates };
  }, [users]);

  // Handler to delete all duplicate staff records by U number
  const handleDeleteDuplicatesByUNumber = async () => {
    if (duplicateInfo.totalDuplicates === 0) return;

    setIsDeduplicating(true);
    try {
      let deletedCount = 0;
      for (const group of duplicateInfo.groups) {
        for (const dupUser of group.duplicateUsers) {
          await onDeleteUser(dupUser.id);
          deletedCount++;
        }
      }
      setShowDeduplicateModal(false);
      alert(`Successfully deleted ${deletedCount} duplicate staff record(s) by U Number from Cloud Firestore.`);
    } catch (err: any) {
      alert(`Error deleting duplicates: ${err?.message || String(err)}`);
    } finally {
      setIsDeduplicating(false);
    }
  };

  // Default Sort by Names (A-Z) & Filter by search query, ALS, and Lead
  const filteredUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
      .filter((u) => {
        // ALS Filter
        if (alsFilter !== 'all' && u.ALS !== alsFilter) return false;

        // Lead Filter
        if (leadFilter !== 'all') {
          if (leadFilter === 'Yes' && !(u.Lead === 'Yes' || u.Lead?.toLowerCase().includes('lead'))) return false;
          if (leadFilter === 'No' && (u.Lead === 'Yes' || u.Lead?.toLowerCase().includes('lead'))) return false;
          if (leadFilter !== 'Yes' && leadFilter !== 'No' && u.Lead !== leadFilter) return false;
        }

        // Search Query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (u.uNumber && u.uNumber.toLowerCase().includes(q)) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.ALS && u.ALS.toLowerCase().includes(q)) ||
          (u.Lead && u.Lead.toLowerCase().includes(q)) ||
          (u.team && u.team.toLowerCase().includes(q))
        );
      });
  }, [users, searchQuery, alsFilter, leadFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormUNumber(`U${1000 + users.length + 1}`);
    setFormName('');
    setFormEmail('');
    setFormAls('N');
    setFormLead('N');
    setFormRole('user');
    setFormIsSuperAdmin(false);
    setFormTeam('Ramp Operations');
    setFormDepartment('Ground Operations');
    setShowAddEditModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormUNumber(u.uNumber || `U${1000}`);
    setFormName(u.name || '');
    setFormEmail(u.email || '');
    setFormAls(u.ALS || 'N');
    setFormLead(u.Lead || 'N');
    setFormRole(u.role || 'user');
    setFormIsSuperAdmin(!!u.isSuperAdmin);
    setFormTeam(u.team || 'Ramp Operations');
    setFormDepartment(u.department || 'Ground Operations');
    setShowAddEditModal(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    setIsSaving(true);
    try {
      const normUNum = formUNumber.trim().toUpperCase();
      // Check if an existing staff record has the matching U Number
      const existingUserByUNum = users.find(
        (u) => u.uNumber && u.uNumber.trim().toUpperCase() === normUNum && u.id !== editingUser?.id
      );

      const targetId = editingUser
        ? editingUser.id
        : existingUserByUNum
        ? existingUserByUNum.id
        : `usr-${Date.now()}`;

      const userToSave: User = {
        id: targetId,
        uNumber: formUNumber.trim(),
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        ALS: formAls.trim(),
        Lead: formLead.trim(),
        role: existingUserByUNum ? existingUserByUNum.role : formRole,
        isSuperAdmin: existingUserByUNum ? existingUserByUNum.isSuperAdmin : formIsSuperAdmin,
        team: formTeam.trim(),
        department: formDepartment.trim(),
        password: editingUser ? editingUser.password : existingUserByUNum ? existingUserByUNum.password : '',
        isPasswordSet: editingUser ? editingUser.isPasswordSet : existingUserByUNum ? existingUserByUNum.isPasswordSet : false,
      };

      await onSaveUser(userToSave);
      setShowAddEditModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setResettingUserId(userId);
    try {
      await onResetUserPassword(userId);
    } finally {
      setResettingUserId(null);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedUserIds.size} staff member(s)?`)) return;

    for (const id of Array.from(selectedUserIds)) {
      await onDeleteUser(id);
    }
    setSelectedUserIds(new Set());
  };

  // CSV/Excel File Reader
  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        alert('File contains no readable sheets.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawRows.length < 2) {
        alert('File must contain a header row and at least one data row.');
        return;
      }

      const headers = (rawRows[0] || []).map((h) => String(h || '').trim());
      const dataRows = rawRows
        .slice(1)
        .filter((row) => row && row.some((cell) => cell !== '' && cell !== null && cell !== undefined))
        .map((row) => row.map((cell) => String(cell || '').trim()));

      setCsvHeaders(headers);
      setCsvRawRows(dataRows);

      // Auto-detect columns
      headers.forEach((h, idx) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lower.includes('unum') || lower.includes('staffid') || lower.includes('empid')) setColMapUNumber(idx);
        else if (lower.includes('name') || lower.includes('staff') || lower === 'names') setColMapName(idx);
        else if (lower.includes('email') || lower.includes('mail')) setColMapEmail(idx);
        else if (lower.includes('als') || lower.includes('station')) setColMapAls(idx);
        else if (lower.includes('lead') || lower.includes('supervisor')) setColMapLead(idx);
      });

      setShowCsvModal(true);
    } catch (err: any) {
      alert(`Failed to read file: ${err?.message || String(err)}`);
    }
  };

  const handleConfirmCsvImport = async () => {
    if (colMapName < 0 || colMapEmail < 0) {
      alert('Please map at least the NAMES and Email columns before importing.');
      return;
    }

    setIsImporting(true);
    try {
      const importedList: Omit<User, 'id'>[] = [];
      const seenUNumbers = new Set<string>();

      // Build set of existing U Numbers in current database
      const existingUNumberSet = new Set<string>();
      users.forEach((u) => {
        if (u.uNumber) existingUNumberSet.add(u.uNumber.trim().toUpperCase());
      });

      csvRawRows.forEach((row, i) => {
        const uNum = colMapUNumber >= 0 ? row[colMapUNumber] : `U${2000 + i}`;
        const name = colMapName >= 0 ? row[colMapName] : '';
        const email = colMapEmail >= 0 ? row[colMapEmail] : '';
        const als = colMapAls >= 0 ? row[colMapAls] : 'ALS-1';
        const lead = colMapLead >= 0 ? row[colMapLead] : 'No';

        if (name && email) {
          const normUNum = (uNum || `U${2000 + i}`).trim().toUpperCase();

          // If duplicateOption is 'ignore', skip if U Number exists in DB or was already seen in this file
          if (duplicateOption === 'ignore') {
            if (existingUNumberSet.has(normUNum) || seenUNumbers.has(normUNum)) {
              return; // Skip duplicate U Number
            }
          }

          if (duplicateOption === 'overwrite') {
            // Check if we already added an entry for this U Number in importedList during this file loop
            const existingIdxInList = importedList.findIndex(
              (item) => (item.uNumber || '').trim().toUpperCase() === normUNum
            );
            if (existingIdxInList >= 0) {
              // Replace the existing entry so the latest row in the file takes precedence without creating a duplicate
              importedList[existingIdxInList] = {
                uNumber: uNum ? uNum.trim() : `U${2000 + i}`,
                name: name.trim(),
                email: email.toLowerCase().trim(),
                ALS: als ? als.trim() : 'ALS-1',
                Lead: lead ? lead.trim() : 'No',
                role: 'user',
                team: 'Ground Operations',
                department: 'Operations',
                isPasswordSet: false,
              };
              return;
            }
          }

          seenUNumbers.add(normUNum);

          importedList.push({
            uNumber: uNum ? uNum.trim() : `U${2000 + i}`,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            ALS: (als && als.trim().toUpperCase() === 'Y') ? 'Y' : 'N',
            Lead: (lead && lead.trim().toUpperCase() === 'Y') ? 'Y' : 'N',
            role: 'user',
            team: 'Ground Operations',
            department: 'Operations',
            isPasswordSet: false,
          });
        }
      });

      await onBulkImportUsers(importedList);
      setShowCsvModal(false);
      setCsvRawRows([]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-0">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Staff Roster &amp; User Database</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Add, amend, delete, or import staff members with real-time Cloud Firestore synchronization
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedUserIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedUserIds.size})</span>
            </button>
          )}

          {/* Delete Duplicate Staff Names by U Number button */}
          <button
            onClick={() => {
              if (duplicateInfo.totalDuplicates === 0) {
                alert('All staff records are unique by U Number. No duplicate staff entries found.');
              } else {
                setShowDeduplicateModal(true);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              duplicateInfo.totalDuplicates > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Scan roster and delete all duplicate staff records by U Number"
          >
            <Trash2 className={`w-4 h-4 ${duplicateInfo.totalDuplicates > 0 ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>
              {duplicateInfo.totalDuplicates > 0
                ? `Delete Duplicates by U Number (${duplicateInfo.totalDuplicates})`
                : 'Delete Duplicates by U Number'}
            </span>
          </button>

          <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-1.5 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import CSV/Excel Database</span>
            <input
              type="file"
              accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleCsvFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar with ALS, Lead & horizontal scroll controls */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by NAMES, UNUMBER, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ALS Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-600">ALS:</span>
            <select
              value={alsFilter}
              onChange={(e) => setAlsFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">All ALS (Y/N)s</option>
              {uniqueAlsOptions.map((als) => (
                <option key={als} value={als}>
                  {als} ({users.filter((u) => u.ALS === als).length})
                </option>
              ))}
            </select>
          </div>

          {/* Lead Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-semibold text-slate-600">Lead:</span>
            <select
              value={leadFilter}
              onChange={(e) => setLeadFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">All Lead Roles</option>
              <option value="Yes">Lead (Y/N)s (Yes)</option>
              <option value="No">Non-Lead Personnel (No)</option>
              {uniqueLeadOptions
                .filter((l) => l !== 'Yes' && l !== 'No')
                .map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
            </select>
          </div>

          {(alsFilter !== 'all' || leadFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setAlsFilter('all');
                setLeadFilter('all');
                setSearchQuery('');
              }}
              className="px-2.5 py-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-slate-500">
          <span>Showing: <strong className="text-slate-900 font-bold">{filteredUsers.length}</strong> / {users.length}</span>
          <span>Admins: <strong className="text-blue-600 font-bold">{users.filter((u) => u.role === 'admin' || u.isSuperAdmin).length}</strong></span>
          
          {/* Top level horizontal scroll chevrons without text */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => scrollTable('left')}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
              title="Scroll Table Left"
              aria-label="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTable('right')}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
              title="Scroll Table Right"
              aria-label="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Staff Table view for desktop (md and larger) */}
      <div ref={tableContainerRef} className="hidden md:block overflow-x-auto relative">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead className="bg-[#1b5e82] text-white uppercase text-[11px] font-bold tracking-wider">
            <tr>
              {/* Checkbox column - Frozen / Sticky Left */}
              <th className="p-3 w-10 text-center sticky left-0 z-30 bg-[#1b5e82] border-r border-slate-600/40">
                <input
                  type="checkbox"
                  checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
                    } else {
                      setSelectedUserIds(new Set());
                    }
                  }}
                  className="rounded border-slate-400"
                />
              </th>

              {/* NAMES column - Put FIRST and Frozen / Sticky Left with horizontal scroll chevrons on top without text */}
              <th className="p-3 border-r border-slate-600/40 sticky left-10 z-30 bg-[#1b5e82] min-w-[220px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span>NAMES</span>
                    <span className="text-[9px] bg-blue-500/40 text-blue-100 px-1.5 py-0.2 rounded font-mono">A-Z</span>
                  </div>
                  {/* Chevrons on top of name column WITHOUT TEXT */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollTable('left')}
                      className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 text-white transition active:scale-95 shadow-sm"
                      title="Scroll Left"
                      aria-label="Scroll Left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollTable('right')}
                      className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 text-white transition active:scale-95 shadow-sm"
                      title="Scroll Right"
                      aria-label="Scroll Right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </th>

              <th className="p-3 border-r border-slate-600/40 min-w-[110px]">UNUMBER</th>
              <th className="p-3 border-r border-slate-600/40 min-w-[220px]">Email</th>
              <th className="p-3 border-r border-slate-600/40 min-w-[100px]">ALS</th>
              <th className="p-3 border-r border-slate-600/40 min-w-[100px]">Lead</th>
              <th className="p-3 border-r border-slate-600/40 min-w-[110px]">Role</th>
              <th className="p-3 border-r border-slate-600/40 min-w-[160px]">Password Status</th>
              <th className="p-3 text-center min-w-[180px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  No staff records found matching your query.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isChecked = selectedUserIds.has(u.id);
                return (
                  <tr
                    key={u.id}
                    className={`group hover:bg-slate-50 transition-colors ${
                      isChecked ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {/* Checkbox cell - Sticky Left */}
                    <td className="p-3 text-center sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectUser(u.id)}
                        className="rounded border-slate-300"
                      />
                    </td>

                    {/* NAMES cell - Sticky Left & First Column */}
                    <td 
                      onClick={() => setSelectedStaffForDetails(u)}
                      className="p-3 font-bold text-slate-900 sticky left-10 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] cursor-pointer hover:text-[#0078D4]"
                      title="Click to view full staff details"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate hover:underline">{u.name}</span>
                      </div>
                    </td>

                    <td className="p-3 font-mono font-bold text-slate-900">
                      {u.uNumber || 'N/A'}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {u.email}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">
                      <span className={`px-2 py-0.5 rounded ${
                        u.ALS === 'Y' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.ALS === 'Y' ? 'Y' : 'N'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">
                      <span className={`px-2 py-0.5 rounded ${
                        u.Lead === 'Y'
                          ? 'bg-purple-100 text-purple-800 font-bold'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.Lead === 'Y' ? 'Y' : 'N'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.isSuperAdmin
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : u.role === 'admin'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.isSuperAdmin ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.isPasswordSet ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Password Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          First-Time Setup Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedStaffForDetails(u)}
                          title="View Staff Details"
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0078D4] border border-blue-200 transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Staff Details</span>
                        </button>

                        <button
                          onClick={() => openEditModal(u)}
                          title="Amend Staff Member"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleResetPassword(u.id)}
                          disabled={resettingUserId === u.id}
                          title="Reset Password to First-Time Setup Flow"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition text-[11px] font-semibold flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${resettingUserId === u.id ? 'animate-spin' : ''}`} />
                          <span className="hidden lg:inline">Reset Password</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          title="Delete Staff Member"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Visible on Mobile Screens / md:hidden) */}
      <div className="block md:hidden p-3 space-y-3 bg-slate-100/70 border-t border-slate-200">
        {filteredUsers.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center text-slate-500 text-xs border border-slate-200">
            No staff records found matching your query.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isChecked = selectedUserIds.has(u.id);
            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm transition-all space-y-3 ${
                  isChecked ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header Row: Checkbox, Name, Role */}
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectUser(u.id)}
                      className="rounded border-slate-300 w-4 h-4 shrink-0 mt-0.5"
                    />
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 bg-[#05164d] p-2 rounded-lg">
                      <h4 className="font-bold text-white text-sm truncate">{u.name}</h4>
                      <p className="text-[11px] font-mono font-bold text-[#ffcf00]">{u.uNumber || 'N/A'}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    u.isSuperAdmin
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : u.role === 'admin'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {u.isSuperAdmin ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>

                {/* Wrapped Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email Address</span>
                    <span className="font-mono text-slate-800 font-medium break-all">{u.email}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">ALS (Y/N)</span>
                      <span className="font-semibold text-slate-800">{u.ALS === 'Y' ? 'Y' : 'N'}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Lead (Y/N)</span>
                      <span className={`font-semibold ${
                        u.Lead === 'Yes' || u.Lead?.toLowerCase().includes('lead')
                          ? 'text-purple-800 font-bold'
                          : 'text-slate-700'
                      }`}>
                        {u.Lead === 'Y' ? 'Y' : 'N'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Password Security Status</span>
                    {u.isPasswordSet ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Password Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-600" />
                        First-Time Setup Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStaffForDetails(u);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0078D4] text-white font-bold text-xs flex items-center gap-1 transition shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Staff Details</span>
                  </button>

                  <button
                    onClick={() => openEditModal(u)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Amend</span>
                  </button>

                  <button
                    onClick={() => handleResetPassword(u.id)}
                    disabled={resettingUserId === u.id}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs flex items-center gap-1 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resettingUserId === u.id ? 'animate-spin' : ''}`} />
                    <span>Reset Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToDelete(u);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Amend Staff Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold">
                {editingUser ? 'Amend Staff Record' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="p-6 space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NAMES (Full Name)</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    placeholder="e.g. Marcus Vance"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UNUMBER</label>
                  <input
                    type="text"
                    required
                    value={formUNumber}
                    onChange={(e) => setFormUNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    placeholder="e.g. U1001"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  placeholder="e.g. marcus.vance@groundops.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ALS (Y/N)</label>
                  <select
                    value={formAls}
                    onChange={(e) => setFormAls(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="N">N</option>
                    <option value="Y">Y</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lead (Y/N)</label>
                  <select
                    value={formLead}
                    onChange={(e) => setFormLead(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="N">N</option>
                    <option value="Y">Y</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">System Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="user">User (Staff Roster)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="chkSuperAdmin"
                    checked={formIsSuperAdmin}
                    onChange={(e) => setFormIsSuperAdmin(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="chkSuperAdmin" className="font-bold text-purple-900">
                    Grant Super Admin Privileges
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {isSaving ? 'Saving to Cloud...' : 'Save Staff Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import & Column Mapping Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-lg font-bold">CSV Staff Database Import &amp; Field Mapping</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Parsed {csvRawRows.length} data rows from CSV. Map columns to system fields below.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Column Mapping Controls */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Map CSV Columns to System Fields
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">NAMES Column *</label>
                    <select
                      value={colMapName}
                      onChange={(e) => setColMapName(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value={-1}>-- Select Column --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          CSV Header: &quot;{h}&quot;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">UNUMBER Column</label>
                    <select
                      value={colMapUNumber}
                      onChange={(e) => setColMapUNumber(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value={-1}>-- Auto Generate --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          CSV Header: &quot;{h}&quot;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Email Column *</label>
                    <select
                      value={colMapEmail}
                      onChange={(e) => setColMapEmail(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value={-1}>-- Select Column --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          CSV Header: &quot;{h}&quot;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">ALS Column</label>
                    <select
                      value={colMapAls}
                      onChange={(e) => setColMapAls(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value={-1}>-- Default (ALS-1) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          CSV Header: &quot;{h}&quot;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Lead Column</label>
                    <select
                      value={colMapLead}
                      onChange={(e) => setColMapLead(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value={-1}>-- Default (No) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          CSV Header: &quot;{h}&quot;
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duplicate U Number Handling Options */}
                <div className="pt-3 border-t border-slate-200">
                  <span className="block font-bold text-slate-800 mb-1.5">
                    Duplicate U Number Action Handling:
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="duplicateOption"
                        value="overwrite"
                        checked={duplicateOption === 'overwrite'}
                        onChange={() => setDuplicateOption('overwrite')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span><strong>Overwrite</strong> existing staff records with matching U Number</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="duplicateOption"
                        value="ignore"
                        checked={duplicateOption === 'ignore'}
                        onChange={() => setDuplicateOption('ignore')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span><strong>Ignore / Skip</strong> duplicate U Numbers</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Import Preview (First 5 Rows)
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b5e82] text-white font-bold">
                      <tr>
                        <th className="p-2.5">NAMES</th>
                        <th className="p-2.5">UNUMBER</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">ALS</th>
                        <th className="p-2.5">Lead</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {csvRawRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50">
                          <td className="p-2.5 font-bold">{colMapName >= 0 ? row[colMapName] : 'N/A'}</td>
                          <td className="p-2.5 font-mono">{colMapUNumber >= 0 ? row[colMapUNumber] : `U200${idx}`}</td>
                          <td className="p-2.5 font-mono text-slate-600">{colMapEmail >= 0 ? row[colMapEmail] : 'N/A'}</td>
                          <td className="p-2.5">{colMapAls >= 0 ? row[colMapAls] : 'ALS-1'}</td>
                          <td className="p-2.5">{colMapLead >= 0 ? row[colMapLead] : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmCsvImport}
                disabled={isImporting || colMapName < 0 || colMapEmail < 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Importing to Cloud...' : `Import ${csvRawRows.length} Staff Records to Cloud`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Member Full Details Modal */}
      {selectedStaffForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0078D4] text-white font-black text-lg flex items-center justify-center shrink-0 border-2 border-white/20 shadow-md">
                  {selectedStaffForDetails.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">{selectedStaffForDetails.name}</h3>
                  <p className="text-xs font-mono text-blue-300">{selectedStaffForDetails.uNumber || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffForDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Official Email</span>
                  <span className="font-mono text-slate-900 font-semibold break-all">{selectedStaffForDetails.email}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Station / ALS</span>
                  <span className="font-bold text-slate-900">{selectedStaffForDetails.ALS || 'ALS-1'}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Lead (Y/N) Status</span>
                  <span className={`font-bold ${
                    selectedStaffForDetails.Lead === 'Yes' || selectedStaffForDetails.Lead?.toLowerCase().includes('lead')
                      ? 'text-purple-700 font-bold'
                      : 'text-slate-700'
                  }`}>
                    {selectedStaffForDetails.Lead || 'No'}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">System Access Role</span>
                  <span className="font-bold uppercase text-slate-900">
                    {selectedStaffForDetails.isSuperAdmin ? 'Super Admin' : selectedStaffForDetails.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Security & Authentication Status</span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {selectedStaffForDetails.isPasswordSet ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center gap-1.5 w-fit">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Active Password Set
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs inline-flex items-center gap-1.5 w-fit">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      First-Time Setup Pending
                    </span>
                  )}

                  <button
                    onClick={() => {
                      handleResetPassword(selectedStaffForDetails.id);
                      setSelectedStaffForDetails(null);
                    }}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-xs transition cursor-pointer"
                  >
                    Reset First-Time Password
                  </button>
                </div>
              </div>

              {(() => {
                const assignedTopicsForStaff = topics.filter((t) =>
                  isUserAssignedToTopic(selectedStaffForDetails, t)
                );
                const staffTopicRecords = assignedTopicsForStaff.map((topic) => {
                  const conf = confirmations.find(
                    (c) => c.topicId === topic.id && c.userId === selectedStaffForDetails.id
                  );
                  const isConfirmed = conf?.status === 'confirmed';
                  const isNotParticipated = conf?.status === 'not_participated';
                  const isPendingWbt = conf?.status === 'pending_wbt_verification';
                  return {
                    topic,
                    conf,
                    isConfirmed,
                    isNotParticipated,
                    isPendingWbt,
                  };
                });
                const staffMissingCount = staffTopicRecords.filter((r) => !r.isConfirmed).length;
                const staffConfirmedCount = staffTopicRecords.filter((r) => r.isConfirmed).length;
                const canManage = currentUser?.role === 'admin' || !!currentUser?.isSuperAdmin;

                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Compliance Directives &amp; Participation Records
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 mt-0.5">
                          <span>{staffTopicRecords.length} Assigned Directives</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-emerald-700 font-bold">{staffConfirmedCount} Confirmed</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-amber-700 font-bold">{staffMissingCount} Missing / Not Participated</span>
                        </div>
                      </div>

                      {canManage && staffMissingCount > 0 && (
                        <button
                          type="button"
                          disabled={isConfirmingAllForStaff}
                          onClick={async () => {
                            setIsConfirmingAllForStaff(true);
                            try {
                              const missingTopics = staffTopicRecords.filter((r) => !r.isConfirmed);
                              for (const item of missingTopics) {
                                await onManualConfirmParticipant?.(item.topic.id, selectedStaffForDetails.id);
                              }
                            } finally {
                              setIsConfirmingAllForStaff(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-center"
                          title="Mark all missing or not participated topics as confirmed for this staff member"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isConfirmingAllForStaff ? 'Confirming All...' : 'Mark All Missing Confirmed'}</span>
                        </button>
                      )}
                    </div>

                    {staffTopicRecords.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        No compliance topics currently assigned to this staff member.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1 space-y-0.5">
                        {staffTopicRecords.map(({ topic, conf, isConfirmed, isNotParticipated, isPendingWbt }) => (
                          <div
                            key={topic.id}
                            className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/80 rounded-lg transition"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 truncate">{topic.title}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {topic.type}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                                <span>Target: {topic.targetGroup}</span>
                                {topic.dueDate && <span>Due: {topic.dueDate}</span>}
                                {conf?.confirmedAt && (
                                  <span>Confirmed: {new Date(conf.confirmedAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isConfirmed ? (
                                conf?.confirmedByAdmin ? (
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs"
                                      title={`Confirmed by Admin: ${conf.verifiedBy || 'Administrator'}`}
                                    >
                                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                                      <span>Confirmed by Admin</span>
                                    </span>
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={() => onUnconfirmParticipant?.(topic.id, selectedStaffForDetails.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        title="Revert to Missing"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>✓ Confirmed</span>
                                  </span>
                                )
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {isNotParticipated ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      <span>Not Participated</span>
                                    </span>
                                  ) : isPendingWbt ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                      <Clock className="w-3 h-3 text-purple-600" />
                                      <span>Pending WBT</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>Missing / Pending</span>
                                    </span>
                                  )}

                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => onManualConfirmParticipant?.(topic.id, selectedStaffForDetails.id)}
                                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                      title="Manually mark this topic as confirmed by Admin"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-blue-100" />
                                      <span>Mark Confirmed</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const u = selectedStaffForDetails;
                  setSelectedStaffForDetails(null);
                  openEditModal(u);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Amend Staff Record</span>
              </button>

              <button
                onClick={() => setSelectedStaffForDetails(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduplicate Staff Modal */}
      {showDeduplicateModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-amber-600 p-5 text-white flex items-center justify-between border-b border-amber-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Delete Duplicate Staff Records by U Number
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Found {duplicateInfo.totalDuplicates} duplicate record(s) across {duplicateInfo.groups.length} U Number(s).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeduplicateModal(false)}
                className="text-amber-100 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 leading-relaxed">
                <strong>System Safeguard:</strong> For each group with identical U Numbers, the primary record (e.g. Super Admin/Admin or active password account) will be <strong>KEPT</strong>, and all extra duplicate staff records will be permanently deleted from Cloud Firestore.
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Detected Duplicate Groups ({duplicateInfo.groups.length})
                </h4>

                {duplicateInfo.groups.map((grp) => (
                  <div key={grp.uNumber} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                        U Number: {grp.uNumber}
                      </span>
                      <span className="text-xs text-amber-700 font-bold">
                        {grp.duplicateUsers.length} duplicate(s) to remove
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {/* Kept user */}
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-extrabold text-[10px] uppercase">
                            KEEP
                          </span>
                          <span className="font-bold">{grp.canonicalUser.name}</span>
                          <span className="font-mono text-emerald-700">({grp.canonicalUser.email})</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800">
                          {grp.canonicalUser.isSuperAdmin ? 'SuperAdmin' : grp.canonicalUser.role}
                        </span>
                      </div>

                      {/* Duplicate users to delete */}
                      {grp.duplicateUsers.map((dup) => (
                        <div key={dup.id} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-900">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[10px] uppercase">
                              DELETE
                            </span>
                            <span className="font-bold">{dup.name}</span>
                            <span className="font-mono text-rose-700">({dup.email})</span>
                          </div>
                          <span className="text-[10px] font-mono text-rose-600">ID: {dup.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDeduplicateModal(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteDuplicatesByUNumber}
                disabled={isDeduplicating}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeduplicating
                    ? 'Deleting Duplicates...'
                    : `Confirm Delete ${duplicateInfo.totalDuplicates} Duplicate Staff Record(s)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Staff Member Deletion Confirmation Modal with Random Text Challenge */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3 bg-red-50/60">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-full shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Delete Staff Member Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">Permanent removal from Cloud Firestore</p>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p>
                Are you sure you want to permanently delete this staff member record?
              </p>
              <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl space-y-1">
                <div className="font-bold text-red-900 text-sm">
                  {userToDelete.name} ({userToDelete.uNumber || 'N/A'})
                </div>
                <div className="text-[11px] text-red-700 font-mono">
                  {userToDelete.email}
                </div>
              </div>

              {/* Random text challenge */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Type <span className="font-mono text-red-600 font-extrabold bg-red-50 px-1 py-0.5 rounded border border-red-200">CONFIRM-DELETE-9911</span> to enable deletion:
                </label>
                <input
                  type="text"
                  id="confirm-delete-staff-input"
                  placeholder="Type CONFIRM-DELETE-9911 here"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Firestore Deletion Notice:</strong> This action cannot be undone. All staff profile details and historical participation links will be erased.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const inputVal = (document.getElementById('confirm-delete-staff-input') as HTMLInputElement)?.value || '';
                  if (inputVal.trim() !== 'CONFIRM-DELETE-9911') {
                    alert('Please type the exact confirmation code (CONFIRM-DELETE-9911) to confirm staff record deletion.');
                    return;
                  }
                  setIsDeletingUser(true);
                  try {
                    await onDeleteUser(userToDelete.id);
                    setUserToDelete(null);
                  } finally {
                    setIsDeletingUser(false);
                  }
                }}
                disabled={isDeletingUser}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    <span>Deleting Staff...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Staff Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
