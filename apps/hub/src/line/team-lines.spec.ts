import { LINES, memberById, validateLine } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import { skipFlags } from './settings.js';
import { PERSONAS, STAGE_JOBS } from './stage-jobs.js';
import { taskFolderName } from './task-folder.js';

describe('every production line', () => {
  for (const line of LINES) {
    describe(line.key, () => {
      it('is valid', () => expect(validateLine(line)).toEqual([]));

      it('has a job, a known owner and a persona for every stage a member works', () => {
        for (const stage of line.stages.filter((s) => s.owner !== 'you')) {
          expect(STAGE_JOBS[`${line.key}/${stage.key}`], `${line.key}/${stage.key}`).toBeDefined();
          expect(memberById(stage.owner), stage.owner).toBeDefined();
          expect(PERSONAS[stage.owner], stage.owner).toBeDefined();
        }
      });

      it('counts versions on one of its own work stages', () => {
        expect(line.stages.find((s) => s.key === line.versionStage)?.kind).toBe('work');
      });
    });
  }
});

describe('skipFlags for campaigns', () => {
  it('skips social content when no social platform is named', () => {
    expect(skipFlags({ platforms: 'Google search and email' })).toContain('no-social');
    expect(skipFlags({ platforms: 'Instagram and TikTok' })).not.toContain('no-social');
  });

  it('skips search and ads when no search platform is named', () => {
    expect(skipFlags({ platforms: 'Instagram and TikTok' })).toContain('no-search');
    expect(skipFlags({ platforms: 'Google Ads' })).not.toContain('no-search');
    expect(skipFlags({ platforms: 'X and LinkedIn' })).not.toContain('no-social');
  });

  it('skips nothing when the platforms are not given', () => {
    expect(skipFlags({})).toEqual([]);
  });
});

describe('taskFolderName with a root', () => {
  it('puts dev task folders under .smart-team so the repo stays clean', () => {
    expect(taskFolderName('Add login', '0193aaaa-bbbb-7ccc-8ddd-eeeeffff1234', new Date('2026-11-07T10:00:00Z'), '.smart-team')).toBe(
      '.smart-team/20261107-add-login-1234',
    );
  });
});
