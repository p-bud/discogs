import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import WrappedView from '../../components/WrappedView';
import { computeWrappedStats } from '../../utils/wrapped-stats';
import { getSupabaseClient } from '../../utils/supabase';
import { CollectionItem } from '../../models/types';

export const revalidate = 3600; // ISR — re-render at most once per hour

const DEFAULT_YEAR = new Date().getFullYear() - 1;

interface Props {
  params: { username: string };
}

async function getCollectionFromCache(username: string): Promise<CollectionItem[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: rows, error } = await supabase.rpc(
    'get_user_collection_with_community',
    { p_username: username },
  );

  if (error || !rows || rows.length === 0) return null;

  return rows.map((row: any) => ({
    id: row.release_id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    format: Array.isArray(row.formats) ? row.formats : [],
    coverImage: row.cover_image,
    haveCount: row.have_count ?? 0,
    wantCount: row.want_count ?? 0,
    rarityScore: Number(row.rarity_score ?? 0),
    dateAdded: row.date_added ?? null,
    genres: Array.isArray(row.genres) ? row.genres : [],
    styles: Array.isArray(row.styles) ? row.styles : [],
  }));
}

export default async function PublicWrappedPage({ params }: Props) {
  const username = decodeURIComponent(params.username);
  const items = await getCollectionFromCache(username);

  if (!items) {
    return (
      <div className="py-8">
        <Header />
        <div className="max-w-4xl mx-auto px-4 text-center py-24">
          <p className="text-2xl font-picnic text-minimal-black mb-4">
            No Wrapped data yet for @{username}
          </p>
          <p className="text-minimal-gray-500 mb-8">
            Ask them to visit{' '}
            <Link href="/wrapped" className="underline hover:text-minimal-black">
              raerz.fyi/wrapped
            </Link>{' '}
            to generate their stats.
          </p>
        </div>
      </div>
    );
  }

  const stats = computeWrappedStats(items, DEFAULT_YEAR);

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto px-4">

        {/* Title */}
        <div className="text-center pt-4 mb-8">
          <p className="text-minimal-gray-500 text-sm mb-1">@{username}&apos;s</p>
          <h1 className="text-4xl sm:text-5xl font-picnic text-minimal-black uppercase tracking-tight">
            {DEFAULT_YEAR} in Records
          </h1>
          <p className="text-xs text-minimal-gray-400 mt-3">
            Rarity scores update when the user visits their{' '}
            <Link href={`/wrapped`} className="underline">Wrapped page</Link>.
          </p>
        </div>

        <WrappedView stats={stats} />
      </div>
    </div>
  );
}
