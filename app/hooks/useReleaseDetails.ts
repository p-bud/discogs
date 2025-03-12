"use client";

import { useState, useEffect } from 'react';
import { CollectionItem } from '../models/types';

// Hook to fetch community data for a batch of releases
export function useReleaseDetails(releases: CollectionItem[], batchSize = 5) {
  const [enrichedReleases, setEnrichedReleases] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!releases || releases.length === 0) return;
    
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
          const batchReleases = releases.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batchReleases.map(async (release, index) => {
              try {
                // Skip if we already have community data
                if (release.haveCount > 0 || release.wantCount > 0) {
                  return release;
                }
                
                // Fetch community data
                const response = await fetch(`/api/release/${release.id}`);
                
                if (!response.ok) {
                  // If we hit a rate limit, add a longer delay
                  if (response.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
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
          
          // Add a small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setCompleted(true);
      } catch (err: any) {
        setError(err.message || 'Error fetching release details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllReleaseDetails();
  }, [releases, batchSize]);
  
  return { enrichedReleases, loading, completed, progress, error };
} 