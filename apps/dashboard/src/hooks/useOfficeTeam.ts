'use client';

import { TEAMS, type TeamId } from '@smart-team/shared';
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'smart-team:office-team';
const CHANGED = 'smart-team:office-team-changed';
const DEFAULT: TeamId = 'nextDev';

function read(): TeamId {
  try {
    const saved = localStorage.getItem(KEY);
    return TEAMS.some((t) => t.id === saved) ? (saved as TeamId) : DEFAULT;
  } catch {
    // Storage can be blocked (private windows, previews); the default team is fine then.
    return DEFAULT;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** The team shown in the office, remembered per browser. */
export function useOfficeTeam(): [TeamId, (team: TeamId) => void] {
  const team = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const setTeam = useCallback((next: TeamId) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  return [team, setTeam];
}
