import { INTAKE_TEMPLATES, type AssetView } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import { briefLines, fallbackSummary, parseReview, reviewPrompt, type BriefState } from './brief-prompts.js';

const asset = (over: Partial<AssetView>): AssetView => ({
  id: 'a1',
  fieldId: 'footage',
  kind: 'UPLOAD',
  name: 'clip.mp4',
  tag: 'raw-footage',
  path: null,
  deviceId: null,
  deviceName: null,
  url: null,
  size: 10,
  ...over,
});

const state: BriefState = {
  team: 'nextEditor',
  title: 'Launch reel',
  fields: INTAKE_TEMPLATES.nextEditor,
  answers: { goal: 'A 30 second launch reel', platform: 'Instagram Reel' },
  skipped: ['captions'],
  assets: [asset({}), asset({ id: 'a2', fieldId: 'vfx', kind: 'LINK', name: 'ref', url: 'https://example.com/ref' })],
  clarifications: [],
};

describe('briefLines', () => {
  it('shows answers, files, skipped and missing fields in template order', () => {
    const lines = briefLines(state);
    expect(lines[0]).toBe('- Goal (required): A 30 second launch reel');
    expect(lines).toContain('- Raw footage (required): files: uploaded file clip.mp4');
    expect(lines).toContain('- VFX references (required): files: link https://example.com/ref');
    expect(lines).toContain('- Captions: (skipped)');
    expect(lines).toContain('- Length and format (required): (no answer)');
  });
});

describe('reviewPrompt', () => {
  it('asks for JSON only and includes the brief', () => {
    const prompt = reviewPrompt(state);
    expect(prompt).toContain('Reply with only one JSON object');
    expect(prompt).toContain('Task: Launch reel');
    expect(prompt).toContain('- Platform (required): Instagram Reel');
  });
});

describe('parseReview', () => {
  it('reads JSON even with text around it', () => {
    expect(parseReview('Here you go: {"complete": false, "questions": ["Which length?"], "summary": "# Brief"} done')).toEqual({
      complete: false,
      questions: ['Which length?'],
      summary: '# Brief',
    });
  });

  it('is only complete when there are no questions, and keeps at most three', () => {
    expect(parseReview('{"complete": true, "questions": ["a", "b", "c", "d"]}')).toEqual({ complete: false, questions: ['a', 'b', 'c'], summary: null });
    expect(parseReview('{"complete": true, "questions": [], "summary": "ok"}')?.complete).toBe(true);
  });

  it('returns null for anything that is not the asked JSON', () => {
    expect(parseReview(null)).toBeNull();
    expect(parseReview('no json here')).toBeNull();
    expect(parseReview('{broken')).toBeNull();
  });
});

describe('fallbackSummary', () => {
  it('builds a readable brief from the answers', () => {
    const summary = fallbackSummary({ ...state, clarifications: ['Length: 30 seconds, 9:16'] });
    expect(summary.startsWith('# Launch reel')).toBe(true);
    expect(summary).toContain('## Clarifications');
  });
});
