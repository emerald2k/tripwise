# Tripwise Copilot Instructions

SRS.md is the product specification and source of truth.

tripwise is the reusable white-label travel-guide product/engine.
The current application brand is Voya.
Do not hardcode Voya into core application logic.

DATA is authored product content. Do not invent, redesign, translate, or modify DATA unless explicitly instructed.

The canonical DATA contract is `src/data/schema.ts`.
Do not create competing DATA schemas.

Keep the implementation KISS.
Do not introduce backend services, databases, CMS functionality, runtime tenant systems, or state-management libraries unless explicitly required by SRS.md.

Progress is local.
The application is client-only.

Git governance is lightweight GitHub Flow:

- every Development Phase must use a dedicated lowercase `phase/` Phase
  Branch created from the latest accepted `master` state;
- do not develop Phase work directly on `master`;
- use optional short-lived lowercase Task Branches with approved prefixes:
  `feature/`, `fix/`, `test/`, `refactor/`, `chore/`, `docs/`, `perf/`,
  `build/`, or `ci/`;
- merge Task Branches into their corresponding Phase Branch, never directly
  into `master`;
- do not create or switch branches unless explicitly instructed by the user;
- follow Conventional Commits;
- do not commit or push without explicit user authorization;
- do not rewrite Git history;
- run appropriate validation and respect phase Quality Gates;
- never merge a Phase Branch into `master` before its Quality Gate passes;
- do not bypass Quality Gates;
- preserve DATA integrity;
- update relevant documentation when requirements, architecture, DATA,
  testing, Quality Gates, CI, releases, or deployment change;
- keep changes focused and follow KISS.

Development is milestone-based. Do not consider a phase complete until its Quality Gate has passed.

For every phase:

1. implement the requested scope;
2. run automated validation;
3. perform manual validation;
4. fix defects;
5. rerun automated regression validation;
6. rerun relevant manual validation;
7. report the Quality Gate status.

Do not silently change product requirements to make tests pass.

When a requirement is ambiguous, prefer the smallest implementation consistent with SRS.md and stop for confirmation when the ambiguity changes product behavior or the DATA contract.

Technical errors such as stack traces, raw JSON errors, Zod details, and debug diagnostics are development-only when `VITE_DEBUG` is enabled. Do not expose them to production users.

Never add an undocumented DATA field just to simplify rendering.
