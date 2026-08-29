'use client';

import { SiteHeader } from '@/components/site-header';

export function RootChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}

