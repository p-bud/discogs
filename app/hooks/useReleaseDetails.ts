"use client";

import { useState, useEffect } from 'react';
import { CollectionItem } from '../models/types';

// Hook to fetch community data for a batch of releases
export function useReleaseDetails(releases: CollectionItem[], batchSize = 15) {
  const [enrichedReleases, setEnrichedReleases] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!releases || releases.length === 0) return;
    const controller = new AbortController();
    const { signal } = controller;

    // Reset state when releases change
    setEnrichedReleases([]);
    setLoading(true);
    setCompleted(false);
    setProgress(0);
    setError(null);

    const fetchAllReleaseDetails = async () => {
      const updatedReleases = [...releases];
      const totalBatches = Math.ceil(releases.length / batchSize);

      try {
        for (let i = 0; i < releases.length; i += batchSize) {
          if (signal.aborted) return;

          const batchReleases = releases.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batchReleases.map(async (release, index) => {
              try {
                // Skip if we already have community data
                if (release.haveCount > 0 || release.wantCount > 0) {
                  return release;
                }

                // Fetch community data
                const response = await fetch(`/api/release/${release.id}`, { signal });

                if (!response.ok) {
                  // If we hit a rate limit, add a longer delay
                  if (response.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    throw new Error(`Rate limit hit, slowing down requests`);
                  }
                  throw new Error(`Failed to fetch details for ${release.title}`);
                }

                const data = await response.json();

                // Update the release with community data
                return {
                  ...release,
                  haveCount: data.community?.have || 0,
                  wantCount: data.community?.want || 0,
                  rarityScore: data.community?.have > 0
                    ? (data.community.want / data.community.have)
                    : 0
                };
              } catch (err) {
                console.error(`Error fetching details for release ${release.id}:`, err);
                return release; // Return original on error
              }
            })
          );

          if (signal.aborted) return;

          // Update releases with new batch data
          batchResults.forEach((updatedRelease: CollectionItem, index: number) => {
            const releaseIndex = i + index;
            if (releaseIndex < updatedReleases.length) {
              updatedReleases[releaseIndex] = updatedRelease;
            }
          });

          // Update state with current progress
          const currentBatch = Math.floor(i / batchSize) + 1;
          setProgress((currentBatch / totalBatches) * 100);
          setEnrichedReleases([...updatedReleases]);

          // Only delay between batches if this batch actually hit the Discogs
          // API. When items already have community data (e.g. from Supabase
          // cache) no API call is made so no rate-limit delay is needed.
          const batchNeededFetch = batchReleases.some(
            r => r.haveCount === 0 && r.wantCount === 0,
          );
          if (batchNeededFetch) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }

        if (!signal.aborted) setCompleted(true);
      } catch (err: any) {
        if (err.name !== 'AbortError' && !signal.aborted) {
          setError(err.message || 'Error fetching release details');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchAllReleaseDetails();

    return () => controller.abort();
  }, [releases, batchSize]);
  
  return { enrichedReleases, loading, completed, progress, error };
} 