'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';
const DEMO_URL = '/demo';

const NAV_ITEMS = [
  { href: '/docs', label: 'Docs' },
  { href: GITHUB_URL, label: 'GitHub', external: true },
] as const;

type SiteHeaderProps = {
  /** Renders inside the landing hero shell — no outer container or sticky positioning. */
  embedded?: boolean;
  /** Single-line landing nav: brand on the left, links on the right. */
  landing?: boolean;
};

export function SiteHeader({ embedded = false, landing = false }: SiteHeaderProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const brand = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href="/" />}
      className="shrink-0 px-0 h-auto hover:bg-transparent"
    >
      <span className="text-xs font-semibold tracking-tight">Protocol Tooling</span>
    </Button>
  );

  const actions = (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <NavigationMenu className="hidden sm:block">
        <NavigationMenuList className="gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavigationMenuItem key={item.href}>
              {'external' in item ? (
                <NavigationMenuLink
                  href={item.href}
                  className={cn(navigationMenuTriggerStyle(), 'h-5 px-2 text-xs text-muted-foreground hover:text-foreground')}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.label}
                </NavigationMenuLink>
              ) : (
                <NavigationMenuLink
                  active={isActive(item.href)}
                  className={cn(navigationMenuTriggerStyle(), 'h-5 px-2 text-xs text-muted-foreground hover:text-foreground')}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <Button size="xs" className="h-5 px-2 text-xs font-medium" nativeButton={false} render={<Link href={DEMO_URL} />}>
        Try demo
      </Button>
    </div>
  );

  if (landing) {
    return (
      <div className="landing-chrome w-full shrink-0 py-1 sm:py-1.5" role="banner">
        <div className="flex items-center justify-between gap-4">
          {brand}
          {actions}
        </div>
      </div>
    );
  }

  const nav = (
    <div
      className={cn(
        'flex h-8 items-center justify-between',
        !embedded && 'container mx-auto px-3 md:px-6',
      )}
    >
        {brand}
        {actions}
    </div>
  );

  if (embedded) {
    return (
      <div className="w-full shrink-0" role="banner">
        {nav}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 bg-transparent">
      {nav}
    </header>
  );
}
