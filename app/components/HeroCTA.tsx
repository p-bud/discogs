'use client';

import React from 'react';
import Link from 'next/link';
import ConnectButton from './ConnectButton';
import { useAuth } from '../hooks/useAuth';

export default function HeroCTA() {
  const { authenticated, username, loading } = useAuth();

  return (
    <div
      className="flex flex-wrap items-center gap-6 animate-fade-in-up"
      style={{ animationDelay: '200ms' }}
    >
      {!loading && authenticated && username ? (
        <Link
          href="/collection"
          className="btn-primary inline-block px-6 py-3 rounded font-semibold transition-opacity"
        >
          View My Collection
        </Link>
      ) : (
        <ConnectButton label="Connect Discogs" />
      )}
      <Link
        href="/leaderboard"
        className="text-white/40 hover:text-white transition-colors text-sm font-medium tracking-widest uppercase"
      >
        Browse Leaderboard →
      </Link>
    </div>
  );
}
