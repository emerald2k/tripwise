# Development Roadmap and Quality Gates

Tripwise is developed in phases. Each phase delivers one major application milestone.

A phase is not complete when implementation is finished. A phase can be closed only after automated testing, manual validation, regression validation, and the phase acceptance criteria all pass.

## Current Status

Current phase: **Phase 1 — DATA MODEL & RUNTIME CONTRACT**

Phase 0:

- automated validation: PASS;
- manual validation: PASS;
- Gate 0: PASS.

Phase 1:

- implementation: PASS;
- DATA validation: PASS;
- unit tests: PASS;
- production build: PASS;
- old schema references: PASS;
- DATA files: PASS;
- manual validation: PASS;
- branding alignment: PASS (`Voya` → `Volala`);
- environment configuration audit: PASS (no variables required);
- Gate 1: PASS after acceptance documentation.

## Standard Phase Lifecycle

```text
Implementation
    ↓
Automated validation
    ↓
Manual validation
    ↓
Bug fixing
    ↓
Automated regression validation
    ↓
Manual regression validation
    ↓
Quality Gate
    ↓
Next Phase
```

No phase may be closed with a known blocking defect or an unvalidated acceptance criterion.

## Quality Gate

Every phase must satisfy:

- implementation complete;
- automated tests pass;
- DATA validation passes when applicable;
- production build passes when applicable;
- implementation validation passes;
- manual validation passes;
- automated regression validation passes;
- manual regression validation passes;
- acceptance review passes;
- GitHub Actions Quality Gate passes;
- no known blocking defects;
- phase acceptance criteria are satisfied.

## Git Governance

Tripwise uses a lightweight GitHub Flow model with short-lived branches.
`master` is the stable, releasable, and only permanent development branch.
Development must not happen directly on `master`. All other branches are
deleted after merge.

Every Development Phase must be implemented on its own dedicated Phase
Branch. A Phase Branch is created from the latest accepted state of `master`.
All work belonging to that Phase is completed on the Phase Branch, either
directly or through optional short-lived Task Branches.

Phase Branches use this naming convention:

```text
phase/<phase-number>-<short-name>
```

Examples include `phase/0-foundation`, `phase/1-data-contract`,
`phase/2-domain-behavior`, `phase/3-navigation`, `phase/4-core-ux`,
`phase/5-persistence`, `phase/6-pwa`, `phase/7-production-readiness`, and
`phase/8-release`.

Task Branches are optional and use these prefixes:

```text
feature/*
fix/*
test/*
refactor/*
chore/*
docs/*
perf/*
build/*
ci/*
```

Branch names must be lowercase, short, descriptive, and hyphen-separated.
Examples include `feature/compact-timeline`, `fix/empty-itinerary`,
`test/timeline-e2e`, `chore/ci-quality-gate`, `docs/development-roadmap`, and
`refactor/app-components`. Task Branches must be merged into their
corresponding Phase Branch, never directly into `master`. Do not introduce a
permanent `develop` branch, release branches, or hotfix branches.

Commits use Conventional Commits. Approved types are `feat`, `fix`, `chore`,
`docs`, `test`, `refactor`, `perf`, `build`, `ci`, and `revert`. Commitlint
validates commit messages locally. Messages must be specific and focused;
vague messages such as `changes`, `update`, `stuff`, `misc`, or `work` are
not acceptable.

The standard change flow is:

```text
master
    ↓
create dedicated Phase Branch
    ↓
implement Phase
    ↓
optional Task Branches
    ↓
merge Task Branches into Phase Branch
    ↓
automated validation
    ↓
manual validation
    ↓
fix defects
    ↓
automated regression validation
    ↓
manual regression validation
    ↓
acceptance review
    ↓
npm run verify
    ↓
GitHub Actions Quality Gate
    ↓
Phase accepted
    ↓
Squash Merge Phase Branch into master
    ↓
delete branch
    ↓
release if applicable
    ↓
create next Phase Branch from accepted master
```

A Phase Branch must not be merged into `master` before its Quality Gate has
passed. Phase Branches are temporary and must be deleted after successful
merge. Task Branches are optional temporary workspaces for individual
features, fixes, tests, refactors, or other focused changes.

The local hooks have focused responsibilities:

- `pre-commit` runs `lint-staged`;
- `commit-msg` runs Commitlint;
- `pre-push` runs `npm run verify`.

Husky is a local quality mechanism and does not replace the GitHub Actions
Quality Gate.

The preferred merge strategy is **squash merge**. It keeps `master` readable
while preserving the detailed development history in the Pull Request and
short-lived branch.

Releases use Semantic Versioning (`MAJOR.MINOR.PATCH`) and must be created
from green `master`. The version is sourced from `package.json` and changes
only when an accepted Phase Branch is merged into `master`: a normal Phase
acceptance increments MINOR, non-Phase bug fixes or maintenance increment
PATCH, and intentionally breaking changes increment MAJOR. Commits made on a
Phase Branch and creating a Phase Branch do not change the version. Releases
should be frequent and should not use release branches.

