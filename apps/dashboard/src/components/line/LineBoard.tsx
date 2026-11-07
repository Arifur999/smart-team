'use client';

import { memberById, YOU, type LineDef, type LineView, type StageStep, type TaskSummary } from '@smart-team/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { shortDuration } from '@/hooks/useNow';
import { laneLabelWidth, layoutLine, NODE_H, type BoardLayout, type NodeBox } from '@/lib/line-layout';
import { CharacterFigure } from '../office/CharacterFigure';

interface Props {
  line: LineDef;
  view: LineView;
  /** The task whose path is drawn; null shows every task on the line. */
  selected: TaskSummary | null;
  now: number | null;
  onPickStage: (key: string | null) => void;
  pickedStage: string | null;
}

type NodeState = 'pending' | 'done' | 'working' | 'queued' | 'waiting' | 'blocked' | 'skipped' | 'failed';

/**
 * The swimlane board: one lane per member, a node per stage where its column meets its owner's lane, the
 * flow between them, the dashed bypasses you can switch on (Trust, skip Sound) and the send-back loops.
 */
export function LineBoard(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  return (
    <div ref={ref} className="min-w-0">
      {width ? <Board {...props} width={width} /> : <div className="h-[520px] rounded-xl bg-prod-bg" aria-hidden />}
    </div>
  );
}

