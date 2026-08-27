import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { inter } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import './globals.css';

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
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
