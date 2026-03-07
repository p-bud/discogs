import React from 'react';
import Link from 'next/link';
import Header from './components/Header';
import ConnectButton from './components/ConnectButton';

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

export default function Home() {
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
          <div
            className="flex flex-wrap items-center gap-6 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <ConnectButton label="Connect Discogs" />
            <Link
              href="/leaderboard"
              className="text-white/40 hover:text-white transition-colors text-sm font-medium tracking-widest uppercase"
            >
              Browse Leaderboard →
            </Link>
          </div>
        </div>
      </section>

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