function Board({ line, view, selected, now, onPickStage, pickedStage, width }: Props & { width: number }) {
  const ids = useId().replace(/:/g, '');
  const maxFixes = selected?.line?.maxFixes ?? line.defaults.maxFixes;
  const layout = layoutLine(line, width, maxFixes);
  const labelW = laneLabelWidth(width);
  const path = selected?.line?.path ?? null;
  const tasksAt = (key: string) => view.tasks.filter((t) => t.line?.stage === key);
  const stats = new Map(view.stats.map((s) => [s.key, s]));
  const maxAvg = Math.max(1, ...view.stats.map((s) => s.avgSeconds ?? 0));

  const stateOf = (key: string): NodeState => {
    if (path) return taskNodeState(path.find((p) => p.key === key)!, selected!, key);
    const here = tasksAt(key);
    if (here.some((t) => t.line!.state === 'working')) return 'working';
    if (here.some((t) => t.line!.state === 'waiting')) return 'waiting';
    if (here.some((t) => t.line!.state === 'blocked')) return 'blocked';
    if (here.length > 0) return 'queued';
    return 'pending';
  };
  const lit = (key: string) => {
    const s = stateOf(key);
    return s !== 'pending' && s !== 'skipped';
  };

  return (
    <div className="overflow-hidden rounded-xl border border-prod-edge bg-prod-bg text-prod-fg shadow-[0_0_60px_-20px_rgba(167,139,250,0.35)]">
      <div className="relative overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <div className="flex" style={{ width: labelW + layout.width }}>
          <LaneLabels layout={layout} width={labelW} />
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            <Lanes layout={layout} />
            <svg className="absolute inset-0" width={layout.width} height={layout.height} aria-hidden>
              <defs>
                <filter id={`${ids}-glow`} filterUnits="userSpaceOnUse" x="0" y="0" width={layout.width} height={layout.height}>
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {layout.connectors.map((c) => {
                const on = c.kind === 'flow' ? lit(c.from) && lit(c.to) : c.kind === 'bypass' ? stateOf(stageBetween(layout, c)) === 'skipped' : sentBackAt(path, c.from) > 0;
                const marching = c.kind === 'flow' && on && (stateOf(c.to) === 'working' || stateOf(c.to) === 'queued');
                const color = c.kind === 'bypass' ? 'var(--prod-skip)' : c.kind === 'loop' ? 'var(--prod-loop)' : 'var(--prod-glow)';
                return (
                  <path
                    key={c.id}
                    d={c.d}
                    fill="none"
                    stroke={color}
                    strokeWidth={on ? 2 : 1.25}
                    strokeOpacity={on ? 0.95 : c.kind === 'flow' ? 0.28 : 0.5}
                    strokeDasharray={c.kind === 'flow' ? undefined : '5 4'}
                    className={marching ? 'prod-march' : undefined}
                    filter={on ? `url(#${ids}-glow)` : undefined}
                  />
                );
              })}
            </svg>
            {layout.connectors
              .filter((c) => c.label)
              .map((c) => (
                <span
                  key={`label-${c.id}`}
                  className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-px text-[10px] font-medium ${
                    c.kind === 'bypass' ? 'border-prod-skip/60 bg-[#2a1608] text-prod-skip' : 'border-prod-loop/60 bg-[#2a0d16] text-prod-loop'
                  }`}
                  style={{ left: c.labelX, top: c.labelY }}
                >
                  {c.kind === 'loop' && sentBackAt(path, c.from) > 0 ? `${c.label} · sent back ${sentBackAt(path, c.from)}` : c.label}
                </span>
              ))}
            {layout.nodes.map((n) => (
              <StageNode
                key={n.key}
                node={n}
                state={stateOf(n.key)}
                step={path?.find((p) => p.key === n.key) ?? null}
                here={path ? [] : tasksAt(n.key)}
                selected={selected}
                now={now}
                picked={pickedStage === n.key}
                onPick={() => onPickStage(pickedStage === n.key ? null : n.key)}
              />
            ))}
          </div>
        </div>
        <MetricRows layout={layout} labelW={labelW} stats={stats} maxAvg={maxAvg} path={path} />
      </div>
    </div>
  );
}

function StageNode({
  node,
  state,
  step,
  here,
  selected,
  now,
  picked,
  onPick,
}: {
  node: NodeBox;
  state: NodeState;
  step: StageStep | null;
  here: TaskSummary[];
  selected: TaskSummary | null;
  now: number | null;
  picked: boolean;
  onPick: () => void;
}) {
  const style: Record<NodeState, string> = {
    pending: 'border-prod-edge bg-prod-lane text-prod-muted',
    done: 'border-prod-done bg-gradient-to-b from-[#3b2a7a] to-[#271c55] text-prod-fg',
    working: 'border-prod-glow-strong bg-[#2b2160] text-white prod-pulse',
    queued: 'border-dashed border-prod-glow bg-prod-lane text-prod-fg',
    waiting: 'border-prod-you bg-[#3a2a08] text-prod-you prod-pulse',
    blocked: 'border-prod-stuck bg-[#3a1212] text-prod-stuck',
    skipped: 'border-dashed border-prod-skip/50 bg-transparent text-prod-muted',
    failed: 'border-prod-stuck bg-[#3a1212] text-prod-stuck',
  };
  const owner = node.stage.owner === YOU ? 'You' : (memberById(node.stage.owner)?.name ?? node.stage.owner);
  const current = selected?.line?.stage === node.key ? selected.line : null;
  const since = current?.since ? Date.parse(current.since) : null;
  const stuck = current?.stuck || here.some((t) => t.line!.stuck);
  const label = [
    `${node.stage.label}, ${owner}.`,
    state === 'working' ? 'Working now.' : state === 'waiting' ? 'Waiting for you.' : state === 'done' ? 'Done.' : state === 'skipped' ? 'Skipped.' : state === 'blocked' ? 'Stopped, needs you.' : '',
    step && step.rounds > 1 ? `${step.rounds} rounds.` : '',
    step?.score !== null && step?.score !== undefined ? `Score ${step.score}.` : '',
    here.length ? `${here.length} task${here.length === 1 ? '' : 's'} here.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      data-stage-node={node.key}
      onClick={onPick}
      aria-label={label}
      aria-pressed={picked}
      className={`absolute flex items-center justify-center rounded-full border px-2 text-center text-[11px] font-semibold leading-[13px] transition-colors ${style[state]} ${
        picked ? 'ring-2 ring-white/70' : ''
      } ${stuck ? '[--pulse:var(--prod-stuck)] border-prod-stuck' : state === 'waiting' ? '[--pulse:var(--prod-you)]' : ''}`}
      style={{ left: node.x, top: node.y, width: node.w, height: NODE_H }}
    >
      <span className="line-clamp-2">{node.stage.label}</span>
      {state === 'done' && step?.score !== null && step?.score !== undefined && (
        <span className="absolute -right-1.5 -top-2 rounded-full bg-prod-done px-1.5 text-[9px] font-bold text-white">{step.score}</span>
      )}
      {step && step.sentBack > 0 && (
        <span className="absolute -left-1.5 -top-2 rounded-full bg-[#4a1222] px-1.5 text-[9px] font-bold text-prod-loop">↺{step.sentBack}</span>
      )}
      {!selected && here.length > 0 && (
        <span className={`absolute -right-1.5 -top-2 rounded-full px-1.5 text-[9px] font-bold ${stuck ? 'bg-prod-stuck text-black' : 'bg-prod-glow text-[#1a1033]'}`}>{here.length}</span>
      )}
      {state === 'working' && (
        <span className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1">
          {node.stage.owner !== YOU && (
            <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-[#0c0e13] ring-2 ring-prod-glow">
              <CharacterFigure id={node.stage.owner} bust size={22} />
            </span>
          )}
          {since && now ? <span className={`rounded-full px-1.5 text-[9px] ${stuck ? 'bg-prod-stuck text-black' : 'bg-black/60 text-prod-fg'}`}>{stuck ? 'stuck ' : ''}{shortDuration((now - since) / 1000)}</span> : null}
        </span>
      )}
      {state === 'waiting' && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold leading-none text-prod-you">your turn</span>}
    </button>
  );
}

function LaneLabels({ layout, width }: { layout: BoardLayout; width: number }) {
  return (
    <div className="sticky left-0 z-10 shrink-0 border-r border-prod-edge bg-prod-bg" style={{ width }}>
      <div style={{ height: 6 }} />
      {layout.lanes.map((lane, i) => {
        const member = lane === YOU ? null : memberById(lane);
        return (
          <div key={lane} className={`flex items-center gap-2 px-2 ${i % 2 ? 'bg-prod-lane' : ''}`} style={{ height: 60 }}>
            <span className={`grid size-8 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ${member ? 'bg-[#0c0e13] ring-prod-edge' : 'bg-[#3a2a08] ring-prod-you'}`}>
              {member ? <CharacterFigure id={member.id} bust size={30} /> : <PersonGlyph />}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-xs font-semibold">{member?.name ?? 'You'}</span>
              <span className="block truncate text-[10px] text-prod-muted">{member?.title ?? 'Brief, checks, review'}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Lanes({ layout }: { layout: BoardLayout }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div style={{ height: 6 }} />
      {layout.lanes.map((lane, i) => (
        <div key={lane} className={`border-b border-white/[0.03] ${i % 2 ? 'bg-prod-lane' : ''}`} style={{ height: 60 }} />
      ))}
    </div>
  );
}

function MetricRows({
  layout,
  labelW,
  stats,
  maxAvg,
  path,
}: {
  layout: BoardLayout;
  labelW: number;
  stats: Map<string, { avgSeconds: number | null; sentBack: number }>;
  maxAvg: number;
  path: StageStep[] | null;
}) {
  return (
    <div className="border-t border-prod-edge" style={{ width: labelW + layout.width }}>
      <div className="flex items-end">
        <div className="sticky left-0 z-10 shrink-0 bg-prod-bg px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wide text-prod-muted" style={{ width: labelW }}>
          {labelW > 100 ? 'Average time' : 'Time'}
        </div>
        <div className="relative h-14" style={{ width: layout.width }}>
          {layout.columns.map((col) => {
            const avg = stats.get(col.key)?.avgSeconds ?? null;
            const mine = path?.find((p) => p.key === col.key);
            const h = avg ? Math.max(3, Math.round((avg / maxAvg) * 30)) : 0;
            return (
              <div key={col.key} className="absolute bottom-1 flex -translate-x-1/2 flex-col items-center gap-0.5" style={{ left: col.cx }}>
                <span className="w-3 rounded-t bg-prod-glow/80" style={{ height: h }} />
                <span className="text-[9px] text-prod-muted">{avg ? shortDuration(avg) : '–'}</span>
                {mine && mine.rounds > 0 && <span className="text-[9px] text-prod-glow-strong">{shortDuration(mine.seconds)}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center border-t border-white/[0.04]">
        <div className="sticky left-0 z-10 shrink-0 bg-prod-bg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-prod-muted" style={{ width: labelW }}>
          {labelW > 100 ? 'Sent back' : 'Back'}
        </div>
        <div className="relative h-8" style={{ width: layout.width }}>
          {layout.columns.map((col) => {
            const n = path ? (path.find((p) => p.key === col.key)?.sentBack ?? 0) : (stats.get(col.key)?.sentBack ?? 0);
            return (
              <span key={col.key} className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-1.5 text-[10px] font-semibold ${n ? 'bg-[#4a1222] text-prod-loop' : 'text-prod-muted/50'}`} style={{ left: col.cx }}>
                {n || '·'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function taskNodeState(step: StageStep, task: TaskSummary, key: string): NodeState {
  const line = task.line!;
  if (line.stage === key) {
    if (line.state === 'working') return 'working';
    if (line.state === 'waiting') return 'waiting';
    if (line.state === 'blocked') return 'blocked';
    if (line.state === 'queued' || line.state === 'paused') return 'queued';
  }
  if (step.status === 'done') return 'done';
  if (step.status === 'skipped') return 'skipped';
  if (step.status === 'failed') return 'failed';
  return 'pending';
}

function sentBackAt(path: StageStep[] | null, gateKey: string): number {
  if (!path) return 0;
  return Math.max(0, (path.find((p) => p.key === gateKey)?.rounds ?? 1) - 1);
}

/** The skipped stage a bypass goes around. */
function stageBetween(layout: BoardLayout, c: { from: string; to: string }): string {
  const i = layout.nodes.findIndex((n) => n.key === c.from);
  return layout.nodes[i + 1]?.key ?? c.to;
}

function PersonGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-prod-you" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

/** Width of an element, kept current as the window resizes. */
function useElementWidth(ref: React.RefObject<HTMLDivElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
