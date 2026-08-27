# Phase Acceptance Checklist

Use this checklist before closing any development phase.

## Phase 1 — DATA Model and Runtime Contract

The DATA contract was already substantially implemented and validated on the
accepted Phase 0 baseline. Phase 1 completed the remaining acceptance and
branding alignment work on `phase/1-data-contract`; no authored DATA content
or schema design was changed.

### Acceptance

- [x] Canonical strict Zod schemas and unknown-field rejection verified
- [x] Manifest consistency, cross-references, unique IDs, valid dates/times,
      chronology, and transport enums verified
- [x] `npm run validate:data` passes, including translation-key parity
- [x] Regression, unit, E2E, and accessibility tests pass
- [x] Production build passes
- [x] Local application and Netlify production routes manually validated
- [x] Branding aligned from `Voya` to `Volala`
- [x] Environment audit confirms no variables or API keys are required
- [x] No DATA content was changed and no schema redesign was required
- [x] Phase 1 acceptance documentation updated

## Phase 2 — Core Domain Logic

### Acceptance

- [x] Local device date and midnight behavior verified
- [x] PAST / TODAY / FUTURE behavior verified
- [x] Chronological item ordering verified
- [x] Deterministic CURRENT resolution verified
- [x] Deterministic UP NEXT resolution verified
- [x] DONE, SKIP, and UNDO transitions verified
- [x] Day-level progress and manual overrides verified
- [x] Existing localStorage progress persistence verified
- [x] Today and manually opened day UI behavior verified
- [x] Regression coverage completed for domain boundaries and transitions
- [x] Deterministic timestamp issue fixed
- [x] Phase 2 acceptance completed at version `0.2.0`
- [x] Phase 3 acceptance was pending at the time of Phase 2 closure

### Validation

- [x] Typecheck, lint, DATA validation, unit tests, coverage, E2E tests, and
      production build pass
- [x] Netlify SPA routes return HTTP 200
- [x] `format:check` and `verify` retain only the known pre-existing Windows
      line-ending warnings; no unrelated files were normalized
- [x] No DATA, schema, dependency, persistence, environment, or deployment
      changes were required

Phase 2 remains version `0.2.0` on its Phase Branch. The next Phase version,
`0.3.0`, is created only after this Phase Branch is accepted and merged into
`master`.

## Phase 3 - Application Shell and Navigation

### Implementation and automated validation

- [x] Existing shell, header, bottom navigation, Today, Days, Search, Settings,
      and day routes preserved
- [x] Multiple-itinerary selection implemented
- [x] Valid active itinerary restoration implemented
- [x] Stale active itinerary IDs return to selection
- [x] Selected itinerary drives all itinerary-dependent views
- [x] Invalid day route regression covered
- [x] Browser back/forward regression covered
- [x] Direct route refresh regression covered
- [x] Mobile viewport and horizontal-overflow regression covered
- [x] English/Romanian selection copy added
- [x] Version remains `0.3.0`
- [x] No authored DATA, schema, dependency, or environment changes
- [x] Typecheck, lint, DATA validation, unit tests, coverage, E2E tests, and
      production build pass
- [x] `git diff --check` passes
- [x] Known repository-wide formatting baseline remains documented; no Phase 3
      source formatting defect was identified

### Manual validation

- [x] Desktop shell and navigation manually validated
- [x] Direct URL and refresh flows manually validated
- [x] Mobile selection screen and responsive layout manually validated
- [x] Manual desktop and mobile validation: PASS

### Acceptance status

- [x] Phase 3 acceptance complete
- [x] Gate 3: Navigation PASS
- [x] Ready for PR

## Phase 4 - Today and Day Experience

### Implementation and automated validation

- [x] Timeline renders authored Location and Transport Items chronologically
- [x] CURRENT and UP NEXT behavior remains deterministic and Today-only
- [x] Visit duration and metric transport details render when authored
- [x] Transport Items have no progress controls
- [x] DONE, SKIP, UNDO, and day progress remain correct
- [x] Google Maps links and manual day navigation remain correct
- [x] CURRENT auto-scroll is guarded and respects reduced motion
- [x] Focused unit and E2E acceptance coverage passes
- [x] Typecheck, lint, formatting, DATA validation, unit tests, coverage, E2E
      tests, production build, and repository verification pass
- [x] No DATA or schema changes were required
- [x] Version is `0.4.0` on the Phase 4 branch

### Manual validation

- [x] Desktop Today and Day experience browser-validated
- [x] Mobile Today and Day experience browser-validated
- [x] Keyboard focus, accessible names, and reduced-motion behavior validated
- [x] No Phase 4 console errors, overflow, clipping, or visible regressions

### Acceptance status

- [x] Phase 4 acceptance complete
- [x] Gate 4: Core UX PASS

## Phase 5 - Search, Settings, Localization, and Install Awareness

### Implementation and automated validation

- [x] Search remains active-itinerary and day-oriented
- [x] Settings and persisted RO/EN language remain available
- [x] Informational install prompt is shown once for eligible new users
- [x] Prompt dismissal and Settings navigation persist `tripwise.installPromptSeen`
- [x] Installed standalone PWAs do not show the awareness prompt
- [x] Prompt uses RO/EN translations without translating DATA
- [x] Prompt directs users to `/settings` and never invokes installation directly
- [x] Existing Settings PWA installation control remains unchanged
- [x] Bottom navigation has readable labels, equal-width touch areas, clear
      active/hover/pressed states, focus indication, and safe-area spacing
- [x] Application icon asset replaced and referenced by favicon and manifest
- [x] Focused unit, E2E, and accessibility coverage passes
- [x] No DATA, schema, or dependency changes were required
- [x] Version is `0.5.0` on the Phase 5 branch

### Manual validation

- [ ] Desktop prompt placement and wording validated
- [ ] Mobile prompt layout, touch targets, and bottom navigation validated
- [ ] Keyboard focus and accessible semantics validated
- [ ] Existing Settings installation flow validated in an install-capable browser
- [ ] Offline behavior remains unchanged
- [ ] Bottom navigation desktop and mobile visual acceptance validated
- [ ] New application icon visually validated in supported desktop/mobile/PWA

### Acceptance status

- [ ] Phase 5 acceptance complete
- [ ] Gate 5: Utility UX PASS

## Automated

- [ ] Relevant unit tests pass
- [ ] Relevant integration tests pass
- [ ] Relevant E2E tests pass
- [ ] `npm run validate:data` passes when DATA is involved
- [ ] `npm run build` passes when the application is involved
- [ ] Regression tests pass

## Manual

- [ ] Phase acceptance criteria verified
- [ ] Critical user flows verified
- [ ] Desktop behavior verified
- [ ] Mobile behavior verified
- [ ] Error states verified where applicable
- [ ] Offline behavior verified where applicable
- [ ] Accessibility/reduced-motion behavior verified where applicable

## Quality Gate

- [ ] No known blocking defects
- [ ] No undocumented product behavior introduced
- [ ] No undocumented DATA fields introduced
- [ ] Development was performed on the dedicated Phase Branch
- [ ] Any Task Branches were merged into the Phase Branch, not directly into `master`
- [ ] The Phase Branch was created from the latest accepted `master` state
- [ ] Git/branch and Pull Request requirements satisfied
- [ ] GitHub Actions Quality Gate passes
- [ ] Required documentation updated
- [ ] All Phase Quality Gate requirements passed before merge
- [ ] The Phase Branch was squash-merged into `master`
- [ ] The Phase Branch can be deleted after successful merge
- [ ] Phase marked PASS

A phase must not be closed until all applicable checks pass.
