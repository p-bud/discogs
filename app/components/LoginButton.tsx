'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { handleDiscogsAuth, handleLogout } from '../utils/discogs-client';
import { createSupabaseBrowserClient } from '../utils/supabase-browser';
import AuthModal from './AuthModal';

interface LoginButtonProps {
  className?: string;
}

interface AuthState {
  discogsConnected: boolean;
  discogsUsername: string | null;
  supabaseUserId: string | null;
  supabaseEmail: string | null;
}

const INITIAL_STATE: AuthState = {
  discogsConnected: false,
  discogsUsername: null,
  supabaseUserId: null,
  supabaseEmail: null,
};

const LoginButton: React.FC<LoginButtonProps> = ({ className = '' }) => {
  const [auth, setAuth] = useState<AuthState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const refreshAuth = useCallback(async () => {
    try {
      setCheckError(null);

      // Parallel: Discogs status + Supabase session.
      const [statusResp, supabaseSession] = await Promise.all([
        fetch('/api/auth/status').then(r => r.json()).catch(() => null),
        createSupabaseBrowserClient().auth.getSession().catch(() => null),
      ]);

      setAuth({
        discogsConnected: statusResp?.authenticated ?? false,
        discogsUsername: statusResp?.username ?? null,
        supabaseUserId: supabaseSession?.data?.session?.user?.id ?? null,
        supabaseEmail: supabaseSession?.data?.session?.user?.email ?? null,
      });
    } catch {
      setCheckError('Unable to check login status');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    refreshAuth();

    const onFocus = () => { if (mounted) refreshAuth(); };
    window.addEventListener('focus', onFocus);
    const timer = setInterval(() => { if (mounted) refreshAuth(); }, 30_000);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [refreshAuth]);

  const initiateDiscogsLogin = async () => {
    setLoading(true);
    setCheckError(null);
    try {
      await handleDiscogsAuth();
    } catch {
      setLoading(false);
      setCheckError('Failed to start Discogs login');
    }
  };

  const initiateDiscogsLogout = async () => {
    setLoading(true);
    setCheckError(null);
    try {
      await handleLogout();
      setAuth(prev => ({ ...prev, discogsConnected: false, discogsUsername: null }));
    } catch {
      setCheckError('Failed to disconnect Discogs');
    } finally {
      setLoading(false);
    }
  };

  const initiateSupabaseSignOut = async () => {
    setLoading(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
      setAuth(prev => ({ ...prev, supabaseUserId: null, supabaseEmail: null }));
    } catch {
      setCheckError('Failed to sign out');
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const { discogsConnected, discogsUsername, supabaseUserId, supabaseEmail } = auth;
  const isFullyLinked = discogsConnected && supabaseUserId;

  // Spinner SVG
  const Spinner = ({ light = false }: { light?: boolean }) => (
    <svg className={`animate-spin -ml-1 mr-2 h-4 w-4 ${light ? 'text-white' : 'text-minimal-gray-600'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  // Fully linked: show a single account button with a dropdown menu.
  if (isFullyLinked) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowMenu(m => !m)}
          className="btn-secondary px-4 py-2 text-sm rounded-md flex items-center gap-2"
          aria-haspopup="true"
          aria-expanded={showMenu}
        >
          <span className="max-w-[140px] truncate">{discogsUsername ?? supabaseEmail}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-1 w-52 bg-white border border-minimal-gray-200 rounded-lg shadow-lg z-10 py-1 text-sm">
            <div className="px-4 py-2 border-b border-minimal-gray-100">
              <p className="font-medium text-minimal-gray-800 truncate">{supabaseEmail}</p>
              <p className="text-minimal-gray-500 text-xs truncate">Discogs: {discogsUsername}</p>
            </div>
            <button
              onClick={initiateDiscogsLogout}
              disabled={loading}
              className="w-full text-left px-4 py-2 hover:bg-minimal-gray-50 text-minimal-gray-700"
            >
              Disconnect Discogs
            </button>
            <button
              onClick={initiateSupabaseSignOut}
              disabled={loading}
              className="w-full text-left px-4 py-2 hover:bg-minimal-gray-50 text-minimal-gray-700"
            >
              Sign out
            </button>
          </div>
        )}

        {checkError && <div className="text-red-500 text-xs mt-1">{checkError}</div>}
        <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} onAuthSuccess={refreshAuth} />
      </div>
    );
  }

  // Partial or no auth: show individual buttons.
  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {/* Supabase account button */}
      {supabaseUserId ? (
        <button
          onClick={initiateSupabaseSignOut}
          disabled={loading}
          className="btn-secondary px-3 py-2 text-sm rounded-md flex items-center"
          title={`Signed in as ${supabaseEmail}`}
        >
          {loading ? <Spinner /> : null}
          <span className="max-w-[120px] truncate">{supabaseEmail}</span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="btn-secondary px-3 py-2 text-sm rounded-md"
        >
          Sign in
        </button>
      )}

      {/* Discogs connect button */}
      {discogsConnected ? (
        <button
          onClick={initiateDiscogsLogout}
          disabled={loading}
          className="btn-secondary px-3 py-2 text-sm rounded-md flex items-center"
          title={`Discogs: ${discogsUsername}`}
        >
          {loading ? <Spinner /> : null}
          {discogsUsername ?? 'Discogs'}
        </button>
      ) : (
        <button
          onClick={initiateDiscogsLogin}
          disabled={loading}
          className="btn-primary px-3 py-2 text-sm rounded-md shadow-sm flex items-center"
        >
          {loading ? <Spinner light /> : null}
          {loading ? 'Connecting…' : 'Connect Discogs'}
        </button>
      )}

      {checkError && <div className="text-red-500 text-xs w-full">{checkError}</div>}

      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} onAuthSuccess={refreshAuth} />
    </div>
  );
};

export default LoginButton;
