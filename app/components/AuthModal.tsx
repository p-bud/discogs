'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase-browser';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

type Tab = 'signin' | 'signup';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes.
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError(null);
      setSuccessMessage(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Close on Escape key.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
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

    if (error) {
      setError(error.message);
      return;
    }

    onAuthSuccess();
    onClose();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccessMessage('Check your email for a confirmation link, then sign in.');
    setTab('signin');
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in or create account"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => { setTab('signin'); setError(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'signin'
                ? 'text-minimal-accent border-b-2 border-minimal-accent'
                : 'text-minimal-gray-500 hover:text-minimal-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'signup'
                ? 'text-minimal-accent border-b-2 border-minimal-accent'
                : 'text-minimal-gray-500 hover:text-minimal-gray-700'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 text-minimal-gray-400 hover:text-minimal-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

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

          <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-minimal-gray-700 mb-1">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-minimal-gray-700 mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-minimal-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minimal-accent"
                placeholder={tab === 'signup' ? 'At least 6 characters' : ''}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2 px-4 rounded text-sm font-medium disabled:opacity-60"
            >
              {loading
                ? tab === 'signin' ? 'Signing in…' : 'Creating account…'
                : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-xs text-minimal-gray-500 text-center">
            {tab === 'signin' ? (
              <>No account? <button onClick={() => setTab('signup')} className="text-minimal-accent hover:underline">Create one</button></>
            ) : (
              <>Already have an account? <button onClick={() => setTab('signin')} className="text-minimal-accent hover:underline">Sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
