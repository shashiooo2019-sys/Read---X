'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  Mail,
  ArrowRight,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface GoogleLoginProps {
  onLoginSuccess: (user: User) => void;
  deviceLockedEmail?: string | null;
}

export function GoogleLogin({ onLoginSuccess, deviceLockedEmail }: GoogleLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeviceLocked, setIsDeviceLocked] = useState(!!deviceLockedEmail);
  const [lockedAccountEmail, setLockedAccountEmail] = useState(deviceLockedEmail || '');

  // Auth steps: 'email' | 'password_setup' | 'password_login'
  const [authStep, setAuthStep] = useState<'email' | 'password_setup' | 'password_login'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Admin login states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    async function checkDevice() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.deviceLockedEmail) {
          setIsDeviceLocked(true);
          setLockedAccountEmail(data.deviceLockedEmail);
        }
      } catch (err) {
        console.error('Failed to query device status', err);
      }
    }
    checkDevice();
  }, []);

  // Step 1: Submit work email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid work email address (e.g., name@dlh.de).');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/work-email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
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
          {/* Device Lock Notice if applicable */}
          {isDeviceLocked && lockedAccountEmail && (
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-4 text-xs text-amber-200 space-y-1">
              <div className="flex items-center space-x-2 font-semibold text-amber-300">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Device Securely Bound</span>
              </div>
              <p>
                This device is bound to account: <strong className="text-white underline">{lockedAccountEmail}</strong>.
              </p>
            </div>
          )}

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
                  <div className="text-center space-y-1.5">
                    <h2 className="text-sm font-semibold text-slate-200">Staff Work Email Sign-In</h2>
                    <p className="text-xs text-slate-400">
                      Enter your authorized work email address to begin sign-in.
                    </p>
                  </div>

                  {/* Remarks for Non-dlh.de / UPN sign-in */}
                  <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl text-[11px] text-slate-300 space-y-1.5">
                    <p className="font-semibold text-blue-300">Remarks:</p>
                    <p className="text-slate-400 leading-relaxed">
                      If you do not have a dlh.de sign-in, enter the UPN Number (Microsoft sign-in email) as below:
                    </p>
                    <p className="font-mono text-amber-300 bg-slate-950 px-2 py-1 rounded text-center text-[10px] leading-tight">
                      If your U number is U123456 then in work email address add: u123456.sp@lhgroup.de
                    </p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Work Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. your.name@dlh.de"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-blue-600/20"
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
    </div>
  );
}
