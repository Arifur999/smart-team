import { INTAKE_AGENT_NAME, PLAN_AGENT_NAME, type AssetView, type IntakeField, type TeamId } from '@smart-team/shared';

export interface BriefState {
  team: TeamId;
  title: string;
  fields: IntakeField[];
  answers: Record<string, string>;
  skipped: string[];
  assets: AssetView[];
  /** Your answers to the intake agent's follow-up questions, oldest first. */
  clarifications: string[];
}

export interface ReviewResult {
  complete: boolean;
  questions: string[];
  summary: string | null;
}

const MAX_QUESTIONS = 3;

function describeAsset(a: AssetView): string {
  if (a.kind === 'LINK') return `link ${a.url}`;
  if (a.kind === 'PATH') return `${a.path} on PC ${a.deviceName ?? 'unknown'}`;
  return `uploaded file ${a.name}`;
}

/** Every field with its answer and files, in template order. */
export function briefLines(state: BriefState): string[] {
  return state.fields.map((f) => {
    const files = state.assets.filter((a) => a.fieldId === f.id).map(describeAsset);
    const answer = state.answers[f.id]?.trim();
    const parts = [answer, files.length ? `files: ${files.join('; ')}` : null].filter(Boolean);
    const value = parts.length ? parts.join(' — ') : state.skipped.includes(f.id) ? '(skipped)' : '(no answer)';
    return `- ${f.label}${f.required ? ' (required)' : ''}: ${value}`;
  });
}

/** What the intake agent's brief check is asked. It must answer with JSON only. */
export function reviewPrompt(state: BriefState): string {
  return [
    `You are ${INTAKE_AGENT_NAME}, the intake agent of the ${state.team} team. Check whether this brief is clear and complete enough for the team to plan the work.`,
    'Do not plan or do the work, and do not change any files. You may look at the project folder to understand the context.',
    '',
    `Task: ${state.title}`,
    '',
    'Brief so far:',
    ...briefLines(state),
    ...(state.clarifications.length ? ['', 'Answers to your earlier questions:', ...state.clarifications.map((c) => `- ${c}`)] : []),
    '',
    'Reply with only one JSON object and no other text:',
    '{"complete": true or false, "questions": ["..."], "summary": "..."}',
    `- questions: at most ${MAX_QUESTIONS} short questions, only about things that would change the result. Empty when nothing important is missing.`,
    '- complete: true when questions is empty.',
    '- summary: the brief rewritten clearly in Markdown with the sections Goal, Details, Files, Done when and Constraints. Keep every fact; do not invent any.',
  ].join('\n');
}

/** Reads the brief check's answer. Returns null when it is not the JSON that was asked for. */
export function parseReview(text: string | null): ReviewResult | null {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const questions = Array.isArray(raw.questions)
      ? raw.questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, MAX_QUESTIONS)
      : [];
    const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : null;
    return { complete: raw.complete === true && questions.length === 0, questions, summary };
  } catch {
    return null;
  }
}

/** A plain brief built from the answers, used when the check could not run. */
export function fallbackSummary(state: BriefState): string {
  return [`# ${state.title}`, '', ...briefLines(state), ...(state.clarifications.length ? ['', '## Clarifications', ...state.clarifications.map((c) => `- ${c}`)] : [])].join('\n');
}

/** The planner's instruction once you confirm the brief. */
export function planPrompt(team: TeamId, summary: string): string {
  return [
    `${PLAN_AGENT_NAME} here, planning for the ${team} team. Plan this task from the confirmed brief below.`,
    'Files from the brief that are on this PC are listed after it, with their paths.',
    '',
    summary,
  ].join('\n');
}
