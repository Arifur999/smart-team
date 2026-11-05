import { useId } from 'react';
import type { Look } from '@/lib/characters';

export type Pose = 'stand' | 'walk' | 'type' | 'sleep';

interface Props {
  look: Look;
  pose?: Pose;
  /** Width in px; height is 1.5 times this. */
  size?: number;
  /** Only the head and shoulders, for avatars in lists. */
  bust?: boolean;
  className?: string;
}

/**
 * A small 2.5D character drawn in SVG: soft shadow, shaded body and a round head with a highlight.
 * Walking swings the legs, typing moves the arms, sleeping closes the eyes. Animations live in globals.css.
 */
export function CharacterSprite({ look, pose = 'stand', size = 34, bust = false, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const skinId = `skin-${uid}`;
  const topId = `top-${uid}`;
  const s = look.scale ?? 1;

  return (
    <svg
      viewBox={bust ? '6 2 28 30' : '0 0 40 60'}
      width={size}
      height={bust ? size : size * 1.5}
      className={`sprite sprite-${pose} ${className}`}
      aria-hidden
    >
      <defs>
        <radialGradient id={skinId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={lighten(look.skin, 0.25)} />
          <stop offset="100%" stopColor={look.skin} />
        </radialGradient>
        <linearGradient id={topId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={lighten(look.top, 0.18)} />
          <stop offset="65%" stopColor={look.top} />
          <stop offset="100%" stopColor={darken(look.top, 0.3)} />
        </linearGradient>
      </defs>

      <ellipse cx="20" cy="57" rx={10 * s} ry="2.6" fill="#000" opacity="0.35" />

      <g transform={`translate(20 57) scale(${s}) translate(-20 -57)`}>
        {look.cape && <path d="M11 29 Q20 26 29 29 L32 52 Q20 55 8 52 Z" fill={darken(look.cape, 0.1)} />}
        {look.hairStyle === 'long' && <rect x="9" y="12" width="22" height="20" rx="7" fill={darken(look.hair, 0.1)} />}

        <g className="leg-l">
          <rect x="14" y="40" width="5" height="13" rx="2" fill={look.bottom} />
          <rect x="13.3" y="51" width="6.4" height="3.4" rx="1.6" fill={darken(look.accent, 0.35)} />
        </g>
        <g className="leg-r">
          <rect x="21" y="40" width="5" height="13" rx="2" fill={darken(look.bottom, 0.15)} />
          <rect x="20.3" y="51" width="6.4" height="3.4" rx="1.6" fill={darken(look.accent, 0.45)} />
        </g>

        <g className="arm-l">
          <rect x="7.4" y="28.5" width="4.6" height="12" rx="2.3" fill={lighten(look.top, 0.08)} />
          <circle cx="9.7" cy="41" r="2.2" fill={look.skin} />
        </g>
        <g className="arm-r">
          <rect x="28" y="28.5" width="4.6" height="12" rx="2.3" fill={darken(look.top, 0.25)} />
          <circle cx="30.3" cy="41" r="2.2" fill={darken(look.skin, 0.1)} />
        </g>

        <rect x="11" y="27" width="18" height="16" rx="5" fill={`url(#${topId})`} />
        <rect x="11" y="38.5" width="18" height="2.4" fill={look.accent} opacity="0.9" />
        <rect x="17.5" y="24.5" width="5" height="4" fill={darken(look.skin, 0.15)} />

        <g className="head">
          <circle cx="9.6" cy="18" r="2" fill={darken(look.skin, 0.08)} />
          <circle cx="30.4" cy="18" r="2" fill={darken(look.skin, 0.08)} />
          <circle cx="20" cy="17" r="10.2" fill={`url(#${skinId})`} />
          <Hair look={look} />
          <Face look={look} sleeping={pose === 'sleep'} />
        </g>
      </g>
    </svg>
  );
}

function Hair({ look }: { look: Look }) {
  const h = look.hair;
  switch (look.hairStyle) {
    case 'short':
      return <path d="M9.8 16 Q10 6.5 20 6.3 Q30 6.5 30.2 16 Q27 11.5 20 11.8 Q13 11.5 9.8 16 Z" fill={h} />;
    case 'spiky':
      return <path d="M9.6 16 L10.5 8 L13.5 10 L15 5 L18 9 L20 4 L22.5 9 L25 5 L26.5 10 L29.5 8 L30.4 16 Q26 11.5 20 12 Q14 11.5 9.6 16 Z" fill={h} />;
    case 'long':
      return <path d="M9.6 18 Q9.6 6 20 6 Q30.4 6 30.4 18 Q28 11 20 11.5 Q12 11 9.6 18 Z" fill={h} />;
    case 'bun':
      return (
        <g fill={h}>
          <circle cx="20" cy="5" r="3.6" />
          <path d="M9.8 16 Q10 6.6 20 6.4 Q30 6.6 30.2 16 Q27 11 20 11.4 Q13 11 9.8 16 Z" />
        </g>
      );
    case 'mohawk':
      return <path d="M17.5 12 L18.5 3.5 L21.5 3.5 L22.5 12 Z" fill={h} />;
    case 'leafy':
      return (
        <g fill={h}>
          <circle cx="13" cy="8.5" r="3.2" />
          <circle cx="20" cy="6" r="3.6" />
          <circle cx="27" cy="8.5" r="3.2" />
          <circle cx="24" cy="4.5" r="2" fill={lighten(h, 0.2)} />
        </g>
      );
    case 'hood':
      // Covers the whole head; the face is a mask with eye lenses.
      return <circle cx="20" cy="17" r="10.4" fill={h} />;
    case 'helmet':
      return (
        <g>
          <circle cx="20" cy="17" r="10.6" fill={h} />
          <path d="M12.5 10.5 Q20 5.5 27.5 10.5" stroke={lighten(h, 0.45)} strokeWidth="1.4" fill="none" opacity="0.7" />
        </g>
      );
    case 'bald':
      return <ellipse cx="16" cy="10.5" rx="3.2" ry="1.4" fill="#fff" opacity="0.22" />;
  }
}

function Face({ look, sleeping }: { look: Look; sleeping: boolean }) {
  if (look.visor) {
    return (
      <g>
        <rect x="12.6" y="15" width="14.8" height="3.6" rx="1.8" fill={look.visor} opacity={sleeping ? 0.35 : 0.95} />
        {!sleeping && <rect x="12.6" y="15" width="14.8" height="3.6" rx="1.8" fill={look.visor} opacity="0.5" filter="blur(1.2px)" />}
      </g>
    );
  }
  if (sleeping) {
    return (
      <g stroke="#2b1d14" strokeWidth="0.9" strokeLinecap="round" fill="none">
        <path d="M14.6 17.6 Q16 18.6 17.4 17.6" />
        <path d="M22.6 17.6 Q24 18.6 25.4 17.6" />
      </g>
    );
  }
  return (
    <g>
      <ellipse className="eye" cx="16" cy="17.2" rx="1.25" ry="1.5" fill="#1d1712" />
      <ellipse className="eye" cx="24" cy="17.2" rx="1.25" ry="1.5" fill="#1d1712" />
      <circle cx="16.4" cy="16.7" r="0.4" fill="#fff" />
      <circle cx="24.4" cy="16.7" r="0.4" fill="#fff" />
      <path d="M18.2 21.6 Q20 22.8 21.8 21.6" stroke="#7a4a35" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
const lighten = (hex: string, a: number) => shade(hex, a);
const darken = (hex: string, a: number) => shade(hex, -a);
