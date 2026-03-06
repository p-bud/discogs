import { Inter, JetBrains_Mono, Syne } from 'next/font/google';

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

// Syne — display typeface used for font-syne and font-picnic utility classes
export const alliance = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alliance',
  weight: ['700', '800'],
});
