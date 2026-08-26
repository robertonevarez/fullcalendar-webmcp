'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/docs', label: 'WebMCP docs' },
  { href: '/businesses/acme-hvac', label: 'Try demo' },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        Protocol Tooling
      </Link>
      <nav className="nav" aria-label="Primary">
        {LINKS.map((link) => {
          const current =
            link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} aria-current={current ? 'page' : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
