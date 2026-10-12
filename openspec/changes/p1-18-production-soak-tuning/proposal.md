# Proposal

## Why

CAI-262 proves the production slice configuration can survive seven days
inside the USD 50 operating ceiling.

## What Changes

- Add soak metrics, monthly projection, and a restart rule for unrecovered
  failures.
- Publish the steady-state caps and operating runbook.
- Keep `AUTO_APPROVE_TOPICS` false until a production soak is signed off.

## Capabilities

### New Capabilities

- `production-soak-tuning`: Seven-day soak report and steady-state caps.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-262.
- **Security:** Metrics come from stored runs and the usage ledger.
- **Cost:** Projected monthly run rate must stay below USD 50.
- **Rollback:** Keep the current caps; do not enable auto-approval.
- **Out of scope:** New pipeline features. Real production 7-day collection
  happens after this stack is on `main`.
