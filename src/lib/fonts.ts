import { Gothic_A1, Lilex } from 'next/font/google';

/** Site-wide UI type. */
export const gothicA1 = Gothic_A1({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

/** Technical / protocol monospace (WebMCP inspect, code). */
export const lilex = Lilex({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
