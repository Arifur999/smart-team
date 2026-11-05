'use client';

import { useEffect, useState } from 'react';
import { lookOf } from '@/lib/characters';
import { PixelSprite, type Pose } from './PixelSprite';

interface Manifest {
  poses: string[];
  ids: string[];
}

/** Which members have Blender renders in /characters. Loaded once and shared by every figure on the page. */
let manifest: Promise<Set<string>> | undefined;
function renderedIds(): Promise<Set<string>> {
  manifest ??= fetch('/characters/manifest.json')
    .then((res) => (res.ok ? (res.json() as Promise<Manifest>) : { poses: [], ids: [] }))
    .then((m) => new Set(m.ids))
    .catch(() => new Set<string>());
  return manifest;
}

function useRendered(id: string): boolean | null {
  const [rendered, setRendered] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void renderedIds().then((ids) => {
      if (live) setRendered(ids.has(id));
    });
    return () => {
      live = false;
    };
  }, [id]);
  return rendered;
}

/** Alternates 0 and 1 while walking, for the two walk frames. */
function useWalkFrame(walking: boolean): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!walking) return;
    const timer = setInterval(() => setFrame((f) => 1 - f), 180);
    return () => clearInterval(timer);
  }, [walking]);
  return frame;
}

interface Props {
  id: string;
  pose?: Pose;
  /** Only the head and shoulders, for round avatars. */
  bust?: boolean;
  /** Pixel size used by the fallback sprite. */
  size?: number;
  className?: string;
}

/**
 * A member as drawn in the office: the Blender-rendered 3D chibi when one exists, otherwise the pixel
 * sprite. Both are original designs from characters.json.
 */
export function CharacterFigure({ id, pose = 'stand', bust = false, size = 32, className = '' }: Props) {
  const rendered = useRendered(id);
  const frame = useWalkFrame(pose === 'walk');

  if (!rendered) return <PixelSprite look={lookOf(id)} pose={pose} size={size} bust={bust} className={className} />;

  const file = pose === 'walk' ? (frame ? 'walk-b' : 'walk-a') : pose;
  return (
    // Plain img on purpose: these are small static sprites swapped many times a second while walking.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/characters/${id}/${file}.png`}
      alt=""
      draggable={false}
      className={`select-none ${className}`}
      style={
        bust
          ? { width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%', transform: 'scale(1.7)', transformOrigin: '50% 12%' }
          : { width: size, height: size * 1.25, objectFit: 'contain' }
      }
    />
  );
}
