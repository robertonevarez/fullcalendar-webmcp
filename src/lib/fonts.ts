import localFont from 'next/font/local';

export const scoutieSans = localFont({
  src: [
    {
      path: '../fonts/scoutie-sans-latin.woff2',
      weight: '200 800',
      style: 'normal',
    },
    {
      path: '../fonts/scoutie-sans-latin-italic.woff2',
      weight: '200 800',
      style: 'italic',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const playpenSansHebrew = localFont({
  src: '../fonts/playpen-sans-hebrew.woff2',
  variable: '--font-playpen-sans-hebrew',
  weight: '400 600',
  display: 'swap',
});

