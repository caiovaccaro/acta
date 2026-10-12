# Tasks

## 1. Notification templates and Resend adapter

- [x] 1.1 Add redacted receipt and digest templates with production/admin links
- [x] 1.2 Add a timeout-bounded Resend adapter that never logs destinations
- [x] 1.3 Add unit tests for subjects, aggregates, links, and redaction

## 2. Persistence and slice coverage

- [x] 2.1 Add `PipelineNotification` and record attempts after run status commits
- [x] 2.2 Add integration coverage for Resend acceptance, rejection, and timeout
- [x] 2.3 Add a receipt E2E for success and forced terminal failure
- [x] 2.4 Add CAI-256 scripts, Linear fixture, verification manifest, and Linux CI steps

## 3. Pull request verification

- [ ] 3.1 Run unit, integration, E2E, regression, strict OpenSpec, and `verify:pr-ready`
- [ ] 3.2 Open the comprehensive PR and loop required checks without merging

## Workflow follow-up

- Do not merge the PR as part of CAI-256 implementation.
- Archive the change after the pull request merges.
