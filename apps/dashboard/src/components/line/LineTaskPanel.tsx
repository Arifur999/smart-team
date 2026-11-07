'use client';

import { lineByKey, mainGate, memberById, stageOf, YOU, type LineStepView, type TaskDetail } from '@smart-team/shared';
import Link from 'next/link';
import { useState } from 'react';
import { shortDuration, useNow } from '@/hooks/useNow';
import { api } from '@/lib/api';
import { CharacterFigure } from '../office/CharacterFigure';

/** The task page's line parts: your settings, what is waiting on you, what you can do, and every stage so far. */
export function LineBanner({ task }: { task: TaskDetail }) {
  const l = task.line;
  if (!l || l.state === 'done' || l.state === 'cancelled') return null;
  const blocked = l.state === 'blocked' || l.stuck;
  const tone = blocked ? 'bg-danger-soft text-danger' : l.state === 'waiting' ? 'bg-warn-soft text-warn' : 'bg-chip text-muted';
  const text =
    l.state === 'waiting' && l.stage === 'ready'
      ? 'Your Ready check: read the plan and its questions in the terminal (02-plan in the task folder), then approve it or send it back with what to change.'
      : l.state === 'waiting' && l.stage === 'review'
        ? 'The finished work passed Final QA and is waiting for you in the Review Booth.'
        : l.state === 'waiting'
          ? (l.note ?? `Waiting for you at ${l.stageLabel}.`)
          : l.stuck
            ? `${l.ownerName ?? 'The member'} has shown no sign of life for 15 minutes at ${l.stageLabel}. Check the PC, or retry the stage.`
            : l.state === 'blocked'
              ? (l.note ?? `${l.stageLabel} stopped and needs you. Retry it, or skip it if you do not need it.`)
              : l.state === 'paused'
                ? (l.note ?? 'Paused until the usage limit resets; it carries on by itself.')
                : `${l.ownerName ?? 'The team'} is on ${l.stageLabel}${l.state === 'queued' ? ', waiting for the PC' : ''}.`;
  return (
    <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3 text-sm ${tone}`}>
      <p className="min-w-0 flex-1">{text}</p>
      {l.stage === 'review' && (
        <Link href={`/review/${task.id}`} className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background">
          Open Review Booth
        </Link>
      )}
      <Link href={`/line?task=${task.id}`} className="text-xs font-medium underline-offset-2 hover:underline">
        See it on the line
      </Link>
    </div>
  );
}

export function LineSettingsChips({ task }: { task: TaskDetail }) {
  const l = task.line;
  if (!l) return null;
  const s = l.settings;
  const chips = [
    s.direction === 'concept' ? 'New concept' : 'Match the reference',
    s.trust ? 'Trust on: no Ready check' : 'Ready check on',
    `Pass mark ${s.passMark}`,
    `Up to ${s.maxFixes} fix round${s.maxFixes === 1 ? '' : 's'}`,
    ...(l.score !== null ? [`Score ${l.score}/100`] : []),
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5 text-xs" aria-label="Line settings">
      {chips.map((c) => (
        <li key={c} className="rounded-full bg-chip px-2.5 py-1 text-muted">
          {c}
        </li>
      ))}
    </ul>
  );
}

/** Approve, send back, retry and skip: only what the line allows right now. */
export function LineActionsBar({ task, onDone }: { task: TaskDetail; onDone?: () => void }) {
  const [open, setOpen] = useState<'send-back' | 'retry' | null>(null);
  const [text, setText] = useState('');
  const [stage, setStage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = task.lineActions;
  if (!task.line || actions.length === 0) return null;
  const line = lineByKey(task.line.key);
  const targets = task.line.stage === 'review' && line ? (mainGate(line)?.gate?.fixTargets ?? []) : [];

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setOpen(null);
      setText('');
      setStage('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      // Show the real state at once, without waiting for the live update (it may have been missed).
      onDone?.();
    }
  };

  const approveLabel = task.line.stage === 'ready' ? 'Approve plan' : task.line.stage === 'review' ? 'Approve result' : 'Approve';
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {actions.includes('approve') && (
          <button disabled={busy} onClick={() => act(() => api.lineApprove(task.id))} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-60">
            {busy ? 'Approving…' : approveLabel}
          </button>
        )}
        {actions.includes('send-back') && (
          <button onClick={() => setOpen(open === 'send-back' ? null : 'send-back')} aria-expanded={open === 'send-back'} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-chip">
            Send back
          </button>
        )}
        {actions.includes('retry') && (
          <button onClick={() => setOpen(open === 'retry' ? null : 'retry')} aria-expanded={open === 'retry'} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-chip">
            Retry stage
          </button>
        )}
        {actions.includes('skip') && (
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Skip ${task.line!.stageLabel}? The line moves on without it.`)) void act(() => api.lineSkip(task.id));
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-chip disabled:opacity-60"
          >
            Skip
          </button>
        )}
      </div>
      {open && (
        <form
          className="w-full max-w-md space-y-2 rounded-lg border border-line bg-surface p-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (open === 'send-back') {
              if (!text.trim()) return;
              void act(() => api.lineSendBack(task.id, { notes: text.trim(), ...(stage ? { stage } : {}) }));
            } else void act(() => api.lineRetry(task.id, text.trim() || undefined));
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={8000}
            required={open === 'send-back'}
            className="w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-accent"
            placeholder={open === 'send-back' ? 'What should change, as exactly as you can' : 'Optional: what to do differently this time'}
            aria-label={open === 'send-back' ? 'What should change' : 'Instruction for the retry'}
          />
          {targets.length > 0 && (
            <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full rounded-lg border border-line bg-background px-3 py-2" aria-label="Send to">
              <option value="">Let the critic route it</option>
              {targets.map((key) => (
                <option key={key} value={key}>
                  {line ? (stageOf(line, key)?.label ?? key) : key} and everything after it
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(null)} className="px-2 text-muted hover:text-foreground">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background disabled:opacity-60">
              {open === 'send-back' ? 'Send back' : 'Retry'}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="max-w-md rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const STATUS: Record<LineStepView['status'], { label: string; className: string }> = {
  ACTIVE: { label: 'In progress', className: 'bg-accent-soft text-accent' },
  WAITING: { label: 'Your turn', className: 'bg-warn-soft text-warn' },
  DONE: { label: 'Done', className: 'bg-ok-soft text-ok' },
  SENT_BACK: { label: 'Sent back', className: 'bg-danger-soft text-danger' },
  SKIPPED: { label: 'Skipped', className: 'bg-chip text-muted' },
  FAILED: { label: 'Stopped', className: 'bg-danger-soft text-danger' },
  CANCELLED: { label: 'Cancelled', className: 'bg-chip text-muted' },
};

/** Every step the task took, oldest first, with who did it, how long it took and what the gates said. */
export function StageTimeline({ task }: { task: TaskDetail }) {
  const now = useNow(5000);
  if (!task.line || task.steps.length === 0) return null;
  return (
    <section aria-label="Stages" className="flex max-h-[70vh] min-h-0 flex-col rounded-xl border border-line bg-surface lg:max-h-none">
      <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">Stages</h2>
      <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {task.steps.map((step) => (
          <TimelineStep key={step.id} step={step} now={now} />
        ))}
      </ol>
    </section>
  );
}

function TimelineStep({ step, now }: { step: LineStepView; now: number | null }) {
  const member = step.ownerId === YOU ? null : memberById(step.ownerId);
  const start = Date.parse(step.startedAt);
  const end = step.finishedAt ? Date.parse(step.finishedAt) : now;
  const status = STATUS[step.status];
  const fixes = step.verdict?.fixes ?? [];
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-7 shrink-0 place-items-center overflow-hidden rounded-full ${member ? 'bg-[#0c0e13]' : 'bg-warn-soft text-[10px] font-bold text-warn'}`}>
          {member ? <CharacterFigure id={member.id} bust size={26} /> : 'You'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{step.label}</span>
            {step.round > 1 && <span className="shrink-0 text-xs text-muted">r{step.round}</span>}
            {step.reason !== 'line' && <span className="shrink-0 rounded bg-chip px-1 text-[10px] text-muted">{step.reason}</span>}
          </div>
          <div className="truncate text-xs text-muted">
            {member?.name ?? 'You'}
            {end ? ` · ${shortDuration((end - start) / 1000)}` : ''}
            {step.runs.length > 1 ? ` · ${step.runs.length} attempts` : ''}
          </div>
        </div>
        {step.score !== null && <span className="shrink-0 text-xs font-semibold tabular-nums">{step.score}</span>}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}>{status.label}</span>
      </div>
      {(step.summary || step.comment) && <p className="mt-1.5 line-clamp-3 text-xs text-muted">{step.comment ?? step.summary}</p>}
      {fixes.length > 0 && (
        <details className="mt-1.5 text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground">
            {fixes.length} fix{fixes.length === 1 ? '' : 'es'} sent back
          </summary>
          <ul className="mt-1 space-y-1">
            {fixes.map((f) => (
              <li key={f.id}>
                <span className="font-semibold">{f.severity}</span> {f.at ? <span className="font-mono text-accent">{f.at}</span> : null} {f.problem} <span className="text-muted">→ {f.stage}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
