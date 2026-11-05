import looks from './characters.json';

/**
 * How each member is drawn. These are original office-crew characters: everyday clothes in their
 * team's colours, varied hair and skin. Only the names come from elsewhere; no costumes, logos or
 * likenesses are copied. The data lives in characters.json so the Blender script renders the same
 * people the dashboard draws.
 */
export type HairStyle = 'short' | 'spiky' | 'long' | 'bun' | 'bald' | 'hood' | 'helmet' | 'mohawk' | 'leafy';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  /** Collar, belt and shoe colour. */
  accent: string;
  /** Glasses or a visor strip instead of eyes (used for the AI helpers). */
  visor?: string;
  /** Bigger or smaller than the default build. */
  scale?: number;
  /** A scarf or long coat tail showing at the sides. */
  cape?: string;
}

export const LOOKS = looks as Record<string, Look>;

const FALLBACK: Look = { skin: '#d39b6a', hair: '#5a3a24', hairStyle: 'short', top: '#475569', bottom: '#334155', accent: '#94a3b8' };

export const lookOf = (id: string): Look => LOOKS[id] ?? FALLBACK;
