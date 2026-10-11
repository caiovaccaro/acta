# Proposal

## Why

CAI-252 gives disposable pipeline workers durable ownership, heartbeat, status,
and checkpoint state. Without database-enforced singular ownership and explicit
transitions, overlapping or failed workers can duplicate mutations or leave
pipeline state impossible to audit and recover.

## What Changes

- Add durable `PipelineRun` and `PipelineStageRun` records with explicit,
  validated state transitions and indexed operational queries.
- Add a PostgreSQL singleton-resource lease repository supporting transactional
  acquisition, heartbeat, release, and stale takeover with displaced-owner
  audit state.
- Add sanitized persisted errors and repository contracts without executing any
  pipeline stage.
- Add a safe additive Prisma migration, unit state-machine tests, concurrent
  PostgreSQL integration tests, and a two-process competing-runner E2E test.
- Add canonical CAI-252 verification commands, Linear fixture, commit-bound
  verification manifest, and operational documentation.

## Capabilities

### New Capabilities

- `pipeline-run-coordination`: Durable run and stage state, guarded transitions,
  and singular auditable worker leases.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-252.
- **Affected systems:** Prisma schema and migration, `@acta/db` repositories and
  exports, database tests, root verification scripts, governance fixtures, and
  pipeline operations documentation.
- **Security:** Owner tokens are opaque identifiers, lease mutations are
  transactional, persisted errors are bounded and sanitized, and tests contain
  no credentials or private addresses.
- **Cost:** The design uses existing PostgreSQL and no paid provider calls. It
  adds only small indexed coordination rows and stays within the project's USD
  50 monthly ceiling.
- **Rollback:** Stop prospective lease users, revert repository code, and leave
  the additive tables/enums in place until a separately reviewed cleanup
  migration is safe. Existing application reads and writes are unaffected.
- **Out of scope:** Executing pipeline stages, scheduling workers, stable cursor
  algorithms, budget enforcement, provider integrations, and production
  deployment.
