import type { StageJob } from './stage-jobs.js';

const FIX = '{"id":"…","status":"done|partly|not done","what":"…"}';

/** Stage jobs for the dev, design and marketing lines. Keyed "<line>/<stage>" like the video line's. */
export const TEAM_STAGE_JOBS: Record<string, StageJob> = {
  // ---- nextDev.build ----
  'nextDev.build/plan': {
    skills: 'problem-solving, db-design, arif-code-review, and the project\'s own conventions',
    job: () =>
      [
        'Read the project (README, package files, the area the brief names, its tests) and plan the change. You are in plan mode: change nothing.',
        'Your reply is saved as plan/PLAN.md, so write it as the plan: goal, what done looks like (acceptance criteria as a numbered list), the files to change and why, data/API changes, the work split into BACKEND, FRONTEND and INTEGRATION sections (write "nothing" for a section with no work), risks, the tests that prove it, and at most 3 questions for the client\'s Ready check.',
        'Follow the project\'s existing patterns; do not invent new libraries when the project already has one for the job.',
      ].join('\n'),
    reply: '{"stage":"plan","summary":"…","criteria":N,"backend":true,"frontend":true,"questions":["…"]}',
  },
  'nextDev.build/backend': {
    skills: 'nestjs-module, express-module, prisma-schema, db-design, security-audit, debugging',
    job: ({ round }) =>
      [
        'Do the BACKEND section of plan/PLAN.md in the project: API, data, migrations (additive only, never reset a database), validation, auth checks, and tests for what you add.',
        'If the plan says "nothing" for the backend, change nothing and say so.',
        `Run the backend tests and the typecheck. Write notes/backend-r${round}/notes.md: what changed (file by file), commands you ran with their results, anything the frontend must know (endpoints, shapes).`,
      ].join('\n'),
    reply: `{"stage":"backend","summary":"…","files":["…"],"tests":"N passed","fixes":[${FIX}]}`,
  },
  'nextDev.build/frontend': {
    skills: 'nextjs-feature, dashboard-ui, ui-ux-visual-designer, frontend-design, debugging',
    job: ({ round }) =>
      [
        'Do the FRONTEND section of plan/PLAN.md in the project, using notes/backend-*/notes.md for the API. Match the project\'s design system; every state (loading, empty, error) handled.',
        'If the plan says "nothing" for the frontend, change nothing and say so.',
        `Run the typecheck and lint. If the app can run, start it, open the changed pages in a headless browser and save screenshots to notes/frontend-r${round}/screens/. Write notes/frontend-r${round}/notes.md.`,
      ].join('\n'),
    reply: `{"stage":"frontend","summary":"…","files":["…"],"screens":["…"],"fixes":[${FIX}]}`,
  },
  'nextDev.build/integrate': {
    skills: 'debugging, clean-refactor, docker-deploy, and the project\'s own scripts',
    job: ({ round }) =>
      [
        'Make the whole change work end to end: wire backend and frontend, do the INTEGRATION section of the plan, run the full build, every test suite, typecheck and lint, and fix what fails at its cause.',
        `Walk every acceptance criterion in plan/PLAN.md and prove it (a test, a command, a screenshot in build/v${round}/screens/).`,
        `Write build/v${round}/report.md: each criterion with its proof, commands and results, and known limits.`,
      ].join('\n'),
    reply: `{"stage":"integrate","summary":"…","build":"ok","tests":"N passed","criteria":[{"id":"C1","met":true,"proof":"…"}],"fixes":[${FIX}]}`,
  },
  'nextDev.build/test-review': {
    skills: 'dev-qa, arif-code-review, security-audit, debugging',
    job: ({ v }) =>
      [
        `Review build v${v} as the strictest reviewer on the team. You did not write this code. Read the diff (git diff against the starting commit), run the tests yourself, try the edge cases the builders did not.`,
        'Score out of 10 with evidence: correct (does what the brief asks), tests (cover the change, all pass), security (auth, validation, secrets, injection), code (readable, follows the project), ux (states, copy, accessibility of changed UI), perf (no obvious N+1 or heavy work), scope (nothing unasked changed).',
        'Every dimension under 9 needs a fix: one problem, the exact change, the file and line, routed to stage backend, frontend, integrate or plan. P0 first, at most 12.',
      ].join('\n'),
    reply: '{"stage":"test-review","score":N,"pass":false,"summary":"…","dimensions":[{"id":"correct","score":N,"evidence":["…"]}],"must_pass":[{"id":"tests-pass","ok":true}],"fixes":[{"id":"F1","severity":"P0","stage":"backend","problem":"…","fix":"…","evidence":"file:line"}]}',
  },
  'nextDev.build/screening': {
    skills: 'team-review, arif-code-review',
    job: () =>
      'Screen the finished change as the client would use it: read build/*/report.md, the review verdict and the diff summary; spot-check three fixes marked done in the code. Ship, or return once with exact fixes. Write screening/client-note.md (3-5 plain lines).',
    reply: '{"stage":"screening","pass":true,"summary":"…","fixes":[],"client_note":"…"}',
  },
  'nextDev.build/final-qa': {
    skills: 'final-qa',
    job: () =>
      'Turn the brief and the plan\'s acceptance criteria into numbered requirements and prove each one from the project (a test you ran, a command output, a screenshot). Check nothing listed under "do not touch" changed (git diff). Pass only when every requirement is met.',
    reply: '{"stage":"final-qa","pass":true,"summary":"…","items":[{"id":"R1","requirement":"…","evidence":"…","status":"met"}],"fixes":[]}',
  },

  // ---- nextDesign.design ----
  'nextDesign.design/reference': {
    skills: 'design-reference-match, map-design, and the client brand kit',
    job: () =>
      [
        'Read every reference the client gave (designs, screenshots, sites) completely. For a website, capture it: full-page screenshots at 1440 and 390 px, and its tokens (colours, fonts, spacing) from the CSS.',
        'Make reference boards in 01-reference/boards/ (one PNG per reference with notes) and write 01-reference/design-spec.md with numbers: grid and widths, type scale and families, colour palette (hex), spacing scale, radii, shadows, imagery style, components worth keeping, what makes it feel good, and what to avoid.',
        'Write 01-reference/brand-facts.md: logo files, brand tokens and fonts, copy from the brief verbatim, and a brand-vs-reference conflicts table with your default decisions.',
      ].join('\n'),
    reply: '{"stage":"reference","summary":"…","references":N,"conflicts":["…"]}',
  },
  'nextDesign.design/concept': {
    skills: 'ui-ux-visual-designer, brand-identity-designer, creative, design-qa (rubric)',
    job: ({ direction }) =>
      [
        `Direction: ${direction === 'match' ? 'follow the references closely with the client\'s content and brand' : 'a fresh concept at the references\' quality'}.`,
        'Write 02-concept/CONCEPT.md: the idea in two sentences, page/screen list with the content of each, the layout system (grid, breakpoints), type and colour roles from the brand, components, imagery and motion notes, and the visuals Human Torch must make.',
        'Write 02-concept/rubric.json with the design-qa dimensions and this task\'s must-pass items (copy verbatim, every listed screen, breakpoints, contrast). At most 3 questions for the Ready check.',
      ].join('\n'),
    reply: '{"stage":"concept","summary":"…","screens":N,"questions":["…"]}',
  },
  'nextDesign.design/visuals': {
    skills: 'brand-identity-designer, ui-ux-visual-designer, creative, and the client brand kit',
    job: ({ round }) =>
      [
        'Make the brand visuals the concept asks for (hero art, illustrations, icons, patterns, social images) as SVG/PNG in site/assets/, using only brand tokens and the real logo files.',
        `Export a preview PNG of each to 03-visuals/v${round}/ and write 03-visuals/v${round}/notes.md (file, purpose, size).`,
      ].join('\n'),
    reply: `{"stage":"visuals","summary":"…","files":["…"],"fixes":[${FIX}]}`,
  },
  'nextDesign.design/design': {
    skills: 'ui-ux-visual-designer, frontend-design, dashboard-ui, interaction-design, ux-writing, accessibility-audit',
    job: ({ round }) =>
      [
        'Build every screen in the concept as real HTML/CSS in site/ (one file per screen, brand tokens as CSS variables, real fonts, the visuals from site/assets/).',
        `Screenshot each screen at 1440 and 390 px wide with a headless browser into 04-screens/v${round}/ (name: <screen>-1440.png, <screen>-390.png) and make 04-screens/v${round}/sheet.png with all of them.`,
        'Look at every screenshot and fix: hierarchy, alignment to the grid, contrast (WCAG AA), copy verbatim from the brief, nothing cut off on mobile.',
      ].join('\n'),
    reply: `{"stage":"design","summary":"…","screens":["…"],"fixes":[${FIX}]}`,
  },
  'nextDesign.design/design-qa': {
    skills: 'design-qa, design-critique, accessibility-audit, design-reference-match',
    job: ({ v }) =>
      [
        `Judge screens v${v} (04-screens/v${v}/) against the brief, the concept and the references. You did not design this. Open every screenshot.`,
        'Score out of 10 with evidence: reference (how well it follows or matches the references\' quality), hierarchy, type, brand (tokens, logo, voice), layout (grid, spacing, responsive), a11y (contrast, focus, alt text, tap targets), craft (pixel details, consistency), idea.',
        'Fixes P0 first, at most 12, each with the screen, the exact change in numbers, routed to concept, visuals or design.',
      ].join('\n'),
    reply: '{"stage":"design-qa","score":N,"pass":false,"summary":"…","dimensions":[{"id":"hierarchy","score":N,"evidence":["…"]}],"must_pass":[{"id":"copy-verbatim","ok":true}],"fixes":[{"id":"F1","severity":"P1","stage":"design","scene":"home-390","problem":"…","fix":"…","evidence":"path"}]}',
  },
  'nextDesign.design/screening': {
    skills: 'team-review, design-critique',
    job: () => 'Screen the screens as the client would see them (sheet.png first, then mobile). Spot-check three fixes marked done. Ship, or return once with exact fixes. Write screening/client-note.md.',
    reply: '{"stage":"screening","pass":true,"summary":"…","fixes":[],"client_note":"…"}',
  },
  'nextDesign.design/final-qa': {
    skills: 'final-qa, accessibility-audit',
    job: () =>
      'Turn the brief into numbered requirements (every screen, size, format, copy line, brand rule) and prove each one from the files (screenshot path, HTML checked, contrast measured). Pass only when every requirement is met.',
    reply: '{"stage":"final-qa","pass":true,"summary":"…","items":[{"id":"R1","requirement":"…","evidence":"…","status":"met"}],"fixes":[]}',
  },

  // ---- NextMarketer.campaign ----
  'NextMarketer.campaign/research': {
    skills: 'market-research, deep-research, humanizer',
    job: () =>
      'Research the product, the customer, the competitors and the platforms in the brief. Cite every fact with its source URL. Write 01-research/research.md: customer pains and words they use, competitor messages and offers (a table), what works on each platform now, gaps to own, and facts the copy may use (each with a source).',
    reply: '{"stage":"research","summary":"…","sources":N}',
  },
  'NextMarketer.campaign/strategy': {
    skills: 'marketing-strategy, team-review',
    job: () =>
      'Write 02-strategy/STRATEGY.md: objective and KPI, audience, positioning line, three key messages with proof from the research, offer and call to action, channel plan (what goes where and when), budget split if a budget was given, and the tone. Write 02-strategy/rubric.json with the marketing-qa dimensions and must-pass items (facts sourced, brand voice, every briefed channel). At most 3 questions for the Ready check.',
    reply: '{"stage":"strategy","summary":"…","messages":["…"],"channels":["…"],"questions":["…"]}',
  },
  'NextMarketer.campaign/copy': {
    skills: 'copywriting, humanizer, ux-writing, and the client brand kit',
    job: ({ round }) =>
      `Write all the campaign copy the strategy needs in 03-copy/v${round}/copy.md: headlines (5 options each, one recommended), body copy, CTAs, email or landing copy as briefed. Brand voice, no invented facts (only the research's sourced facts), no banned words. Run the humanizer checks on every piece.`,
    reply: `{"stage":"copy","summary":"…","pieces":N,"fixes":[${FIX}]}`,
  },
  'NextMarketer.campaign/content': {
    skills: 'social-content, prompt-master, copywriting, and the client brand kit',
    job: ({ v }) =>
      `Turn the copy into a social content calendar for the briefed platforms: 04-content/v${v}/calendar.md (date, platform, format, caption, hashtags, visual brief). Make the key post visuals as PNG in 04-content/v${v}/ from brand tokens and real logos (HTML rendered to PNG is fine), sized per platform.`,
    reply: `{"stage":"content","summary":"…","posts":N,"fixes":[${FIX}]}`,
  },
  'NextMarketer.campaign/seo-ads': {
    skills: 'seo-ads, deep-research',
    job: ({ v }) =>
      `Write 05-search/v${v}/search-ads.md: target keywords with intent and a priority, page titles and meta descriptions, search ad groups (headlines within 30 characters, descriptions within 90), negative keywords, and how to measure. Cite where keyword ideas came from.`,
    reply: `{"stage":"seo-ads","summary":"…","keywords":N,"ad_groups":N,"fixes":[${FIX}]}`,
  },
  'NextMarketer.campaign/marketing-qa': {
    skills: 'marketing-qa, humanizer',
    job: ({ v }) =>
      [
        `Judge the campaign (copy, content v${v}, search) against the brief and strategy. You did not write it.`,
        'Score out of 10 with evidence: strategy (fits the objective), message (clear, one idea per piece), voice (brand and tone), accuracy (every fact sourced, nothing invented), channel (right format per platform, limits respected), search (keywords and ads sound), cta (clear next step), polish (no typos, natural language).',
        'Fixes P0 first, at most 12, each with the exact rewrite, routed to strategy, copy, content or seo-ads.',
      ].join('\n'),
    reply: '{"stage":"marketing-qa","score":N,"pass":false,"summary":"…","dimensions":[{"id":"message","score":N,"evidence":["…"]}],"must_pass":[{"id":"facts-sourced","ok":true}],"fixes":[{"id":"F1","severity":"P1","stage":"copy","problem":"…","fix":"…"}]}',
  },
  'NextMarketer.campaign/screening': {
    skills: 'team-review',
    job: () => 'Read the campaign as the client and as their customer. Spot-check three fixes marked done. Ship, or return once with exact rewrites. Write screening/client-note.md.',
    reply: '{"stage":"screening","pass":true,"summary":"…","fixes":[],"client_note":"…"}',
  },
  'NextMarketer.campaign/final-qa': {
    skills: 'final-qa, humanizer',
    job: () =>
      'Turn the brief into numbered requirements (every channel, piece, length limit, CTA, fact) and prove each one from the files; check every fact has a source and nothing is invented. Pass only when every requirement is met.',
    reply: '{"stage":"final-qa","pass":true,"summary":"…","items":[{"id":"R1","requirement":"…","evidence":"…","status":"met"}],"fixes":[]}',
  },
};

