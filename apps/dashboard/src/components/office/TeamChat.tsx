'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatLine } from '@/hooks/useTeamChat';
import { lookOf } from '@/lib/characters';
import { PixelSprite } from './PixelSprite';

export function TeamChat({ lines }: { lines: ChatLine[] }) {
  const [open, setOpen] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [lines.length, open]);

  return (
    <section className="rounded-xl border border-line bg-surface" aria-label="Team chat">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-2 text-left" aria-expanded={open}>
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
          {open ? '▾' : '▸'} Team chat
        </span>
        <span className="text-xs text-muted">{lines.length} events</span>
      </button>
      {open && (
        <div ref={box} className="max-h-44 space-y-1.5 overflow-y-auto border-t border-line px-4 py-3" role="log" aria-live="polite">
          {lines.length === 0 && <p className="text-sm text-muted">Quiet so far. Give the team a task and they will report here.</p>}
          {lines.map((line) => (
            <div key={line.id} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0c0e13]">
                <PixelSprite look={lookOf(line.memberId)} bust size={22} />
              </span>
              <p className="min-w-0 flex-1">
                <span className="font-medium">{line.name}</span> <span className="text-muted">{line.text}</span>
              </p>
              <time className="shrink-0 text-xs tabular-nums text-muted" dateTime={line.at}>
                {new Date(line.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
