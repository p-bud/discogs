import React from 'react';
import './styles/globals.css';
import { inter, jetbrainsMono, picnic } from './fonts';

export const metadata = {
  title: 'Discogs Bargain Finder - Discover Rare Records',
  description: 'Find rare vinyl records from the Discogs marketplace. Search for albums by genre, style, or artist to discover hidden gems.',
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