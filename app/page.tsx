import React from 'react';
import Link from 'next/link';
import Header from './components/Header';
import ConnectButton from './components/ConnectButton';

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
          <h2 className="text-[clamp(3rem,11vw,9rem)] font-syne font-bold uppercase leading-none tracking-tighter text-white mb-10 animate-fade-in-up">
            Find the<br />Rarest Records
          </h2>
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

      {/* Feature grid — editorial separator style */}
      <div className="max-w-6xl mx-auto px-8 sm:px-16 py-24">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-12">What you can do</p>
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
              <p className="text-white/40 text-sm leading-relaxed">{description}</p>
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
