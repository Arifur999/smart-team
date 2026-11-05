import type { OfficeMember } from './office';

const LINES = {
  planning: ['Mapping it out.', 'Reading the code first.', 'Drafting the plan.', 'Checking the details.'],
  supervising: ['On it, chief!', 'Keeping an eye on it.', 'Looks good so far.', 'Got this.'],
  working: ['Working it now.', 'Writing the code.', 'Almost there.', 'Running the checks.', 'Capturing it.'],
  waiting: ['Plan ready for you.', 'Waiting on your OK.', 'Your call, boss.'],
  briefing: ['Reading your brief.', 'Any gaps here?', 'Checking the files.'],
  asking: ['Got a question for you.', 'Need a few details.', 'Your turn.'],
  queued: ['Next up.', 'Ready when the PC is.'],
  idle: ['Coffee break.', 'Ready for work.', 'Anything for me?'],
} as const;

/** Spreads members over the lines so two people in a room rarely say the same thing. */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * What a member says right now, or null for no bubble. Working members always talk; idle ones only
 * now and then, so the map is not full of bubbles. `tick` moves every few seconds.
 */
export function speechFor(member: OfficeMember, tick: number): string | null {
  const { activity } = member;
  const pick = (lines: readonly string[]) => lines[(tick + hash(member.id)) % lines.length]!;

  if (activity.tone === 'off') return null;
  if (activity.tone === 'waiting') {
    if (member.role === 'intake') return pick(LINES.asking);
    return pick(activity.label === 'Queued' ? LINES.queued : LINES.waiting);
  }
  if (activity.tone === 'busy') {
    if (member.role === 'intake') return pick(LINES.briefing);
    if (member.role === 'planner') return pick(LINES.planning);
    if (member.role === 'leader') return pick(LINES.supervising);
    return pick(LINES.working);
  }
  // Idle: about one in seven members speaks at a time, so the lounge stays readable.
  return (tick + hash(member.id)) % 7 === 0 ? pick(LINES.idle) : null;
}
