# Tasks

## 1. Matcher and allocator

- [x] 1.1 Add deterministic URL, title/domain, and topic-alias matching
- [x] 1.2 Add 40/30/15/15 scoring, 70/30 allocation, and budget-derived caps
- [x] 1.3 Persist unique matches from the `tavily_priority` adapter
- [x] 1.4 Add unit tests for matches, scores, queues, and effective caps

## 2. Stage selection evidence

- [x] 2.1 Add capped extraction/analysis integration coverage
- [x] 2.2 Add a repeated-slice E2E under a low budget cap
- [x] 2.3 Add CAI-258 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-258 implementation.
- Archive the change after the pull request merges.
