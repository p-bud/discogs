'use client';

import React, { useState } from 'react';
import { handleDiscogsAuth } from '../utils/discogs-client';

const ACCENT = '#4f46e5';

interface ConnectButtonProps {
  className?: string;
  label?: string;
}

export default function ConnectButton({
  className = '',
  label = 'Connect Discogs',
}: ConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await handleDiscogsAuth();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-block px-6 py-3 rounded text-white font-semibold disabled:opacity-60 transition-opacity ${className}`}
      style={{ backgroundColor: ACCENT }}
    >
      {loading ? 'Connecting…' : label}
    </button>
  );
}
