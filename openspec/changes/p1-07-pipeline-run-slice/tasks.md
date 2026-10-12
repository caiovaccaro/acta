# Tasks

## 1. Slice contract

- [x] 1.1 Implement flag parsing, production caps, and terminal configuration failure
- [x] 1.2 Implement stage order, adapter contract, decision table, and default adapters
- [x] 1.3 Implement lease, heartbeat, checkpoint, summary, and `pipeline:run-slice`
- [x] 1.4 Add unit tests for outcomes, deadlines, heartbeat states, and status codes

## 2. Database and process evidence

- [x] 2.1 Add a repository integration test for pause and recoverable failure
- [x] 2.2 Add a killed-run E2E that resumes and completes a coherent summary
- [x] 2.3 Add CAI-249 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-249 implementation.
- Archive the change after the pull request merges.
