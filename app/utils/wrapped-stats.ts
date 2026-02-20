import { CollectionItem, WrappedStats } from '../models/types';

/**
 * Pure function — no React, no I/O.
 * Computes Wrapped stats for a given target year from the full collection.
 */
export function computeWrappedStats(
  allItems: CollectionItem[],
  targetYear: number,
): WrappedStats {
  // Items added in the target year
  const yearItems = allItems.filter(item => {
    if (!item.dateAdded) return false;
    try {
      return new Date(item.dateAdded).getFullYear() === targetYear;
    } catch {
      return false;
    }
  });

  // Partial data: any item is missing dateAdded (pre-migration cache)
  const hasPartialData = allItems.some(item => !item.dateAdded);

  // ── Breakdown helpers ────────────────────────────────────────────────────

  function countOccurrences(values: string[]): { label: string; count: number }[] {
    const counts: Record<string, number> = {};
    for (const v of values) {
      if (v) counts[v] = (counts[v] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Genre breakdown (top 8)
  const allGenres = yearItems.flatMap(item => item.genres ?? []);
  const genreBreakdown = countOccurrences(allGenres)
    .slice(0, 8)
    .map(({ label, count }) => ({ genre: label, count }));

  // Style breakdown (top 8)
  const allStyles = yearItems.flatMap(item => item.styles ?? []);
  const styleBreakdown = countOccurrences(allStyles)
    .slice(0, 8)
    .map(({ label, count }) => ({ style: label, count }));

  // Format breakdown — primary format only (item.format[0])
  const allFormats = yearItems
    .map(item => item.format?.[0])
    .filter((f): f is string => Boolean(f));
  const formatBreakdown = countOccurrences(allFormats)
    .map(({ label, count }) => ({ format: label, count }));

  // Decade breakdown — derived from item.year (release year), NOT dateAdded
  const allDecades = yearItems
    .map(item => {
      const y = parseInt(item.year, 10);
      if (isNaN(y) || y < 1000) return null;
      return `${Math.floor(y / 10) * 10}s`;
    })
    .filter((d): d is string => d !== null);
  const decadeBreakdown = countOccurrences(allDecades)
    .map(({ label, count }) => ({ decade: label, count }));

  // ── Rarity spotlights ────────────────────────────────────────────────────

  const yearItemsWithRarity = yearItems.filter(item => item.rarityScore > 0);
  const sortedByRarity = [...yearItemsWithRarity].sort(
    (a, b) => b.rarityScore - a.rarityScore,
  );

  const rarestAddition     = sortedByRarity[0] ?? null;
  const mostCommonAddition = sortedByRarity[sortedByRarity.length - 1] ?? null;

  // All-time rarest across the whole collection
  const allTimeRarest = [...allItems]
    .filter(item => item.rarityScore > 0)
    .sort((a, b) => b.rarityScore - a.rarityScore)[0] ?? null;

  // ── Average rarity ───────────────────────────────────────────────────────

  function avg(items: CollectionItem[]): number {
    const withRarity = items.filter(i => i.rarityScore > 0);
    if (withRarity.length === 0) return 0;
    return withRarity.reduce((s, i) => s + i.rarityScore, 0) / withRarity.length;
  }

  const avgRarityThisYear = avg(yearItems);
  const avgRarityAllTime  = avg(allItems);

  return {
    year: targetYear,
    totalAdded: yearItems.length,
    hasPartialData,
    genreBreakdown,
    styleBreakdown,
    formatBreakdown,
    decadeBreakdown,
    rarestAddition,
    mostCommonAddition,
    allTimeRarest,
    avgRarityThisYear,
    avgRarityAllTime,
  };
}
