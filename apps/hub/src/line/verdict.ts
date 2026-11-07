import { YOU, type FixNote, type FixSeverity, type LineDef, type LineSettings, type StageDef, type Verdict } from '@smart-team/shared';

/** Most fixes one verdict may route; the rest are left for the next round. */
const MAX_FIXES = 12;
/** Pass mark of scored gates that are not the line's main gate. */
const DEFAULT_PASS_MARK = 80;

/**
 * The last JSON object in a reply: the last fenced ```json block that parses, otherwise the last balanced
 * {…} in the text (quotes and braces inside strings are respected). Null when there is none.
 */
export function extractLastJson(text: string): Record<string, unknown> | null {
  const fenced = [...text.matchAll(/```(?:json)?[ \t]*\r?\n([\s\S]*?)```/g)].map((m) => m[1]!.trim());
  for (const body of fenced.reverse()) {
    const value = tryParse(body);
    if (isRecord(value)) return value;
  }
  for (const body of topLevelObjects(text).reverse()) {
    const value = tryParse(body);
    if (isRecord(value)) return value;
  }
  return null;
}

export interface StageReport {
  summary: string;
  /** Set when the member says the work cannot go on without something only you can give. */
  blocked: string | null;
  data: Record<string, unknown> | null;
}

/** A work stage's closing report; when it has no JSON, the start of the reply serves as its summary. */
export function parseStageReport(text: string): StageReport {
  const data = extractLastJson(text);
  const summary = str(data?.summary) ?? str(data?.notes) ?? firstWords(text, 600);
  return { summary, blocked: str(data?.blocked), data };
}

export interface VerdictContext {
  line: LineDef;
  stage: StageDef;
  settings: LineSettings;
  /** Who gave the verdict (the gate's owner). */
  from: string;
}

/**
 * Reads a gate's verdict. Scores are recomputed from the dimensions with the line's rubric, and the pass is
 * decided here: the hub, not the member, applies the pass mark, the must-pass items and the P0 rule.
 * Fixes are normalised and routed only to stages the gate may send work back to. Null when unreadable.
 */
export function parseVerdict(text: string, ctx: VerdictContext): Verdict | null {
  const obj = extractLastJson(text);
  const gate = ctx.stage.gate;
  if (!obj || !gate) return null;

  const dimensions = readDimensions(obj.dimensions ?? obj.scores);
  const mustPass = readMustPass(obj.must_pass ?? obj.mustPass);
  const fixes = readFixes(obj, ctx);
  const reported = readScore(obj.score);
  const summary = (str(obj.summary) ?? str(obj.client_note) ?? '').slice(0, 2000);

  let score = reported;
  let scoreMismatch: Verdict['scoreMismatch'];
  const weights = gate.judge === 'score' && gate.rubric ? gate.rubric[ctx.settings.direction] : null;
  if (weights) {
    const computed = weightedScore(dimensions, weights);
    if (computed !== null) {
      if (reported !== null && Math.abs(reported - computed) > 2) scoreMismatch = { reported, computed };
      score = computed;
    }
  }

  const minDimension = gate.minDimension;
  const checked = weights ? Object.keys(weights).filter((k) => weights[k]! > 0) : Object.keys(dimensions);
  const dimensionsOk = minDimension === undefined || checked.every((k) => dimensions[k] === undefined || dimensions[k]! >= minDimension);
  const mustPassOk = mustPass.every((m) => m.ok);
  const noP0 = !fixes.some((f) => f.severity === 'P0');
  const passMark = gate.main ? ctx.settings.passMark : DEFAULT_PASS_MARK;

  const pass =
    gate.judge === 'score'
      ? score !== null && score >= passMark && dimensionsOk && mustPassOk && noP0
      : obj.pass === true && dimensionsOk && mustPassOk && noP0;

  return { score, pass, summary, fixes, dimensions, mustPass, ...(scoreMismatch ? { scoreMismatch } : {}) };
}

/** Σ weight × score / 10 over the rubric's dimensions; null unless every weighted dimension was scored. */
export function weightedScore(dimensions: Record<string, number>, weights: Record<string, number>): number | null {
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (weight <= 0) continue;
    const value = dimensions[key];
    if (value === undefined) return null;
    total += (weight * value) / 10;
  }
  return Math.round(total);
}

