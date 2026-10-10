# Proposal

## Why

CAI-250 replaces numeric offsets with stable `(createdAt, id)` cursors so
disposable pipeline workers can resume bounded stage work after interruption
without skipping or duplicating records on mutating tables.

## What Changes

- Add a cursor codec and keyset window selector ordered by `(createdAt, id)`.
- Add a bounded stage-unit runner that checkpoints only after a unit commits
  and leaves the cursor unchanged when a unit fails.
- Add per-stage production unit caps and a deadline signal that stops new
  claims near expiry.
- Add unit, mutating-dataset integration, and interrupted-process E2E tests.
- Add CAI-250 verification commands, Linear fixture, and commit-bound
  verification evidence.

## Capabilities

### New Capabilities

- `stable-stage-cursors`: Stable keyset cursors, bounded units, committed
  checkpoints, and deadline-aware claiming.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-250.
- **Affected systems:** `@acta/db` pipeline cursor/unit helpers, database
  tests, root verification scripts, governance fixtures, and coordination docs.
- **Security:** Cursor payloads are opaque public IDs and timestamps only.
  Production unit caps are required. Tests contain no credentials.
- **Cost:** Uses existing disposable PostgreSQL. No paid provider calls.
- **Rollback:** Revert repository code. No schema migration is added.
- **Out of scope:** Cross-stage orchestration, executing product pipeline
  stages, Tavily, email, and budget enforcement.
