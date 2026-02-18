/**
 * discogs.ts — re-export barrel
 *
 * The original monolithic file has been split into focused modules:
 *   discogs-http-client.ts  — axios client creation (OAuth + API key)
 *   discogs-metadata.ts     — genres, styles, formats, genre-style map
 *   discogs-search.ts       — search and release-data functions
 *
 * This barrel preserves all existing imports so nothing else needs to change.
 */

export {
  createDiscogsClient,
  createDiscogsClientWithApiKey,
  isAuthenticated,
} from './discogs-http-client';

export {
  getGenres,
  getStyles,
  getGenreStyleMap,
  getFormats,
} from './discogs-metadata';

export {
  searchMarketplace,
  searchDatabaseWithRarity,
  searchDiscogs,
  getPriceSuggestions,
  getReleaseDetails,
  getSalesHistory,
  getReleaseHaveWantCounts,
} from './discogs-search';
