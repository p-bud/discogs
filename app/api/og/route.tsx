import React from 'react';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const username = searchParams.get('username') ?? 'your collection';
    const year = searchParams.get('year') ?? String(new Date().getFullYear() - 1);
    const type = searchParams.get('type') ?? 'wrapped';

    const headline = type === 'wrapped' ? `${year} in Records` : 'Rarest Collection';
    const sub = type === 'wrapped'
      ? `@${username}'s year in vinyl`
      : `@${username}'s rarity analysis`;

    const toArrayBuffer = (b: Buffer) =>
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

    const [buf500, buf700] = await Promise.all([
      readFile(path.join(process.cwd(), 'public/fonts/space-grotesk-500.ttf')).catch(() => null),
      readFile(path.join(process.cwd(), 'public/fonts/space-grotesk-700.ttf')).catch(() => null),
    ]);

    const fontConfig = [
      buf500 && { name: 'Space Grotesk', data: toArrayBuffer(buf500), style: 'normal' as const, weight: 500 as const },
      buf700 && { name: 'Space Grotesk', data: toArrayBuffer(buf700), style: 'normal' as const, weight: 700 as const },
    ].filter(Boolean) as { name: string; data: ArrayBuffer; style: 'normal'; weight: 500 | 700 }[];

    return new ImageResponse(
      React.createElement('div', {
        style: {
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '72px 80px',
          justifyContent: 'space-between',
          fontFamily: fontConfig.length ? 'Space Grotesk' : 'sans-serif',
        },
      }, [
        React.createElement('div', { key: 'brand', style: { display: 'flex', alignItems: 'center' } },
          React.createElement('span', { style: { color: '#ffffff', fontSize: 22, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' } }, 'raerz'),
          React.createElement('span', { style: { color: 'rgba(255,255,255,0.25)', fontSize: 22, marginLeft: 16 } }, 'vinyl rarity'),
        ),
        React.createElement('div', { key: 'headline', style: { display: 'flex', flexDirection: 'column' } },
          React.createElement('span', { style: { color: 'rgba(255,255,255,0.4)', fontSize: 30, marginBottom: 20 } }, sub),
          React.createElement('span', { style: { color: '#ffffff', fontSize: 88, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.9 } }, headline),
        ),
        React.createElement('div', { key: 'footer', style: { display: 'flex', alignItems: 'center' } },
          React.createElement('div', { style: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginRight: 16 } }),
          React.createElement('span', { style: { color: 'rgba(255,255,255,0.3)', fontSize: 18, letterSpacing: '0.1em', textTransform: 'uppercase' } }, 'raerz.fyi'),
        ),
      ]),
      {
        width: 1200,
        height: 630,
        fonts: fontConfig,
      },
    );
  } catch (err: any) {
    console.error('[OG] error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
