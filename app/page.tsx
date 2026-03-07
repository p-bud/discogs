import React from 'react';
import Link from 'next/link';
import Header from './components/Header';
import HeroCTA from './components/HeroCTA';
import { getSupabaseClient } from './utils/supabase';

export const revalidate = 120;

async function getCommunityStats(): Promise<{ collections: number; records: number; topEntry: { username: string; displayName: string | null; score: number } | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { collections: 0, records: 0, topEntry: null };

  const { data } = await supabase
    .from('leaderboard_entries')
    .select('discogs_username, display_name, avg_rarity_score, collection_size')
    .eq('leaderboard_opt_in', true)
    .order('avg_rarity_score', { ascending: false })
    .limit(1);

  const { count } = await supabase
    .from('leaderboard_entries')
    .select('*', { count: 'exact', head: true })
    .eq('leaderboard_opt_in', true);

  const { count: recordCount } = await supabase
    .from('user_collection_cache')
    .select('*', { count: 'exact', head: true });

  const top = data?.[0] ?? null;
  return {
    collections: count ?? 0,
    records: recordCount ?? 0,
    topEntry: top ? { username: top.discogs_username, displayName: top.display_name, score: Number(top.avg_rarity_score) } : null,
  };
}

const steps = [
  {
    number: '01',
    title: 'Connect',
    description: 'Link your Discogs account in one click.',
  },
  {
    number: '02',
    title: 'Score',
    description: 'Every record is ranked by rarity — how many people want it vs. own it.',
  },
  {
    number: '03',
    title: 'Compete',
    description: 'See your rarest records, year-in-vinyl stats, and climb the global leaderboard.',
  },
];

const features = [
  {
    href: '/collection',
    title: 'Collection Analyzer',
    description: 'Rank every record you own by rarity score. See your rarest items, most-wanted, and full collection stats.',
    delay: '0ms',
  },
  {
    href: '/wrapped',
    title: 'Wrapped',
    description: 'Your year in vinyl. See what genres, formats, and decades defined your collecting year.',
    delay: '100ms',
  },
  {
    href: '/leaderboard',
    title: 'Leaderboard',
    description: 'Compete globally. See who holds the rarest collections across three categories.',
    delay: '200ms',
  },
];

export default async function Home() {
  const { collections, records, topEntry } = await getCommunityStats();

  return (
    <>
      <Header />

      {/* Hero — full bleed, bottom-anchored, editorial */}
      <section className="min-h-[90vh] flex items-end bg-black px-8 sm:px-16 pb-20 overflow-hidden">
        <div className="w-full max-w-6xl">
          <h2 className="text-[clamp(3rem,11vw,9rem)] font-syne font-bold uppercase leading-none tracking-tighter text-white mb-6 animate-fade-in-up">
            How Rare Is<br />Your Collection?
          </h2>
          <p
            className="text-white/60 text-sm max-w-md mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            Connect your Discogs account to rank every record you own by rarity,
            explore your year in vinyl, and compete on the global leaderboard.
          </p>
          <HeroCTA />

          {/* Community stats */}
          {collections > 0 && (
            <p
              className="text-white/30 text-xs mt-6 animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
            >
              {collections.toLocaleString()} collection{collections !== 1 ? 's' : ''} analyzed
              {records > 0 && ` · ${records.toLocaleString()} records scored`}
            </p>
          )}
        </div>
      </section>

      {/* Demo entry point — top collection preview */}
      {topEntry && (
        <div className="max-w-6xl mx-auto px-8 sm:px-16 pb-4">
          <div className="border border-white/10 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Current leader</p>
              <p className="text-white font-syne font-bold text-lg">
                {topEntry.displayName ?? `@${topEntry.username}`}
              </p>
              <p className="text-white/40 text-sm">avg rarity {topEntry.score.toFixed(4)}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/collection/${encodeURIComponent(topEntry.username)}`}
                className="px-4 py-2 text-sm text-white border border-white/20 rounded hover:border-white/50 transition-colors whitespace-nowrap"
              >
                See their collection
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition-colors whitespace-nowrap"
              >
                Full leaderboard →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="max-w-6xl mx-auto px-8 sm:px-16 py-16">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-12">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
          {steps.map(({ number, title, description }) => (
            <div key={number}>
              <span className="block text-[4rem] font-syne font-bold text-white/30 leading-none mb-4">
                {number}
              </span>
              <h3 className="text-white font-syne font-bold text-lg uppercase tracking-wide mb-2">
                {title}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature grid — editorial separator style */}
      <div className="max-w-6xl mx-auto px-8 sm:px-16 py-24">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-12">What you can do</p>
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/10">
          {features.map(({ href, title, description, delay }) => (
            <Link
              key={href}
              href={href}
              className="block bg-black p-8 hover:bg-[#0a0a0a] transition-colors group animate-fade-in-up"
              style={{ animationDelay: delay }}
            >
              <h3 className="text-white font-syne font-bold text-xl mb-3 group-hover:text-white/60 transition-colors">
                {title}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">{description}</p>
              <span className="inline-block mt-6 text-white/60 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
