'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Lock } from 'lucide-react';

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(!token ? 'error' : 'verifying');
  const [errorMessage, setErrorMessage] = useState(
    !token ? 'No authentication token found in URL. Please use the complete link from your sign-in email.' : ''
  );
  const [errorCode, setErrorCode] = useState(!token ? 'TOKEN_MISSING' : '');
  const [userData, setUserData] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch('/api/auth/verify-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success) {
          setStatus('success');
          setUserData({ name: data.user.name, email: data.user.email });

          // Inform client storage if needed for cache sync
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('read_and_sign_auth_changed'));
          }

          // Redirect to main application dashboard after brief confirmation
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          setStatus('error');
          setErrorCode(data.error || 'VERIFY_FAILED');
          setErrorMessage(data.message || 'Verification failed. Please request a new sign-in link.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Unable to connect to verification server. Please check your network and try again.');
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-[#0078D4] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-xs"></div>
            <span className="font-bold text-sm tracking-wide">READ & SIGN COMPLIANCE</span>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-mono">
            Identity Lock Active
          </span>
        </div>

        <div className="p-8">
          {/* STATE 1: Verifying */}
          {status === 'verifying' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <div className="w-14 h-14 border-3 border-[#0078D4]/20 border-t-[#0078D4] rounded-full animate-spin"></div>
                <Lock className="w-5 h-5 text-[#0078D4] absolute" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Verifying Sign-In Link...</h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Cryptographically validating your one-time sign-in token and establishing your authenticated session.
              </p>
            </div>
          )}

          {/* STATE 2: Success */}
          {status === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Identity Verified</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Welcome, <strong>{userData?.name}</strong>
                </p>
                <div className="mt-2 inline-block px-2.5 py-1 bg-slate-100 rounded text-xs font-mono text-slate-700">
                  {userData?.email}
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-[#0078D4] flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Authenticated via secure server session. Zero browser persistence.</span>
              </div>

              <p className="text-xs text-slate-400 animate-pulse">
                Redirecting to Read & Sign Compliance Manager...
              </p>
            </div>
          )}

          {/* STATE 3: Error */}
          {status === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sign-in Link Invalid</h2>
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 text-left">
                  <div className="font-semibold mb-0.5">
                    {errorCode === 'TOKEN_ALREADY_USED' && 'Link Already Used'}
                    {errorCode === 'TOKEN_EXPIRED' && 'Link Expired'}
                    {errorCode === 'TOKEN_MISSING' && 'Missing Verification Token'}
                    {errorCode !== 'TOKEN_ALREADY_USED' &&
                      errorCode !== 'TOKEN_EXPIRED' &&
                      errorCode !== 'TOKEN_MISSING' &&
                      'Authentication Failed'}
                  </div>
                  <p>{errorMessage}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-2.5 px-4 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium rounded-lg transition shadow flex items-center justify-center gap-2"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          <span>Read & Sign Compliance · Enterprise Security</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#0078D4] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <VerifyMagicLinkContent />
    </Suspense>
  );
}
