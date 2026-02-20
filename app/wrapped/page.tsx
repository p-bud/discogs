'use client';

import React from 'react';
import Header from '../components/Header';
import WrappedAnalysis from '../components/WrappedAnalysis';
import { useAuth } from '../hooks/useAuth';

export default function WrappedPage() {
  const { username, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto px-4">
        <WrappedAnalysis username={username} />
      </div>
    </div>
  );
}
