# Tasks

## 1. Policy evaluator

- [x] 1.1 Add Level 1 conditions, thresholds, policy version, and safety tokens
- [x] 1.2 Persist shadow decisions without updating moderation status
- [x] 1.3 Wire shadow evaluation into the default finalize adapter
- [x] 1.4 Add unit tests for at/above/below each threshold

## 2. Evidence and slice coverage

- [x] 2.1 Add integration coverage that stores a proposal without mutation
- [x] 2.2 Add a shadow-slice E2E for ready, incomplete, duplicate, and sensitive candidates
- [x] 2.3 Add CAI-255 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-255 implementation.
- Archive the change after the pull request merges.
