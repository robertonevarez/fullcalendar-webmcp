'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';

export function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = /^\/businesses\/[^/]+$/.test(pathname);

  return (
    <>
      {!hideHeader && <SiteHeader />}
      {children}
    </>
  );
}
