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