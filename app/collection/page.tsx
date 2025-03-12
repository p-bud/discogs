'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CollectionAnalysis from '../components/CollectionAnalysis';
import Header from '../components/Header';

export default function CollectionPage() {
  const [username, setUsername] = useState<string>('');
  const [submittedUsername, setSubmittedUsername] = useState<string>('');
  const router = useRouter();

  const logUser = async (username: string) => {
    try {
      await fetch('/api/log-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username,
          collectionSize: null // We'll get this later if needed
        }),
      });
      console.log('User logged successfully');
    } catch (error) {
      console.error('Failed to log user:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      const trimmedUsername = username.trim();
      setSubmittedUsername(trimmedUsername);
      
      // Log the user when they submit their username
      logUser(trimmedUsername);
    }
  };

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Rarity Analyzer</h1>
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Enter Your Discogs Username</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your Discogs username"
              className="flex-1 border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Analyze Collection
            </button>
          </form>
        </div>

        {submittedUsername && (
          <>
            <h2 className="text-2xl font-bold mb-4">Collection Analysis for {submittedUsername}</h2>
            <CollectionAnalysis username={submittedUsername} />
          </>
        )}

        {!submittedUsername && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-8">
            <h3 className="font-bold mb-2">How It Works:</h3>
            <ol className="list-decimal pl-6 mb-4 space-y-2">
              <li>Enter your Discogs username above</li>
              <li>We'll analyze your collection to calculate rarity scores based on want/have ratios</li>
              <li>See your rarest records and how unique your collection is</li>
            </ol>
            <p className="mb-2">You must be logged in to Discogs to access your collection data.</p>
            <p className="text-sm italic">Note: To stay within Discogs API rate limits, we analyze only your most recent additions. This ensures fast results while avoiding rate limit errors.</p>
          </div>
        )}
      </div>
    </div>
  );
} 