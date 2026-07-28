import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CEKALoader } from '@/components/ui/ceka-loader';

/**
 * AuthCallback — handles all Supabase auth redirects:
 *   • OAuth providers (Google, GitHub, Twitter) — access_token in URL hash
 *   • Email confirmation links — type=signup in URL hash
 *   • Password reset links    — type=recovery in URL hash
 *
 * Supabase JS automatically processes the hash fragment when the page loads.
 * This component waits for that to complete, then redirects appropriately.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse the hash from the URL — Supabase puts tokens here
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type'); // 'signup' | 'recovery' | 'magiclink'
        const errorDesc = params.get('error_description');

        // Surface any upstream error from Supabase
        if (errorDesc) {
          setErrorMessage(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
          setStatus('error');
          return;
        }

        // If tokens are in the hash, set the session manually
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setErrorMessage(error.message);
            setStatus('error');
            return;
          }

          // For password recovery, redirect to the reset-password page
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
        } else {
          // No tokens in hash — check if Supabase already resolved the session
          // (this handles PKCE flow where tokens are not in the hash)
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            // Wait briefly and re-check — Supabase may still be processing
            await new Promise(r => setTimeout(r, 1200));
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (!retrySession) {
              setErrorMessage('Authentication could not be completed. Please try signing in again.');
              setStatus('error');
              return;
            }
          }
        }

        // Determine where to go after successful auth
        const returnTo = searchParams.get('returnTo') || '/';
        navigate(returnTo, { replace: true });
      } catch (err: any) {
        console.error('[AuthCallback] Unexpected error:', err);
        setErrorMessage(err?.message || 'An unexpected error occurred.');
        setStatus('error');
      }
    };

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-white tracking-tighter mb-2">Authentication Failed</h2>
          <p className="text-sm text-white/50 max-w-xs leading-relaxed">{errorMessage}</p>
        </div>
        <button
          onClick={() => navigate('/auth', { replace: true })}
          className="px-6 py-3 rounded-2xl bg-kenya-green text-white font-black text-xs uppercase tracking-widest hover:bg-kenya-green/90 transition-all"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
      <CEKALoader />
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-4">
        Completing sign-in…
      </p>
    </div>
  );
};

export default AuthCallback;
