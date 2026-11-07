'use client';

import { DashboardEvents, type TaskSummary, type VersionsView } from '@smart-team/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

/** A task's uploaded versions and verdicts, reloaded when that task changes. */
export function useVersions(taskId: string) {
  const [versions, setVersions] = useState<VersionsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    api
      .versions(taskId)
      .then((v) => {
        setVersions(v);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [taskId]);

  useEffect(() => {
    const socket = hubSocket();
    const onUpdated = (task: TaskSummary) => {
      if (task.id !== taskId) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(load, 300);
    };
    socket.on(DashboardEvents.taskUpdated, onUpdated);
    socket.on('connect', load);
    load();
    return () => {
      socket.off(DashboardEvents.taskUpdated, onUpdated);
      socket.off('connect', load);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [taskId, load]);

  return { versions, error };
}
