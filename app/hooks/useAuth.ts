'use client';

import { useState, useEffect } from 'react';

export interface AuthStatus {
  authenticated: boolean;
  username: string | null;
  supabaseUserId: string | null;
  supabaseLinkedUsername: string | null;
  display_name: string | null;
  leaderboard_opt_in: boolean;
}

const DEFAULT: AuthStatus = {
  authenticated: false,
  username: null,
  supabaseUserId: null,
  supabaseLinkedUsername: null,
  display_name: null,
  leaderboard_opt_in: false,
};

// One promise for the entire browser session — cleared by refresh().
let cachedPromise: Promise<AuthStatus> | null = null;

function loadAuthStatus(): Promise<AuthStatus> {
  if (!cachedPromise) {
    cachedPromise = fetch('/api/auth/status')
      .then(r => r.json())
      .then(d => ({
        authenticated:          d?.authenticated          ?? false,
        username:               d?.username               ?? null,
        supabaseUserId:         d?.supabaseUserId         ?? null,
        supabaseLinkedUsername: d?.supabaseLinkedUsername ?? null,
        display_name:           d?.display_name           ?? null,
        leaderboard_opt_in:     d?.leaderboard_opt_in     ?? false,
      }))
      .catch(() => DEFAULT);
  }
  return cachedPromise;
}

export function clearAuthCache(): void {
  cachedPromise = null;
}

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadAuthStatus().then(s => {
      if (!cancelled) { setStatus(s); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const refresh = () => {
    clearAuthCache();
    setLoading(true);
    loadAuthStatus().then(s => { setStatus(s); setLoading(false); });
  };

  return { ...status, loading, refresh };
}
