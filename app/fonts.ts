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

// PicNic custom font
export const picnic = localFont({
  src: [
    {
      path: '../public/fonts/PicNic.woff',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-picnic',
  display: 'swap',
});

// Example of using a local font (uncomment and replace paths when you have your font files)
/*
export const customFont = localFont({
  src: [
    {
      path: '../public/fonts/YourFont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/YourFont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
  display: 'swap',
});
*/ 