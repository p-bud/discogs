'use client';

import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import WrappedAnalysis from '../components/WrappedAnalysis';

export default function WrappedPage() {
  const [discogsUsername, setDiscogsUsername] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        setDiscogsUsername(data?.username ?? null);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto px-4">
        <WrappedAnalysis username={discogsUsername} />
      </div>
    </div>
  );
}
