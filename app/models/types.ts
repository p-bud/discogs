export interface Listing {
  id: string;
  title: string;
  artist: string;
  condition?: string;
  coverImage: string;
  year: number;
  genre: string;
  style: string;
  format: string;
  country: string;
  haveCount?: number;
  wantCount?: number;
  rarityScore?: number;
  price?: number;
  seller?: string;
  sellerRating?: number;
  historicalLow?: number;
  historicalMedian?: number;
  totalResults?: number;
}

export interface SearchFilters {
  genre?: string;
  style?: string;
  format?: string;
  artist?: string;
  album?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  condition?: string[];
  country?: string;
  sortByRarity?: boolean;
}

export type RecordCondition = 'M' | 'NM' | 'VG+' | 'VG' | 'G+' | 'G' | 'F' | 'P';

export interface ReleaseStats {
  have: number;
  want: number;
}

export interface User {
  username: string;
  avatarUrl?: string;
  name?: string;
  id?: string;
}

export interface CollectionItem {
  id: string;
  title: string;
  artist: string;
  year: string;
  format: string[];
  coverImage: string;
  haveCount: number;
  wantCount: number;
  rarityScore: number; // want/have ratio
  dateAdded?: string | null;  // ISO 8601 e.g. "2025-03-15T14:22:00-07:00"
  genres?: string[];           // e.g. ["Rock", "Electronic"]
  styles?: string[];           // e.g. ["Punk", "Synth-pop"]
}

export interface WrappedStats {
  year: number;
  totalAdded: number;
  hasPartialData: boolean;   // true if any items have null dateAdded (pre-migration cache)
  genreBreakdown:  { genre: string;  count: number }[];  // top 8
  styleBreakdown:  { style: string;  count: number }[];  // top 8
  formatBreakdown: { format: string; count: number }[];
  decadeBreakdown: { decade: string; count: number }[];
  rarestAddition:      CollectionItem | null;  // highest rarityScore > 0 in target year
  mostCommonAddition:  CollectionItem | null;  // lowest  rarityScore > 0 in target year
  avgRarityThisYear: number;
  avgRarityAllTime:  number;
}

export interface CollectionStats {
  totalReleases: number;
  averageRarityScore: number;
  rarestItems: CollectionItem[];
  mostCommonItems: CollectionItem[];
  fewestHaves: CollectionItem[];
  mostWanted: CollectionItem[];
  mostCollectible: CollectionItem[];
} 