Phases, Phase Branches, Task Branches, and releases are different concepts:

- a **Phase** is a product/development milestone;
- a **Phase Branch** is the dedicated Git workspace for that Phase;
- a **Task Branch** is an optional short-lived workspace for focused work;
- a **Release** is a versioned product state created from accepted `master`.

For example, Phase 3 uses `phase/3-navigation`, with optional
`feature/compact-timeline` and `test/timeline-e2e` branches merged into it.
After the Phase Quality Gate passes, the Phase Branch is squash-merged into
`master`, deleted, and a later release may be created.

The GitHub repository should manually protect `master` by requiring Pull
Requests, the GitHub Actions Quality Gate, and an up-to-date branch where
appropriate. Direct pushes and force pushes should be disabled, branch
deletion should be disabled for `master`, and administrators should not
routinely bypass required checks. These settings are repository
administration tasks and are not configured automatically by this project.

Because the project currently has no meaningful published Git history, the
initial repository history must be created incrementally rather than through
one large bulk commit. The first commit should establish the appropriate
project foundation. Later commits should introduce documentation, DATA/domain
implementation, testing, quality tooling, Git hooks, CI, and other milestones
in logical stages. This principle does not prescribe commit hashes or claim
that future commits already exist.

## Phase 0. Project Foundation

Milestone: repository ready for controlled development.

Scope:

- Vite + React + TypeScript;
- npm project and dependency lockfile;
- repository structure;
- Git configuration;
- `.gitignore`;
- SRS;
- README;
- Copilot instructions;
- Vitest;
- Playwright;
- Netlify configuration;
- initial DATA package.

Validation:

- `npm install`;
- `npm run build`;
- `npm test`;
- `npm run validate:data`;
- `npm run test:e2e`;
- manual application startup and browser access.

Gate 0: Foundation PASS.

## Phase 1. DATA Model and Runtime Contract

Milestone: DATA layer is authoritative and validated.

Scope:

- `src/data/schema.ts` is the only canonical DATA schema;
- manifest-driven DATA loading;
- strict Zod validation;
- itinerary validation;
- city validation;
- location references;
- ID uniqueness;
- date/time validation;
- transport validation;
- Location Item / Transport Item union;
- `validate:data`.

Copilot must not redesign or modify authored DATA content unless explicitly instructed.

Automated validation:

- schema tests;
- malformed DATA;
- unknown fields;
- invalid enum values;
- broken `locationId`;
- duplicate IDs;
- invalid dates/times;
- invalid transport items.

Manual validation:

- inspect DATA;
- confirm all authored days and locations remain represented;
- confirm the application can load the itinerary.

Gate 1: DATA Contract PASS.

## Phase 2. Core Domain Logic

Milestone: Tripwise understands time, days, and progress.

Scope:

- local date;
- PAST / TODAY / FUTURE;
- chronological ordering;
- CURRENT;
- UP NEXT;
- DONE;
- SKIP;
- UNDO;
- day progress;
- All Done;
- manual intervention;
- current item resolution.

Core rule:

> Time defines the current objective when the user has not intervened.

The application must not introduce lateness, schedule adherence, scoring, or automatic completion.

Automated validation:

- focused Vitest coverage;
- deterministic CURRENT transitions;
- progress state transitions;
- edge cases.

Manual validation:

- date/time scenarios;
- CURRENT;
- DONE;
- SKIP;
- UNDO;
- reload persistence where applicable.

Gate 2: Domain Behavior PASS.

## Phase 3. Application Shell and Navigation

Milestone: complete application skeleton.

Scope:

- application shell;
- header;
- navigation;
- Today;
- Days;
- Search;
- Settings;
- Day routes;
- itinerary selection.

Branding:

- product/engine: `tripwise`;
- current application brand: `Voya`;
- branding is configuration-driven.

Automated validation:

- routes;
- navigation;
- not-found behavior;
- itinerary selection.

Manual validation:

- all pages;
- browser back/forward;
- refresh;
- mobile viewport.

Gate 3: Navigation PASS.

## Phase 4. Today and Day Experience

Milestone: core travel-guide experience complete.

Scope:

- timeline;
- CURRENT;
- UP NEXT;
- Location Items;
- Transport Items;
- Google Maps links;
- visit duration;
- DONE/SKIP;
- UNDO;
- day progress;
- CURRENT auto-scroll;
- manual day navigation.

Rules:

- DATA is rendered, not regenerated;
- transport items are rendered inline;
- only progress-enabled Location Items expose progress controls;
- no duplicate CURRENT card;
- no lateness calculation.

Automated validation:

- Today;
- Day;
- CURRENT;
- progress;
- transport rendering;
- external location links.

Manual validation:

- each item type;
- each progress state;
- scrolling;
- mobile;
- links;
- timeline behavior.

