import { useMemo } from 'react';
import type { Look } from '@/lib/characters';
import { ARM_COLS, ARM_ROWS, LEG_ROWS, palette, SPRITE_H, SPRITE_W, spriteGrid } from '@/lib/pixel-sprites';

export type Pose = 'stand' | 'walk' | 'type' | 'sleep';

interface Props {
  look: Look;
  pose?: Pose;
  /** Width in px; height follows the sprite's 16 x 26 shape. */
  size?: number;
  /** Only the head, for avatars in lists. */
  bust?: boolean;
  className?: string;
}

type Part = 'body' | 'leg-l' | 'leg-r' | 'arm-l' | 'arm-r';

/**
 * A pixel-art chibi drawn as SVG squares with crisp edges. Legs and arms are separate groups so
 * walking, typing and breathing can move them by a pixel (animations live in globals.css).
 */
export function PixelSprite({ look, pose = 'stand', size = 32, bust = false, className = '' }: Props) {
  const parts = useMemo(() => {
    const grid = spriteGrid(look, pose === 'sleep');
    const colors = palette(look);
    const out: Record<Part, { x: number; y: number; fill: string }[]> = { body: [], 'leg-l': [], 'leg-r': [], 'arm-l': [], 'arm-r': [] };
    grid.forEach((row, y) =>
      row.forEach((key, x) => {
        if (key === '.') return;
        out[partOf(x, y)].push({ x, y, fill: colors[key] ?? '#f0f' });
      }),
    );
    return out;
  }, [look, pose]);

  const scale = look.scale ?? 1;
  const viewBox = bust ? '1 1 14 14' : `0 0 ${SPRITE_W} ${SPRITE_H + 2}`;
  const height = bust ? size : (size * (SPRITE_H + 2)) / SPRITE_W;

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={height}
      shapeRendering="crispEdges"
      className={`pixel-sprite pose-${pose} ${className}`}
      aria-hidden
    >
      {!bust && <ellipse cx="8" cy={SPRITE_H - 0.5} rx={5.5 * scale} ry="1.3" fill="#000" opacity="0.4" shapeRendering="auto" />}
      <g transform={`translate(8 ${SPRITE_H - 1}) scale(${scale}) translate(-8 ${-(SPRITE_H - 1)})`}>
        {(['body', 'leg-l', 'leg-r', 'arm-l', 'arm-r'] as Part[]).map((part) => (
          <g key={part} className={`px-${part}`}>
            {parts[part].map((p) => (
              <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1.02" height="1.02" fill={p.fill} />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

function partOf(x: number, y: number): Part {
  if (LEG_ROWS.includes(y)) return x < SPRITE_W / 2 ? 'leg-l' : 'leg-r';
  if (ARM_ROWS.includes(y)) {
    if (ARM_COLS.left.includes(x)) return 'arm-l';
    if (ARM_COLS.right.includes(x)) return 'arm-r';
  }
  return 'body';
}
