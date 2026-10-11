'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@/lib/types';
import { INITIAL_STAFF_ROSTER } from '@/lib/roster-data';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  Mail,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  Users,
  Search,
  X,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface GoogleLoginProps {
  onLoginSuccess: (user: User) => void;
  rosterUsers?: User[];
}

export function GoogleLogin({ onLoginSuccess, rosterUsers }: GoogleLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Active roster synchronized with staff directory
  const availableRoster = useMemo(() => {
    return rosterUsers && rosterUsers.length > 0 ? rosterUsers : INITIAL_STAFF_ROSTER;
  }, [rosterUsers]);

  // Auth steps: 'email' | 'password_setup' | 'password_login'
  const [authStep, setAuthStep] = useState<'email' | 'password_setup' | 'password_login'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Roster Directory modal state
  const [showRosterDirectory, setShowRosterDirectory] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Admin login states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Check if current input matches any staff roster member (by email or U-number)
  const matchedRosterUser = useMemo(() => {
    const q = email.trim().toLowerCase();
    if (!q) return null;
    return (
      availableRoster.find(
        u =>
          u.email.toLowerCase() === q ||
          u.loginEmail?.toLowerCase() === q ||
          u.workEmail?.toLowerCase() === q ||
          u.uNumber.toUpperCase() === q.toUpperCase()
      ) || null
    );
  }, [email, availableRoster]);

  // Autocomplete suggestions based on typed input
  const suggestions = useMemo(() => {
    const q = email.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return availableRoster
      .filter(
        u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.uNumber.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [email, availableRoster]);

  // Filtered staff list in the roster directory modal
  const filteredDirectoryStaff = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return availableRoster;
    return availableRoster.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uNumber.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        (u.title && u.title.toLowerCase().includes(q))
    );
  }, [rosterSearch, availableRoster]);

  // Step 1: Submit work email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetEmail = email.trim();

    // If a roster user was matched (or if they typed a U-number), resolve to their canonical roster email
    if (matchedRosterUser) {
      targetEmail = matchedRosterUser.email;
    } else {
      const uFound = availableRoster.find(
        u => u.uNumber.toUpperCase() === targetEmail.toUpperCase()
      );
      if (uFound) {
        targetEmail = uFound.email;
      }
    }

    if (!targetEmail || (!targetEmail.includes('@') && !matchedRosterUser)) {
      setErrorMessage('Please enter a valid work email address (e.g. name@dlh.de or U-number).');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setShowSuggestions(false);

    try {
      const res = await fetch('/api/auth/work-email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.email) {
          setEmail(data.email);
        }
        if (data.needsPasswordSetup) {
          setAuthStep('password_setup');
          setSuccessMessage(data.message);
        } else if (data.needsPassword) {
          setAuthStep('password_login');
        } else if (data.user) {
          onLoginSuccess(data.user);
        }
      } else {
        setErrorMessage(data.message || 'Authorization failed for this email address.');
      }
    } catch (err) {
      console.error('Email check error:', err);
      setErrorMessage('Network error communicating with authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2A: Create and save password (First-time sign-in)
  const handlePasswordSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: newPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('Password created successfully! Please sign in with your work email and new password.');
        setAuthStep('password_login');
        setPassword('');
      } else {
        setErrorMessage(data.message || 'Failed to create password.');
      }
    } catch (err) {
      setErrorMessage('Network error while saving password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2B: Sign in with Work Email + Password
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/work-email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.message || 'Invalid password.');
      }
    } catch (err) {
      console.error('Password login error:', err);
      setErrorMessage('Network error during sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setErrorMessage('Please enter both admin username and password.');
      return;
    }
    setAdminLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.message || 'Invalid admin credentials.');
      }
    } catch (err) {
      setErrorMessage('Network error during admin login.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-blue-300" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Read & Sign Compliance Manager</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Lufthansa Group & Swiss International Air Lines Station Compliance
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/50 border border-rose-600/50 rounded-xl p-4 text-xs text-rose-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-emerald-950/50 border border-emerald-600/50 rounded-xl p-4 text-xs text-emerald-200 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">{successMessage}</div>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">Processing authentication...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* STEP 1: Enter Work Email */}
              {authStep === 'email' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h2 className="text-sm font-semibold text-slate-200">Staff Work Email Sign-In</h2>
                    <p className="text-xs text-slate-400">
                      Enter your authorized work email address to begin sign-in.
                    </p>
                  </div>

                  {/* Sync status with staff roster */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-semibold text-slate-200">Staff Roster Synced:</span>
                      <span className="text-slate-400">{availableRoster.length} Accounts</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRosterDirectory(true)}
                      className="text-blue-400 hover:text-blue-300 font-medium hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                    >
                      <Search className="w-3 h-3" />
                      <span>Lookup Email</span>
                    </button>
                  </div>

                  {/* Remarks for Non-dlh.de / UPN sign-in */}
                  <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl text-[11px] text-slate-300 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-blue-300">Sign-in Email Synchronization:</p>
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> In Sync
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Enter your registered email from the staff roster (<span className="text-slate-300 font-mono">@dlh.de</span>, <span className="text-slate-300 font-mono">@swiss.com</span>, <span className="text-slate-300 font-mono">@lhgroup.de</span>), or your Staff U-Number directly:
                    </p>
                    <p className="font-mono text-amber-300 bg-slate-950 px-2 py-1 rounded text-center text-[10px] leading-tight">
                      Tip: Typing your U-Number (e.g. U086936) automatically resolves your registered roster email.
                    </p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                          Work Email Address or U-Number
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRosterDirectory(true)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          <span>Select from Roster</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="e.g. your.name@dlh.de or U123456"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      {/* Autocomplete suggestions dropdown */}
                      {showSuggestions && !matchedRosterUser && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden divide-y divide-slate-800">
                          <div className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-950 flex items-center justify-between">
                            <span>Matching Staff Roster Emails:</span>
                            <button
                              type="button"
                              onClick={() => setShowSuggestions(false)}
                              className="text-slate-500 hover:text-slate-300"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {suggestions.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setEmail(u.email);
                                setShowSuggestions(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-800 transition flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  <span className="font-mono text-[10px] text-slate-400">({u.uNumber})</span>
                                </div>
                                <div className="text-[11px] font-mono text-blue-400 mt-0.5">{u.email}</div>
                              </div>
                              <span className="text-[10px] text-slate-500">{u.department || 'Operations'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Verified Roster Match Feedback */}
                    {matchedRosterUser && (
                      <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="flex-1 text-[11px] leading-tight">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{matchedRosterUser.name}</span>
                            <span className="font-mono text-[10px] text-emerald-300 bg-emerald-900/60 px-1 py-0.2 rounded">
                              {matchedRosterUser.uNumber}
                            </span>
                            {matchedRosterUser.isAls && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">ALS</span>
                            )}
                            {matchedRosterUser.isLead && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded">Lead</span>
                            )}
                          </div>
                          <div className="text-emerald-300/90 text-[10px] mt-1 font-mono">
                            Registered Roster Email: <strong>{matchedRosterUser.email}</strong>
                          </div>
                          <div className="text-[10px] text-emerald-400/80 mt-0.5">
                            {matchedRosterUser.department || 'Station Operations'} · {matchedRosterUser.title || 'Staff Member'}
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
                    >
                      <span>Continue with Work Email</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2A: Password Setup (First-time sign-in) */}
              {authStep === 'password_setup' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-500/10 rounded-xl mb-1 border border-amber-500/20">
                      <KeyRound className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-200">First-Time Password Setup</h2>
                    <p className="text-xs text-slate-400">
                      For <strong className="text-white">{email}</strong>: Create and save a secure password for all future sign-ins.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordSetupSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Create Password (min. 6 chars)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter secure password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-amber-600/20"
                    >
                      <span>Create & Save Password</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthStep('email')}
                      className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      ← Back to Email Entry
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2B: Password Sign-In (Subsequent visits) */}
              {authStep === 'password_login' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <h2 className="text-sm font-semibold text-slate-200">Sign In with Password</h2>
                    <p className="text-xs text-slate-400">
                      Enter your password for <strong className="text-white">{email}</strong>.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordLoginSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        required
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-blue-600/20"
                    >
                      <span>Sign In to App</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('email');
                        setPassword('');
                      }}
                      className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      ← Use a different email
                    </button>
                  </form>
                </div>
              )}

              {/* Separate Administrator Login */}
              <div className="pt-4 border-t border-slate-700/60">
                <form onSubmit={handleAdminSubmit} className="space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <label className="block text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Administrator Login
                    </label>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Admin Username (admin)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Admin Password (Admin220!)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1 transition-colors shadow-lg shadow-emerald-600/20"
                    >
                      {adminLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Signing in as Admin...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In as Administrator</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="text-center pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
            Secure Work Email & Password Verification · Read & Sign Compliance
          </div>
        </div>
      </div>

      {/* Staff Roster Directory Modal */}
      {showRosterDirectory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Staff Roster Sign-In Directory</h3>
                  <p className="text-[11px] text-slate-400">
                    {availableRoster.length} Synchronized Staff Accounts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterDirectory(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 bg-slate-900 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search by staff name, U-number, or email address..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2">
              {filteredDirectoryStaff.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No staff members match &quot;{rosterSearch}&quot;.
                </div>
              ) : (
                filteredDirectoryStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-3 hover:bg-slate-800/70 rounded-xl transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs truncate">
                          {staff.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                          {staff.uNumber}
                        </span>
                        {staff.isAls && (
                          <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 px-1 rounded">
                            ALS
                          </span>
                        )}
                        {staff.isLead && (
                          <span className="text-[9px] font-semibold bg-purple-500/20 text-purple-400 px-1 rounded">
                            Lead
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-blue-400 mt-1 truncate">
                        {staff.email}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {staff.department || 'Ground Operations'} · {staff.title || 'Station Staff'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(staff.email);
                        setShowRosterDirectory(false);
                        setErrorMessage('');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shrink-0 transition shadow cursor-pointer flex items-center gap-1"
                    >
                      <span>Select</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Showing {filteredDirectoryStaff.length} of {availableRoster.length} staff</span>
              <button
                type="button"
                onClick={() => setShowRosterDirectory(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
