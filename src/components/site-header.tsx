'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';
const DEMO_URL = '/demo';

const NAV_ITEMS = [
  { href: '/docs', label: 'Docs' },
  { href: GITHUB_URL, label: 'GitHub', external: true },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <Shell className={cn('flex items-center', spacing.gap)}>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/" />}
          className="shrink-0 px-0 hover:bg-transparent"
        >
          <span className="text-lg font-semibold tracking-tight">Protocol Tooling</span>
        </Button>

        <div className="flex-1" />

        <div className={cn('flex items-center', spacing.gap)}>
          <NavigationMenu>
            <NavigationMenuList>
              {NAV_ITEMS.map((item) => (
                <NavigationMenuItem key={item.href}>
                  {'external' in item ? (
                    <NavigationMenuLink
                      href={item.href}
                      className={navigationMenuTriggerStyle()}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {item.label}
                    </NavigationMenuLink>
                  ) : (
                    <NavigationMenuLink
                      active={isActive(item.href)}
                      className={navigationMenuTriggerStyle()}
                      render={<Link href={item.href} />}
                    >
                      {item.label}
                    </NavigationMenuLink>
                  )}
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <Button nativeButton={false} render={<Link href={DEMO_URL} />}>
            Try demo
          </Button>
        </div>
      </Shell>
    </header>
  );
}
