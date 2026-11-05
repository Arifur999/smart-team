'use client';

import { DashboardEvents, type IntakeView, type TaskSummary } from '@smart-team/shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

/** The brief chat of one task, reloaded whenever the hub says the task changed. */
export function useIntake(taskId: string) {
  const [intake, setIntake] = useState<IntakeView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api
      .intake(taskId)
      .then((view) => {
        setIntake(view);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [taskId]);

  useEffect(() => {
    const socket = hubSocket();
    const onUpdated = (task: TaskSummary) => {
      if (task.id === taskId) reload();
    };
    socket.on(DashboardEvents.taskUpdated, onUpdated);
    reload();
    return () => {
      socket.off(DashboardEvents.taskUpdated, onUpdated);
    };
  }, [taskId, reload]);

  return { intake, error, reload };
}
