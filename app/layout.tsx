import React from 'react';
import './styles/globals.css';
import { inter, jetbrainsMono, picnic } from './fonts';

export const metadata = {
  title: 'Raerz',
  description: 'Analyze your Discogs vinyl record collection to discover how rare your records are.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${picnic.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body className="min-h-screen bg-minimal-white">
        <div className="container mx-auto px-2 py-4">
          {children}
        </div>
      </body>
    </html>
  );
} 