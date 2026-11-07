import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHouseRules, type HouseRule } from '../line/house-rules.js';

/** Rule id prefix per scope: R-GL-001 global, R-ED-001 video, and so on. */
export const RULE_PREFIX: Record<string, string> = {
  global: 'R-GL',
  nextEditor: 'R-ED',
  nextDev: 'R-DV',
  nextDesign: 'R-DS',
  NextMarketer: 'R-MK',
};

export function ruleFile(dir: string, scope: string): string {
  return join(dir, `${scope}.md`);
}

export function readRules(dir: string, scope: string): HouseRule[] {
  const file = ruleFile(dir, scope);
  return existsSync(file) ? parseHouseRules(readFileSync(file, 'utf8')) : [];
}

/** The next free id in a scope, e.g. R-ED-011 after R-ED-010. */
export function nextRuleId(markdown: string, prefix: string): string {
  const numbers = [...markdown.matchAll(new RegExp(`^## ${prefix}-(\\d+)`, 'gm'))].map((m) => Number(m[1]));
  return `${prefix}-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export interface NewRule {
  title: string;
  applies: string;
  rule: string;
  why: string;
  check: string | null;
  source: string;
}

/** One rule as a Markdown section in the house-rules format. Line breaks are flattened so the parser reads it back. */
export function ruleSection(id: string, r: NewRule): string {
  const flat = (s: string) => s.replace(/\s*\r?\n\s*/g, ' ').trim();
  return [
    `## ${id} ${flat(r.title)}`,
    '- status: active',
    `- applies: ${flat(r.applies) || 'all'}`,
    `- rule: ${flat(r.rule)}`,
    `- why: ${flat(r.why)}`,
    ...(r.check ? [`- check: ${flat(r.check)}`] : []),
    `- source: ${flat(r.source)}`,
  ].join('\n');
}

/** Appends a rule to the scope's file (creating it with a heading) and returns its id. */
export function appendRule(dir: string, scope: string, label: string, r: NewRule): string {
  const file = ruleFile(dir, scope);
  const current = existsSync(file) ? readFileSync(file, 'utf8') : `# ${label} house rules\n`;
  const id = nextRuleId(current, RULE_PREFIX[scope] ?? 'R-XX');
  writeFileSync(file, `${current.replace(/\s*$/, '')}\n\n${ruleSection(id, r)}\n`, 'utf8');
  return id;
}
