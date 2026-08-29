import { Inter, Lilex } from 'next/font/google';

/** Site-wide UI type. */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

/** Technical / protocol monospace (WebMCP inspect, code). */
export const lilex = Lilex({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
