'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase-browser';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

type View = 'signin' | 'signup' | 'forgot';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [view, setView] = useState<View>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError(null);
      setSuccessMessage(null);
      setLoading(false);
      setView('signin');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const supabase = createSupabaseBrowserClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onAuthSuccess();
    onClose();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccessMessage('Check your email for a confirmation link, then sign in.');
    setView('signin');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Route through /auth/callback to exchange the code, then on to /auth/reset-password.
      redirectTo: `${appUrl}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccessMessage('Password reset email sent — check your inbox.');
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-3 text-sm font-medium transition-colors ${
      active
        ? 'text-minimal-accent border-b-2 border-minimal-accent'
        : 'text-minimal-gray-500 hover:text-minimal-gray-700'
    }`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Tabs — only show signin / signup; forgot is a sub-view */}
        {view !== 'forgot' && (
          <div className="flex border-b">
            <button onClick={() => { setView('signin'); setError(null); }} className={tabClass(view === 'signin')}>
              Sign In
            </button>
            <button onClick={() => { setView('signup'); setError(null); }} className={tabClass(view === 'signup')}>
              Create Account
            </button>
            <button onClick={onClose} className="px-4 py-3 text-minimal-gray-400 hover:text-minimal-gray-600" aria-label="Close">✕</button>
          </div>
        )}

        {view === 'forgot' && (
          <div className="flex items-center border-b px-4 py-3">
            <button onClick={() => { setView('signin'); setError(null); setSuccessMessage(null); }} className="text-minimal-gray-400 hover:text-minimal-gray-600 mr-3 text-lg leading-none">←</button>
            <span className="text-sm font-medium text-minimal-gray-700">Reset Password</span>
            <button onClick={onClose} className="ml-auto text-minimal-gray-400 hover:text-minimal-gray-600" aria-label="Close">✕</button>
          </div>
        )}

        <div className="p-6">
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Sign In */}
          {view === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-minimal-gray-700 mb-1">Email</label>
                <input id="auth-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                  placeholder="you@example.com" autoComplete="email" />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label htmlFor="auth-password" className="block text-sm font-medium text-minimal-gray-700">Password</label>
                  <button type="button" onClick={() => { setView('forgot'); setError(null); setSuccessMessage(null); }}
                    className="text-xs text-minimal-accent hover:underline">
                    Forgot password?
                  </button>
                </div>
                <input id="auth-password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                  autoComplete="current-password" />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-2 px-4 rounded text-sm font-medium disabled:opacity-60">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <p className="text-xs text-minimal-gray-500 text-center">
                No account? <button type="button" onClick={() => setView('signup')} className="text-minimal-accent hover:underline">Create one</button>
              </p>
            </form>
          )}

          {/* Sign Up */}
          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="auth-email-up" className="block text-sm font-medium text-minimal-gray-700 mb-1">Email</label>
                <input id="auth-email-up" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                  placeholder="you@example.com" autoComplete="email" />
              </div>
              <div>
                <label htmlFor="auth-password-up" className="block text-sm font-medium text-minimal-gray-700 mb-1">Password</label>
                <input id="auth-password-up" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                  placeholder="At least 6 characters" autoComplete="new-password" />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-2 px-4 rounded text-sm font-medium disabled:opacity-60">
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
              <p className="text-xs text-minimal-gray-500 text-center">
                Already have an account? <button type="button" onClick={() => setView('signin')} className="text-minimal-accent hover:underline">Sign in</button>
              </p>
            </form>
          )}

          {/* Forgot Password */}
          {view === 'forgot' && !successMessage && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-minimal-gray-600">Enter your email and we'll send you a reset link.</p>
              <div>
                <label htmlFor="auth-email-reset" className="block text-sm font-medium text-minimal-gray-700 mb-1">Email</label>
                <input id="auth-email-reset" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                  placeholder="you@example.com" autoComplete="email" />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-2 px-4 rounded text-sm font-medium disabled:opacity-60">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
