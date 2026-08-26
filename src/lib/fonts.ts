import { Instrument_Sans } from 'next/font/google';
import localFont from 'next/font/local';

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const playpenSansHebrew = localFont({
  src: '../fonts/playpen-sans-hebrew.woff2',
  variable: '--font-playpen-sans-hebrew',
  weight: '400 600',
  display: 'swap',
});
