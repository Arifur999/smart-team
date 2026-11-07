import type { LineSummary, RunMode, TaskStatus } from '@smart-team/shared';

const STYLES: Record<string, { label: string; className: string; pulse?: boolean }> = {
  INTAKE: { label: 'Brief', className: 'bg-accent-soft text-accent' },
  QUEUED: { label: 'Queued', className: 'bg-idle-soft text-muted' },
  PLANNING: { label: 'Planning', className: 'bg-accent-soft text-accent', pulse: true },
  WORKING: { label: 'Working', className: 'bg-accent-soft text-accent', pulse: true },
  AWAITING_APPROVAL: { label: 'Plan ready', className: 'bg-warn-soft text-warn' },
  SUCCEEDED: { label: 'Done', className: 'bg-ok-soft text-ok' },
  FAILED: { label: 'Failed', className: 'bg-danger-soft text-danger' },
  CANCELLED: { label: 'Cancelled', className: 'bg-idle-soft text-muted' },
};

/** A task's state in a word or two; for tasks on a production line, the stage it is at ("Animate · r2", "Your check"). */
export function TaskStatusBadge({ status, mode, line }: { status: TaskStatus; mode: RunMode; line?: LineSummary | null }) {
  const style = (line && status !== 'INTAKE' && lineStyle(line)) || STYLES[status === 'RUNNING' ? (mode === 'PLAN' ? 'PLANNING' : 'WORKING') : status] || STYLES.QUEUED!;
  return (
    <span className={`inline-flex max-w-56 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}>
      <span className={`size-1.5 shrink-0 rounded-full bg-current ${style.pulse ? 'animate-pulse' : ''}`} aria-hidden />
      <span className="truncate">{style.label}</span>
    </span>
  );
}

function lineStyle(l: LineSummary): { label: string; className: string; pulse?: boolean } | null {
  if (l.state === 'done' || l.state === 'cancelled' || !l.stageLabel) return null;
  const round = l.round > 1 ? ` · r${l.round}` : '';
  if (l.stuck) return { label: `Stuck · ${l.stageLabel}`, className: 'bg-danger-soft text-danger' };
  if (l.state === 'blocked') return { label: `Stopped · ${l.stageLabel}`, className: 'bg-danger-soft text-danger' };
  if (l.state === 'waiting') return { label: l.stage === 'review' ? 'Your review' : 'Your check', className: 'bg-warn-soft text-warn' };
  if (l.state === 'paused') return { label: `Paused · ${l.stageLabel}`, className: 'bg-idle-soft text-muted' };
  if (l.state === 'queued') return { label: `${l.stageLabel} · queued`, className: 'bg-idle-soft text-muted' };
  return { label: `${l.stageLabel}${round}`, className: 'bg-accent-soft text-accent', pulse: true };
}
