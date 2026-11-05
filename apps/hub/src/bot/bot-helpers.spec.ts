import { mentionedTeams } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import { botTurnText, userTurnText } from './bot-prompt.js';
import { findMember } from './bot-tools.js';

describe('mentionedTeams', () => {
  it('finds @team mentions whatever their case', () => {
    expect(mentionedTeams('@nextdev add a login page')).toEqual(['nextDev']);
    expect(mentionedTeams('@NextMarketer and @nextDesign, please')).toEqual(['NextMarketer', 'nextDesign']);
  });

  it('ignores unknown names and e-mail addresses that are not teams', () => {
    expect(mentionedTeams('ask @someone or mail me@example.com')).toEqual([]);
  });
});

describe('findMember', () => {
  it('matches names and ids loosely', () => {
    expect(findMember('Hulk')?.member.id).toBe('hulk');
    expect(findMember('spiderman')?.member.id).toBe('spider-man');
    expect(findMember('maria-hill')?.team).toBeNull();
  });

  it('returns undefined for nobody', () => {
    expect(findMember('Thanos')).toBeUndefined();
  });
});

describe('turn text', () => {
  it('replays action cards so task ids stay known', () => {
    const text = botTurnText('Done.', [
      { kind: 'task-created', id: 'a', taskId: 't1', team: 'nextDev', title: 'Login page' },
      { kind: 'confirm', id: 'b', action: 'cancel', taskId: 't2', title: 'Old task', answer: null },
    ]);
    expect(text).toContain('id t1');
    expect(text).toContain('cancel task "Old task" (id t2): waiting for the user');
  });

  it('marks the team picked in the panel', () => {
    expect(userTurnText('status?', 'nextEditor')).toBe('[Team selected in the bot panel: nextEditor]\nstatus?');
    expect(userTurnText('status?', null)).toBe('status?');
  });
});