Gate 4: Core UX PASS.

## Phase 5. Search, Settings, and Localization

Milestone: user-facing utility features complete.

Scope:

- Fuse.js search;
- search within active itinerary;
- results navigate to days;
- Settings page;
- RO / EN;
- persisted language;
- DATA remains untranslated.

Automated validation:

- search;
- language persistence;
- reload;
- translation key validation.

Manual validation:

- RO → EN;
- EN → RO;
- refresh;
- search;
- result navigation.

Gate 5: Utility UX PASS.

## Phase 6. Local Persistence

Milestone: user progress survives sessions.

Persist only:

- `activeItineraryId`;
- `language`;
- progress.

Progress contains only item IDs and statuses.

Statuses:

- `done`;
- `skipped`.

Missing status means pending.

Do not use Redux, Zustand, IndexedDB, a backend, or a database.

Automated validation:

- persistence;
- reload;
- malformed localStorage;
- missing values;
- multiple itineraries.

Manual validation:

- DONE → refresh;
- SKIP → refresh;
- UNDO;
- itinerary changes;
- language changes.

Gate 6: Persistence PASS.

## Phase 7. PWA and Offline

Milestone: Tripwise works reliably without connectivity.

Scope:

- Web App Manifest;
- Service Worker;
- Cache Storage;
- offline indicator;
- application asset caching;
- DATA caching;
- validated DATA cache replacement.

Cache update rule:

```text
new DATA
   ↓
Zod validation
   ├── PASS → replace cache
   └── FAIL → keep previous valid DATA
```

Automated validation:

- service worker;
- cache;
- offline behavior;
- invalid DATA update;
- fallback to previous DATA.

Manual validation:

- installation;
- offline mode;
- offline reload;
- offline navigation;
- existing progress offline;
- reconnect.

Gate 7: Offline/PWA PASS.

## Phase 8. Production UX and Error Handling

Milestone: application safe for real users.

Scope:

- production error boundaries;
- user-facing errors;
- development-only technical errors;
- `VITE_DEBUG`;
- no stack traces in production;
- no raw JSON/Zod errors in production;
- graceful missing DATA;
- graceful unsupported browser capabilities;
- accessibility pass;
- reduced motion.

Development may expose technical diagnostics when debug mode is enabled.

Production must expose concise user-facing errors.

Automated validation:

- production error behavior;
- development debug behavior;
- malformed DATA;
- missing DATA;
- browser capability fallbacks.

Manual validation:

- intentionally broken DATA;
- offline;
- unsupported features;
- mobile;
- keyboard;
- accessibility.

Gate 8: Production UX PASS.

## Phase 9. Full System Validation

Milestone: feature-complete release candidate.

No major new features are introduced during this phase.

Validation:

- DATA validation;
- unit tests;
- integration tests;
- E2E tests;
- PWA tests;
- manual QA;
- responsive QA;
- accessibility QA;
- production build.

Critical end-to-end flow:

```text
Open app
→ select itinerary
→ Today
→ CURRENT
→ navigate day
→ DONE
→ SKIP
→ UNDO
→ Search
→ Settings
→ change language
→ reload
→ go offline
→ continue using app
```

Validation matrix should include supported desktop/mobile browsers and online/offline states.

Gate 9: Release Candidate PASS.

## Phase 10. Production Preparation

Milestone: production deployment ready.

Scope:

- production build;
- production environment configuration;
- production branding;
- Voya configuration;
- Netlify configuration;
- SPA fallback;
- Service Worker production behavior;
- manifest;
- icons;
- metadata;
- production error handling;
- final DATA;
- final validation.

Required commands:

```text
npm run validate:data
npm test
npm run test:e2e
npm run build
```

A deployment preview must pass the relevant manual checks.

Gate 10: Production Ready.

## Phase 11. Production Deployment

Milestone: Voya is live.

Deployment flow:

```text
GitHub
   ↓
Netlify
   ↓
Voya
```

Current deployment target:

```text
https://voya.netlify.app
```

Post-deployment checks:

- application load;
- SPA routes;
- refresh;
- DATA loading;
- Today;
- Search;
- Settings;
- language;
- progress persistence;
- PWA installation;
- offline behavior;
- Google Maps links;
- Share/Copy Link;
- no development diagnostics exposed.

Gate 11: Production PASS.

## Phase 12. Post-Production Verification

Milestone: production deployment confirmed stable.

Run a real production smoke test against the deployed application.

Verify:

- production build;
- production DATA;
- Service Worker;
- Cache Storage;
- offline behavior;
- routing;
- localStorage;
- external links;
- PWA;
- core user journeys.

If a production defect is found:

```text
Production
   ↓
Bug
   ↓
Fix
   ↓
Relevant automated validation
   ↓
Relevant manual validation
   ↓
Redeploy
```

Production deployment success alone does not mean the project is complete.
