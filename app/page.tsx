import React from 'react';
import Link from 'next/link';
import Header from './components/Header';
import ConnectButton from './components/ConnectButton';

const ACCENT = '#4f46e5';

const features = [
  {
    href: '/collection',
    title: 'Collection Analyzer',
    description: 'Rank every record you own by rarity score. See your rarest items, most-wanted, and full collection stats.',
  },
  {
    href: '/wrapped',
    title: 'Wrapped',
    description: 'Your year in vinyl. See what genres, formats, and decades defined your collecting year.',
  },
  {
    href: '/leaderboard',
    title: 'Leaderboard',
    description: 'Compete globally. See who holds the rarest collections across three categories.',
  },
];

export default function Home() {
  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto px-4">

        {/* Hero */}
        <section className="text-center py-16">
          <h2
            className="text-5xl sm:text-6xl font-picnic uppercase tracking-tight text-minimal-black leading-tight mb-6"
          >
            Find the Rarest Records<br />in Your Collection
          </h2>
          <p className="text-minimal-gray-500 text-lg max-w-xl mx-auto mb-10">
            Analyze your Discogs vinyl collection to discover rarity scores, see your Wrapped
            stats, and compete on the leaderboard.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <ConnectButton label="Connect Discogs" />
            <Link
              href="/leaderboard"
              className="inline-block px-6 py-3 rounded font-semibold border border-minimal-gray-300 text-minimal-gray-700 hover:bg-minimal-gray-50 transition-colors"
            >
              Browse Leaderboard
            </Link>
          </div>
        </section>

        {/* Feature cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-16">
          {features.map(({ href, title, description }) => (
            <Link
              key={href}
              href={href}
              className="block border border-minimal-gray-200 rounded-xl p-6 hover:border-minimal-gray-400 hover:shadow-sm transition-all group"
            >
              <h3
                className="text-lg font-picnic font-semibold mb-2 group-hover:text-minimal-accent transition-colors"
                style={{ color: ACCENT }}
              >
                {title}
              </h3>
              <p className="text-sm text-minimal-gray-500 leading-relaxed">{description}</p>
            </Link>
          ))}
        </section>

      </div>
    </div>
  );
}
