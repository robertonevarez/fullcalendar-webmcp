import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';

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
    <html lang="en">
      <body>
        <div className="site-shell">
          <SiteHeader />
          {children}
          <footer className="site-footer">
            <p>
              Protocol Tooling ·{' '}
              <a href={GITHUB_URL}>GitHub</a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
