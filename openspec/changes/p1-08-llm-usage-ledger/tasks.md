# Tasks

## 1. Ledger contract

- [x] 1.1 Add `LlmUsage` schema, additive migration, and redacted cost mapping
- [x] 1.2 Record usage from the central OpenAI provider and block on persist failure
- [x] 1.3 Persist through a repository sink and attach ledger totals to slice summaries
- [x] 1.4 Add unit tests for pricing, rounding, and redacted metadata

## 2. Database and process evidence

- [x] 2.1 Add a mocked-provider integration test that writes one usage row
- [x] 2.2 Add a capped fixture analysis E2E whose summary matches the ledger
- [x] 2.3 Add CAI-251 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-251 implementation.
- Archive the change after the pull request merges.
