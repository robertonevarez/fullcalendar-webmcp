import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ScheduleMCP',
  description: 'Agent-native scheduling infrastructure exposed through WebMCP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
