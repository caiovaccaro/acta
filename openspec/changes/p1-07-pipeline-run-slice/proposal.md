# Proposal

## Why

CAI-249 gives disposable workers one resumable, deadline-aware cloud entry
point so independent scripts can share leases, checkpoints, and status codes.

## What Changes

- Add `pipeline:run-slice` with the Section 7 flag contract.
- Add a stage adapter contract and the documented stage order.
- Orchestrate lease acquisition, heartbeats, checkpoints, and structured
  summaries.
- Treat remaining backlog as a successful resumable outcome.
- Fail closed on invalid configuration before paid work.
- Add unit, repository integration, killed-run E2E, and regression tests.

## Capabilities

### New Capabilities

- `pipeline-run-slice`: Deadline-aware slice orchestration with adapters,
  leases, checkpoints, summaries, and status codes.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-249.
- **Affected systems:** `@acta/db` slice orchestrator, root CLI, Linux CI,
  governance fixtures, and pipeline coordination docs.
- **Security:** Logs and persisted errors are sanitized. Owner tokens and
  connection strings are not printed. Tavily, email, and budget enforcement
  remain out of scope so this slice cannot emit secret-bearing receipts.
- **Cost:** Uses disposable PostgreSQL and no paid provider calls. Production
  article and analysis caps are required.
- **Rollback:** Revert repository code. No schema migration is added.
- **Out of scope:** Tavily, email transport, and final budget enforcement.
