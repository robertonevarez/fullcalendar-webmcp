import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Protocol Tooling — Infrastructure for the agent-native web',
    template: '%s · Protocol Tooling',
  },
  description:
    'Infrastructure for the agent-native web. This implementation exposes service-business scheduling and booking capabilities to personal AI agents through WebMCP.',
  openGraph: {
    title: 'Protocol Tooling — Infrastructure for the agent-native web',
    description:
      'Infrastructure for the agent-native web. This implementation exposes service-business scheduling and booking capabilities to personal AI agents through WebMCP.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <div className="site-shell">
          <SiteHeader />
          {children}
          <footer className="site-footer">
            <p>
              Protocol Tooling — MIT licensed prototype for the{' '}
              <a href="https://webmcp.devpost.com/">OpenAI WebMCP Challenge</a>. The agent is the
              interface; this site explains the capability surface.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
