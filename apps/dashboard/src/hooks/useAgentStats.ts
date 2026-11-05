'use client';

import { DashboardEvents, type AgentStats } from '@smart-team/shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

/** Tokens arrive in the middle of runs, so the stats are refreshed on a short timer as well as on task changes. */
const REFRESH_MS = 5_000;

/** Time, tokens and cost per member, keyed by member id. */
export function useAgentStats() {
  const [stats, setStats] = useState<Record<string, AgentStats>>({});

  const load = useCallback(() => {
    api
      .agentStats()
      .then((list) => setStats(Object.fromEntries(list.map((s) => [s.agentId, s]))))
      .catch(() => {
        // Keep the last numbers; the next refresh tries again.
      });
  }, []);

  useEffect(() => {
    const socket = hubSocket();
    const timer = setInterval(load, REFRESH_MS);
    socket.on(DashboardEvents.taskUpdated, load);
    load();
    return () => {
      clearInterval(timer);
      socket.off(DashboardEvents.taskUpdated, load);
    };
  }, [load]);

  return stats;
}
