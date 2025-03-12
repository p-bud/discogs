"use client";

import { CollectionItem, CollectionStats } from '../models/types';

/**
 * Calculate collection statistics client-side
 */
export function calculateCollectionStats(collection: CollectionItem[]): CollectionStats {
  // Handle empty collection
  if (!collection || collection.length === 0) {
    return {
      totalReleases: 0,
      averageRarityScore: 0,
      rarestItems: [],
      mostCommonItems: [],
      fewestHaves: [],
      mostWanted: [],
      mostCollectible: []
    };
  }
  
  // Calculate average rarity score
  const totalRarityScore = collection.reduce((sum, item) => sum + item.rarityScore, 0);
  const averageRarityScore = totalRarityScore / collection.length;
  
  // Sort by different metrics
  const sortedByRarity = [...collection].sort((a, b) => b.rarityScore - a.rarityScore);
  const sortedByFewestHaves = [...collection].sort((a, b) => a.haveCount - b.haveCount);
  const sortedByMostWanted = [...collection].sort((a, b) => b.wantCount - a.wantCount);
  const sortedByCollectibility = [...collection].sort((a, b) => {
    // Create a collectibility score that favors items with both high have and want counts
    const aScore = (a.haveCount * a.wantCount) / 1000;
    const bScore = (b.haveCount * b.wantCount) / 1000;
    return bScore - aScore;
  });
  
  return {
    totalReleases: collection.length,
    averageRarityScore,
    rarestItems: sortedByRarity.slice(0, 10), // Top 10 rarest by want/have ratio
    mostCommonItems: sortedByRarity.slice(-10).reverse(), // Bottom 10 by want/have ratio
    fewestHaves: sortedByFewestHaves.slice(0, 10), // Top 10 with fewest haves
    mostWanted: sortedByMostWanted.slice(0, 10), // Top 10 most wanted
    mostCollectible: sortedByCollectibility.slice(0, 10) // Top 10 most collectible
  };
} 