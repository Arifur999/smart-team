'use client';

import { lineByKey, memberById, YOU, type LineView, type TaskSummary } from '@smart-team/shared';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { useLines } from '@/hooks/useLines';
import { shortDuration, useNow } from '@/hooks/useNow';
import { NewTaskForm } from '../NewTaskForm';
import { LineBoard } from './LineBoard';

/** Order of the "On the line" chips: what needs attention first. */
const URGENCY: Record<string, number> = { stuck: 0, waiting: 1, blocked: 2, working: 3, paused: 4, queued: 5 };
const urgency = (t: TaskSummary) => (t.line!.stuck ? URGENCY.stuck! : (URGENCY[t.line!.state] ?? 9));

/**
 * The Production Line room: every member on their own lane, each task moving stage by stage, with the
 * bypasses, the send-back loops and how long each stage takes. Pick a task to light up its own path.
 */
export function ProductionLine() {
  const { lines, error } = useLines();
  const { devices } = useDevices();
  const now = useNow(1000);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pickedStage, setPickedStage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const taskId = params.get('task');
  const lineKey = params.get('line');
  const allTasks = lines?.flatMap((l) => l.tasks) ?? [];
  const selected = allTasks.find((t) => t.id === taskId) ?? null;
  const view: LineView | undefined = lines?.find((l) => l.key === (selected?.line?.key ?? lineKey)) ?? lines?.[0];
  const line = view ? lineByKey(view.key) : undefined;

  const go = (next: { task?: string | null; line?: string | null }) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const onLine = [...(view?.tasks ?? [])].sort((a, b) => urgency(a) - urgency(b));
  const waiting = onLine.filter((t) => t.line!.state === 'waiting').length;
  const stuck = onLine.filter((t) => t.line!.stuck || t.line!.state === 'blocked').length;
  const online = devices?.filter((d) => d.status === 'ONLINE') ?? [];
  const onlineIds = new Set(online.map((d) => d.id));
  const busy = new Set(allTasks.filter((t) => t.line!.state === 'working' && onlineIds.has(t.deviceId)).map((t) => t.deviceId));
  const noun = view?.noun ?? { one: 'task', many: 'tasks' };

  return (
    <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Production Line</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Each member works their own stage. The critic sends work back with exact fixes until it passes, and you only step in at
            your checks.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
          New {noun.one}
        </button>
      </header>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Could not load the line: {error}
        </p>
      )}

      {lines && lines.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Lines">
          {lines.map((l) => (
            <button
              key={l.key}
              onClick={() => go({ line: l.key, task: null })}
              aria-pressed={l.key === view?.key}
              className={`rounded-full border px-3 py-1 text-sm ${l.key === view?.key ? 'border-foreground bg-foreground text-background' : 'border-line text-muted hover:text-foreground'}`}
            >
              {l.label} <span className="opacity-70">{l.tasks.length}</span>
            </button>
          ))}
        </div>
      )}

      {lines && !view && (
        <section className="mt-8 rounded-xl border border-dashed border-line p-8 text-center">
          <h2 className="font-medium">No team works on a line yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Turn one on with LINE_TEAMS in the hub&apos;s .env.</p>
        </section>
      )}

      {view && line && (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Counter label={`${noun.many} on the line`} value={onLine.length} />
            <Counter label="wait for you" value={waiting} tone={waiting ? 'you' : undefined} />
            <Counter label="stuck or stopped" value={stuck} tone={stuck ? 'stuck' : undefined} />
            <Counter label="PCs busy" value={devices ? `${busy.size}/${online.length}` : '–'} />
          </dl>

          <section aria-label="On the line" className="mt-5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">On the line</span>
              <button
                onClick={() => go({ task: null })}
                aria-pressed={!selected}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs ${!selected ? 'border-foreground bg-foreground text-background' : 'border-line text-muted hover:text-foreground'}`}
              >
                All
              </button>
              {onLine.map((t) => (
                <TaskChip key={t.id} task={t} now={now} active={t.id === selected?.id} onClick={() => go({ task: t.id === selected?.id ? null : t.id })} />
              ))}
              {onLine.length === 0 && <span className="text-xs text-muted">Nothing on the line right now.</span>}
            </div>
          </section>

          <div className="mt-3">
            <LineBoard line={line} view={view} selected={selected} now={now} pickedStage={pickedStage} onPickStage={setPickedStage} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {selected && <SelectedTask task={selected} now={now} />}
            {pickedStage && <StageInspector view={view} stageKey={pickedStage} selected={selected} onClose={() => setPickedStage(null)} />}
          </div>

          <p className="mt-4 text-xs text-muted">
            Times and send-backs are from the last {view.statsTasks} {view.statsTasks === 1 ? noun.one : noun.many} (30 days).
          </p>
        </>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={`New ${noun.one}`}>
          <div className="w-full max-w-2xl">
            <NewTaskForm
              defaultTeam={view?.team}
              onClose={() => setCreating(false)}
              onCreated={(task) => {
                setCreating(false);
                router.push(`/tasks/${task.id}`);
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function Counter({ label, value, tone }: { label: string; value: number | string; tone?: 'you' | 'stuck' }) {
  const color = tone === 'you' ? 'text-warn' : tone === 'stuck' ? 'text-danger' : '';
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <dd className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}

function TaskChip({ task, now, active, onClick }: { task: TaskSummary; now: number | null; active: boolean; onClick: () => void }) {
  const l = task.line!;
  const since = l.since ? Date.parse(l.since) : null;
  const dot = l.stuck || l.state === 'blocked' ? 'bg-danger' : l.state === 'waiting' ? 'bg-warn' : l.state === 'working' ? 'bg-ok' : 'bg-idle';
  const state = l.stuck ? 'stuck' : l.state === 'waiting' ? 'your turn' : l.state === 'blocked' ? 'stopped' : l.state === 'paused' ? 'paused' : l.state === 'queued' ? 'queued' : null;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex max-w-72 shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs ${active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-muted'}`}
    >
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="truncate font-medium">{task.title}</span>
      <span className="shrink-0 text-muted">
        {l.stageLabel}
        {state ? ` · ${state}` : ''}
        {since && now ? ` · ${shortDuration((now - since) / 1000)}` : ''}
      </span>
    </button>
  );
}

