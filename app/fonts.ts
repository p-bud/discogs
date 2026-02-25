import { Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

// Define your Inter font
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

// Define JetBrains Mono font
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
});

// Alliance No. 2 — display typeface (utility.agency)
// Files needed in /public/fonts/:
//   AllianceNo2-Bold.woff2        (700)
//   AllianceNo2-ExtraBold.woff2   (800)
export const alliance = localFont({
  src: [
    {
      path: '../public/fonts/AllianceNo2-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/AllianceNo2-ExtraBold.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-alliance',
  display: 'swap',
});
