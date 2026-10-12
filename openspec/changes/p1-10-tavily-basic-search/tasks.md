# Tasks

## 1. Search contract

- [x] 1.1 Add query groups, daily/monthly caps, and result normalization
- [x] 1.2 Add a basic-search client that degrades without throwing
- [x] 1.3 Persist `TrendSignal` and search logs from the trends adapter
- [x] 1.4 Add unit tests for duplicates, malformed items, and caps

## 2. Database and process evidence

- [x] 2.1 Add mocked HTTP/persistence integration coverage
- [x] 2.2 Add a trends-stage E2E for success then quota exhaustion
- [x] 2.3 Add CAI-254 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-254 implementation.
- Archive the change after the pull request merges.
