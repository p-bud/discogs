'use client';

import React from 'react';
import CollectionAnalysis from '../components/CollectionAnalysis';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';

export default function CollectionPage() {
  const { username, loading } = useAuth();

  // Avoid a flash of the "not connected" state before the auth check resolves.
  if (loading) return null;

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <CollectionAnalysis username={username ?? undefined} />
      </div>
    </div>
  );
}
