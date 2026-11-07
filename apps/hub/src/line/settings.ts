import type { LineDef, LineSettings, SkipWhen } from '@smart-team/shared';

/** Your line settings, cleaned up: unknown values fall back to the line's defaults, numbers are kept in range. */
export function readSettings(raw: unknown, line: LineDef): LineSettings {
  const d = line.defaults;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const skippable = new Set(line.stages.filter((s) => s.skippable).map((s) => s.key));
  const optional = new Set(line.stages.filter((s) => s.optional).map((s) => s.key));
  return {
    direction: r.direction === 'match' || r.direction === 'concept' ? r.direction : d.direction,
    trust: typeof r.trust === 'boolean' ? r.trust : d.trust,
    passMark: whole(r.passMark, 50, 100, d.passMark),
    maxFixes: whole(r.maxFixes, 0, 5, d.maxFixes),
    skipStages: r.skipStages === undefined ? d.skipStages : keysIn(r.skipStages, skippable),
    extraChecks: r.extraChecks === undefined ? d.extraChecks : keysIn(r.extraChecks, optional),
  };
}

/** Brief answers that switch stages off: no sound asked for, or a single delivery format. */
export function skipFlags(answers: Record<string, string | undefined>): SkipWhen[] {
  const flags: SkipWhen[] = [];
  const sound = (answers.sound ?? answers.audio ?? '').trim().toLowerCase();
  if (/^(no|none|no sound|silent|without sound|mute)\b/.test(sound)) flags.push('no-sound');
  const formats = `${answers.format ?? ''} ${answers.deliverables ?? ''}`.toLowerCase();
  const ratios = new Set(formats.match(/\b\d{1,2}\s*[:x×]\s*\d{1,2}\b/g)?.map((r) => r.replace(/\s|×/g, '').replace('x', ':')) ?? []);
  const named = ['vertical', 'square', 'landscape', 'portrait', 'reel', 'story', 'shorts', 'youtube'].filter((w) => formats.includes(w));
  if (formats.trim() && ratios.size + (ratios.size ? 0 : named.length) <= 1) flags.push('single-format');
  return flags;
}

function whole(value: unknown, low: number, high: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(high, Math.max(low, Math.round(value))) : fallback;
}

function keysIn(value: unknown, allowed: Set<string>): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((k): k is string => typeof k === 'string' && allowed.has(k)))] : [];
}
