import { defaultLineKey, INTAKE_TEMPLATES, type AssetView, type LineSettings, type StageFile, type TeamId } from '@smart-team/shared';
import { directionText } from './stage-jobs.js';

/** The brief's typed answers by field id. */
export function briefAnswers(json: unknown): Record<string, string> {
  if (!json || typeof json !== 'object') return {};
  return Object.fromEntries(Object.entries(json as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

/**
 * The files every stage finds in 00-brief/: the confirmed brief with every answer, the direction, and where
 * the brief's files are. Written by the agent before Claude starts, so the brief always wins over memory.
 */
export function briefFiles(input: {
  title: string;
  team: TeamId;
  summary: string | null;
  answers: Record<string, string>;
  assets: AssetView[];
  settings: LineSettings;
}): StageFile[] {
  const fields = INTAKE_TEMPLATES[input.team];
  const answerLines = fields
    .map((f) => [f.label, input.answers[f.id]?.trim()] as const)
    .filter((pair): pair is readonly [string, string] => Boolean(pair[1]))
    .map(([label, answer]) => `- **${label}:** ${answer}`);
  const clarifications = input.answers._clarifications?.trim();

  const brief = [
    `# Brief: ${input.title}`,
    '',
    input.summary?.trim() || '(No summary was written; use the answers below.)',
    '',
    '## Every answer, as given',
    ...answerLines,
    ...(clarifications ? ['', '## Clarifications', clarifications] : []),
  ].join('\n');

  const assets = [
    '# Files from the brief',
    '',
    ...(input.assets.length
      ? input.assets.map((a) => {
          const where = a.kind === 'LINK' ? a.url : a.kind === 'PATH' ? `${a.path} (on ${a.deviceName ?? 'a PC'})` : `uploaded to the hub (${a.name})`;
          const label = fields.find((f) => f.id === a.fieldId)?.label ?? a.fieldId;
          return `- ${label}${a.tag ? ` [${a.tag}]` : ''}: ${a.name} — ${where}`;
        })
      : ['(none)']),
    '',
    'Uploaded files are also listed at the end of your instruction with the folder they were downloaded to.',
  ].join('\n');

  return [
    { path: '00-brief/brief.md', content: brief },
    { path: '00-brief/direction.txt', content: `${input.settings.direction}\n${directionText(input.settings.direction, defaultLineKey(input.team) ?? undefined)}\n` },
    { path: '00-brief/assets.md', content: assets },
  ];
}
