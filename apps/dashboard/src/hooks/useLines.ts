'use client';

import { DashboardEvents, type LineView, type TaskSummary } from '@smart-team/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

/** How long to wait after a task change before reloading the lines, so a burst of updates loads once. */
const RELOAD_MS = 600;

/** Every production line with its tasks and stage stats, reloaded whenever a task on a line changes. */
export function useLines() {
  const [lines, setLines] = useState<LineView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    api
      .lines()
      .then((l) => {
        setLines(l);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const socket = hubSocket();
    const onUpdated = (task: TaskSummary) => {
      if (!task.line) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(load, RELOAD_MS);
    };
    socket.on(DashboardEvents.taskUpdated, onUpdated);
    socket.on('connect', load);
    load();
    return () => {
      socket.off(DashboardEvents.taskUpdated, onUpdated);
      socket.off('connect', load);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return { lines, error, reload: load };
}
