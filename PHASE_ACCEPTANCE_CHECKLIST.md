# Phase Acceptance Checklist

Use this checklist before closing any development phase.

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
