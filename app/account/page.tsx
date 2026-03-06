'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { createSupabaseBrowserClient } from '../utils/supabase-browser';
import { handleDiscogsAuth } from '../utils/discogs-client';

interface AccountData {
  email: string;
  discogs_username: string | null;
  display_name: string | null;
  leaderboard_opt_in: boolean;
  show_discogs_link: boolean;
  created_at: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Display name section
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);

  // Leaderboard toggles
  const [optInSaving, setOptInSaving] = useState(false);
  const [showDiscogsLinkSaving, setShowDiscogsLinkSaving] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account');
      if (res.status === 401) {
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('Failed to load account');
      const data: AccountData = await res.json();
      setAccount(data);
      setDisplayNameInput(data.display_name ?? '');
    } catch (err: any) {
      setError(err.message ?? 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // ── Display name ─────────────────────────────────────────────────────────────

  const handleSaveDisplayName = async () => {
    setDisplayNameError(null);
    setDisplayNameSaving(true);
    setDisplayNameSaved(false);
    try {
      const value = displayNameInput.trim() || null;
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: value }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setDisplayNameError('Display name already taken — try another.');
        return;
      }
      if (!res.ok) {
        setDisplayNameError(data.error ?? 'Failed to save display name');
        return;
      }
      setAccount(prev => prev ? { ...prev, display_name: value } : prev);
      setDisplayNameSaved(true);
    } catch {
      setDisplayNameError('Failed to save display name');
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const handleClearDisplayName = async () => {
    setDisplayNameInput('');
    setDisplayNameError(null);
    setDisplayNameSaving(true);
    setDisplayNameSaved(false);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setDisplayNameError(data.error ?? 'Failed to clear display name');
        return;
      }
      setAccount(prev => prev ? { ...prev, display_name: null } : prev);
      setDisplayNameSaved(true);
    } catch {
      setDisplayNameError('Failed to clear display name');
    } finally {
      setDisplayNameSaving(false);
    }
  };

  // ── Leaderboard toggles ───────────────────────────────────────────────────────

  const handleToggleOptIn = async (value: boolean) => {
    if (!account) return;
    setToggleError(null);
    // Optimistic update — move the toggle immediately.
    setAccount(prev => prev ? { ...prev, leaderboard_opt_in: value } : prev);
    setOptInSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderboard_opt_in: value }),
      });
      if (!res.ok) {
        // Revert on failure.
        setAccount(prev => prev ? { ...prev, leaderboard_opt_in: !value } : prev);
        const data = await res.json();
        setToggleError(data.error ?? 'Failed to save setting');
      }
    } catch {
      setAccount(prev => prev ? { ...prev, leaderboard_opt_in: !value } : prev);
      setToggleError('Failed to save setting');
    } finally {
      setOptInSaving(false);
    }
  };

  const handleToggleShowDiscogsLink = async (value: boolean) => {
    if (!account) return;
    setToggleError(null);
    // Optimistic update — move the toggle immediately.
    setAccount(prev => prev ? { ...prev, show_discogs_link: value } : prev);
    setShowDiscogsLinkSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_discogs_link: value }),
      });
      if (!res.ok) {
        // Revert on failure.
        setAccount(prev => prev ? { ...prev, show_discogs_link: !value } : prev);
        const data = await res.json();
        setToggleError(data.error ?? 'Failed to save setting');
      }
    } catch {
      setAccount(prev => prev ? { ...prev, show_discogs_link: !value } : prev);
      setToggleError('Failed to save setting');
    } finally {
      setShowDiscogsLinkSaving(false);
    }
  };

  // ── Discogs disconnect ────────────────────────────────────────────────────────

  const handleDiscogsDisconnect = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAccount(prev => prev ? { ...prev, discogs_username: null } : prev);
    } catch { /* non-fatal */ }
  };

  // ── Data export ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raerz-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* non-fatal */ }
  };

  // ── Delete account ────────────────────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'delete my account' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? 'Failed to delete account');
        return;
      }
      // Sign out of Supabase + clear Discogs cookies, then redirect home.
      await createSupabaseBrowserClient().auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch {
      setDeleteError('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main>
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-minimal-gray-500">
          Loading…
        </div>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main>
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-red-600">
          {error ?? 'Unable to load account'}
        </div>
      </main>
    );
  }

  return (
    <main>
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-picnic text-minimal-black mb-1">Account Settings</h1>
          <p className="text-sm text-minimal-gray-500">Manage your profile and privacy preferences.</p>
        </div>

        {/* ── 1. Display Name ── */}
        <section className="border border-minimal-gray-200 rounded-lg p-6 space-y-3">
          <h2 className="font-semibold text-minimal-gray-800 text-lg">Display Name</h2>
          <p className="text-sm text-minimal-gray-600">
            Shown on the leaderboard instead of your Discogs username. Leave blank to use your Discogs username.
            3–30 characters; letters, numbers, <code>_</code> and <code>-</code> only.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayNameInput}
              onChange={e => { setDisplayNameInput(e.target.value); setDisplayNameSaved(false); }}
              placeholder="e.g. vinyl_wizard"
              maxLength={30}
              className="border border-minimal-gray-300 rounded-md px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-minimal-accent"
            />
            <button
              onClick={handleSaveDisplayName}
              disabled={displayNameSaving}
              className="btn-primary px-4 py-2 text-sm rounded-md disabled:opacity-60"
            >
              Save
            </button>
            {account.display_name && (
              <button
                onClick={handleClearDisplayName}
                disabled={displayNameSaving}
                className="btn-secondary px-4 py-2 text-sm rounded-md disabled:opacity-60"
              >
                Clear
              </button>
            )}
          </div>
          {displayNameError && <p className="text-xs text-red-600">{displayNameError}</p>}
          {displayNameSaved && !displayNameError && (
            <p className="text-xs text-green-600">Display name updated.</p>
          )}
        </section>

        {/* ── 2. Connected Accounts ── */}
        <section className="border border-minimal-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-minimal-gray-800 text-lg">Connected Accounts</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-minimal-gray-700">Email</p>
              <p className="text-sm text-minimal-gray-500">{account.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-minimal-gray-700">Discogs</p>
              {account.discogs_username ? (
                <a
                  href={`https://www.discogs.com/user/${encodeURIComponent(account.discogs_username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-minimal-accent hover:underline"
                >
                  {account.discogs_username}
                </a>
              ) : (
                <p className="text-sm text-minimal-gray-500">
                  Not connected.{' '}
                  <button onClick={handleDiscogsAuth} className="underline">Connect Discogs</button>
                </p>
              )}
            </div>
            {account.discogs_username && (
              <button
                onClick={handleDiscogsDisconnect}
                className="btn-secondary px-3 py-1.5 text-sm rounded-md"
              >
                Disconnect
              </button>
            )}
          </div>
        </section>

        {/* ── 3. Leaderboard ── */}
        <section className="border border-minimal-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-minimal-gray-800 text-lg">Leaderboard</h2>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-minimal-gray-700">Appear on the public leaderboard</p>
              <p className="text-xs text-minimal-gray-500 mt-0.5">
                {account.leaderboard_opt_in
                  ? 'Your display name (or Discogs username), rarity scores and collection size are publicly visible.'
                  : 'Your entry will be hidden from the leaderboard.'}
              </p>
            </div>
            <button
              onClick={() => handleToggleOptIn(!account.leaderboard_opt_in)}
              disabled={optInSaving}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                account.leaderboard_opt_in ? 'bg-minimal-accent' : 'bg-minimal-gray-300'
              }`}
              role="switch"
              aria-checked={account.leaderboard_opt_in}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ${
                  account.leaderboard_opt_in ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
                }`}
              />
            </button>
          </div>

          {toggleError && <p className="text-xs text-red-600">{toggleError}</p>}
          <p className="text-xs text-minimal-gray-400">Changes may take up to a minute to appear on the leaderboard.</p>

          {account.display_name && (
            <div className="flex items-start justify-between gap-4 pt-2 border-t border-minimal-gray-100">
              <div>
                <p className="text-sm font-medium text-minimal-gray-700">Link my Discogs profile on the leaderboard</p>
                <p className="text-xs text-minimal-gray-500 mt-0.5">
                  {account.show_discogs_link
                    ? 'Your display name is linked to your Discogs profile.'
                    : 'Your display name appears as plain text with no Discogs link.'}
                </p>
              </div>
              <button
                onClick={() => handleToggleShowDiscogsLink(!account.show_discogs_link)}
                disabled={showDiscogsLinkSaving}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                  account.show_discogs_link ? 'bg-minimal-accent' : 'bg-minimal-gray-300'
                }`}
                role="switch"
                aria-checked={account.show_discogs_link}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    account.show_discogs_link ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </section>

        {/* ── 4. Your Data ── */}
        <section className="border border-minimal-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-minimal-gray-800 text-lg">Your Data</h2>
          <p className="text-sm text-minimal-gray-600">We store the following data about you:</p>
          <ul className="text-sm text-minimal-gray-600 list-disc list-inside space-y-1">
            <li>Email address (Supabase Auth)</li>
            <li>Discogs username (linked account)</li>
            <li>Display name (if set)</li>
            <li>Leaderboard entry: rarity scores, collection size, submission date</li>
            <li>Collection cache: release titles, artists, formats, cover images (7-day TTL)</li>
          </ul>
          <button
            onClick={handleExport}
            className="btn-secondary px-4 py-2 text-sm rounded-md"
          >
            Download your data
          </button>
        </section>

        {/* ── 5. Delete Account ── */}
        <section className="border border-red-200 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-red-700 text-lg">Delete Account</h2>
          <p className="text-sm text-minimal-gray-600">
            Permanently deletes your account, leaderboard entry, and cached collection data. Cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            Delete my account
          </button>
        </section>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-red-700">Confirm account deletion</h3>
            <p className="text-sm text-minimal-gray-600">
              This will permanently delete your account, leaderboard entry, and cached collection data.
              This action cannot be undone.
            </p>
            <p className="text-sm text-minimal-gray-700">
              Type <strong>delete my account</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="delete my account"
              className="border border-minimal-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(null); }}
                className="btn-secondary px-4 py-2 text-sm rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'delete my account' || deleting}
                className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
