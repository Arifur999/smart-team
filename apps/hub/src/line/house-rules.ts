/**
 * House rules: your feedback kept as permanent rules for a team. Files in skill-packs/house-rules hold them
 * as Markdown sections:
 *
 *   ## R-ED-001 Light is soft, never a hard polygon
 *   - status: active
 *   - applies: storyboard, animate, critique
 *   - rule: …
 *   - why: …
 *   - check: …
 */
export interface HouseRule {
  id: string;
  title: string;
  status: string;
  /** Stage keys, or "all". */
  applies: string[];
  rule: string;
  why: string | null;
  check: string | null;
}

export function parseHouseRules(markdown: string): HouseRule[] {
  const rules: HouseRule[] = [];
  for (const section of markdown.split(/^## /m).slice(1)) {
    const [heading = '', ...body] = section.split(/\r?\n/);
    const m = heading.trim().match(/^(\S+)\s+(.*)$/);
    if (!m) continue;
    const fields: Record<string, string> = {};
    for (const line of body) {
      const f = line.match(/^\s*-\s*([a-z]+)\s*:\s*(.*)$/i);
      if (f) fields[f[1]!.toLowerCase()] = f[2]!.trim();
    }
    if (!fields.rule) continue;
    rules.push({
      id: m[1]!,
      title: m[2]!.trim(),
      status: (fields.status ?? 'active').split(/\s/)[0]!.toLowerCase(),
      applies: (fields.applies ?? 'all').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
      rule: fields.rule,
      why: fields.why ?? null,
      check: fields.check ?? null,
    });
  }
  return rules;
}

/** Active rules that apply to a stage. */
export function rulesFor(rules: HouseRule[], stage: string): HouseRule[] {
  return rules.filter((r) => r.status === 'active' && (r.applies.includes('all') || r.applies.includes(stage)));
}

/** Rules as prompt lines, with their checks so a critic can test them. */
export function formatRules(rules: HouseRule[]): string {
  return rules.map((r) => `- ${r.id} ${r.title}: ${r.rule}${r.check ? ` (check: ${r.check})` : ''}`).join('\n');
}
