import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TEAMS, type RuleBookView, type RuleProposalView, type TeamId } from '@smart-team/shared';
import { getEnv } from '../env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { appendRule, readRules } from './rule-book.js';

const MAX_PROPOSALS = 3;

const SYSTEM = `You are Nick Fury, the Rule keeper of a team of AI agents. The client just sent work back with notes.
Turn the notes into permanent house rules so the team never makes the same mistake again.

Rules:
- One rule per distinct idea, at most ${MAX_PROPOSALS}. Generalise one level ("the end card sits on white"), not more.
- Skip notes that are one-off content changes for this piece only (e.g. "change the word X to Y"); return [] when nothing generalises.
- Skip ideas an existing rule already covers.
- rule: one instruction sentence, with a number when possible. why: one sentence quoting or citing the client's note.
- check: how a reviewer can test it from the files (a measurement or what to look for), or null if it cannot be tested.
- applies: comma-separated stage keys from the list you are given, or "all".
Reply with only a JSON array: [{"title":"…","applies":"…","rule":"…","why":"…","check":"…"}]`;

interface Draft {
  title: string;
  applies: string;
  rule: string;
  why: string;
  check: string | null;
}

/**
 * House rules: the files in skill-packs/house-rules, and Nick Fury's proposals made from your send-back notes.
 * You apply a proposal (it is appended to the team's file and every later stage prompt gets it) or dismiss it.
 * With Trust on, rules made from your own words are applied straight away.
 */
@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);
  private client: Anthropic | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private dir(): string {
    return join(getEnv().SKILL_PACKS_DIR, 'house-rules');
  }

  private api(): Anthropic | null {
    if (this.client) return this.client;
    const { ANTHROPIC_API_KEY: key, ANTHROPIC_WORKSPACE_ID: workspace } = getEnv();
    this.client = key ? new Anthropic({ apiKey: key, ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}) }) : null;
    return this.client;
  }

  async books(): Promise<RuleBookView[]> {
    const proposals = await this.prisma.ruleProposal.findMany({ where: { status: 'PROPOSED' }, orderBy: { createdAt: 'asc' } });
    const scopes = [{ scope: 'global', label: 'Every team' }, ...TEAMS.map((t) => ({ scope: t.id as string, label: t.label }))];
    return scopes.map(({ scope, label }) => ({
      scope,
      label,
      active: readRules(this.dir(), scope)
        .filter((r) => r.status === 'active')
        .map((r) => ({ id: r.id, title: r.title, applies: r.applies, rule: r.rule, why: r.why, check: r.check })),
      proposals: proposals.filter((p) => p.team === scope).map(toView),
    }));
  }

  /** Called after you send work back. Never throws: a failed proposal must not affect the line. */
  async proposeFrom(input: { taskId: string; team: TeamId; stages: string[]; notes: string; trust: boolean }): Promise<void> {
    const notes = input.notes.trim();
    const client = this.api();
    if (!notes || !client) return;
    try {
      const existing = [...readRules(this.dir(), 'global'), ...readRules(this.dir(), input.team)].filter((r) => r.status === 'active');
      const msg = await client.messages.create({
        model: getEnv().BOT_MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              `Team: ${input.team}. Stage keys: ${input.stages.join(', ')}.`,
              `Existing rules:\n${existing.map((r) => `- ${r.id} ${r.title}: ${r.rule}`).join('\n') || '(none)'}`,
              `The client's notes:\n${notes}`,
            ].join('\n\n'),
          },
        ],
      });
      const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      const drafts = parseDrafts(text).slice(0, MAX_PROPOSALS);
      for (const d of drafts) {
        const row = await this.prisma.ruleProposal.create({
          data: { team: input.team, taskId: input.taskId, title: d.title, applies: d.applies, rule: d.rule, why: d.why, check: d.check, source: notes.slice(0, 2000) },
        });
        if (input.trust) await this.apply(row.id);
      }
      if (drafts.length) this.logger.log(`Nick Fury proposed ${drafts.length} house rule(s) for ${input.team}${input.trust ? ' (applied: Trust is on)' : ''}`);
    } catch (e) {
      this.logger.warn(`Could not propose house rules: ${(e as Error).message}`);
    }
  }

  async apply(id: string): Promise<string> {
    const p = await this.prisma.ruleProposal.findUnique({ where: { id } });
    if (!p || p.status !== 'PROPOSED') throw new NotFoundException('No such proposal waiting.');
    const label = TEAMS.find((t) => t.id === p.team)?.label ?? 'Every team';
    const ruleId = appendRule(this.dir(), p.team, label, {
      title: p.title,
      applies: p.applies,
      rule: p.rule,
      why: p.why,
      check: p.check,
      source: `${p.taskId ? `task ${p.taskId} ` : ''}client note, ${new Date().toISOString().slice(0, 10)}`,
    });
    await this.prisma.ruleProposal.update({ where: { id }, data: { status: 'APPLIED', ruleId, decidedAt: new Date() } });
    return ruleId;
  }

  async dismiss(id: string): Promise<void> {
    const p = await this.prisma.ruleProposal.findUnique({ where: { id } });
    if (!p || p.status !== 'PROPOSED') throw new NotFoundException('No such proposal waiting.');
    await this.prisma.ruleProposal.update({ where: { id }, data: { status: 'DISMISSED', decidedAt: new Date() } });
  }
}

/** The JSON array in a reply (fenced or bare); bad items are dropped. */
export function parseDrafts(text: string): Draft[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return raw.flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const o = r as Record<string, unknown>;
    const d = { title: str(o.title, 120), applies: str(o.applies, 200) || 'all', rule: str(o.rule, 600), why: str(o.why, 400), check: str(o.check, 400) || null };
    return d.title && d.rule ? [d] : [];
  });
}

function toView(p: {
  id: string;
  team: string;
  taskId: string | null;
  title: string;
  applies: string;
  rule: string;
  why: string;
  check: string | null;
  source: string;
  createdAt: Date;
}): RuleProposalView {
  return { id: p.id, team: p.team, taskId: p.taskId, title: p.title, applies: p.applies, rule: p.rule, why: p.why, check: p.check, source: p.source, createdAt: p.createdAt.toISOString() };
}
