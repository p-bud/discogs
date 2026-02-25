'use client';

import React from 'react';
import CollectionAnalysis from '../components/CollectionAnalysis';
import Header from '../components/Header';
import { SkeletonCollection } from '../components/SkeletonCollection';
import { useAuth } from '../hooks/useAuth';

export default function CollectionPage() {
  const { username, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-8">
        <Header />
        <div className="max-w-4xl mx-auto">
          <SkeletonCollection />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <CollectionAnalysis username={username ?? undefined} />
      </div>
    </div>
  );
}
