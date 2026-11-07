import { YOU, type LineDef, type StageDef } from '@smart-team/shared';

/**
 * Geometry of the Production Line board: one column per stage, one lane per owner (you on top), a node
 * where a stage's column meets its owner's lane. Pure, so it can be reasoned about and tested apart from React.
 */
export const LANE_H = 60;
export const NODE_H = 34;
const PAD_X = 12;
const PAD_TOP = 6;
const PAD_BOTTOM = 34;
const MIN_COL = 92;
const MAX_COL = 150;
const NODE_GAP = 16;

export interface NodeBox {
  key: string;
  stage: StageDef;
  lane: number;
  /** Centre. */
  cx: number;
  cy: number;
  x: number;
  y: number;
  w: number;
}

export interface Connector {
  id: string;
  d: string;
  kind: 'flow' | 'bypass' | 'loop';
  from: string;
  to: string;
  label?: string;
  labelX?: number;
  labelY?: number;
}

export interface BoardLayout {
  lanes: string[];
  colW: number;
  nodeW: number;
  width: number;
  height: number;
  nodes: NodeBox[];
  connectors: Connector[];
  /** Centre x of each stage's column, for the metric rows. */
  columns: { key: string; cx: number }[];
}

export function laneLabelWidth(boardWidth: number): number {
  return boardWidth < 640 ? 64 : boardWidth < 1024 ? 128 : 168;
}

export function layoutLine(line: LineDef, boardWidth: number, maxFixes: number): BoardLayout {
  const stages = line.stages;
  const lanes = [YOU, ...[...new Set(stages.map((s) => s.owner))].filter((o) => o !== YOU)];
  const usable = Math.max(0, boardWidth - laneLabelWidth(boardWidth) - PAD_X * 2);
  const colW = Math.min(MAX_COL, Math.max(MIN_COL, Math.floor(usable / stages.length)));
  const nodeW = colW - NODE_GAP;
  const width = PAD_X * 2 + stages.length * colW;
  const height = PAD_TOP + lanes.length * LANE_H + PAD_BOTTOM;

  const nodes: NodeBox[] = stages.map((stage, i) => {
    const lane = lanes.indexOf(stage.owner);
    const cx = PAD_X + i * colW + colW / 2;
    const cy = PAD_TOP + lane * LANE_H + LANE_H / 2;
    return { key: stage.key, stage, lane, cx, cy, x: cx - nodeW / 2, y: cy - NODE_H / 2, w: nodeW };
  });
  const byKey = new Map(nodes.map((n) => [n.key, n]));

  const connectors: Connector[] = [];
  for (let i = 0; i + 1 < nodes.length; i++) {
    connectors.push({ id: `flow-${i}`, kind: 'flow', from: nodes[i]!.key, to: nodes[i + 1]!.key, d: flowPath(nodes[i]!, nodes[i + 1]!) });
  }

  // Bypasses around stages that can be skipped: your Trust check, optional checks, skippable work.
  nodes.forEach((n, i) => {
    const skip = n.stage.trustSkips ? 'Trust skips your check' : n.stage.optional ? 'only if you ask' : n.stage.skippable ? n.stage.skippable.label : null;
    if (!skip || i === 0 || i === nodes.length - 1) return;
    const a = nodes[i - 1]!;
    const b = nodes[i + 1]!;
    const ax = a.x + a.w;
    const ay = a.cy + 6;
    const bx = b.x;
    const by = b.cy + 6;
    // Arc around the skipped node on the side away from its lane.
    const around = n.cy < Math.max(ay, by) ? n.y + NODE_H + 16 : n.y - 16;
    const k = colW / 2;
    connectors.push({
      id: `bypass-${n.key}`,
      kind: 'bypass',
      from: a.key,
      to: b.key,
      d: `M ${ax} ${ay} C ${ax + k} ${ay}, ${n.cx - k} ${around}, ${n.cx} ${around} S ${bx - k} ${by}, ${bx} ${by}`,
      label: skip,
      labelX: n.cx,
      labelY: around,
    });
  });

  // Send-back loops from each gate to the stage it sends work back to most often (its default fix).
  let level = 0;
  for (const n of nodes) {
    const gate = n.stage.gate;
    if (!gate || gate.judge === 'flag' && !gate.maxFixes) continue;
    if (!['storyboard-check', 'critique'].includes(n.key) && !gate.main) continue;
    const target = byKey.get(gate.main ? 'storyboard' : gate.defaultFix) ?? byKey.get(gate.defaultFix);
    if (!target) continue;
    const max = gate.main ? maxFixes : (gate.maxFixes ?? 0);
    const low = Math.max(n.cy, target.cy) + NODE_H / 2 + 14 + level * 10;
    const sx = n.cx;
    const sy = n.y + NODE_H;
    const ex = target.cx + 8;
    const ey = target.y + NODE_H;
    connectors.push({
      id: `loop-${n.key}`,
      kind: 'loop',
      from: n.key,
      to: target.key,
      d: `M ${sx} ${sy} V ${low - 6} Q ${sx} ${low} ${sx - 6} ${low} H ${ex + 6} Q ${ex} ${low} ${ex} ${low - 6} V ${ey + 2}`,
      label: `${gate.loopLabel} up to ${max}×`,
      labelX: (sx + ex) / 2,
      labelY: low,
    });
    level++;
  }

  return { lanes, colW, nodeW, width, height, nodes, connectors, columns: nodes.map((n) => ({ key: n.key, cx: n.cx })) };
}

/** Right edge of one node to the left edge of the next, with rounded corners when it changes lane. */
function flowPath(a: NodeBox, b: NodeBox): string {
  const ax = a.x + a.w;
  const ay = a.cy;
  const bx = b.x;
  const by = b.cy;
  if (ay === by) return `M ${ax} ${ay} H ${bx}`;
  const mx = (ax + bx) / 2;
  const r = Math.min(8, Math.abs(by - ay) / 2);
  const s = by > ay ? 1 : -1;
  return `M ${ax} ${ay} H ${mx - r} Q ${mx} ${ay} ${mx} ${ay + s * r} V ${by - s * r} Q ${mx} ${by} ${mx + r} ${by} H ${bx}`;
}
