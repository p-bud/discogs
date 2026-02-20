'use client';

import React, { useEffect, useState } from 'react';
import CollectionAnalysis from '../components/CollectionAnalysis';
import Header from '../components/Header';

export default function CollectionPage() {
  const [discogsUsername, setDiscogsUsername] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  // Resolve the Discogs username from the OAuth session so we can pass it
  // straight into CollectionAnalysis and skip the manual-entry gate.
  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        setDiscogsUsername(data?.username ?? null);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  // Avoid a flash of the "not connected" state before the auth check resolves.
  if (!checked) return null;

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <CollectionAnalysis username={discogsUsername ?? undefined} />
      </div>
    </div>
  );
}
