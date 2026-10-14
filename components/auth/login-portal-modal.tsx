'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import {
  Shield,
  UserCheck,
  Users,
  Search,
  LogIn,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Building,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { AppBanner } from '@/components/common/app-banner';

interface LoginPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLogin: (user: User) => void;
  onUpdateUserPassword: (userId: string, newPass: string) => Promise<void>;
}

export function LoginPortalModal({
  isOpen,
  onClose,
  users,
  onLogin,
  onUpdateUserPassword,
}: LoginPortalModalProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'admin' | 'superadmin'>('roster');

  // Staff Roster Login states
  const [emailInput, setEmailInput] = useState('');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [step, setStep] = useState<'email' | 'first_time_pass' | 'returning_pass'>('email');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  // Admin login states
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Super Admin login states
  const [superUser, setSuperUser] = useState('');
  const [superPass, setSuperPass] = useState('');
  const [superError, setSuperError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Live Auto-Suggestions for Email Input
  const emailSuggestions = users.filter((u) => {
    if (!emailInput.trim() || step !== 'email') return false;
    const q = emailInput.toLowerCase().trim();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.uNumber && u.uNumber.toLowerCase().includes(q))
    );
  });

  // Handle Email Submit for Staff Users
  const handleStaffEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRosterError(null);

    const targetEmail = emailInput.trim().toLowerCase();
    if (!targetEmail) {
      setRosterError('Please enter your staff email address.');
      return;
    }

    const found = users.find(
      (u) =>
        (u.email && u.email.trim().toLowerCase() === targetEmail) ||
        (u.uNumber && u.uNumber.trim().toLowerCase() === targetEmail)
    );

    if (found) {
      setMatchedUser(found);
      if (found.isPasswordSet && found.password) {
        setStep('returning_pass');
      } else {
        setStep('first_time_pass');
      }
    } else {
      setRosterError(
        `Email '${emailInput}' was not found in the active Staff Database. Please check spelling or contact Admin.`
      );
    }
  };

  const selectSuggestedUser = (u: User) => {
    setEmailInput(u.email);
    setMatchedUser(u);
    setRosterError(null);
    if (u.isPasswordSet && u.password) {
      setStep('returning_pass');
    } else {
      setStep('first_time_pass');
    }
  };

  // Handle First Time Password Creation
  const handleCreateFirstTimePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRosterError(null);

    if (!newPassword || newPassword.length < 4) {
      setRosterError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRosterError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!matchedUser) return;

    setIsSavingPass(true);
    try {
      await onUpdateUserPassword(matchedUser.id, newPassword);
      const updatedUserObj: User = {
        ...matchedUser,
        password: newPassword,
        isPasswordSet: true,
      };
      onLogin(updatedUserObj);
    } finally {
      setIsSavingPass(false);
    }
  };

  // Handle Returning User Password Submit
  const handleReturningPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRosterError(null);

    if (!matchedUser) return;

    if (enteredPassword === matchedUser.password) {
      onLogin(matchedUser);
    } else {
      setRosterError('Incorrect password. Please try again or ask Admin to reset your password.');
    }
  };

  // Handle Admin Log-In
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const inputU = adminUser.trim().toLowerCase();
    const isDefaultAdminPass = adminPass === 'Admin220!';

    if ((inputU === 'admin' || inputU === 'admin@groundops.com') && isDefaultAdminPass) {
      const defaultAdminObj: User = {
        id: 'usr-admin-1',
        name: 'Duty Manager Admin',
        email: 'admin@groundops.com',
        role: 'admin',
        team: 'Ramp Services',
        department: 'Ground Operations',
      };
      onLogin(defaultAdminObj);
      return;
    }

    // Check registered admin user in database
    const registeredAdmin = users.find(
      (u) =>
        (u.role === 'admin' || u.isSuperAdmin) &&
        (u.email?.toLowerCase() === inputU || u.name?.toLowerCase() === inputU)
    );

    if (registeredAdmin) {
      if (registeredAdmin.password ? adminPass === registeredAdmin.password : isDefaultAdminPass) {
        onLogin(registeredAdmin);
      } else {
        setAdminError('Incorrect password for Administrator account.');
      }
    } else {
      setAdminError('Invalid Administrator credentials. Please check your username and password.');
    }
  };

  // Handle Super Admin Log-In
  const handleSuperAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuperError(null);

    const inputU = superUser.trim().toLowerCase();
    const isDefaultSuperPass = superPass === 'SuperAdmin220!';

    if ((inputU === 'superadmin' || inputU === 'sarah.jenkins@groundops.com') && isDefaultSuperPass) {
      const defaultSuperObj: User = {
        id: 'usr-1',
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@groundops.com',
        role: 'admin',
        isSuperAdmin: true,
        team: 'Flight Safety & Operations',
        department: 'Ground Operations',
      };
      onLogin(defaultSuperObj);
      return;
    }

    const registeredSuper = users.find(
      (u) =>
        u.isSuperAdmin &&
        (u.email?.toLowerCase() === inputU || u.name?.toLowerCase() === inputU)
    );

    if (registeredSuper) {
      if (registeredSuper.password ? superPass === registeredSuper.password : isDefaultSuperPass) {
        onLogin(registeredSuper);
      } else {
        setSuperError('Incorrect password for Super Admin account.');
      }
    } else {
      setSuperError('Invalid Super Admin credentials. Please check your username and password.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header Banner */}
        <div className="bg-[#000d21] p-3 text-white text-center relative border-b border-slate-800 shrink-0">
          <AppBanner compact className="m-0 border-0 shadow-none" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors z-20 cursor-pointer"
            title="Close login modal"
          >
            ✕
          </button>
        </div>

        {/* Login Mode Tabs */}
        <div className="grid grid-cols-3 bg-slate-100 p-2 gap-2 border-b border-slate-200 shrink-0">
          <button
            onClick={() => {
              setActiveTab('roster');
              setStep('email');
              setRosterError(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'roster'
                ? 'bg-white text-blue-700 shadow-md border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span className="truncate">Staff Email Log-In</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('admin');
              setAdminError(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'admin'
                ? 'bg-white text-indigo-700 shadow-md border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="truncate">Admin Log-In</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('superadmin');
              setSuperError(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'superadmin'
                ? 'bg-white text-purple-700 shadow-md border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="truncate">Super Admin</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: STAFF USER EMAIL LOGIN */}
          {activeTab === 'roster' && (
            <div className="space-y-5">
              {step === 'email' && (
                <>
                  <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 leading-relaxed">
                      <p className="font-bold">Staff Email Log-In</p>
                      <p className="mt-0.5 text-blue-800">
                        Enter your staff email address. Live suggestions will appear as you type.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleStaffEmailSubmit} className="space-y-4">
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Staff Roster Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. marcus.vance@groundops.com"
                          value={emailInput}
                          onChange={(e) => {
                            setEmailInput(e.target.value);
                            setRosterError(null);
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                        />
                      </div>

                      {/* Live Suggestions Dropdown */}
                      {emailSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 divide-y divide-slate-100">
                          {emailSuggestions.map((u) => (
                            <button
                              type="button"
                              key={u.id}
                              onClick={() => selectSuggestedUser(u)}
                              className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition flex items-center justify-between group"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                                  {u.name}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500">{u.email}</p>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-800">
                                {u.uNumber || 'UNUMBER'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {rosterError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{rosterError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Continue Log-In</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}

              {/* STEP: FIRST TIME PASSWORD SETUP */}
              {step === 'first_time_pass' && matchedUser && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                    <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <p className="font-bold">First-Time Log-In Password Setup</p>
                      <p className="mt-0.5 text-amber-800">
                        Welcome, <strong>{matchedUser.name}</strong>! This is your first time signing in. Please create a personal password for future sign-ins.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateFirstTimePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Create New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Enter secure password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {rosterError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{rosterError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                      >
                        Back
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingPass}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSavingPass ? 'Saving Password...' : 'Save Password & Log In'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP: RETURNING USER PASSWORD */}
              {step === 'returning_pass' && matchedUser && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{matchedUser.name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{matchedUser.email}</p>
                    </div>
                    <button
                      onClick={() => setStep('email')}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      Change User
                    </button>
                  </div>

                  <form onSubmit={handleReturningPasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Enter Your Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          placeholder="Enter your password"
                          value={enteredPassword}
                          onChange={(e) => {
                            setEnteredPassword(e.target.value);
                            setRosterError(null);
                          }}
                          className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {rosterError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{rosterError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            'Forgotten password? Please contact your Admin or SuperAdmin to reset your password to first-time setup mode.'
                          )
                        }
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Forgotten Password?</span>
                      </button>

                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADMIN LOG-IN */}
          {activeTab === 'admin' && (
            <div className="space-y-5">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <p className="font-bold">Administrator Credentials</p>
                  <p className="mt-0.5 text-indigo-800">
                    Restricted access. Please sign in with your administrative account credentials.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Admin Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Enter admin username or email"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Enter password"
                  />
                </div>

                {adminError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{adminError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In as Administrator</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: SUPER ADMIN LOG-IN */}
          {activeTab === 'superadmin' && (
            <div className="space-y-5">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900 leading-relaxed">
                  <p className="font-bold">Super Admin Master Credentials</p>
                  <p className="mt-0.5 text-purple-800">
                    Restricted access. Please sign in with your Super Administrator master credentials.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSuperAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Super Admin Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={superUser}
                    onChange={(e) => setSuperUser(e.target.value)}
                    placeholder="Enter super admin username or email"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Super Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={superPass}
                    onChange={(e) => setSuperPass(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="Enter password"
                  />
                </div>

                {superError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{superError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/20 transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In as Super Admin</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Ground Operations Compliance v3.5</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