/** "82", 82, "82/100" → 82; "8.2/10" or 8.2 → 82. Clamped to 0-100; null when there is no number. */
export function readScore(value: unknown): number | null {
  let n: number | null = null;
  if (typeof value === 'number' && Number.isFinite(value)) n = value <= 10 ? value * 10 : value;
  else if (typeof value === 'string') {
    const m = value.match(/(-?\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?/);
    if (m) {
      const num = Number(m[1]);
      const of = m[2] ? Number(m[2]) : num <= 10 ? 10 : 100;
      n = (num / of) * 100;
    }
  }
  return n === null ? null : Math.round(Math.min(100, Math.max(0, n)));
}

function readDimensions(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const put = (id: unknown, value: unknown) => {
    const key = str(id)?.toLowerCase();
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (key && Number.isFinite(n)) out[key] = Math.min(10, Math.max(0, n > 10 ? n / 10 : n));
  };
  if (Array.isArray(raw)) {
    for (const d of raw) if (isRecord(d)) put(d.id ?? d.key ?? d.name, d.score);
  } else if (isRecord(raw)) {
    for (const [k, v] of Object.entries(raw)) put(k, isRecord(v) ? v.score : v);
  }
  return out;
}

function readMustPass(raw: unknown): { id: string; ok: boolean }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m) => (isRecord(m) && typeof m.ok === 'boolean' ? [{ id: str(m.id) ?? '?', ok: m.ok }] : []));
}

const SEVERITY: Record<string, FixSeverity> = { p0: 'P0', critical: 'P0', blocker: 'P0', must: 'P0', p1: 'P1', should: 'P1', major: 'P1', p2: 'P2', minor: 'P2', nice: 'P2' };
const SEVERITY_ORDER: FixSeverity[] = ['P0', 'P1', 'P2'];

function readFixes(obj: Record<string, unknown>, ctx: VerdictContext): FixNote[] {
  const gate = ctx.stage.gate!;
  const raw = [obj.fixes, obj.redo, obj.notes, obj.blockers].flatMap((list) => (Array.isArray(list) ? list : []));
  const seen = new Set<string>();
  const fixes: FixNote[] = [];
  raw.forEach((item, i) => {
    const f: Record<string, unknown> = isRecord(item) ? item : { problem: item };
    const problem = str(f.problem) ?? str(f.issue) ?? str(f.note) ?? str(f.requirement);
    if (!problem) return;
    const stage = stageKey(str(f.stage), ctx.line);
    const routed = stage && gate.fixTargets.includes(stage) ? stage : gate.defaultFix;
    const dedupe = `${routed}|${problem.toLowerCase()}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    const at = typeof f.at === 'number' ? String(f.at) : str(f.at);
    const scene = str(f.scene) ?? str(f.frame);
    const evidence = Array.isArray(f.evidence) ? f.evidence.filter((e) => typeof e === 'string').join(', ') : str(f.evidence);
    fixes.push({
      id: str(f.id) ?? `F${i + 1}`,
      severity: SEVERITY[(str(f.severity) ?? '').toLowerCase()] ?? 'P1',
      stage: routed,
      ...(at ? { at } : {}),
      ...(scene ? { scene } : {}),
      problem: problem.slice(0, 600),
      fix: (str(f.fix) ?? str(f.change) ?? '').slice(0, 800),
      ...(evidence ? { evidence: evidence.slice(0, 300) } : {}),
      from: ctx.from,
    });
  });
  return fixes.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)).slice(0, MAX_FIXES);
}

/** A stage named in a fix: its key or its label, any case or punctuation. */
function stageKey(name: string | null, line: LineDef): string | null {
  if (!name) return null;
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const wanted = flat(name);
  return line.stages.find((s) => flat(s.key) === wanted || flat(s.label) === wanted)?.key ?? null;
}

/** Your notes as fixes for the critic to map (a triage round). */
export function notesFromYou(notes: { text: string; at?: string; scene?: string }[], stage: string): FixNote[] {
  return notes
    .filter((n) => n.text.trim())
    .map((n, i) => ({ id: `Y${i + 1}`, severity: 'P0' as const, stage, ...(n.at ? { at: n.at } : {}), ...(n.scene ? { scene: n.scene } : {}), problem: n.text.trim(), fix: '', from: YOU }));
}

function topLevelObjects(text: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"' && depth > 0) inString = true;
    else if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}' && depth > 0) {
      depth--;
      if (depth === 0) found.push(text.slice(start, i + 1));
    }
  }
  return found;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstWords(text: string, max: number): string {
  const clean = text.replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
