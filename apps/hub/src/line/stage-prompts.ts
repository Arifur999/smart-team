import { fillStagePath, type FixNote, type LineDef, type LineSettings, type MemberInfo, type StageDef, type Verdict } from '@smart-team/shared';
import { formatRules, type HouseRule } from './house-rules.js';
import { directionText, PERSONAS, STAGE_JOBS } from './stage-jobs.js';

export interface EarlierStage {
  label: string;
  ownerName: string;
  summary: string;
  files: string[];
}

export interface StagePromptInput {
  line: LineDef;
  stage: StageDef;
  member: MemberInfo;
  teamLabel: string;
  taskTitle: string;
  /** The task folder on the PC, absolute. */
  folderAbs: string;
  settings: LineSettings;
  round: number;
  /** The current render version. */
  v: number;
  briefSummary: string;
  earlier: EarlierStage[];
  fixes: FixNote[];
  /** The gate's previous verdict, for a recheck. */
  previousVerdict: Verdict | null;
  rules: HouseRule[];
  requiredFiles: string[];
  triage: boolean;
  /** Redone only because an earlier stage changed: the stage's short "quick" job, when it has one. */
  quick?: boolean;
}

/** Paths the stage may write, relative to the task folder. */
export function writeScope(stage: StageDef, round: number, v: number): string[] {
  const own = stage.dir ? [fillStagePath(stage.dir, { round, v })] : [];
  const extra = (stage.writes ?? []).map((w) => fillStagePath(w, { round, v }));
  const reply = stage.saveReply ? [fillStagePath(stage.saveReply, { round, v })] : [];
  return [...new Set([...own, ...extra, ...reply])];
}

/** The persona and the rules every stage works under, appended to Claude Code's system prompt. */
export function stageSystemPrompt(i: StagePromptInput): string {
  const scope = writeScope(i.stage, i.round, i.v);
  return [
    `You are ${i.member.name}, ${i.member.title} of the ${i.teamLabel} team, running the "${i.stage.label}" stage of the task "${i.taskTitle}".`,
    PERSONAS[i.member.id] ?? '',
    'You work unattended on a production line: nobody can answer a question, approve a command or run anything for you during this run.',
    'Load the smart-team-skills:production-line skill first, then the skills named in your job. When any skill says to ask the person, wait for approval, open a preview or offer options, skip that step: the line itself is the gate. Write your assumptions in your notes instead.',
    'The brief (00-brief/brief.md) wins over every other file. Brand rules win over the reference for the logo, colours, fonts and copy; the reference wins over generic defaults for look, layout, motion and tone.',
    `Work inside the task folder ${i.folderAbs}. Write only inside: ${scope.length ? scope.map((p) => (p === '@project' ? 'the project itself (the work folder, outside the task folder)' : p)).join(', ') : 'nothing (read and judge only)'}${i.stage.access === 'review' ? ', and scratch files under _tmp/' : ''}. Never change the reference, the brief, earlier stages' files or any skill folder. Every new version goes in a new folder; never overwrite an earlier one.`,
    'When a command or tool fails, read the error, fix the cause (install what is missing) and carry on. Only stop early if the work truly cannot continue without something only the client has; then end with {"blocked":"what is missing"}.',
    'Back every claim about the work with a file you opened (an image, a page, a test run), and every number with a command or a measurement file.',
    'End your reply with exactly one JSON object in the shape your job gives, and nothing after it.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** The instruction for this stage: the brief, what came before, the job, the fixes and the rules. */
export function stagePrompt(i: StagePromptInput): string {
  const job = (i.quick ? STAGE_JOBS[`${i.line.key}/${i.stage.key}:quick`] : undefined) ?? STAGE_JOBS[`${i.line.key}/${i.stage.key}`];
  const parts: string[] = [];
  const roundNote = i.round > 1 ? ` (round ${i.round})` : '';
  parts.push(`# ${i.stage.label}${roundNote} · ${i.line.label} · ${i.taskTitle}`);
  parts.push(`Task folder: ${i.folderAbs} (all paths below are relative to it).`);
  parts.push(`Direction: ${directionText(i.settings.direction, i.line.key)}`);
  parts.push(`## Brief\n${i.briefSummary.trim() || 'See 00-brief/brief.md.'}`);
  if (i.earlier.length) {
    parts.push(
      `## Earlier stages\n${i.earlier
        .map((e) => `- ${e.label} (${e.ownerName}): ${e.summary.trim() || 'done'}${e.files.length ? `\n  Files: ${e.files.join(', ')}` : ''}`)
        .join('\n')}`,
    );
  }
  if (job) parts.push(`## Your job\nSkills: ${job.skills}.\n${job.job({ direction: i.settings.direction, round: i.round, v: i.v, lineKey: i.line.key })}`);
  if (i.fixes.length) {
    const heading = i.triage
      ? '## The client\'s notes (map each one to a fix routed to the stage that can make it)'
      : '## Fixes for you (answer every id: done, partly or not done, with what changed)';
    parts.push(`${heading}\n${i.fixes.map(formatFix).join('\n')}`);
  }
  if (i.previousVerdict) {
    const prev = i.previousVerdict;
    parts.push(
      [
        `## Your previous verdict\nScore ${prev.score ?? '?'}, ${prev.pass ? 'passed' : 'failed'}. ${prev.summary}`,
        `Its fixes: ${prev.fixes.map((f) => `${f.id} [${f.severity}] (${f.stage}) ${f.problem}`).join('; ') || 'none'}`,
        "This is a recheck, not a fresh review. Start from your previous pairs and the builder's match sheet, re-measure, and report each previous fix as fixed, partly, not fixed or regressed, with the frame that shows it.",
        'Hold the same bar as before; do not raise it. A new problem is P0 only when it would stop the client using the film (cut-off text, wrong copy, a broken logo, black or frozen frames, a regression). Every other new finding is P2 polish.',
      ].join('\n'),
    );
  }
  if (i.rules.length) parts.push(`## House rules (follow them; a rule with a check is a must-pass item)\n${formatRules(i.rules)}`);
  if (i.requiredFiles.length) parts.push(`## Must exist when you finish\n${i.requiredFiles.map((f) => `- ${f}`).join('\n')}`);
  if (job) parts.push(`## Reply\nEnd with exactly this JSON shape:\n${job.reply}`);
  return parts.join('\n\n');
}

function formatFix(f: FixNote): string {
  const where = [f.at ? `at ${f.at}s` : '', f.scene ? `scene ${f.scene}` : ''].filter(Boolean).join(', ');
  return `- ${f.id} [${f.severity}]${where ? ` (${where})` : ''}: ${f.problem}${f.fix ? ` → ${f.fix}` : ''}${f.evidence ? ` [evidence: ${f.evidence}]` : ''}`;
}
