'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

const LINKS = [
  { href: '/', label: 'Office' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/devices', label: 'Devices' },
];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

/** Reading the URL needs Suspense under Next 16's prerendering; the fallback is the same links without highlighting. */
export function NavLinks() {
  return (
    <Suspense fallback={<LinkList active={null} />}>
      <ActiveNavLinks />
    </Suspense>
  );
}

function ActiveNavLinks() {
  const pathname = usePathname();
  const active = LINKS.find((link) => isActive(pathname, link.href))?.href ?? null;
  return <LinkList active={active} />;
}

function LinkList({ active }: { active: string | null }) {
  return (
    <ul className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            aria-current={active === link.href ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 ${active === link.href ? 'bg-chip font-medium text-foreground' : 'text-muted hover:text-foreground'}`}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
