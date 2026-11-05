/**
 * How each member is drawn. Original designs: colours and hair hint at the hero, but there are no
 * costumes, logos or likenesses copied from anywhere.
 */
export type HairStyle = 'short' | 'spiky' | 'long' | 'bun' | 'bald' | 'hood' | 'helmet' | 'mohawk' | 'leafy';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  /** Belt, collar and shoe colour. */
  accent: string;
  /** Glowing eye strip instead of eyes. */
  visor?: string;
  /** Bigger or smaller than the default build. */
  scale?: number;
  /** A cape behind the body. */
  cape?: string;
}

const SKIN = { light: '#f2c9a0', mid: '#d9a273', tan: '#c68a5a', deep: '#8d5a3b', dark: '#6b4128' };

export const LOOKS: Record<string, Look> = {
  // Leadership
  'nick-fury': { skin: SKIN.deep, hair: '#1f1f1f', hairStyle: 'bald', top: '#1c1f26', bottom: '#15171c', accent: '#5b6170', visor: '#111' },
  'maria-hill': { skin: SKIN.light, hair: '#2b1d14', hairStyle: 'bun', top: '#2d3a55', bottom: '#1e2638', accent: '#8aa0c8' },
  'captain-marvel': { skin: SKIN.light, hair: '#e3b860', hairStyle: 'long', top: '#2f4fa8', bottom: '#b8322b', accent: '#e9c348' },
  friday: { skin: '#b9d8ff', hair: '#78a8ff', hairStyle: 'short', top: '#3a5c99', bottom: '#2a4170', accent: '#9cc7ff', visor: '#7fd3ff' },
  jarvis: { skin: '#cfd8e3', hair: '#8fa3bb', hairStyle: 'helmet', top: '#4b5a70', bottom: '#38455a', accent: '#a7f3ff', visor: '#5eead4' },

  // nextDev
  'iron-man': { skin: SKIN.mid, hair: '#3a2416', hairStyle: 'short', top: '#b3261e', bottom: '#8f1d17', accent: '#e8b33b', visor: '#ffe9a3' },
  hulk: { skin: '#5a9a3f', hair: '#1f2a14', hairStyle: 'spiky', top: '#6b3fa0', bottom: '#4b2c74', accent: '#2f5a22', scale: 1.18 },
  'spider-man': { skin: SKIN.light, hair: '#3a2416', hairStyle: 'hood', top: '#c62828', bottom: '#1f4fa8', accent: '#1a1a1a', visor: '#e8f1ff' },
  'black-panther': { skin: SKIN.dark, hair: '#151515', hairStyle: 'hood', top: '#22222b', bottom: '#18181f', accent: '#9b8cff', visor: '#d6d0ff' },
  vision: { skin: '#c2413b', hair: '#8a2b26', hairStyle: 'bald', top: '#2f6e4a', bottom: '#245539', accent: '#e8c547', cape: '#e8c547' },

  // nextEditor
  'doctor-strange': { skin: SKIN.light, hair: '#2a1f1a', hairStyle: 'short', top: '#1e3a6e', bottom: '#20283a', accent: '#d9a441', cape: '#b3261e' },
  'scarlet-witch': { skin: SKIN.light, hair: '#a3262a', hairStyle: 'long', top: '#7c1d2a', bottom: '#4a1219', accent: '#e05a6b' },
  quicksilver: { skin: SKIN.light, hair: '#e6e8ee', hairStyle: 'spiky', top: '#3f6fd0', bottom: '#2a3550', accent: '#cfd8ff' },
  hawkeye: { skin: SKIN.mid, hair: '#7a5634', hairStyle: 'short', top: '#4b2a6e', bottom: '#2b2433', accent: '#8f6bc4' },
  falcon: { skin: SKIN.deep, hair: '#161616', hairStyle: 'short', top: '#4a5560', bottom: '#2c333b', accent: '#c94a3a', visor: '#ffb3a3' },

  // nextDesign
  wasp: { skin: SKIN.light, hair: '#1c1c1c', hairStyle: 'bun', top: '#d4a017', bottom: '#2b2b2b', accent: '#f2d15c' },
  'ant-man': { skin: SKIN.light, hair: '#5a3a22', hairStyle: 'helmet', top: '#9e2a22', bottom: '#2c2c2c', accent: '#c9c9c9', visor: '#ffdd8a', scale: 0.88 },
  loki: { skin: SKIN.light, hair: '#121212', hairStyle: 'long', top: '#1f5a3a', bottom: '#1a2a20', accent: '#d4af37', cape: '#164a2f' },
  mantis: { skin: '#f3e3c6', hair: '#141414', hairStyle: 'long', top: '#3f7a4a', bottom: '#2a5232', accent: '#b4f0a8' },
  nebula: { skin: '#4f78b8', hair: '#3a5c91', hairStyle: 'bald', top: '#2a2f3a', bottom: '#1f232b', accent: '#6c8cc8' },

  // NextMarketer
  thor: { skin: SKIN.light, hair: '#e2b45a', hairStyle: 'long', top: '#3a4352', bottom: '#2a303b', accent: '#c8ccd4', cape: '#a3221b' },
  'black-widow': { skin: SKIN.light, hair: '#b5452a', hairStyle: 'long', top: '#1b1b20', bottom: '#141418', accent: '#c4302b' },
  'star-lord': { skin: SKIN.light, hair: '#8a5a32', hairStyle: 'short', top: '#7a2e22', bottom: '#2b2b33', accent: '#c9a26b' },
  groot: { skin: '#8b5e3c', hair: '#4f7a2e', hairStyle: 'leafy', top: '#7a5233', bottom: '#5e3f27', accent: '#4f7a2e', scale: 1.12 },
  rocket: { skin: '#9a7b5f', hair: '#6b5240', hairStyle: 'mohawk', top: '#c4602c', bottom: '#3c3a36', accent: '#e0e0e0', scale: 0.78 },
  gamora: { skin: '#4f9a5a', hair: '#2a1a2a', hairStyle: 'long', top: '#2a2a33', bottom: '#1d1d24', accent: '#b84a8a' },
};

const FALLBACK: Look = { skin: SKIN.mid, hair: '#3a2a20', hairStyle: 'short', top: '#475569', bottom: '#334155', accent: '#94a3b8' };

export const lookOf = (id: string): Look => LOOKS[id] ?? FALLBACK;
