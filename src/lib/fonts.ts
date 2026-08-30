import localFont from 'next/font/local';
import { Lilex } from 'next/font/google';

/** Site-wide UI type — Open Runde vendored from https://github.com/lauridskern/open-runde */
export const openRunde = localFont({
  src: [
    {
      path: '../fonts/open-runde/OpenRunde-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/open-runde/OpenRunde-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/open-runde/OpenRunde-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../fonts/open-runde/OpenRunde-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

/** Technical / protocol monospace (WebMCP inspect, code). */
export const lilex = Lilex({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
