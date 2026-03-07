import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../../components/Header';
import { getSupabaseClient } from '../../utils/supabase';
import { CollectionItem } from '../../models/types';

export const revalidate = 3600;

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props) {
  const username = decodeURIComponent(params.username);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://raerz.fyi';
  const ogImageUrl = `${appUrl}/api/og?username=${encodeURIComponent(username)}&type=collection`;

  return {
    title: `@${username}'s Rarest Records — raerz`,
    description: `See @${username}'s rarest vinyl records ranked by Discogs want/have ratio.`,
    openGraph: {
      title: `@${username}'s Rarest Records`,
      description: `See @${username}'s rarest vinyl records ranked by Discogs want/have ratio.`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      url: `${appUrl}/collection/${encodeURIComponent(username)}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `@${username}'s Rarest Records`,
      description: `See @${username}'s rarest vinyl records ranked by Discogs want/have ratio.`,
      images: [ogImageUrl],
    },
  };
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

export default async function PublicCollectionPage({ params }: Props) {
  const username = decodeURIComponent(params.username);
  const items = await getCollectionFromCache(username);

  if (!items) {
    return (
      <div className="py-8">
        <Header />
        <div className="max-w-4xl mx-auto px-4 text-center py-24">
          <p className="text-2xl font-picnic text-minimal-black mb-4">
            No collection data yet for @{username}
          </p>
          <p className="text-minimal-gray-500 mb-8">
            Ask them to visit{' '}
            <Link href="/collection" className="underline hover:text-minimal-black">
              raerz.fyi/collection
            </Link>{' '}
            to analyze their records.
          </p>
          <Link
            href="/collection"
            className="inline-block px-6 py-3 bg-minimal-black text-minimal-white text-sm font-semibold rounded hover:opacity-80 transition-opacity"
          >
            Analyze your own collection →
          </Link>
        </div>
      </div>
    );
  }

  const withRarity = items.filter(i => i.rarityScore > 0);
  const rarest = [...withRarity].sort((a, b) => b.rarityScore - a.rarityScore).slice(0, 20);
  const avgRarity = withRarity.length
    ? withRarity.reduce((s, i) => s + i.rarityScore, 0) / withRarity.length
    : 0;

  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto px-4">

        {/* Title */}
        <div className="pt-4 mb-10">
          <p className="text-minimal-gray-500 text-sm mb-1">@{username}</p>
          <h1 className="text-4xl sm:text-5xl font-picnic text-minimal-black uppercase tracking-tight mb-4">
            Rarest Records
          </h1>
          <div className="flex flex-wrap gap-6 text-sm text-minimal-gray-500">
            <span>{items.length.toLocaleString()} records</span>
            <span>Avg rarity: {avgRarity.toFixed(4)}</span>
          </div>
        </div>

        {/* Record list */}
        <div className="divide-y divide-minimal-gray-100">
          {rarest.map((item, i) => (
            <div key={item.id} className="flex items-center gap-4 py-4">
              {/* Rank */}
              <span className="text-minimal-gray-500 font-mono text-sm w-6 shrink-0 text-right">
                {i + 1}
              </span>

              {/* Cover */}
              <div className="w-12 h-12 shrink-0 bg-minimal-gray-100 rounded overflow-hidden">
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={`${item.artist} - ${item.title}`}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-minimal-gray-100" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-minimal-black truncate text-sm">{item.title}</p>
                <p className="text-minimal-gray-500 text-xs truncate">{item.artist} · {item.year}</p>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-semibold text-minimal-black">
                  {item.rarityScore.toFixed(4)}
                </p>
                <p className="text-xs text-minimal-gray-400">
                  {item.wantCount.toLocaleString()}w / {item.haveCount.toLocaleString()}h
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-minimal-gray-100 text-center">
          <p className="text-minimal-gray-500 text-sm mb-4">
            How rare is your collection?
          </p>
          <Link
            href="/collection"
            className="inline-block px-6 py-3 bg-minimal-black text-minimal-white text-sm font-semibold rounded hover:opacity-80 transition-opacity"
          >
            Analyze your collection →
          </Link>
        </div>

      </div>
    </div>
  );
}
