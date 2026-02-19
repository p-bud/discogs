import { describe, it, expect } from 'vitest';
import { calculateCollectionStats } from '@/app/utils/collection';
import type { CollectionItem } from '@/app/models/types';

function makeItem(overrides: Partial<CollectionItem> & { id: string }): CollectionItem {
  return {
    title: 'Test Album',
    artist: 'Test Artist',
    year: '2000',
    format: ['Vinyl'],
    coverImage: '',
    haveCount: 100,
    wantCount: 50,
    rarityScore: 0.5,
    ...overrides,
  };
}

function makeCollection(n: number): CollectionItem[] {
  return Array.from({ length: n }, (_, i) =>
    makeItem({
      id: `item-${i}`,
      haveCount: (i + 1) * 10,
      wantCount: (n - i) * 5,
      rarityScore: (n - i) / n,
    }),
  );
}

describe('calculateCollectionStats', () => {
  it('returns all-zeros and empty arrays for an empty collection', () => {
    const stats = calculateCollectionStats([]);
    expect(stats.totalReleases).toBe(0);
    expect(stats.averageRarityScore).toBe(0);
    expect(stats.rarestItems).toEqual([]);
    expect(stats.mostCommonItems).toEqual([]);
    expect(stats.fewestHaves).toEqual([]);
    expect(stats.mostWanted).toEqual([]);
    expect(stats.mostCollectible).toEqual([]);
  });

  it('handles null/undefined collection gracefully', () => {
    const stats = calculateCollectionStats(null as any);
    expect(stats.totalReleases).toBe(0);
  });

  it('single item: averageRarityScore equals its rarityScore', () => {
    const item = makeItem({ id: 'single', rarityScore: 0.75 });
    const stats = calculateCollectionStats([item]);
    expect(stats.averageRarityScore).toBe(0.75);
  });

  it('single item: is present in rarestItems', () => {
    const item = makeItem({ id: 'single', rarityScore: 0.75 });
    const stats = calculateCollectionStats([item]);
    expect(stats.rarestItems).toContainEqual(item);
  });

  it('totalReleases equals collection length', () => {
    const collection = makeCollection(7);
    const stats = calculateCollectionStats(collection);
    expect(stats.totalReleases).toBe(7);
  });

  it('averageRarityScore is arithmetic mean of all rarityScores', () => {
    const items = [
      makeItem({ id: 'a', rarityScore: 0.2 }),
      makeItem({ id: 'b', rarityScore: 0.4 }),
      makeItem({ id: 'c', rarityScore: 0.6 }),
    ];
    const stats = calculateCollectionStats(items);
    expect(stats.averageRarityScore).toBeCloseTo((0.2 + 0.4 + 0.6) / 3, 10);
  });

  it('rarestItems are top 10 by rarityScore descending', () => {
    const collection = makeCollection(15);
    const stats = calculateCollectionStats(collection);
    expect(stats.rarestItems).toHaveLength(10);
    for (let i = 0; i < stats.rarestItems.length - 1; i++) {
      expect(stats.rarestItems[i].rarityScore).toBeGreaterThanOrEqual(stats.rarestItems[i + 1].rarityScore);
    }
  });

  it('mostCommonItems are bottom 10 by rarityScore (taken from the tail of rarity-sorted list)', () => {
    const collection = makeCollection(15);
    const stats = calculateCollectionStats(collection);
    expect(stats.mostCommonItems).toHaveLength(10);
    // All items in mostCommonItems should have rarityScore <= the max score in the full collection
    const allScores = collection.map(i => i.rarityScore).sort((a, b) => a - b);
    // The 10 lowest scores (bottom decile)
    const bottom10Scores = new Set(allScores.slice(0, 10).map(s => s.toFixed(10)));
    for (const item of stats.mostCommonItems) {
      expect(bottom10Scores.has(item.rarityScore.toFixed(10))).toBe(true);
    }
  });

  it('fewestHaves are top 10 by haveCount ascending', () => {
    const collection = makeCollection(15);
    const stats = calculateCollectionStats(collection);
    expect(stats.fewestHaves).toHaveLength(10);
    for (let i = 0; i < stats.fewestHaves.length - 1; i++) {
      expect(stats.fewestHaves[i].haveCount).toBeLessThanOrEqual(stats.fewestHaves[i + 1].haveCount);
    }
  });

  it('mostWanted are top 10 by wantCount descending', () => {
    const collection = makeCollection(15);
    const stats = calculateCollectionStats(collection);
    expect(stats.mostWanted).toHaveLength(10);
    for (let i = 0; i < stats.mostWanted.length - 1; i++) {
      expect(stats.mostWanted[i].wantCount).toBeGreaterThanOrEqual(stats.mostWanted[i + 1].wantCount);
    }
  });

  it('mostCollectible are top 10 by haveCount * wantCount descending', () => {
    const collection = makeCollection(15);
    const stats = calculateCollectionStats(collection);
    expect(stats.mostCollectible).toHaveLength(10);
    for (let i = 0; i < stats.mostCollectible.length - 1; i++) {
      const a = stats.mostCollectible[i];
      const b = stats.mostCollectible[i + 1];
      expect(a.haveCount * a.wantCount).toBeGreaterThanOrEqual(b.haveCount * b.wantCount);
    }
  });

  it('arrays are capped at 10 when collection has more than 10 items', () => {
    const collection = makeCollection(20);
    const stats = calculateCollectionStats(collection);
    expect(stats.rarestItems.length).toBeLessThanOrEqual(10);
    expect(stats.mostCommonItems.length).toBeLessThanOrEqual(10);
    expect(stats.fewestHaves.length).toBeLessThanOrEqual(10);
    expect(stats.mostWanted.length).toBeLessThanOrEqual(10);
    expect(stats.mostCollectible.length).toBeLessThanOrEqual(10);
  });

  it('arrays have all items when collection has fewer than 10', () => {
    const collection = makeCollection(5);
    const stats = calculateCollectionStats(collection);
    expect(stats.rarestItems).toHaveLength(5);
    expect(stats.mostWanted).toHaveLength(5);
  });
});
