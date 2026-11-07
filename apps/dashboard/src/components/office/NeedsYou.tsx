"use client";

import {
  INTAKE_AGENT_NAME,
  PLAN_AGENT_NAME,
  type TaskSummary,
} from "@smart-team/shared";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";

/** True for tasks that are waiting on you: a plan to approve, or a brief with questions or a summary to confirm. */
export function needsYou(task: TaskSummary): boolean {
  if (task.line && task.status !== "INTAKE")
    return task.line.state === "waiting" || task.line.state === "blocked";
  if (task.status === "AWAITING_APPROVAL") return true;
  return task.status === "INTAKE" && task.intakePhase !== "REVIEWING";
}

/**
 * What is waiting on you, oldest first. Plans get Apply / Dismiss right here; briefs open the brief chat,
 * because answering takes more than one click.
 */
export function NeedsYou({
  waiting,
  onOpen,
  onDone,
}: {
  waiting: TaskSummary[];
  onOpen: (task: TaskSummary) => void;
  /** Reloads the tasks after an action, so the bar shows the real state even if a live update was missed. */
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const task = waiting[0];

  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onDone?.();
    }
  }

  if (!task) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
        <span className="size-2 rounded-full bg-ok" aria-hidden />
        Nothing needs you
      </div>
    );
  }

  const isBrief = task.status === "INTAKE";
  // Line tasks open where the decision is made: the Review Booth for the finished work, the task page otherwise.
  const line = !isBrief ? task.line : null;
  const what = isBrief
    ? task.intakePhase === "READY"
      ? `${INTAKE_AGENT_NAME}’s brief is ready to confirm`
      : `${INTAKE_AGENT_NAME} needs your answers`
    : line
      ? line.state === "blocked"
        ? `Stopped at ${line.stageLabel}`
        : line.stage === "review"
          ? "Finished, ready for your review"
          : line.stage === "ready"
            ? "Plan ready for your check"
            : `Your check: ${line.stageLabel}`
      : `${PLAN_AGENT_NAME}’s plan`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-sm">
      <span className="flex items-center gap-2 font-medium text-warn">
        <span
          className="size-2 animate-pulse rounded-full bg-warn"
          aria-hidden
        />
        Needs you · {waiting.length}
      </span>
      <button
        onClick={() => onOpen(task)}
        className="min-w-0 max-w-96 truncate text-left text-foreground hover:underline"
        title={task.title}
      >
        {what}: {task.title}
      </button>
      <span className="ml-auto flex gap-2">
        {error && (
          <span role="alert" className="rounded bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
            {error}
          </span>
        )}
        {line ? (
          <Link
            href={
              line.stage === "review" && line.state === "waiting"
                ? `/review/${task.id}`
                : `/tasks/${task.id}`
            }
            className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white"
          >
            {line.stage === "review" && line.state === "waiting"
              ? "Open Review Booth"
              : "Open"}
          </Link>
        ) : isBrief ? (
          <button
            onClick={() => onOpen(task)}
            className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white"
          >
            Open brief
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => act(() => api.approve(task.id))}
            className="rounded-md bg-ok px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            Apply
          </button>
        )}
        {!line && (
          <button
            disabled={busy}
            onClick={() => {
              const noun = isBrief ? "task" : "plan";
              if (
                window.confirm(
                  `Dismiss the ${noun} “${task.title}”? Nothing on the PC has changed yet.`,
                )
              )
                void act(() => api.cancel(task.id));
            }}
            className="rounded-md border border-danger/50 px-3 py-1 text-xs font-semibold text-danger disabled:opacity-60"
          >
            Dismiss
          </button>
        )}
      </span>
    </div>
  );
}
