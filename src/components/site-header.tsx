'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowUpRightIcon } from 'lucide-react';

const GITHUB_CORE_URL = 'https://github.com/robertonevarez/protocoltooling';
const DEMO_REPO_URL = 'https://github.com/robertonevarez/protocoltooling-demo';

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xs">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Protocol Tooling
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              Core
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/docs"
              className={isActive('/docs') ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              Docs &amp; Tools
            </Link>
            <Link
              href="/businesses/acme-hvac"
              className={isActive('/businesses') ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              Reference Endpoint
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={DEMO_REPO_URL} target="_blank" rel="noopener noreferrer" />}>
            Showcase Repo
            <ArrowUpRightIcon className="size-3.5" />
          </Button>
          <Button size="sm" nativeButton={false} render={<a href={GITHUB_CORE_URL} target="_blank" rel="noopener noreferrer" />}>
            GitHub
          </Button>
        </div>
      </div>
    </header>
  );
}
