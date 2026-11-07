'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { useTasks } from '@/hooks/useTasks';

/** Every room of the dashboard in one place, like the floors of the office. */
const ROOMS: { href: string; label: string; short: string; icon: ReactNode }[] = [
  { href: '/', label: 'Office', short: 'Office', icon: <Icon d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
  { href: '/line', label: 'Production Line', short: 'Line', icon: <Icon d="M3 6h6v4H3zM15 6h6v4h-6zM9 14h6v4H9zM9 8h6M12 10v4M6 10v6h3M18 10v6h-3" /> },
  { href: '/review', label: 'Review Booth', short: 'Review', icon: <Icon d="M3 5h18v12H3zM8 21h8M12 17v4M10 9l5 2-5 2z" /> },
  { href: '/tasks', label: 'Tasks', short: 'Tasks', icon: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" /> },
  { href: '/devices', label: 'Devices', short: 'PCs', icon: <Icon d="M3 4h18v12H3zM8 20h8M12 16v4" /> },
];

/** Rooms on their way; shown so you know where things will live. */
const SOON = ['Style Lab', 'Brand Desk'];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

export function RoomsNav() {
  return (
    <nav
      aria-label="Rooms"
      className="z-30 shrink-0 border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:flex-col lg:border-b-0 lg:border-r"
    >
      <div className="flex h-12 items-center gap-2 px-4 lg:h-16">
        <span className="grid size-7 place-items-center rounded-lg bg-foreground text-xs font-bold text-background" aria-hidden>
          ST
        </span>
        <span className="font-semibold tracking-tight">Smart Team</span>
      </div>
      <Suspense fallback={<RoomList active={null} waiting={0} />}>
        <ActiveRooms />
      </Suspense>
      <div className="mt-auto hidden px-4 pb-5 lg:block">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Coming soon</p>
        <ul className="mt-2 space-y-1 text-sm text-muted/70">
          {SOON.map((room) => (
            <li key={room} className="flex items-center gap-2 px-2 py-1">
              <span className="size-1.5 rounded-full bg-line" aria-hidden />
              {room}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function ActiveRooms() {
  const pathname = usePathname();
  const { tasks } = useTasks();
  const active = ROOMS.find((room) => isActive(pathname, room.href))?.href ?? null;
  // Finished videos waiting for your approval in the Review Booth.
  const waiting = tasks?.filter((t) => t.line?.stage === 'review' && t.line.state === 'waiting').length ?? 0;
  return <RoomList active={active} waiting={waiting} />;
}

function RoomList({ active, waiting }: { active: string | null; waiting: number }) {
  return (
    <ul className="-mt-1 flex gap-1 overflow-x-auto px-2 pb-2 text-sm [scrollbar-width:none] lg:mt-2 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
      {ROOMS.map((room) => {
        const current = active === room.href;
        return (
          <li key={room.href} className="shrink-0">
            <Link
              href={room.href}
              aria-current={current ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 lg:py-2 ${current ? 'bg-chip font-medium text-foreground' : 'text-muted hover:bg-chip/60 hover:text-foreground'}`}
            >
              <span className={current ? 'text-accent' : ''}>{room.icon}</span>
              <span className="lg:hidden">{room.short}</span>
              <span className="hidden lg:inline">{room.label}</span>
              {room.href === '/review' && waiting > 0 && (
                <span className="ml-auto rounded-full bg-warn-soft px-1.5 text-[11px] font-semibold text-warn">
                  {waiting}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
