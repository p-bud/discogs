'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../utils/supabase-browser';
import Header from '../../components/Header';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Supabase password reset emails can arrive in three formats:
    //  1. PKCE:     ?code=XXX               → exchangeCodeForSession
    //  2. token_hash: ?token_hash=XXX&type=recovery → verifyOtp
    //  3. Implicit: #access_token=XXX&type=recovery → onAuthStateChange fires PASSWORD_RECOVERY
    // Handle all three so the flow works regardless of Supabase project config.

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    // Subscribe first so we catch the PASSWORD_RECOVERY event from implicit flow (#hash).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setError(null);
      }
    });

    async function init() {
      if (code) {
        // PKCE flow — exchange the authorisation code for a session.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('exchangeCodeForSession error:', exchangeError.message);
          // Fall through to token_hash / session check before giving up.
        } else {
          window.history.replaceState({}, '', '/auth/reset-password');
          setReady(true);
          return;
        }
      }

      if (tokenHash && type === 'recovery') {
        // token_hash flow.
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (verifyError) {
          console.error('verifyOtp error:', verifyError.message);
        } else {
          window.history.replaceState({}, '', '/auth/reset-password');
          setReady(true);
          return;
        }
      }

      // Implicit flow or already-authenticated session — check for an active session.
      // (onAuthStateChange above will fire PASSWORD_RECOVERY if the hash fragment is present.)
      if (!window.location.hash.includes('access_token')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setReady(true);
        } else if (!code && !tokenHash) {
          // No params at all — show an error.
          setError('This link has expired or already been used. Request a new reset link.');
        } else {
          // Had params but exchanges failed.
          setError('This link has expired or already been used. Request a new reset link.');
        }
      }
      // If hash contains access_token, wait for onAuthStateChange PASSWORD_RECOVERY event.
    }

    init();
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Sign out so user logs in fresh with new password.
    await supabase.auth.signOut();
    router.push('/?password_reset=success');
  };

  return (
    <div>
      <Header />
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-2xl font-picnic text-minimal-black mb-6">Set New Password</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}

        {!ready && !error && (
          <p className="text-sm text-minimal-gray-500">Verifying link…</p>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-minimal-gray-700 mb-1">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-minimal-gray-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2 px-4 rounded text-sm font-medium disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
