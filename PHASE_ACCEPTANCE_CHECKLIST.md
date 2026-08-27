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
- [x] Phase 3 has not started

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
