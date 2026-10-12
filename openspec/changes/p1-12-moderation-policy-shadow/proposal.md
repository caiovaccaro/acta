# Proposal

## Why

CAI-255 makes Level 1 topic auto-approval explainable and conservative by
evaluating every condition in shadow mode before any publication-state mutation
is allowed.

## What Changes

- Add a versioned Level 1 policy evaluator with environment-backed thresholds.
- Persist each condition result and the decision as an auditable proposal.
- Hold safety-sensitive, incomplete, duplicate, and missing-evidence candidates
  pending.
- Keep `AUTO_APPROVE_TOPICS` from mutating `moderationStatus` in this change.
- Add unit, evidence integration, shadow-policy E2E, and regression tests.

## Capabilities

### New Capabilities

- `moderation-policy-shadow`: Level 1 evaluation, stored evidence, and
  shadow-mode proposals that never mutate status.

### Modified Capabilities

- `pipeline-run-slice`: Default finalize records shadow proposals beside the
  email-out-of-scope receipt.

## Impact

- **Linear issue:** CAI-255.
- **Affected systems:** `@acta/core` policy evaluator, Prisma decision table,
  finalize adapter, Linux CI, and pipeline docs.
- **Security:** Safety-sensitive token matches stay pending. Policy cannot
  bypass the budget guard. Shadow mode cannot approve topics.
- **Cost:** Tests use disposable PostgreSQL only.
- **Rollback:** Revert application code. Leave the additive table until a
  reviewed cleanup migration is authorized.
- **Out of scope:** Enabling mutation in production.
