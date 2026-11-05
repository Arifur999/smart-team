'use client';

import { useEffect, useRef, useState } from 'react';
import { MAP_H, MAP_W, type OfficeMember, type Point, type RoomId } from '@/lib/office';
import { distance, walkPath, WALK_SPEED } from '@/lib/office-walk';
import { speechFor } from '@/lib/speech';
import { OfficeBuilding } from './OfficeBuilding';
import { CharacterFigure } from './CharacterFigure';

interface Props {
  members: OfficeMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function OfficeMap({ members, selectedId, onSelect }: Props) {
  const tick = useTick(7_000);
  const counts = new Map<RoomId, number>();
  for (const m of members) counts.set(m.activity.room, (counts.get(m.activity.room) ?? 0) + 1);

  return (
    // `isolate` keeps the characters' depth sorting (z-index by y) inside the map, under dialogs and cards.
    <div className="@container relative isolate w-full overflow-hidden rounded-xl border border-black/70 bg-[#0b0c10] shadow-2xl" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
      <OfficeBuilding counts={counts} />
      {members.map((m) => (
        <Character key={m.id} member={m} tick={tick} selected={m.id === selectedId} onSelect={() => onSelect(m.id)} />
      ))}
    </div>
  );
}

/** Small round icon over the head for people who are not talking: resting, idle or off duty. */
function statusIcon(member: OfficeMember, tick: number): string | null {
  if (member.activity.tone === 'off') return '💤';
  if (member.activity.tone !== 'idle') return null;
  const icons = ['☕', '🎧', '💬', '📖'];
  return icons[(tick + member.id.length) % icons.length]!;
}

function Character({ member, tick, selected, onSelect }: { member: OfficeMember; tick: number; selected: boolean; onSelect: () => void }) {
  const { activity } = member;
  const { x, y } = member.position;
  const { ref, figureRef, active: walking } = useWalk(x, y);

  const pose = walking ? 'walk' : activity.pose;
  const speech = walking ? null : speechFor(member, tick);
  const icon = walking || speech ? null : statusIcon(member, tick);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-label={`${member.name}, ${member.title}: ${activity.label}`}
      aria-pressed={selected}
      className="group absolute flex -translate-x-1/2 -translate-y-full flex-col items-center focus-visible:outline-none"
      style={{ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%`, zIndex: Math.round(y) }}
    >
      {speech && (
        <span
          key={speech}
          className={`bubble-in relative mb-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[clamp(9px,1cqw,13px)] font-medium leading-tight shadow-lg ${
            activity.tone === 'waiting' ? 'border-amber-300/60 bg-amber-950/95 text-amber-100' : 'border-violet-300/50 bg-[#24203f]/95 text-violet-100'
          }`}
        >
          {speech}
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-inherit bg-inherit" aria-hidden />
        </span>
      )}
      {icon && (
        <span
          className={`mb-1 grid size-[clamp(18px,2.2cqw,30px)] place-items-center rounded-full border border-white/15 bg-[#14161d]/90 text-[clamp(10px,1.2cqw,16px)] shadow ${
            activity.tone === 'off' ? 'zzz' : ''
          }`}
          aria-hidden
        >
          {icon}
        </span>
      )}

      {/* Hover card, like a game tooltip: name · role · status. */}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-black/20 bg-white px-2 py-0.5 text-[11px] text-black shadow-lg group-hover:block">
        {member.name.toLowerCase()} · {member.title} · {activity.label.toLowerCase()}
      </span>

      <span
        ref={figureRef}
        className={`relative ${selected ? 'drop-shadow-[0_0_6px_rgba(167,139,250,1)]' : 'group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]'}`}
      >
        {/* Sized in container units so characters grow and shrink with the map. */}
        <CharacterFigure id={member.id} pose={pose} size={36} className="!h-[clamp(58px,7.4cqw,118px)] !w-[clamp(46px,5.9cqw,94px)]" />
      </span>
      {/* Beds sit close together, so sleepers show their name only on hover (the hover card) or when selected. */}
      <span className={`-mt-0.5 ${activity.tone === 'off' && !selected ? 'hidden' : ''} max-w-[clamp(44px,5.6cqw,96px)] truncate px-0.5 text-[clamp(8px,0.95cqw,12px)] font-semibold leading-tight text-white [text-shadow:0_1px_2px_#000,0_0_4px_#000]`}>
        {member.name}
      </span>
    </button>
  );
}

/**
 * Walks the character to (x, y) along the corridors whenever its spot changes: out of its room's door,
 * along the hallways and into the other room. One Web Animation per walk moves it at a steady pace and
 * turns it to face the way it goes; `active` is true while it walks.
 */
function useWalk(x: number, y: number) {
  const ref = useRef<HTMLButtonElement>(null);
  const figureRef = useRef<HTMLSpanElement>(null);
  const at = useRef<Point>({ x, y });
  const current = useRef<Animation[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const figure = figureRef.current;
    if (!el || !figure) return;
    // Stopped mid-walk by a new destination: carry on from where the character is now.
    const from = current.current.length > 0 ? shownAt(el) : at.current;
    for (const a of current.current) a.cancel();
    current.current = [];
    at.current = { x, y };
    if (from.x === x && from.y === y) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const points = [from, ...walkPath(from, { x, y })];
    const lengths = points.slice(1).map((p, i) => distance(points[i]!, p));
    const total = lengths.reduce((sum, l) => sum + l, 0);
    if (total === 0) return;

    let walked = 0;
    const offsets = [0, ...lengths.map((l) => (walked += l) / total)];
    const move = el.animate(
      points.map((p, i) => ({ left: `${(p.x / MAP_W) * 100}%`, top: `${(p.y / MAP_H) * 100}%`, zIndex: Math.round(p.y), offset: offsets[i] })),
      { duration: (total / WALK_SPEED) * 1000, easing: 'linear' },
    );
    // Face each stretch's direction, switching at its corner; straight up or down keeps the last facing.
    let facing = 1;
    const turns = lengths.map((_, i) => {
      const dx = points[i + 1]!.x - points[i]!.x;
      if (dx !== 0) facing = dx < 0 ? -1 : 1;
      return { transform: `scaleX(${facing})`, offset: offsets[i], easing: 'step-end' };
    });
    const turn = figure.animate([...turns, { transform: `scaleX(${facing})`, offset: 1 }], { duration: (total / WALK_SPEED) * 1000 });

    current.current = [move, turn];
    move.ready.then(() => setActive(true)).catch(() => {});
    move.finished
      .then(() => {
        for (const a of current.current) a.cancel();
        current.current = [];
        setActive(false);
      })
      // Cancelled by a newer walk, which takes over.
      .catch(() => {});
  }, [x, y]);

  return { ref, figureRef, active };
}

/** Where the character is drawn right now, in map units (mid-walk too). */
function shownAt(el: HTMLElement): Point {
  const style = getComputedStyle(el);
  const parent = el.parentElement!;
  return { x: (parseFloat(style.left) / parent.clientWidth) * MAP_W, y: (parseFloat(style.top) / parent.clientHeight) * MAP_H };
}

/** A counter that goes up every `ms`, so speech bubbles and icons change now and then. */
function useTick(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}
