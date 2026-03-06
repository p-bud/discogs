'use client';

import React, { useState } from 'react';
import { handleDiscogsAuth } from '../utils/discogs-client';

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
      className={`btn-primary inline-block px-6 py-3 rounded font-semibold disabled:opacity-60 transition-opacity ${className}`}
    >
      {loading ? 'Connecting…' : label}
    </button>
  );
}
