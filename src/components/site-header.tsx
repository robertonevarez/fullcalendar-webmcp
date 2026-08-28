'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { ArrowRightIcon } from 'lucide-react';

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
    <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
      Protocol Tooling
    </Button>
  );

  const actions = (
    <div className="flex items-center gap-2">
      <NavigationMenu>
        <NavigationMenuList>
          {NAV_ITEMS.map((item) => (
            <NavigationMenuItem key={item.href}>
              {'external' in item ? (
                <NavigationMenuLink
                  href={item.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.label}
                </NavigationMenuLink>
              ) : (
                <NavigationMenuLink
                  active={isActive(item.href)}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <Button size="sm" nativeButton={false} render={<Link href={DEMO_URL} />}>
        Try demo
        <ArrowRightIcon />
      </Button>
    </div>
  );

  if (landing || embedded) {
    return (
      <header className="flex items-center justify-between">
        {brand}
        {actions}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container flex h-14 items-center justify-between">
        {brand}
        {actions}
      </div>
    </header>
  );
}
