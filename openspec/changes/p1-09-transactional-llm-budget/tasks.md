# Tasks

## 1. Reservation contract

- [x] 1.1 Add `LlmBudgetReservation`, estimates, and a clamped USD 30 ceiling
- [x] 1.2 Reserve before paid provider calls and settle or expire afterwards
- [x] 1.3 Pause paid slice stages on rejection and continue deterministic stages
- [x] 1.4 Add unit tests for precision, month boundary, and ceiling clamp

## 2. Database and process evidence

- [x] 2.1 Add concurrent PostgreSQL reservation integration coverage
- [x] 2.2 Add a low-ceiling slice E2E that reports `paused_budget`
- [x] 2.3 Add CAI-253 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-253 implementation.
- Archive the change after the pull request merges.
