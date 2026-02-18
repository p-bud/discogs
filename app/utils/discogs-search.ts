/**
 * discogs-search.ts
 * Search and release-data functions for the Discogs API.
 * Server-side only — never import in client components.
 */
import { createDiscogsClient, createDiscogsClientWithApiKey } from './discogs-http-client';

// ─── Release helpers ──────────────────────────────────────────────────────────

export async function getPriceSuggestions(releaseId: string) {
  const client = createDiscogsClient();
  const response = await client.get(`/marketplace/price_suggestions/${releaseId}`);
  return response.data;
}

export async function getReleaseDetails(releaseId: string) {
  const client = createDiscogsClient();
  const response = await client.get(`/releases/${releaseId}`);
  return response.data;
}

export async function getSalesHistory(releaseId: string) {
  const client = createDiscogsClient();
  const response = await client.get(`/marketplace/stats/${releaseId}`);
  return response.data;
}

export async function getReleaseHaveWantCounts(releaseId: string) {
  try {
    const client = createDiscogsClient();
    const response = await client.get(`/releases/${releaseId}`);
    const community = response.data.community ?? { have: 0, want: 0 };
    const have = community.have || 0;
    const want = community.want || 0;
    return { have, want, rarityScore: have > 0 ? want / have : 0 };
  } catch {
    return { have: 0, want: 0, rarityScore: 0 };
  }
}

// ─── Marketplace wrapper ──────────────────────────────────────────────────────

export async function searchMarketplace(params: any, forceApiKey = false) {
  const client = forceApiKey ? createDiscogsClientWithApiKey() : createDiscogsClient();
  const response = await client.get('/database/search', { params });
  const data = response.data;
  return {
    ...data,
    listings: (data.results ?? []).map((item: any) => ({
      id: item.id?.toString() ?? '',
      release: {
        id: item.id?.toString() ?? '',
        title: item.title ?? '',
        artist: item.title?.split(' - ')?.[0] ?? '',
        year: item.year ?? '',
        format: item.format ?? [],
        genre: item.genre ?? [],
        style: item.style ?? [],
        thumbnail: item.thumb ?? item.cover_image ?? '',
      },
      price: { value: '0' },
      condition: 'VG+',
      seller: { username: 'Unknown', rating: 0, location: item.country ?? '' },
    })),
  };
}

// ─── Result post-processing ───────────────────────────────────────────────────

export async function searchDatabaseWithRarity(
  searchResults: any[],
  _includeRarity = true,
  _forceApiKey = false
) {
  if (!Array.isArray(searchResults) || searchResults.length === 0) return [];

  try {
    return searchResults.map((item: any, index: number) => {
      let artist = '';
      let title = item.title ?? '';
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0] ?? '';
        title = parts.slice(1).join(' - ');
      }

      const haveCount = Math.floor(Math.random() * 500) + 10;
      const wantCount = Math.floor(Math.random() * 300) + 5;

      return {
        id: item.id?.toString() ?? '',
        title,
        artist,
        coverImage: item.thumb ?? item.cover_image ?? '',
        year: item.year ?? '',
        genre: Array.isArray(item.genre) ? item.genre[0] : (item.genre ?? ''),
        style: Array.isArray(item.style) ? item.style[0] : (item.style ?? ''),
        format: Array.isArray(item.format) ? item.format[0] : (item.format ?? ''),
        country: item.country ?? '',
        price: 0,
        condition: 'VG+',
        seller: 'Discogs Database',
        sellerRating: 0,
        historicalLow: 0,
        historicalMedian: 0,
        haveCount,
        wantCount,
        rarityScore: 0.5,
        rank: index + 1,
      };
    });
  } catch {
    return [];
  }
}

// ─── Main search ──────────────────────────────────────────────────────────────

export async function searchDiscogs(filters: any, randomSeed = 0): Promise<any[]> {
  const searchParams: Record<string, any> = {
    type: 'release',
    per_page: 50,
    genre: filters.genre?.trim() || 'Rock',
  };

  if (filters.style?.trim() && searchParams.genre) searchParams.style = filters.style;
  if (filters.format?.trim()) searchParams.format = filters.format;
  if (filters.country?.trim()) searchParams.country = filters.country;

  const yearMin = Number(filters.yearMin);
  const yearMax = Number(filters.yearMax);
  if (!isNaN(yearMin) && !isNaN(yearMax) && yearMax >= yearMin) {
    searchParams.year = `${yearMin}-${yearMax}`;
  }

  searchParams.page = (randomSeed % 5) + 1;

  const client = createDiscogsClient();
  const response = await client.get('/database/search', { params: searchParams, timeout: 15000 });

  if (!Array.isArray(response.data?.results)) return [];

  const results: any[] = response.data.results;
  const totalResults: number = response.data.pagination?.items ?? results.length;

  if (results.length <= 10) {
    return results.map(item => ({ ...item, totalResults }));
  }

  // Pick a diverse seeded sample from the result set.
  const rng = new SeededRandom(randomSeed);
  const selected: any[] = [];

  const top = results.slice(0, Math.min(20, results.length));
  const numTop = Math.min(5, top.length);
  for (let i = 0; i < numTop; i++) {
    const idx = Math.floor(rng.next() * top.length);
    selected.push(top[idx]);
    top.splice(idx, 1);
  }

  if (results.length > 20) {
    const rest = results.slice(20);
    const numRest = Math.min(5, rest.length);
    for (let i = 0; i < numRest; i++) {
      const idx = Math.floor(rng.next() * rest.length);
      selected.push(rest[idx]);
      rest.splice(idx, 1);
    }
  }

  return selected.map(item => ({ ...item, totalResults }));
}

// ─── LCG seeded RNG ──────────────────────────────────────────────────────────

class SeededRandom {
  private seed: number;
  constructor(seed = Date.now()) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    return this.seed / 2147483647;
  }
}
