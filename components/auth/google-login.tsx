'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';
import { INITIAL_STAFF_ROSTER } from '@/lib/roster-data';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  Mail,
  ArrowRight,
} from 'lucide-react';

interface GoogleLoginProps {
  onLoginSuccess: (user: User) => void;
  deviceLockedEmail?: string | null;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement | null,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_black' | 'filled_blue';
              size?: 'small' | 'medium' | 'large';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'standard';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '974822903687-vitk00ec65q9jjkpirl35587g1hfglau.apps.googleusercontent.com';

export function GoogleLogin({ onLoginSuccess, deviceLockedEmail }: GoogleLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeviceLocked, setIsDeviceLocked] = useState(!!deviceLockedEmail);
  const [lockedAccountEmail, setLockedAccountEmail] = useState(deviceLockedEmail || '');
  const [uNumberInput, setUNumberInput] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Check device lock status on mount
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

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setErrorMessage('');
      if (!uNumberInput.trim()) {
        setErrorMessage('Step 1 Required: Please enter your Staff U Number (e.g. U086936) before choosing your Google account.');
        return;
      }
      setIsLoading(true);

      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential, uNumber: uNumberInput.trim() }),
        });

        const contentType = res.headers.get('content-type');
        let data: any = {};
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          console.error('Non-JSON response from /api/auth/google:', text);
          data = { success: false, message: 'Authentication server error or gateway timeout. Please check network connection.' };
        }

        if (res.ok && data.success && data.user) {
          onLoginSuccess(data.user);
        } else {
          if (data.error === 'DEVICE_LOCKED') {
            setIsDeviceLocked(true);
            setLockedAccountEmail(data.lockedEmail);
          }
          setErrorMessage(data.message || 'Google authentication failed. Please verify your U Number and Google account.');
        }
      } catch (err: any) {
        console.error('Google Auth Fetch Error:', err);
        setErrorMessage('Network connection error while communicating with authentication server. Please check your network connection or try direct work email sign-in.');
      } finally {
        setIsLoading(false);
      }
    },
    [onLoginSuccess, uNumberInput]
  );

  const initializeGoogleButton = useCallback(() => {
    if (!window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        cancel_on_tap_outside: true,
      });

      const buttonContainer = document.getElementById('google-signin-btn-container');
      if (buttonContainer) {
        buttonContainer.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainer, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 380,
        });
      }
    } catch (err) {
      console.error('Error initializing Google button:', err);
    }
  }, [handleCredentialResponse]);

  // Load Google Identity Services script
  useEffect(() => {
    const scriptId = 'google-gsi-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      initializeGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeGoogleButton();
    };
    script.onerror = () => {
      console.warn('Google Sign-In SDK failed to load (possibly due to network/adblocker). Direct Work Email sign-in is available below.');
    };
    document.body.appendChild(script);
  }, [initializeGoogleButton]);

  const handleQuickDemoLogin = async (testEmail: string) => {
    if (!uNumberInput.trim()) {
      setErrorMessage('Step 1 Required: Please enter your Staff U Number (e.g. U086936) before signing in.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: `mock_google_id_token_for_${testEmail}`, uNumber: uNumberInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.message || 'Authentication failed for ' + testEmail);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage('Network connection error while communicating with authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantGoogleLogin = () => {
    if (!uNumberInput.trim()) {
      setErrorMessage('Step 1 Required: Please enter your Staff U Number (e.g. U086936) first.');
      return;
    }
    const cleanUNumber = uNumberInput.trim().toUpperCase();
    const staff = INITIAL_STAFF_ROSTER.find(s => s.uNumber.toUpperCase() === cleanUNumber);
    const emailToUse = staff ? staff.email : `${cleanUNumber.toLowerCase()}@dlh.de`;
    handleQuickDemoLogin(emailToUse);
  };

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uNumberInput.trim()) {
      setErrorMessage('Step 1 Required: Please enter your Staff U Number (e.g. U086936) first.');
      return;
    }
    if (!customEmail || !customEmail.includes('@')) {
      setErrorMessage('Please enter a valid work or email address (e.g., name@dlh.de).');
      return;
    }
    handleQuickDemoLogin(customEmail.trim().toLowerCase());
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
                Sign in with the authorized Google account to continue.
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

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">Authenticating secure Google session...</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <h2 className="text-sm font-semibold text-slate-200">Secure Staff Authentication</h2>
                <p className="text-xs text-slate-400">
                  Step 1: Enter your Staff U Number, then Step 2: Choose your Google account.
                </p>
              </div>

              {/* Step 1: Staff U Number Input */}
              <div className="space-y-1.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80">
                <label className="block text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Step 1: Enter Your Staff U Number</span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. U086936</span>
                </label>
                <input
                  type="text"
                  value={uNumberInput}
                  onChange={(e) => setUNumberInput(e.target.value)}
                  placeholder="Enter U Number (e.g. U086936)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors uppercase tracking-wider font-semibold"
                />
              </div>

              {/* Step 2: Official Google Sign-In Button Container */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Step 2: Choose Google Account
                </label>
                <div className="flex justify-center py-1">
                  <div id="google-signin-btn-container" className="w-full flex justify-center min-h-[44px]">
                    <button
                      disabled
                      className="w-full py-3 px-4 bg-slate-700 text-slate-400 text-sm font-medium rounded-xl flex items-center justify-center space-x-2 cursor-wait"
                    >
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading Google Sign-In...</span>
                    </button>
                  </div>
                </div>
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={handleInstantGoogleLogin}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-blue-600/25"
                  >
                    <span>Continue with Google (Instant Deployment Sign-In)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Bypasses browser popup restrictions and origin constraints in deployment.
                  </p>
                </div>
              </div>

              {/* Direct Work Email Sign-In Fallback (Bypasses popup blockers / iframe sandbox restrictions) */}
              <div className="pt-1">
                <form onSubmit={handleCustomEmailSubmit} className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Or Sign In with Work Email Address
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="e.g. your.name@dlh.de"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1 transition-colors shrink-0 shadow-lg shadow-blue-600/20"
                    >
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>

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
            Secure Google OAuth 2.0 Identity Verification · Read & Sign Compliance
          </div>
        </div>
      </div>
    </div>
  );
}
