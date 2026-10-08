'use client';

import React, { useState, useMemo } from 'react';
import { User, Topic, TopicConfirmation } from '@/lib/types';
import { exportStaffRosterCompliance } from '@/lib/export-utils';
import { StaffEditModal } from './staff-edit-modal';
import { ImportStaffModal } from './import-staff-modal';
import {
  ChangeEmailModal,
  ApprovedUsersManager,
  AuditLogModal,
} from './admin-auth-controls';
import {
  Search,
  Download,
  Shield,
  UserCheck,
  UserX,
  Filter,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  Upload,
  Edit2,
  Trash2,
  UserCog,
  Check,
  Key,
  Mail,
  History,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface StaffRosterViewProps {
  users: User[];
  topics: Topic[];
  confirmations: TopicConfirmation[];
  currentUser: User;
  onSwitchUser?: (user: User) => void;
  onAddStaff: (staff: User) => void;
  onUpdateStaff: (staff: User) => void;
  onDeleteStaff: (userId: string) => void;
  onBulkUpdateStaff: (updatedUsers: User[], msg: string) => void;
}

export function StaffRosterView({
  users,
  topics,
  confirmations,
  currentUser,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onBulkUpdateStaff,
}: StaffRosterViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [alsFilter, setAlsFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [leadFilter, setLeadFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [adminFilter, setAdminFilter] = useState<'all' | 'admin' | 'standard'>('all');
  const [domainFilter, setDomainFilter] = useState<'all' | 'dlh.de' | 'lhgroup.de' | 'swiss.com'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [userForEmailChange, setUserForEmailChange] = useState<User | null>(null);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Reissue magic link for staff (Requirement 9)
  const handleReissueMagicLink = async (user: User) => {
    setActionLoadingUserId(user.id);
    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_auth',
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Secure magic link dispatched to ${user.email}. Previous sessions invalidated.`);
      } else {
        showToast(data.message || 'Failed to dispatch magic link.');
      }
    } catch {
      showToast('Network error while dispatching link.');
    } finally {
      setActionLoadingUserId(null);
    }
  };

  // Toggle user account disabled / active (Requirement 9)
  const handleToggleAccountStatus = async (user: User) => {
    const newStatus = user.accountStatus === 'disabled' ? 'active' : 'disabled';
    const actionLabel = newStatus === 'disabled' ? 'Deactivate' : 'Reactivate';

    if (!window.confirm(`${actionLabel} account for ${user.name}? When deactivated, all active sessions are instantly revoked.`)) {
      return;
    }

    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          userId: user.id,
          newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateStaff(data.user);
        showToast(`Account for ${user.name} is now ${newStatus}.`);
      } else {
        showToast(data.message || 'Failed to update account status.');
      }
    } catch {
      showToast('Network error updating status.');
    }
  };

  // Compute individual compliance for each user
  const userComplianceMap = useMemo(() => {
    const map = new Map<string, { assigned: number; confirmed: number; pending: number; rate: number }>();

    users.forEach(u => {
      const assigned = topics.filter(t => {
        if (t.targetGroup === 'ALL') return true;
        if (t.targetGroup === 'ALS') return u.isAls;
        if (t.targetGroup === 'Lead') return u.isLead;
        return false;
      });

      const confirmed = assigned.filter(t =>
        confirmations.some(c => c.topicId === t.id && c.userId === u.id && c.status === 'confirmed')
      );

      const pending = assigned.length - confirmed.length;
      const rate = assigned.length > 0 ? Math.round((confirmed.length / assigned.length) * 100) : 100;

      map.set(u.id, { assigned: assigned.length, confirmed: confirmed.length, pending, rate });
    });

    return map;
  }, [users, topics, confirmations]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.uNumber.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // ALS filter
      if (alsFilter === 'yes' && !u.isAls) return false;
      if (alsFilter === 'no' && u.isAls) return false;

      // Lead filter
      if (leadFilter === 'yes' && !u.isLead) return false;
      if (leadFilter === 'no' && u.isLead) return false;

      // Admin filter
      if (adminFilter === 'admin' && !u.isAdmin) return false;
      if (adminFilter === 'standard' && u.isAdmin) return false;

      // Domain filter
      if (domainFilter !== 'all' && !u.email.toLowerCase().includes(domainFilter)) {
        return false;
      }

      return true;
    });
  }, [users, searchQuery, alsFilter, leadFilter, adminFilter, domainFilter]);

  const handleDeleteStaffWithConfirm = (user: User) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${user.name} (${user.uNumber} - ${user.email}) from the organizational roster?`
      )
    ) {
      onDeleteStaff(user.id);
      showToast(`Staff member "${user.name}" (${user.uNumber}) has been deleted.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header bar with primary CTAs */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Staff Compliance Roster ({users.length} Personnel)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Import, add, delete, or amend personnel. Configure ALS, Lead, and Administrator permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowApprovedModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
            title="Manage and approve private email addresses (e.g. Gmail, Outlook) for external users"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approved Private Emails</span>
          </button>

          <button
            onClick={() => setShowAuditModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
            title="View immutable authentication, email changes, and session audit logs"
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
            title="Import staff names through XLSX, CSV, or PDF with changes-only and new names support"
          >
            <Upload className="w-3.5 h-3.5 text-[#0078D4]" />
            <span>Import Staff (XLSX / CSV / PDF)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Staff</span>
          </button>

          <button
            onClick={() => exportStaffRosterCompliance(users, topics, confirmations)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Clickable Overview Metric Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Box 1: Total Personnel */}
        <button
          type="button"
          onClick={() => {
            setAlsFilter('all');
            setLeadFilter('all');
            setAdminFilter('all');
            setDomainFilter('all');
          }}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            alsFilter === 'all' && leadFilter === 'all' && adminFilter === 'all' && domainFilter === 'all'
              ? 'bg-blue-50/50 border-[#0078D4] ring-2 ring-[#0078D4]/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
          title="Click to view all personnel"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Personnel</span>
            {alsFilter === 'all' && leadFilter === 'all' && adminFilter === 'all' && domainFilter === 'all' && (
              <span className="text-[10px] bg-[#0078D4] text-white px-1.5 py-0.2 rounded font-semibold">All</span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{users.length}</div>
          <div className="text-[11px] text-[#0078D4] mt-1 font-medium flex items-center justify-between">
            <span>Show all staff</span>
            <span className="text-slate-400">↳</span>
          </div>
        </button>

        {/* Box 2: ALS Qualified */}
        <button
          type="button"
          onClick={() => setAlsFilter(alsFilter === 'yes' ? 'all' : 'yes')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            alsFilter === 'yes'
              ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
          title="Click to filter personnel with ALS qualification"
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
            <span>ALS Qualified</span>
            {alsFilter === 'yes' && (
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">Filtered</span>
            )}
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">
            {users.filter(u => u.isAls).length}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center justify-between">
            <span>{alsFilter === 'yes' ? 'Showing ALS only' : 'Filter ALS staff'}</span>
            <span>↳</span>
          </div>
        </button>

        {/* Box 3: Station Leads */}
        <button
          type="button"
          onClick={() => setLeadFilter(leadFilter === 'yes' ? 'all' : 'yes')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            leadFilter === 'yes'
              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
          }`}
          title="Click to filter personnel with Station / Duty Lead role"
        >
          <div className="flex items-center justify-between text-xs font-medium text-blue-700">
            <span>Lead Qualified</span>
            {leadFilter === 'yes' && (
              <span className="text-[10px] bg-[#0078D4] text-white px-1.5 py-0.2 rounded font-semibold">Filtered</span>
            )}
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1 tabular-nums">
            {users.filter(u => u.isLead).length}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 font-medium flex items-center justify-between">
            <span>{leadFilter === 'yes' ? 'Showing Leads only' : 'Filter Lead staff'}</span>
            <span>↳</span>
          </div>
        </button>

        {/* Box 4: Administrators */}
        <button
          type="button"
          onClick={() => setAdminFilter(adminFilter === 'admin' ? 'all' : 'admin')}
          className={`text-left p-4 rounded-xl shadow-xs transition cursor-pointer border ${
            adminFilter === 'admin'
              ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
          }`}
          title="Click to filter Administrator accounts"
        >
          <div className="flex items-center justify-between text-xs font-medium text-purple-700">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Administrators</span>
            </div>
            {adminFilter === 'admin' && (
              <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-semibold">Filtered</span>
            )}
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-1 tabular-nums">
            {users.filter(u => u.isAdmin).length}
          </div>
          <div className="text-[11px] text-purple-700 mt-1 font-medium flex items-center justify-between">
            <span>{adminFilter === 'admin' ? 'Showing Admins only' : 'Filter Admin staff'}</span>
            <span>↳</span>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, or U-Number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
            />
          </div>

          {/* ALS Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ALS Qualification</label>
            <select
              value={alsFilter}
              onChange={e => setAlsFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">All Personnel</option>
              <option value="yes">ALS Qualified (Y)</option>
              <option value="no">Non-ALS (N)</option>
            </select>
          </div>

          {/* Lead Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Lead Station Role</label>
            <select
              value={leadFilter}
              onChange={e => setLeadFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">All Personnel</option>
              <option value="yes">Lead Role (Y)</option>
              <option value="no">Non-Lead (N)</option>
            </select>
          </div>

          {/* Domain Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Email Domain</label>
            <select
              value={domainFilter}
              onChange={e => setDomainFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">All Domains</option>
              <option value="dlh.de">@dlh.de</option>
              <option value="lhgroup.de">@lhgroup.de</option>
              <option value="swiss.com">@swiss.com</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 gap-2">
          <div>
            Showing <strong className="text-slate-900">{filteredUsers.length}</strong> of {users.length} staff members
          </div>

          {/* Quick Domain Filter Boxes */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 mr-1">Domains:</span>
            <button
              type="button"
              onClick={() => setDomainFilter('all')}
              className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                domainFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Domains ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setDomainFilter('dlh.de')}
              className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                domainFilter === 'dlh.de'
                  ? 'bg-[#0078D4] text-white border-[#0078D4]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
              }`}
            >
              @dlh.de ({users.filter(u => u.email.toLowerCase().includes('dlh.de')).length})
            </button>
            <button
              type="button"
              onClick={() => setDomainFilter('lhgroup.de')}
              className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                domainFilter === 'lhgroup.de'
                  ? 'bg-[#0078D4] text-white border-[#0078D4]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
              }`}
            >
              @lhgroup.de ({users.filter(u => u.email.toLowerCase().includes('lhgroup.de')).length})
            </button>
            <button
              type="button"
              onClick={() => setDomainFilter('swiss.com')}
              className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                domainFilter === 'swiss.com'
                  ? 'bg-[#0078D4] text-white border-[#0078D4]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
              }`}
            >
              @swiss.com ({users.filter(u => u.email.toLowerCase().includes('swiss.com')).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>Filter Admin:</span>
            <button
              type="button"
              onClick={() => setAdminFilter('all')}
              className={`px-2 py-0.5 rounded ${adminFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setAdminFilter('admin')}
              className={`px-2 py-0.5 rounded ${adminFilter === 'admin' ? 'bg-purple-700 text-white font-medium' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              Admins Only
            </button>
            <button
              type="button"
              onClick={() => setAdminFilter('standard')}
              className={`px-2 py-0.5 rounded ${adminFilter === 'standard' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              Standard Staff
            </button>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">UNUMBER</th>
                <th className="py-3 px-4 font-semibold">NAMES</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold text-center">ALS</th>
                <th className="py-3 px-4 font-semibold text-center">Lead</th>
                <th className="py-3 px-4 font-semibold text-center">Role / Admin</th>
                <th className="py-3 px-4 font-semibold">Compliance Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const comp = userComplianceMap.get(user.id) || {
                    assigned: 0,
                    confirmed: 0,
                    pending: 0,
                    rate: 100,
                  };
                  const isCurrent = user.id === currentUser.id;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition ${isCurrent ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                        {user.uNumber}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-100 text-[#0078D4] px-1.5 py-0.2 rounded font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{user.title || user.department || 'Station Team'}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            if (user.email.includes('dlh.de')) setDomainFilter('dlh.de');
                            else if (user.email.includes('lhgroup.de')) setDomainFilter('lhgroup.de');
                            else if (user.email.includes('swiss.com')) setDomainFilter('swiss.com');
                          }}
                          className="text-slate-600 hover:text-[#0078D4] hover:underline cursor-pointer text-left"
                          title="Click to filter roster by this email domain"
                        >
                          {user.email}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold">
                        {user.isAls ? (
                          <button
                            type="button"
                            onClick={() => setAlsFilter('yes')}
                            className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition cursor-pointer"
                            title="Click to filter by ALS Qualified staff"
                          >
                            Y
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold">
                        {user.isLead ? (
                          <button
                            type="button"
                            onClick={() => setLeadFilter('yes')}
                            className="text-[#0078D4] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition cursor-pointer"
                            title="Click to filter by Station Lead staff"
                          >
                            Y
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                          Standard Staff
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                comp.rate === 100
                                  ? 'bg-emerald-500'
                                  : comp.rate >= 50
                                  ? 'bg-[#0078D4]'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${comp.rate}%` }}
                            />
                          </div>
                          <span className="tabular-nums font-mono text-[11px] text-slate-700">
                            {comp.confirmed}/{comp.assigned} ({comp.rate}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1 whitespace-nowrap">
                        {/* Account Status Badge */}
                        {user.accountStatus === 'disabled' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 mr-1">
                            Deactivated
                          </span>
                        )}

                        {/* Admin Action 1: Change Registered Email (Requirement 9 & 11) */}
                        <button
                          type="button"
                          onClick={() => setUserForEmailChange(user)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded transition inline-flex items-center gap-1 text-[11px] font-medium"
                          title="Change Registered Login Email (Invalidates sessions & tokens)"
                        >
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>Change Email</span>
                        </button>

                        {/* Admin Action 2: Reset / Reissue Magic Link (Requirement 9) */}
                        <button
                          type="button"
                          onClick={() => handleReissueMagicLink(user)}
                          disabled={actionLoadingUserId === user.id || user.accountStatus === 'disabled'}
                          className="p-1.5 text-slate-500 hover:text-[#0078D4] hover:bg-blue-50 rounded transition disabled:opacity-40"
                          title="Invalidate sessions and send new magic login link"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${actionLoadingUserId === user.id ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Admin Action 3: Disable / Reactivate User (Requirement 9) */}
                        <button
                          type="button"
                          onClick={() => handleToggleAccountStatus(user)}
                          disabled={isCurrent}
                          className={`p-1.5 rounded transition ${
                            isCurrent
                              ? 'text-slate-200 cursor-not-allowed'
                              : user.accountStatus === 'disabled'
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                          title={user.accountStatus === 'disabled' ? 'Reactivate staff account' : 'Deactivate staff account'}
                        >
                          {user.accountStatus === 'disabled' ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Edit / Amend staff details */}
                        <button
                          type="button"
                          onClick={() => setEditingStaff(user)}
                          className="p-1.5 text-slate-500 hover:text-[#0078D4] hover:bg-blue-50 rounded transition"
                          title="Amend / Edit Staff Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete staff */}
                        <button
                          type="button"
                          onClick={() => handleDeleteStaffWithConfirm(user)}
                          disabled={isCurrent}
                          className={`p-1.5 rounded transition ${
                            isCurrent
                              ? 'text-slate-200 cursor-not-allowed'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title="Delete staff member from roster"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <StaffEditModal
          initialStaff={null}
          existingUsers={users}
          onSave={newStaff => {
            onAddStaff(newStaff);
            showToast(`Staff member "${newStaff.name}" (${newStaff.uNumber}) added successfully.`);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Amend / Edit Staff Modal */}
      {editingStaff && (
        <StaffEditModal
          initialStaff={editingStaff}
          existingUsers={users}
          onSave={updatedStaff => {
            onUpdateStaff(updatedStaff);
            showToast(`Profile for "${updatedStaff.name}" (${updatedStaff.uNumber}) updated successfully.`);
          }}
          onClose={() => setEditingStaff(null)}
        />
      )}

      {/* Import Staff Modal (XLSX, CSV, PDF) */}
      {showImportModal && (
        <ImportStaffModal
          existingUsers={users}
          onApplyImport={(updatedList, summaryMsg) => {
            onBulkUpdateStaff(updatedList, summaryMsg);
            showToast(summaryMsg);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Admin Action Modal: Change Registered Login Email (Requirement 9) */}
      {userForEmailChange && (
        <ChangeEmailModal
          user={userForEmailChange}
          onSuccess={(updatedUser, msg) => {
            onUpdateStaff(updatedUser);
            showToast(msg);
          }}
          onClose={() => setUserForEmailChange(null)}
        />
      )}

      {/* Admin Action Modal: Approved Private Users Registry (Requirement 8 & 9) */}
      {showApprovedModal && (
        <ApprovedUsersManager
          onClose={() => setShowApprovedModal(false)}
          onRefreshRoster={() => {
            window.dispatchEvent(new Event('read_and_sign_data_changed'));
          }}
        />
      )}

      {/* Admin Action Modal: Authentication & Identity Audit Trail (Requirement 9) */}
      {showAuditModal && (
        <AuditLogModal
          onClose={() => setShowAuditModal(false)}
        />
      )}
    </div>
  );
}
