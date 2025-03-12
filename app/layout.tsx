import React from 'react';
import './styles/globals.css';
import { inter, jetbrainsMono, picnic } from './fonts';

export const metadata = {
  title: 'Rarity - How Rare is Your Record Collection?',
  description: 'Analyze your Discogs vinyl record collection to discover how rare your records are.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${picnic.variable}`}>
      <body className="min-h-screen bg-minimal-white">
        <div className="container mx-auto px-2 py-4">
          {children}
        </div>
      </body>
    </html>
  );
} 