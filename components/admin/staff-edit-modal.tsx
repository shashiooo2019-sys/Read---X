'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { X, UserPlus, Check, Shield, AlertCircle, Key, RefreshCw } from 'lucide-react';

interface StaffEditModalProps {
  initialStaff?: User | null; // If null, creating new staff
  onSave: (staff: User) => void;
  onClose: () => void;
  existingUsers: User[];
}

export function StaffEditModal({
  initialStaff,
  onSave,
  onClose,
  existingUsers,
}: StaffEditModalProps) {
  const isEditing = !!initialStaff;

  const [uNumber, setUNumber] = useState(initialStaff?.uNumber || '');
  const [name, setName] = useState(initialStaff?.name || '');
  const [email, setEmail] = useState(initialStaff?.email || '');
  const [isAls, setIsAls] = useState(initialStaff?.isAls ?? false);
  const [isLead, setIsLead] = useState(initialStaff?.isLead ?? false);
  const [department, setDepartment] = useState(initialStaff?.department || 'Station Operations');
  const [title, setTitle] = useState(initialStaff?.title || '');
  const [error, setError] = useState('');
  const [clearingPassword, setClearingPassword] = useState(false);

  const handleClearPassword = async () => {
    if (!initialStaff) return;
    if (!window.confirm(`Are you sure you want to clear/reset the password for ${initialStaff.name} (${initialStaff.email})? They will be prompted to set up a new password upon next sign-in.`)) {
      return;
    }
    setClearingPassword(true);
    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_password', userId: initialStaff.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
      } else {
        alert(data.message || 'Failed to clear password.');
      }
    } catch (err) {
      alert('Network error while clearing password.');
    } finally {
      setClearingPassword(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUNumber = uNumber.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUNumber) {
      setError('Please provide a U-Number (e.g. U194888).');
      return;
    }
    if (!trimmedName) {
      setError('Please provide the staff member full name.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid organizational email address.');
      return;
    }

    // Check for duplicate U-number or email when adding new staff
    if (!isEditing) {
      const duplicateUNumber = existingUsers.some(
        u => u.uNumber.trim().toUpperCase() === trimmedUNumber
      );
      if (duplicateUNumber) {
        setError(`A staff member with U-Number "${trimmedUNumber}" already exists.`);
        return;
      }

      const duplicateEmail = existingUsers.some(
        u => u.email.trim().toLowerCase() === trimmedEmail
      );
      if (duplicateEmail) {
        setError(`A staff member with email "${trimmedEmail}" already exists.`);
        return;
      }
    }

    const savedUser: User = {
      id: initialStaff?.id || `u-${trimmedUNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      uNumber: trimmedUNumber,
      name: trimmedName,
      email: trimmedEmail,
      isAls,
      isLead,
      isAdmin: Boolean(
        initialStaff &&
        (initialStaff.uNumber?.toUpperCase() === 'ADMIN' ||
          initialStaff.id === 'u-admin' ||
          initialStaff.email?.toLowerCase() === 'admin@compliance.system')
      ),
      department: department.trim() || 'Station Operations',
      title: title.trim() || (isLead ? 'Station Lead' : isAls ? 'ALS Specialist' : 'Ground Team Member'),
    };

    onSave(savedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? 'Amend / Edit Staff Details' : 'Add New Staff Member'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? `Updating profile for ${initialStaff.name} (${initialStaff.uNumber})`
                : 'Register an employee into the compliance roster'}
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: U-Number and Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                UNUMBER <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={uNumber}
                onChange={e => setUNumber(e.target.value)}
                placeholder="e.g. U194888 or SAKS"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                NAMES (Full Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                required
              />
            </div>
          </div>

          {/* Row 2: Organizational Email */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Email (M365 Username) <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. jane.doe@dlh.de or u194888@lhgroup.de"
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used for Microsoft 365 Entra ID Single Sign-On and compliance verification.
            </p>
          </div>

          {/* Target Group Qualifications: ALS & Lead */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="font-semibold text-slate-900">Target Group Qualifications</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAls}
                  onChange={e => setIsAls(e.target.checked)}
                  className="w-4 h-4 text-[#0078D4] rounded border-slate-300"
                />
                <div>
                  <span className="font-medium text-slate-800">ALS Qualified</span>
                  <span className="block text-[10px] text-slate-500">Receives ALS compliance items</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isLead}
                  onChange={e => setIsLead(e.target.checked)}
                  className="w-4 h-4 text-[#0078D4] rounded border-slate-300"
                />
                <div>
                  <span className="font-medium text-slate-800">Station / Duty Lead</span>
                  <span className="block text-[10px] text-slate-500">Receives Lead compliance items</span>
                </div>
              </label>
            </div>
          </div>


          {/* Optional Department and Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="Station Operations"
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Ground Operations Lead"
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
          </div>

          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-amber-900 block">Password Setup State</span>
                <span className="text-[11px] text-amber-700">Clear password to require first-time setup again.</span>
              </div>
              <button
                type="button"
                onClick={handleClearPassword}
                disabled={clearingPassword}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{clearingPassword ? 'Clearing...' : 'Clear/Reset Password'}</span>
              </button>
            </div>
          )}

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
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Add Staff Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
