'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const GITHUB_CORE_URL = 'https://github.com/robertonevarez/protocoltooling';

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 gap-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity">
            Protocol Tooling
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/businesses"
              className={pathname === '/businesses' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground transition-colors'}
            >
              Directory
            </Link>
            <Link
              href="/businesses/marias-cleaning"
              className={pathname.startsWith('/businesses/') ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground transition-colors'}
            >
              Reference Endpoint
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={GITHUB_CORE_URL} target="_blank" rel="noopener noreferrer" />}>
            GitHub
          </Button>
        </div>
      </div>
    </header>
  );
}
