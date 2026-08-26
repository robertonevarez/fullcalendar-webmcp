'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';

const LINKS = [
  { href: '/businesses/acme-hvac', label: 'Demo' },
  { href: '/docs', label: 'Docs' },
  { href: GITHUB_URL, label: 'GitHub', external: true },
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
            !link.external &&
            (link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(`${link.href}/`));

          if (link.external) {
            return (
              <a key={link.href} href={link.href} rel="noopener noreferrer">
                {link.label}
              </a>
            );
          }

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
