import { LINES, YOU } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import { layoutLine, NODE_H, type NodeBox } from './line-layout';

const overlap = (a: NodeBox, b: NodeBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + NODE_H && b.y < a.y + NODE_H;

describe('layoutLine', () => {
  for (const line of LINES) {
    for (const width of [375, 1152, 1600]) {
      describe(`${line.key} at ${width}px`, () => {
        const layout = layoutLine(line, width, 3);

        it('puts you in the top lane and every owner in one lane', () => {
          expect(layout.lanes[0]).toBe(YOU);
          expect(new Set(layout.lanes).size).toBe(layout.lanes.length);
          for (const n of layout.nodes) expect(layout.lanes[n.lane]).toBe(n.stage.owner);
        });

        it('never lets two stage nodes overlap', () => {
          for (let i = 0; i < layout.nodes.length; i++)
            for (let j = i + 1; j < layout.nodes.length; j++) expect(overlap(layout.nodes[i]!, layout.nodes[j]!)).toBe(false);
        });

        it('keeps every node inside the board', () => {
          for (const n of layout.nodes) {
            expect(n.x).toBeGreaterThanOrEqual(0);
            expect(n.x + n.w).toBeLessThanOrEqual(layout.width);
            expect(n.y + NODE_H).toBeLessThanOrEqual(layout.height);
          }
        });

        it('starts and ends each flow line on the edges of its two nodes', () => {
          const byKey = new Map(layout.nodes.map((n) => [n.key, n]));
          for (const c of layout.connectors.filter((c) => c.kind === 'flow')) {
            const nums = c.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
            const a = byKey.get(c.from)!;
            const b = byKey.get(c.to)!;
            expect(nums[0]).toBeCloseTo(a.x + a.w);
            expect(nums.at(-1)).toBeCloseTo(b.x);
          }
        });

        it('routes each bypass around the stage it skips, not through it', () => {
          for (const c of layout.connectors.filter((c) => c.kind === 'bypass')) {
            const i = layout.nodes.findIndex((n) => n.key === c.from);
            const skipped = layout.nodes[i + 1]!;
            const outside = c.labelY! >= skipped.y + NODE_H || c.labelY! <= skipped.y;
            expect(outside).toBe(true);
          }
        });
      });
    }
  }
});
