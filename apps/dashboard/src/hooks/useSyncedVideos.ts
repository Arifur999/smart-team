'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Larger gaps than this between the two players are corrected by moving the follower. */
const MAX_DRIFT = 0.08;

export interface SyncedVideos {
  lead: RefObject<HTMLVideoElement | null>;
  follow: RefObject<HTMLVideoElement | null>;
  playing: boolean;
  time: number;
  duration: number;
  toggle: () => void;
  seek: (seconds: number) => void;
  /** Moves by whole frames while paused. */
  step: (frames: number) => void;
}

/**
 * Two videos that play as one: the lead sets the time, the follower is pulled back into step whenever it
 * drifts, and play, pause and seeking always act on both. Mute one of them so only one carries sound.
 */
export function useSyncedVideos(fps = 25, leadSource?: string): SyncedVideos {
  const lead = useRef<HTMLVideoElement>(null);
  const follow = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const align = useCallback(() => {
    const a = lead.current;
    const b = follow.current;
    if (!a || !b || !Number.isFinite(b.duration)) return;
    const target = Math.min(a.currentTime, Math.max(0, b.duration - 0.01));
    if (Math.abs(b.currentTime - target) > MAX_DRIFT) b.currentTime = target;
    if (!a.paused && b.paused && a.currentTime < b.duration) void b.play().catch(() => {});
    if (a.paused && !b.paused) b.pause();
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const a = lead.current;
      if (a) {
        // About ten updates a second is enough for the clock and keeps the page from re-rendering every frame.
        setTime((t) => (Math.abs(t - a.currentTime) >= 0.1 || a.paused ? a.currentTime : t));
        if (Number.isFinite(a.duration)) setDuration(a.duration);
        if (!a.paused) align();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const a = lead.current;
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      align();
    };
    a?.addEventListener('play', onPlay);
    a?.addEventListener('pause', onPause);
    a?.addEventListener('seeked', align);
    return () => {
      cancelAnimationFrame(frame);
      a?.removeEventListener('play', onPlay);
      a?.removeEventListener('pause', onPause);
      a?.removeEventListener('seeked', align);
    };
    // Re-attach when the lead video changes (a new version or the first load).
  }, [align, leadSource]);

  const toggle = useCallback(() => {
    const a = lead.current;
    if (!a) return;
    if (a.paused) {
      if (a.ended) a.currentTime = 0;
      void a.play().catch(() => {});
    } else a.pause();
  }, []);

  const seek = useCallback(
    (seconds: number) => {
      const a = lead.current;
      if (!a) return;
      const end = Number.isFinite(a.duration) ? a.duration : seconds;
      a.currentTime = Math.min(Math.max(0, seconds), end);
      setTime(a.currentTime);
      align();
    },
    [align],
  );

  const step = useCallback(
    (frames: number) => {
      const a = lead.current;
      if (!a) return;
      a.pause();
      seek(a.currentTime + frames / fps);
    },
    [fps, seek],
  );

  return { lead, follow, playing, time, duration, toggle, seek, step };
}
