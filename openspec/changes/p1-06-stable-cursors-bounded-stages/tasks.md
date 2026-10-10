# Tasks

## 1. Cursor and unit contract

- [x] 1.1 Implement the `(createdAt, id)` codec, keyset window helper, deadline signal, and production unit-cap resolver
- [x] 1.2 Implement the bounded unit runner that checkpoints only committed work
- [x] 1.3 Add unit tests for equal timestamps, deleted records, empty windows, failed units, caps, and deadlines

## 2. Database and process evidence

- [x] 2.1 Add a mutating-dataset PostgreSQL integration test on host port 55435
- [x] 2.2 Add an interrupted-process E2E test that resumes after a checkpoint without duplicate writes
- [x] 2.3 Add CAI-250 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-250 implementation.
- Archive the change after the pull request merges.
