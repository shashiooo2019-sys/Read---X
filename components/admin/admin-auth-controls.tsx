'use client';

import React, { useState, useEffect } from 'react';
import { User, ApprovedUser, AuthAuditLogItem } from '@/lib/types';
import {
  Shield,
  Mail,
  Lock,
  UserCheck,
  UserX,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  History,
  Plus,
  Key,
  ExternalLink,
} from 'lucide-react';

interface ChangeEmailModalProps {
  user: User;
  onSuccess: (updatedUser: User, msg: string) => void;
  onClose: () => void;
}

export function ChangeEmailModal({ user, onSuccess, onClose }: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState('');
  const [releaseDeviceLock, setReleaseDeviceLock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setErrorMessage('The new email must be different from the currently registered email.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_email',
          userId: user.id,
          newEmail: newEmail.trim().toLowerCase(),
          updateDeviceLock: releaseDeviceLock,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.user, data.message);
        onClose();
      } else {
        setErrorMessage(data.message || 'Failed to change registered email.');
      }
    } catch {
      setErrorMessage('Network error while updating registered email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">Change Registered Login Email</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 leading-relaxed">
            <strong className="block font-semibold mb-1">Administrative Security Protocol:</strong>
            Changing this email will immediately:
            <br />1. Invalidate all active browser sessions for <strong>{user.name}</strong>.
            <br />2. Invalidate all pending magic links.
            <br />3. Require re-authentication via the newly registered email address.
            <br />4. Record an immutable audit log entry.
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Target Staff Member</label>
            <div className="p-2.5 bg-slate-100 rounded text-slate-900 font-medium">
              {user.name} ({user.uNumber})
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Current Registered Email</label>
            <div className="p-2.5 bg-slate-100 rounded font-mono text-slate-700">
              {user.email}
            </div>
          </div>

          <div>
            <label htmlFor="new-reg-email" className="block text-slate-700 font-semibold mb-1">
              New Registered Email Address
            </label>
            <input
              id="new-reg-email"
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="e.g. new.email@dlh.de or approved@swiss.com"
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
              required
              autoFocus
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={releaseDeviceLock}
              onChange={e => setReleaseDeviceLock(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-[#0078D4] rounded border-slate-300"
            />
            <span className="text-slate-600">
              Update device lock to new address so the user can sign in on their current device.
            </span>
          </label>

          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold rounded shadow-xs"
            >
              {isSubmitting ? 'Updating...' : 'Authorize Email Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ApprovedUsersManagerProps {
  onClose: () => void;
  onRefreshRoster?: () => void;
}

export function ApprovedUsersManager({ onClose, onRefreshRoster }: ApprovedUsersManagerProps) {
  const [approvedList, setApprovedList] = useState<ApprovedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New approval form
  const [newName, setNewName] = useState('');
  const [newWorkEmail, setNewWorkEmail] = useState('');
  const [newLoginEmail, setNewLoginEmail] = useState('');
  const [newUNumber, setNewUNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await fetch('/api/auth/admin/users');
        if (res.ok && active) {
          const data = await res.json();
          setApprovedList(data.approvedPrivateUsers || []);
        }
      } catch {
        // ignore
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const fetchApproved = async () => {
    try {
      const res = await fetch('/api/auth/admin/users');
      if (res.ok) {
        const data = await res.json();
        setApprovedList(data.approvedPrivateUsers || []);
      }
    } catch {
      // ignore
    }
  };

  const handleAddApproved = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newWorkEmail || !newLoginEmail) return;

    setSubmittingAdd(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_private_email',
          name: newName,
          workEmail: newWorkEmail,
          loginEmail: newLoginEmail,
          uNumber: newUNumber,
          notes: newNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg(`Approved ${newLoginEmail} successfully.`);
        setNewName('');
        setNewWorkEmail('');
        setNewLoginEmail('');
        setNewUNumber('');
        setNewNotes('');
        setShowAddForm(false);
        fetchApproved();
        onRefreshRoster?.();
      } else {
        setMsg(data.message || 'Failed to approve user.');
      }
    } catch {
      setMsg('Network error.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleRevoke = async (loginEmail: string) => {
    if (!window.confirm(`Revoke approved private email status for ${loginEmail}?`)) return;
    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_private_email',
          loginEmail,
        }),
      });
      if (res.ok) {
        fetchApproved();
        onRefreshRoster?.();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 bg-[#0078D4] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-sm">Approved Private Email Directory (Requirement 8)</h3>
              <p className="text-[11px] text-blue-100">
                Pre-approve contractor & external private emails (Gmail, Outlook) to access Read & Sign
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {msg && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-[#0078D4] rounded">
              {msg}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">
              Registered Approved Whitelist ({approvedList.length} Accounts)
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white rounded font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel Form' : 'Approve Private Email'}</span>
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddApproved} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Authorize New Private Email Address
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">M365 Work Email</label>
                  <input
                    type="email"
                    value={newWorkEmail}
                    onChange={e => setNewWorkEmail(e.target.value)}
                    placeholder="e.g. jane.doe@swiss.com"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Approved Private Login Email</label>
                  <input
                    type="email"
                    value={newLoginEmail}
                    onChange={e => setNewLoginEmail(e.target.value)}
                    placeholder="e.g. jane.doe@gmail.com"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Staff ID / U-Number</label>
                  <input
                    type="text"
                    value={newUNumber}
                    onChange={e => setNewUNumber(e.target.value)}
                    placeholder="e.g. U799201"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 mb-1">Approval Justification / Notes</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="e.g. Station contractor / mobile line approved by Duty Manager"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs"
                >
                  {submittingAdd ? 'Approving...' : 'Grant Private Email Approval'}
                </button>
              </div>
            </form>
          )}

          {/* Table of Approved Users */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Work Email</th>
                  <th className="py-2 px-3">Approved Login Email</th>
                  <th className="py-2 px-3">Approved By</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvedList.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{item.workEmail}</td>
                    <td className="py-2 px-3 font-mono text-[#0078D4] font-medium">{item.loginEmail}</td>
                    <td className="py-2 px-3 text-slate-500">{item.approvedBy}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {item.status === 'approved' && (
                        <button
                          onClick={() => handleRevoke(item.loginEmail)}
                          className="text-red-600 hover:underline font-medium text-[11px]"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface AuditLogModalProps {
  onClose: () => void;
}

export function AuditLogModal({ onClose }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuthAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/admin/users');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.auditLogs || []);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Authentication & Identity Change Audit Trail</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          <p className="text-slate-500 text-[11px]">
            Immutable record of all login link issuances, verified sessions, administrator email updates, and access approvals.
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No audit events recorded yet.</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-3 bg-white hover:bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 font-mono text-[11px]">
                      {log.action.toUpperCase()}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-700">{log.details}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>Actor: {log.performedBy}</span>
                    {log.ipAddress && <span>· IP: {log.ipAddress}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
