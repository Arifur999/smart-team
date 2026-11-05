/**
 * How each member is drawn. These are original office-crew characters: everyday clothes in their
 * team's colours, varied hair and skin. Only the names come from elsewhere; no costumes, logos or
 * likenesses are copied.
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

const SKIN = { light: '#f3cfa8', fair: '#eab98f', mid: '#d39b6a', tan: '#b97e52', deep: '#8a5a3a', dark: '#5f3b25' };
const HAIR = { black: '#1d1a1f', brown: '#5a3a24', chestnut: '#7a4a2a', blond: '#e0b45c', red: '#a8442c', grey: '#9aa0aa', white: '#e8e8ee', navy: '#2b3a66' };

// Team palettes: nextDev red, nextEditor violet, nextDesign teal, NextMarketer amber, leadership slate.
export const LOOKS: Record<string, Look> = {
  // Leadership
  'nick-fury': { skin: SKIN.dark, hair: HAIR.black, hairStyle: 'bald', top: '#2b2f3a', bottom: '#1d2029', accent: '#8a93a6' },
  'maria-hill': { skin: SKIN.light, hair: HAIR.brown, hairStyle: 'bun', top: '#3a4a6b', bottom: '#262f44', accent: '#a9b8d6' },
  'captain-marvel': { skin: SKIN.fair, hair: HAIR.blond, hairStyle: 'short', top: '#4a5a80', bottom: '#2c3550', accent: '#d8c27a' },
  friday: { skin: '#cfe1f5', hair: '#7aa8e8', hairStyle: 'helmet', top: '#3d5c94', bottom: '#2a406b', accent: '#9cc7ff', visor: '#7fe0ff' },
  jarvis: { skin: '#d5dbe4', hair: '#8794a8', hairStyle: 'helmet', top: '#4a5568', bottom: '#343d4d', accent: '#a7f3d0', visor: '#5eead4' },

  // nextDev — red hoodies and jackets
  'iron-man': { skin: SKIN.mid, hair: HAIR.black, hairStyle: 'short', top: '#a9342b', bottom: '#2e2f38', accent: '#f0c674' },
  hulk: { skin: SKIN.tan, hair: HAIR.brown, hairStyle: 'spiky', top: '#c2483a', bottom: '#3a3f4b', accent: '#e8e2d4', scale: 1.15 },
  'spider-man': { skin: SKIN.light, hair: HAIR.chestnut, hairStyle: 'short', top: '#d0574a', bottom: '#40485a', accent: '#f4f1ea', scale: 0.92 },
  'black-panther': { skin: SKIN.dark, hair: HAIR.black, hairStyle: 'short', top: '#8f2d27', bottom: '#2a2a33', accent: '#c9c2e8' },
  vision: { skin: SKIN.fair, hair: HAIR.grey, hairStyle: 'short', top: '#b85a3c', bottom: '#34363f', accent: '#e8e0c8', visor: '#dfe8ff' },

  // nextEditor (X-Men names) — violet
  cyclops: { skin: SKIN.fair, hair: HAIR.brown, hairStyle: 'short', top: '#5b3c8f', bottom: '#2c2840', accent: '#d9b8ff' },
  storm: { skin: SKIN.dark, hair: HAIR.white, hairStyle: 'long', top: '#7a4aa8', bottom: '#352a48', accent: '#f0c8e8' },
  'jean-grey': { skin: SKIN.light, hair: HAIR.red, hairStyle: 'long', top: '#6a52b8', bottom: '#2f2d45', accent: '#d8d0ff' },
  wolverine: { skin: SKIN.mid, hair: HAIR.black, hairStyle: 'spiky', top: '#4f3a7a', bottom: '#2b2838', accent: '#c4b0ec', scale: 0.95 },
  beast: { skin: SKIN.tan, hair: HAIR.navy, hairStyle: 'short', top: '#8a63c9', bottom: '#2e2b3d', accent: '#ece4ff', scale: 1.12, visor: '#e8eef8' },

  // nextDesign (Fantastic Four names) — teal
  'mister-fantastic': { skin: SKIN.light, hair: HAIR.grey, hairStyle: 'short', top: '#1f8a7a', bottom: '#253836', accent: '#bff0e6', scale: 1.05 },
  'invisible-woman': { skin: SKIN.light, hair: HAIR.blond, hairStyle: 'bun', top: '#2a9d8f', bottom: '#2a3b3a', accent: '#e0f4f0' },
  'human-torch': { skin: SKIN.fair, hair: HAIR.blond, hairStyle: 'spiky', top: '#176b5f', bottom: '#1f2d2b', accent: '#ffcf8a' },
  'silver-surfer': { skin: SKIN.light, hair: HAIR.black, hairStyle: 'bald', top: '#35b0a0', bottom: '#2b3d3b', accent: '#e6fff9' },
  'the-thing': { skin: SKIN.tan, hair: HAIR.brown, hairStyle: 'bald', top: '#22786c', bottom: '#223230', accent: '#a8e6da', scale: 1.18 },

  // NextMarketer (DC names) — amber
  superman: { skin: SKIN.fair, hair: HAIR.blond, hairStyle: 'long', top: '#c47f1c', bottom: '#3a332a', accent: '#f6dfa8', scale: 1.08 },
  'lois-lane': { skin: SKIN.light, hair: HAIR.red, hairStyle: 'long', top: '#a8661a', bottom: '#30291f', accent: '#ffe2b0' },
  flash: { skin: SKIN.mid, hair: HAIR.brown, hairStyle: 'short', top: '#d18a2b', bottom: '#38322b', accent: '#fff0cc', visor: '#2a2420' },
  aquaman: { skin: SKIN.tan, hair: '#4f7a2e', hairStyle: 'leafy', top: '#b77722', bottom: '#4a3a28', accent: '#e8d8a8', scale: 1.08 },
  'green-lantern': { skin: SKIN.mid, hair: HAIR.chestnut, hairStyle: 'mohawk', top: '#e09a3a', bottom: '#3c3530', accent: '#fff3d6', scale: 0.85 },
  'martian-manhunter': { skin: SKIN.deep, hair: HAIR.black, hairStyle: 'bun', top: '#9a5a14', bottom: '#2c241c', accent: '#ffd9a0' },
};

const FALLBACK: Look = { skin: SKIN.mid, hair: HAIR.brown, hairStyle: 'short', top: '#475569', bottom: '#334155', accent: '#94a3b8' };

export const lookOf = (id: string): Look => LOOKS[id] ?? FALLBACK;