function SelectedTask({ task, now }: { task: TaskSummary; now: number | null }) {
  const l = task.line!;
  const since = l.since ? Date.parse(l.since) : null;
  const atReview = l.stage === 'review';
  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-label="Selected task">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{task.title}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {task.deviceName} · {l.settings.direction === 'concept' ? 'New concept' : 'Match the reference'}
            {l.settings.trust ? ' · Trust on' : ''} · pass mark {l.passMark}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {atReview && (
            <Link href={`/review/${task.id}`} className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              Open Review Booth
            </Link>
          )}
          <Link href={`/tasks/${task.id}`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-chip">
            Open task
          </Link>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Fact label="Stage" value={l.stageLabel ?? '–'} />
        <Fact label="Who" value={l.ownerName ?? '–'} />
        <Fact label="Score" value={l.score !== null ? `${l.score}/100` : '–'} />
        <Fact label="Fix rounds" value={`${l.fixesUsed} of ${l.maxFixes}`} />
      </dl>
      {(l.note || (since && now)) && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${l.stuck || l.state === 'blocked' ? 'bg-danger-soft text-danger' : l.state === 'waiting' ? 'bg-warn-soft text-warn' : 'bg-chip text-muted'}`}>
          {l.note ?? `${l.state === 'working' ? 'Working' : l.state === 'waiting' ? 'Waiting for you' : 'At this stage'} for ${shortDuration(((now ?? 0) - (since ?? 0)) / 1000)}.`}
          {l.stuck ? ' No sign of life for 15 minutes; check the PC or retry from the task page.' : ''}
        </p>
      )}
    </section>
  );
}

function StageInspector({ view, stageKey, selected, onClose }: { view: LineView; stageKey: string; selected: TaskSummary | null; onClose: () => void }) {
  const line = lineByKey(view.key)!;
  const stage = line.stages.find((s) => s.key === stageKey);
  if (!stage) return null;
  const owner = stage.owner === YOU ? null : memberById(stage.owner);
  const stats = view.stats.find((s) => s.key === stageKey);
  const here = view.tasks.filter((t) => t.line?.stage === stageKey);
  const step = selected?.line?.path.find((p) => p.key === stageKey);
  const gate = stage.gate;
  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-label={`Stage ${stage.label}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{stage.label}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {owner ? `${owner.name} · ${owner.title}` : 'You'} · {stage.kind === 'gate' ? 'quality gate' : stage.kind === 'check' ? 'check' : 'work'}
          </p>
        </div>
        <button onClick={onClose} className="text-xs text-muted hover:text-foreground">
          Close
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Fact label="Average time" value={stats?.avgSeconds ? shortDuration(stats.avgSeconds) : '–'} />
        <Fact label="Sent back" value={String(stats?.sentBack ?? 0)} />
        <Fact label="Here now" value={String(here.length)} />
        {step ? <Fact label="This task" value={`${step.rounds} round${step.rounds === 1 ? '' : 's'}${step.score !== null ? ` · ${step.score}` : ''}`} /> : <Fact label="Went through" value={String(stats?.tasks ?? 0)} />}
      </dl>
      {gate && (
        <p className="mt-3 text-xs text-muted">
          {gate.judge === 'score'
            ? `Passes at ${selected?.line?.passMark ?? line.defaults.passMark}/100 with every dimension at ${gate.minDimension ?? 6} or more; otherwise the fixes go back to the stage that owns them.`
            : `Passes or fails with notes${gate.maxFixes ? `; can send work back ${gate.maxFixes}×` : ''}.`}
        </p>
      )}
      {here.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {here.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`} className="text-accent hover:underline">
                {t.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
