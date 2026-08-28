'use client';

import { SiteHeader } from '@/components/site-header';
import { usePathname } from 'next/navigation';

export function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {!pathname.startsWith('/businesses/') && <SiteHeader />}
      {children}
    </>
  );
}
