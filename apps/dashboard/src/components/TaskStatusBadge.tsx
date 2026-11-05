import type { RunMode, TaskStatus } from '@smart-team/shared';

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

export function TaskStatusBadge({ status, mode }: { status: TaskStatus; mode: RunMode }) {
  const key = status === 'RUNNING' ? (mode === 'PLAN' ? 'PLANNING' : 'WORKING') : status;
  const style = STYLES[key] ?? STYLES.QUEUED!;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}>
      <span className={`size-1.5 rounded-full bg-current ${style.pulse ? 'animate-pulse' : ''}`} aria-hidden />
      {style.label}
    </span>
  );
}
