# Proposal

## Why

CAI-261 enables Level 1 topic status mutation behind `AUTO_APPROVE_TOPICS`,
default false, after the P1-16 fixture go/no-go.

## What Changes

- Mutate only fully eligible pending topics when the flag is exactly `true`.
- Persist audit rows with policy version in the same transaction as status.
- Email every mutation. Unsetting the flag stops future mutations and keeps
  history.

## Capabilities

### New Capabilities

- `level1-topic-auto-approval`: Flag-gated transactional topic approval.

### Modified Capabilities

- `moderation-shadow-evaluation`: this change links the fixture go report.

## Impact

- **Linear issue:** CAI-261.
- **Evaluation artifact:** `openspec/changes/p1-16-moderation-shadow-evaluation/evaluation-report.md`
- **Security:** Server-side env only. Failed transactions leave topics pending.
- **Cost:** No extra paid provider calls.
- **Rollback:** `AUTO_APPROVE_TOPICS=false`.
- **Out of scope:** Automatic question validation. Production flag stays false
  until soak sign-off.
