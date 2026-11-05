import type { Look } from './characters';

/**
 * Pixel-art chibi characters, 16 x 26 pixels, front facing. Original designs built from one template:
 * the hair style, visor, cape and colours come from each member's Look.
 *
 * Keys: . empty  o outline  h hair  H hair shine  s skin  S skin shade  e eye  m mouth  v visor
 *       t top  T top shade  a accent  k hand  b bottom  B bottom shade  f shoe  c cape
 */
const BASE = [
  '................', // 0  room for buns, spikes and leaves
  '................', // 1
  '....oooooooo....', // 2
  '...ohhhhhhhho...', // 3
  '..ohhhhhhhhhho..', // 4
  '..ohHhhhhhhhho..', // 5
  '.ohhhhhhhhhhhho.', // 6
  '.ohssssssssssho.', // 7
  '.osssssssssssso.', // 8
  '.osseesssseesso.', // 9
  '.osseesssseesso.', // 10
  '.oSssssssssssSo.', // 11
  '..oSsssmmsssSo..', // 12
  '...ooSSSSSSoo...', // 13
  '....otaaaato....', // 14
  '..otttttttttto..', // 15
  '.ottttttttttTto.', // 16
  '.ottttttttttTto.', // 17
  '.ottaaaaaaaaTto.', // 18
  '.okkbbbbbbbbkko.', // 19
  '..obbbbBBbbbbo..', // 20
  '...obbboobbbo...', // 21
  '...obbboobbbo...', // 22
  '...offfoofffo...', // 23
  '...oooo..oooo...', // 24
  '................', // 25
];

export const SPRITE_W = 16;
export const SPRITE_H = BASE.length;

/** Rows that move together when animating. */
export const LEG_ROWS = [21, 22, 23, 24];
export const ARM_COLS = { left: [1, 2, 3], right: [12, 13, 14] };
export const ARM_ROWS = [15, 16, 17, 18, 19];

type Grid = string[][];

const set = (g: Grid, row: number, col: number, key: string) => {
  if (g[row]) g[row]![col] = key;
};

function applyHair(g: Grid, look: Look) {
  switch (look.hairStyle) {
    case 'bald':
      for (let r = 3; r <= 7; r++) for (let c = 0; c < SPRITE_W; c++) if (g[r]![c] === 'h' || g[r]![c] === 'H') g[r]![c] = 's';
      set(g, 4, 5, 'H');
      break;
    case 'spiky':
      g[0] = '...o..o..o..o...'.split('');
      g[1] = '..ohoohhoohhoo..'.split('');
      g[2] = '..ohhhhhhhhhho..'.split('');
      break;
    case 'bun':
      g[0] = '......oooo......'.split('');
      g[1] = '.....ohhhho.....'.split('');
      break;
    case 'mohawk':
      for (let r = 3; r <= 7; r++) for (let c = 0; c < SPRITE_W; c++) if ((g[r]![c] === 'h' || g[r]![c] === 'H') && (c < 6 || c > 9)) g[r]![c] = 's';
      g[0] = '.......oo.......'.split('');
      g[1] = '......ohho......'.split('');
      g[2] = '....oohhhhoo....'.split('');
      break;
    case 'leafy':
      g[0] = '..oo..oooo..oo..'.split('');
      g[1] = '.ohho.oHHo.ohho.'.split('');
      break;
    case 'long':
      // Hair falls past the face on both sides.
      for (let r = 7; r <= 15; r++) {
        set(g, r, 0, 'o');
        set(g, r, 1, 'h');
        set(g, r, 14, 'h');
        set(g, r, 15, 'o');
      }
      break;
    case 'hood':
    case 'helmet':
      // The whole head is covered; only a visor strip shows.
      for (let r = 7; r <= 12; r++) for (let c = 0; c < SPRITE_W; c++) if ('sSm'.includes(g[r]![c]!)) g[r]![c] = 'h';
      break;
    case 'short':
      break;
  }
}

function applyFace(g: Grid, look: Look, sleeping: boolean) {
  if (look.visor || look.hairStyle === 'hood' || look.hairStyle === 'helmet') {
    for (const r of [9, 10]) for (let c = 3; c <= 12; c++) g[r]![c] = r === 9 && sleeping ? 'S' : 'v';
    if (sleeping) for (let c = 3; c <= 12; c++) g[10]![c] = 'S';
    return;
  }
  if (sleeping) {
    // Closed eyes: one dark line instead of two-pixel-tall eyes.
    for (const c of [4, 5, 10, 11]) {
      g[9]![c] = 's';
      g[10]![c] = 'e';
    }
  }
}

function applyCape(g: Grid) {
  for (let r = 15; r <= 22; r++) {
    if (g[r]![0] === '.') g[r]![0] = 'c';
    if (g[r]![15] === '.') g[r]![15] = 'c';
  }
}

/** The sprite as rows of palette keys. */
export function spriteGrid(look: Look, sleeping = false): Grid {
  const g: Grid = BASE.map((row) => row.split(''));
  applyHair(g, look);
  applyFace(g, look, sleeping);
  if (look.cape) applyCape(g);
  return g;
}

export function palette(look: Look): Record<string, string> {
  return {
    o: '#14121a',
    h: look.hair,
    H: lighten(look.hair, 0.35),
    s: look.skin,
    S: darken(look.skin, 0.18),
    e: '#1a1418',
    m: darken(look.skin, 0.45),
    v: look.visor ?? '#e8f1ff',
    t: look.top,
    T: darken(look.top, 0.28),
    a: look.accent,
    k: look.skin,
    b: look.bottom,
    B: darken(look.bottom, 0.25),
    f: darken(look.accent, 0.5),
    c: look.cape ?? look.top,
  };
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `#${((mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)).toString(16).padStart(6, '0')}`;
}
export const lighten = (hex: string, a: number) => shade(hex, a);
export const darken = (hex: string, a: number) => shade(hex, -a);
