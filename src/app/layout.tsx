import type { Metadata } from 'next';
import { RootChrome } from '@/components/root-chrome';
import { openRunde, lilex } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Protocol Tooling — Agent-native scheduling infrastructure',
    template: '%s · Protocol Tooling',
  },
  description:
    'Agent-native scheduling infrastructure for service businesses, exposed through WebMCP.',
  openGraph: {
    title: 'Protocol Tooling — Agent-native scheduling infrastructure',
    description:
      'Agent-native scheduling infrastructure for service businesses, exposed through WebMCP.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn('min-h-dvh font-sans', openRunde.variable, lilex.variable)}
    >
      <body className="flex min-h-dvh flex-col bg-muted text-foreground antialiased selection:bg-muted">
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
