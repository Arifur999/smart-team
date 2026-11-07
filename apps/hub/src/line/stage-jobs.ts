import type { LineDirection } from '@smart-team/shared';

/** What one stage must do, given the task's direction and versions. Keyed "<line>/<stage>". */
export interface StageJob {
  skills: string;
  job: (c: { direction: LineDirection; round: number; v: number }) => string;
  /** The JSON the member ends with. */
  reply: string;
}

const MATCH = 'Match the reference closely: keep its beats, light, layout, motion and transitions; change only the brand content.';
const CONCEPT = 'New concept in the same spirit: keep the mood, quality bar and pace; change the idea, the layout system and the transitions.';

export const directionText = (d: LineDirection) => (d === 'match' ? MATCH : CONCEPT);

export const STAGE_JOBS: Record<string, StageJob> = {
  'nextEditor.video/source': {
    skills: 'reference-match, video-production, hyperframes-cli, media-use, and the client brand kit if there is one',
    job: () =>
      [
        'Read the reference video from start to finish, A to Z, and turn it into measured grammar the team builds and judges against.',
        'Copy the reference into 01-source/ (never touch the original), run the reference-match analysis, then open EVERY contact sheet, strip and beat frame you made: no second of the reference goes unseen.',
        'Name every beat (id, plain name, start/end, poster time, what moves, ease feel, transition, sound). Transcribe all on-screen text.',
        'Write 01-source/style-spec.md with numbers (each marked measured or estimated): stage, light (sources, cone angle, edge softness, falloff, bloom, haze, colour), surface, type, layout, motion, transitions, sound, premium cues, "Allowed by reference" (overrides of the hyperframes BANNED defaults) and "Never".',
        'Write 01-source/beat-map.json and 01-source/brand-facts.md: logo files, brand tokens and fonts from the brand kit or the client site (never sampled from a PNG when tokens exist), the on-screen copy verbatim from the brief, and a table of every brand-versus-reference conflict with your default decision.',
        'Before you finish, check coverage: the beats cover 0 to the full duration with no gap.',
        'Describe the reference; do not plan the film.',
      ].join('\n'),
    reply: '{"stage":"source","summary":"…","beats":N,"duration":seconds,"conflicts":["…"]}',
  },
  'nextEditor.video/plan': {
    skills: 'video-production, hyperframes, reference-match, video-qa (rubric), motion-light-recipes, and the client brand kit',
    job: ({ direction }) =>
      [
        `Direction: ${directionText(direction)}`,
        'Look at 01-source/reference-sheet.png and every beat frame before writing. Then write in 02-plan/:',
        '- SPEC.md with numbers, including an ALLOWED line copied from "Allowed by reference" that overrides the hyperframes BANNED defaults.',
        '- storyboard.md: one frame per beat with its reference beat id, render window, poster time, what it reads, sound, transition in and the light recipe.',
        '- beat-plan.json mapping every render beat to its reference window (match) or to pace targets (new concept).',
        '- rubric.md and rubric.json: the video-qa rubric for this direction plus this task\'s must-pass items (verbatim copy list, formats, duration, sound).',
        '- conflicts.md: each decision you took, and at most 3 questions for the client\'s Ready check.',
        'Every on-screen word comes verbatim from the brief. Decide; do not offer options.',
      ].join('\n'),
    reply: '{"stage":"plan","summary":"…","frames":N,"duration":seconds,"size":"WxH","fps":N,"sound":true,"questions":["…"]}',
  },
  'nextEditor.video/storyboard': {
    skills: 'storyboard-keyframes, motion-light-recipes, hyperframes, hyperframes-cli, hyperframes-registry, and the client brand kit',
    job: ({ round }) =>
      [
        `Build the look, not the motion (style frames v${round}). In build/, pose every storyboard frame in its landed state at its poster time with the brand fonts, tokens, final copy and the planned light recipe. No entrance or exit animation.`,
        `Snapshot all poster times in one run into 03-storyboard/v${round}/stills, pair each still with its reference beat frame, make 03-storyboard/v${round}/sheet.png, and look at every pair.`,
        'Fix until light, texture, type and placement match (at most 2 passes per frame). hyperframes check must show zero errors.',
        'On a redo round, redo only the frames named in your fixes, and copy the unchanged stills into the new version folder.',
      ].join('\n'),
    reply: '{"stage":"storyboard","summary":"…","frames":[{"id":"F01","still":"…","pair":"…"}],"fixes":[{"id":"…","status":"done|partly|not done","what":"…"}]}',
  },
  'nextEditor.video/storyboard-check': {
    skills: 'video-qa (stills mode), reference-match, motion-light-recipes, and the client brand kit',
    job: ({ round }) =>
      [
        `Judge style frames v${round} (03-storyboard/v${round}) as a still: light, glow and texture; typography and layout; brand; legibility and safe area.`,
        'Use the pairs and safe-area overlays, and zoom into beam edges, text edges and the logo. Score light, type, brand and safe out of 10.',
        'Every frame passes or gets one fix with an exact change in numbers, routed to stage "storyboard". No motion comments.',
      ].join('\n'),
    reply: '{"stage":"storyboard-check","pass":true,"summary":"…","dimensions":{"light":N,"type":N,"brand":N,"safe":N},"fixes":[{"id":"S1","severity":"P0|P1|P2","stage":"storyboard","scene":"F04","problem":"…","fix":"…","evidence":"path"}]}',
  },
  'nextEditor.video/animate': {
    skills: 'hyperframes, hyperframes-cli, motion-light-recipes, hyperframes-registry, media-use',
    job: ({ round }) =>
      [
        'Animate the approved style frames to 02-plan/beat-plan.json: each beat within 2 frames, the planned transitions, eases by role, titles dead still once landed and the light kept moving during holds. At every poster time the frame must look like its approved still.',
        'npx hyperframes check --json must show zero errors. If you move a beat, move its sound cues with it.',
        `Render the master to 04-renders/v${round}/film.mp4 (H.264, yuv420p, AAC if there is sound, +faststart) and a poster frame to 04-renders/v${round}/poster.jpg. Confirm the duration with ffprobe and compare the poster-time frames from the file with the stills.`,
        'Write build-notes.md next to the render: for each fix id, what changed (file and selector).',
      ].join('\n'),
    reply: '{"stage":"animate","summary":"…","file":"04-renders/vN/film.mp4","duration":seconds,"check_errors":0,"fixes":[{"id":"…","status":"done|partly|not done","what":"…"}]}',
  },
  'nextEditor.video/sound': {
    skills: 'media-use, hyperframes (sound), video-production (audio engineering)',
    job: ({ v }) =>
      [
        'Score the picture to the storyboard\'s sound lines: a licensed, commercial-safe bed if planned, effects only on visible actions at their beat times.',
        `Record every source and licence in 05-sound/v${v}/licences.md. Keep the silent picture as 04-renders/v${v}/film-picture.mp4 and write the mixed film to 04-renders/v${v}/film.mp4.`,
        'Measure the delivered file: -14 LUFS ±1, true peak at most -1.0 dBTP, stereo 48 kHz.',
      ].join('\n'),
    reply: '{"stage":"sound","summary":"…","lufs":N,"true_peak":N,"cues":N,"fixes":[{"id":"…","status":"done|partly|not done","what":"…"}]}',
  },
  'nextEditor.video/critique': {
    skills: 'video-qa, reference-match, motion-light-recipes, hyperframes-cli, video-production (qc_report.py), and the client brand kit',
    job: ({ v, direction }) =>
      [
        `Judge render v${v} (04-renders/v${v}/film.mp4) as the client's creative director. You did not make this film. Look first; read the builders' notes last. Change nothing outside critique/.`,
        `Direction: ${directionText(direction)}`,
        'Measure it (black, empty and frozen frames, beat timing, luma envelope, glow, safe areas, edge flags, loudness), build side-by-side pairs against the reference at matched beats, and open every pair, seam strip and safe-area overlay.',
        'Score every rubric dimension of 02-plan/rubric.json out of 10 with evidence: light, type, timing, transitions, brand, safe, tech, idea. Check every must-pass item. Start each dimension at 5 and move only on evidence.',
        'List fixes P0 first: one problem each, an exact change with numbers, routed to stage plan, storyboard, animate or sound. Every dimension under 9 needs a fix. From v2 on, report every previous fix as fixed, partly, not fixed or regressed (a regression is P0).',
        'If your fixes come from the client\'s notes (a triage round), map each note to the stage that can fix it.',
      ].join('\n'),
    reply:
      '{"stage":"critique","version":"vN","score":N,"pass":false,"summary":"…","dimensions":[{"id":"light","score":N,"evidence":["path"]}],"must_pass":[{"id":"MP1","ok":true,"evidence":"…"}],"fixes":[{"id":"F1","severity":"P0","stage":"animate","at":"2.4","scene":"…","problem":"…","fix":"…","evidence":"path"}],"previous":[{"id":"F1","status":"fixed"}]}',
  },
  'nextEditor.video/screening': {
    skills: 'team-review, video-qa (reading), reference-match',
    job: ({ v }) =>
      [
        `Watch render v${v} as the client would, through the overview strip, the pair sheet and a phone-size view, against the brief, your plan and the reference.`,
        'Spot-check three fixes marked fixed and the highest-scored dimension on the actual frames. Ship only what you would sign. Otherwise return with fixes in the fix format.',
        'Write a 3-5 line client note in screening/client-note.md.',
      ].join('\n'),
    reply: '{"stage":"screening","pass":true,"summary":"…","fixes":[{"id":"…","severity":"P0|P1","stage":"animate","at":"…","problem":"…","fix":"…"}],"client_note":"…"}',
  },
  'nextEditor.video/variants': {
    skills: 'hyperframes, hyperframes-cli, motion-light-recipes',
    job: ({ v }) =>
      [
        'Recompose the approved master into every other format the brief asks for. Never crop: keep the title centred on its light pool and scale by the short side.',
        `Render each format to 04-renders/v${v}/<aspect>.mp4 (for example 9x16.mp4) as H.264, yuv420p, +faststart, and check every one for cut-off text.`,
      ].join('\n'),
    reply: '{"stage":"variants","summary":"…","files":["04-renders/vN/9x16.mp4"]}',
  },
  'nextEditor.video/final-qa': {
    skills: 'final-qa, video-production (qc_report.py), humanizer, and the client brand kit',
    job: () =>
      [
        'Turn the brief into numbered testable requirements and prove each one from the deliverables: measured (ffprobe, ebur128, qc_report.py), seen (frame path and time) or read (on-screen text compared verbatim with the brief).',
        'Check file names, every format, a full decode of each file, licences.md, and that nothing is invented. You judge the brief, not taste. Pass only if every requirement is met; for each miss, add a fix routed to the stage that owns it.',
      ].join('\n'),
    reply: '{"stage":"final-qa","pass":true,"summary":"…","items":[{"id":"R1","requirement":"…","evidence":"…","status":"met|not met"}],"fixes":[{"id":"…","stage":"animate","problem":"…","fix":"…"}]}',
  },
};

/** Short voice of each member, so a stage reads like that person. */
export const PERSONAS: Record<string, string> = {
  wolverine: 'You notice everything and take nothing on faith: you measure every frame before you describe it.',
  cyclops: 'You lead the team: clear direction, decisive, and you sign only what you would show the client.',
  'jean-grey': 'You see the finished picture before it exists and build it frame by frame with care.',
  storm: 'You make things move with control: timing, weight and flow are your craft.',
  beast: 'You are the team\'s toughest critic: precise, evidence-first, never fooled by "it is fixed".',
  'captain-marvel': 'You hold the final line: nothing reaches the client unless every requirement is proven.',
};
