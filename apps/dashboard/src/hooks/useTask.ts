'use client';

import { DashboardEvents, type TaskDetail, type TaskLogEvent, type TaskSummary, type TerminalLine } from '@smart-team/shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

const lineKey = (l: TerminalLine) => `${l.runId}:${l.seq}`;

/** One task with its terminal transcript, live. */
export function useTask(taskId: string) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api
      .task(taskId)
      .then((detail) => setTask((current) => (current ? { ...detail, lines: mergeLines(detail.lines, current.lines) } : detail)))
      .catch((e: Error) => setError(e.message));
  }, [taskId]);

  useEffect(() => {
    const socket = hubSocket();
    const watch = () => socket.emit(DashboardEvents.watchTask, taskId);
    const onLog = (event: TaskLogEvent) => {
      if (event.taskId !== taskId) return;
      setTask((current) => (current ? { ...current, lines: mergeLines(current.lines, event.lines) } : current));
    };
    // A state change can add a run (and its prompt line) or flip approve/follow-up, so reload the detail.
    const onUpdated = (summary: TaskSummary) => {
      if (summary.id === taskId) reload();
    };

    watch();
    socket.on('connect', watch);
    socket.on(DashboardEvents.taskLog, onLog);
    socket.on(DashboardEvents.taskUpdated, onUpdated);
    reload();
    return () => {
      socket.emit(DashboardEvents.unwatchTask, taskId);
      socket.off('connect', watch);
      socket.off(DashboardEvents.taskLog, onLog);
      socket.off(DashboardEvents.taskUpdated, onUpdated);
    };
  }, [taskId, reload]);

  return { task, error, reload };
}

/** Union of both lists, ordered by run then seq. Runs are ordered by when their first line appeared. */
function mergeLines(a: TerminalLine[], b: TerminalLine[]): TerminalLine[] {
  const byKey = new Map<string, TerminalLine>();
  for (const line of [...a, ...b]) byKey.set(lineKey(line), line);

  const runOrder = new Map<string, string>();
  for (const line of byKey.values()) {
    const first = runOrder.get(line.runId);
    if (!first || line.at < first) runOrder.set(line.runId, line.at);
  }
  return [...byKey.values()].sort((x, y) => {
    if (x.runId !== y.runId) return (runOrder.get(x.runId) ?? '').localeCompare(runOrder.get(y.runId) ?? '');
    return x.seq - y.seq;
  });
}
