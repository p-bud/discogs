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

      {/* Dark hero — full bleed */}
      <section className="relative bg-gradient-to-br from-[#0a0a12] via-[#160f3a] to-[#0a0a12] text-center py-24 px-4 overflow-hidden">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-picnic uppercase tracking-tight text-white leading-tight mb-6 animate-fade-in-up">
            Find the Rarest Records<br />in Your Collection
          </h2>
          <p
            className="text-indigo-200/70 text-lg max-w-xl mx-auto mb-10 animate-fade-in-up"
            style={{ animationDelay: '150ms' }}
          >
            Analyze your Discogs vinyl collection to discover rarity scores, see your Wrapped
            stats, and compete on the leaderboard.
          </p>
          <div
            className="flex flex-wrap gap-4 justify-center animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <ConnectButton label="Connect Discogs" />
            <Link
              href="/leaderboard"
              className="inline-block px-6 py-3 rounded font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors"
            >
              Browse Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <div className="py-16 max-w-4xl mx-auto px-4">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {features.map(({ href, title, description, delay }) => (
            <Link
              key={href}
              href={href}
              className="block border border-minimal-gray-200 rounded-xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group animate-fade-in-up"
              style={{ animationDelay: delay }}
            >
              <h3 className="text-lg font-picnic font-semibold mb-2 text-minimal-accent transition-colors">
                {title}
              </h3>
              <p className="text-sm text-minimal-gray-500 leading-relaxed">{description}</p>
              <span className="inline-block mt-3 text-minimal-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm font-medium">
                →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
