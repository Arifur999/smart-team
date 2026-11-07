import { lineByKey, type TaskSummary } from '@smart-team/shared';

/** The stages a task goes through. Review and Ship are greyed out until their phases are built. */
const STEPS = [
  { id: 'brief', label: 'Brief', built: true },
  { id: 'plan', label: 'Plan', built: true },
  { id: 'approve', label: 'Approve', built: true },
  { id: 'build', label: 'Build', built: true },
  { id: 'review', label: 'Review', built: false },
  { id: 'ship', label: 'Ship-ready', built: false },
] as const;

function currentStep(task: TaskSummary | undefined): string | null {
  if (!task) return null;
  if (task.status === 'INTAKE') return 'brief';
  if (task.status === 'AWAITING_APPROVAL') return 'approve';
  if (task.mode === 'PLAN') return 'plan';
  if (task.status === 'SUCCEEDED') return 'ship';
  return 'build';
}

export function PhaseSteps({ task }: { task: TaskSummary | undefined }) {
  if (task?.line && task.status !== 'INTAKE') return <StageTrack task={task} />;
  const current = currentStep(task);
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">Phase</span>
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs" aria-label="Task stages">
        {STEPS.map((step, i) => {
          const done = currentIndex > i;
          const active = i === currentIndex;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className={`h-px w-4 ${done || active ? 'bg-accent' : 'bg-line'}`} aria-hidden />}
              <span
                aria-current={active ? 'step' : undefined}
                title={step.built ? undefined : 'Comes in a later phase'}
                className={`rounded px-1.5 py-0.5 ${
                  active ? 'bg-accent text-white' : done ? 'text-foreground' : step.built ? 'text-muted' : 'text-muted/50 line-through decoration-dotted'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      {task && <span className="hidden min-w-0 truncate text-xs text-muted md:inline">· {task.title}</span>}
    </div>
  );
}

/** A line task's own stages, compact: done ones ticked, the current one lit, skipped ones struck out. */
function StageTrack({ task }: { task: TaskSummary }) {
  const l = task.line!;
  const def = lineByKey(l.key);
  const labels = new Map(def?.stages.map((s) => [s.key, s.label]) ?? []);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">Line</span>
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs [scrollbar-width:none]" aria-label="Task stages">
        {l.path.map((step, i) => {
          const active = step.key === l.stage;
          const waiting = active && l.state === 'waiting';
          return (
            <li key={step.key} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className={`h-px w-2 ${step.status === 'done' || active ? 'bg-accent' : 'bg-line'}`} aria-hidden />}
              <span
                aria-current={active ? 'step' : undefined}
                className={`rounded px-1.5 py-0.5 ${
                  waiting
                    ? 'bg-warn text-white'
                    : active
                      ? 'bg-accent text-white'
                      : step.status === 'done'
                        ? 'text-foreground'
                        : step.status === 'skipped'
                          ? 'text-muted/50 line-through'
                          : 'text-muted'
                }`}
              >
                {labels.get(step.key) ?? step.key}
                {step.sentBack > 0 ? ` ↺${step.sentBack}` : ''}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="hidden min-w-0 truncate text-xs text-muted md:inline">· {task.title}</span>
    </div>
  );
}
