# Proposal

## Why

CAI-257 schedules the resumable slice on standard GitHub-hosted runners so
Acta can run unattended.

## What Changes

- Add a six-hour production workflow with a safe manual dispatch.
- Keep permissions read-only, timeout at 330 minutes, and overlap blocked by
  concurrency plus the database lease.
- Document the secret contract. Never print secrets or upload article text.

## Capabilities

### New Capabilities

- `production-pipeline-workflow`: Unattended GitHub Actions slice runner.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-257.
- **Affected systems:** GitHub Actions, `pipeline:run-slice`, Linux CI.
- **Security:** `contents: read`. Secrets stay in GitHub environment secrets.
- **Cost:** Public runners only. No paid larger runners.
- **Rollback:** Disable the workflow schedule.
- **Out of scope:** Self-hosted runners.
