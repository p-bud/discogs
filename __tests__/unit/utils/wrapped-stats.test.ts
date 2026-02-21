/**
 * Unit tests for app/utils/wrapped-stats.ts.
 * Pure function — no mocks needed.
 */
import { describe, it, expect } from 'vitest';
import { computeWrappedStats } from '@/app/utils/wrapped-stats';
import { CollectionItem } from '@/app/models/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Test Album',
    artist: 'Test Artist',
    year: '1985',
    format: ['Vinyl'],
    coverImage: '',
    haveCount: 100,
    wantCount: 50,
    rarityScore: 0.5,
    dateAdded: '2025-06-01T00:00:00Z',
    genres: ['Rock'],
    styles: ['Classic Rock'],
    ...overrides,
  };
}

const TARGET = 2025;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeWrappedStats', () => {
  it('empty collection → all zeros, hasPartialData false', () => {
    const stats = computeWrappedStats([], TARGET);
    expect(stats.totalAdded).toBe(0);
    expect(stats.hasPartialData).toBe(false);
    expect(stats.genreBreakdown).toHaveLength(0);
    expect(stats.styleBreakdown).toHaveLength(0);
    expect(stats.formatBreakdown).toHaveLength(0);
    expect(stats.decadeBreakdown).toHaveLength(0);
    expect(stats.rarestAddition).toBeNull();
    expect(stats.mostCommonAddition).toBeNull();
    expect(stats.avgRarityThisYear).toBe(0);
    expect(stats.avgRarityAllTime).toBe(0);
    expect(stats.year).toBe(TARGET);
  });

  it('all null dateAdded → hasPartialData true, totalAdded 0', () => {
    const items = [makeItem({ dateAdded: null }), makeItem({ dateAdded: null })];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.hasPartialData).toBe(true);
    expect(stats.totalAdded).toBe(0);
  });

  it('mixed null/non-null dateAdded → hasPartialData true', () => {
    const items = [makeItem(), makeItem({ dateAdded: null })];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.hasPartialData).toBe(true);
    expect(stats.totalAdded).toBe(1); // only the non-null one counted
  });

  it('items from other years excluded from year stats', () => {
    const items = [
      makeItem({ dateAdded: '2024-06-15T12:00:00Z' }), // previous year
      makeItem({ dateAdded: '2025-06-15T12:00:00Z' }), // target year
      makeItem({ dateAdded: '2026-06-15T12:00:00Z' }), // next year
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.totalAdded).toBe(1);
  });

  it('genre counting correct and sorted descending', () => {
    const items = [
      makeItem({ genres: ['Rock'] }),
      makeItem({ genres: ['Rock'] }),
      makeItem({ genres: ['Jazz'] }),
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.genreBreakdown[0]).toEqual({ genre: 'Rock', count: 2 });
    expect(stats.genreBreakdown[1]).toEqual({ genre: 'Jazz', count: 1 });
  });

  it('style counting correct', () => {
    const items = [
      makeItem({ styles: ['Punk', 'Hardcore'] }),
      makeItem({ styles: ['Punk'] }),
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.styleBreakdown[0]).toEqual({ style: 'Punk', count: 2 });
    expect(stats.styleBreakdown[1]).toEqual({ style: 'Hardcore', count: 1 });
  });

  it('format uses only first element (primary format)', () => {
    const items = [
      makeItem({ format: ['Vinyl', 'LP'] }), // only "Vinyl" counted
      makeItem({ format: ['CD'] }),
    ];
    const stats = computeWrappedStats(items, TARGET);
    const vinyl = stats.formatBreakdown.find(f => f.format === 'Vinyl');
    const cd    = stats.formatBreakdown.find(f => f.format === 'CD');
    const lp    = stats.formatBreakdown.find(f => f.format === 'LP');
    expect(vinyl?.count).toBe(1);
    expect(cd?.count).toBe(1);
    expect(lp).toBeUndefined();
  });

  it('decade derived from item.year (release year), NOT dateAdded', () => {
    const items = [
      makeItem({ year: '1983', dateAdded: '2025-03-01T00:00:00Z' }),
      makeItem({ year: '1987', dateAdded: '2025-06-01T00:00:00Z' }),
    ];
    const stats = computeWrappedStats(items, TARGET);
    const eighties = stats.decadeBreakdown.find(d => d.decade === '1980s');
    expect(eighties?.count).toBe(2);
  });

  it('missing or invalid item.year excluded from decade breakdown', () => {
    const items = [
      makeItem({ year: '' }),
      makeItem({ year: 'unknown' }),
      makeItem({ year: '999' }), // < 1000, treated as invalid
      makeItem({ year: '1972' }), // valid
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.decadeBreakdown).toHaveLength(1);
    expect(stats.decadeBreakdown[0].decade).toBe('1970s');
  });

  it('rarestAddition = highest rarityScore > 0 in target year', () => {
    const items = [
      makeItem({ id: 'a', rarityScore: 0.2 }),
      makeItem({ id: 'b', rarityScore: 5.0 }),
      makeItem({ id: 'c', rarityScore: 1.0 }),
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.rarestAddition?.id).toBe('b');
  });

  it('mostCommonAddition = lowest rarityScore > 0 in target year', () => {
    const items = [
      makeItem({ id: 'a', rarityScore: 0.2 }),
      makeItem({ id: 'b', rarityScore: 5.0 }),
      makeItem({ id: 'c', rarityScore: 1.0 }),
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.mostCommonAddition?.id).toBe('a');
  });

  it('items with rarityScore === 0 excluded from rarity calculations', () => {
    const items = [
      makeItem({ id: 'a', rarityScore: 0 }),
      makeItem({ id: 'b', rarityScore: 0 }),
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.rarestAddition).toBeNull();
    expect(stats.mostCommonAddition).toBeNull();
    expect(stats.avgRarityThisYear).toBe(0);
  });

  it('avgRarityAllTime uses whole collection, not just yearItems', () => {
    const items = [
      makeItem({ dateAdded: '2025-06-15T12:00:00Z', rarityScore: 2.0 }), // in year
      makeItem({ dateAdded: '2024-06-15T12:00:00Z', rarityScore: 4.0 }), // not in year
    ];
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.avgRarityThisYear).toBeCloseTo(2.0);
    expect(stats.avgRarityAllTime).toBeCloseTo(3.0); // (2 + 4) / 2
  });

  it('genreBreakdown capped at top 8', () => {
    const genres = ['A','B','C','D','E','F','G','H','I','J'];
    const items = genres.map(g => makeItem({ genres: [g] }));
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.genreBreakdown.length).toBeLessThanOrEqual(8);
  });

  it('styleBreakdown capped at top 8', () => {
    const styles = ['A','B','C','D','E','F','G','H','I','J'];
    const items = styles.map(s => makeItem({ styles: [s] }));
    const stats = computeWrappedStats(items, TARGET);
    expect(stats.styleBreakdown.length).toBeLessThanOrEqual(8);
  });

  it('returns correct year in stats object', () => {
    const stats = computeWrappedStats([], 2023);
    expect(stats.year).toBe(2023);
  });

  it('single item with all valid data → complete stats', () => {
    const item = makeItem({
      id: 'solo',
      rarityScore: 3.5,
      genres: ['Electronic'],
      styles: ['Ambient'],
      format: ['CD'],
      year: '1993',
    });
    const stats = computeWrappedStats([item], TARGET);
    expect(stats.totalAdded).toBe(1);
    expect(stats.genreBreakdown).toEqual([{ genre: 'Electronic', count: 1 }]);
    expect(stats.styleBreakdown).toEqual([{ style: 'Ambient', count: 1 }]);
    expect(stats.formatBreakdown).toEqual([{ format: 'CD', count: 1 }]);
    expect(stats.decadeBreakdown).toEqual([{ decade: '1990s', count: 1 }]);
    expect(stats.rarestAddition?.id).toBe('solo');
    expect(stats.mostCommonAddition?.id).toBe('solo');
    expect(stats.avgRarityThisYear).toBeCloseTo(3.5);
  });
});