export const TEAM_PERSONAS: Record<string, string> = {
  'maria-hill': 'You plan precisely and change nothing until the plan is approved.',
  'iron-man': 'You lead the dev team: you ship only what you would put your name on.',
  hulk: 'You make the whole thing work end to end, and you do not stop at the first green test.',
  'spider-man': 'You build interfaces people enjoy, with every state handled.',
  'black-panther': 'You build the backend like a fortress: correct, secure and simple.',
  vision: 'You review code with total honesty: tests you ran, lines you read, nothing assumed.',
  'mister-fantastic': 'You lead design: a clear idea, solved completely.',
  'silver-surfer': 'You study references until you can name every number that makes them work.',
  'invisible-woman': 'You build screens that feel effortless because every detail is considered.',
  'human-torch': 'You make the visuals that give a brand its fire, always on brand.',
  'the-thing': 'You test designs hard: contrast, grid, copy and craft, with evidence.',
  superman: 'You lead marketing with a clear strategy and honest promises.',
  'lois-lane': 'You dig for the truth and cite every fact.',
  flash: 'You write copy that is fast to read and hard to forget.',
  aquaman: 'You make social content that fits each platform like water.',
  'green-lantern': 'You turn search intent into keywords and ads that pay off.',
  'martian-manhunter': 'You read every word as the customer would, and you catch every invented fact.',
};
