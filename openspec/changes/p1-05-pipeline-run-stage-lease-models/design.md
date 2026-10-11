# Design

## Context

See `proposal.md` for motivation and
`specs/pipeline-run-coordination/spec.md` for required behavior.

PostgreSQL is already the Phase 1 source of truth and Prisma is the database
boundary. Workers are disposable, may disappear without cleanup, and may start
concurrently. The repository has no durable run, stage, or ownership records.
The migration must be additive and safe on empty and production-like databases.

## Goals / Non-Goals

**Goals:**

- Persist run, stage, checkpoint, heartbeat, and concise failure state.
- Guarantee one active owner for the named pipeline resource.
- Make stale takeover atomic and append an audit record naming the displaced
  run and owner.
- Reject undeclared run transitions before database mutation.
- Keep contention, ownership loss, and stored errors safe to expose to callers.

**Non-Goals:**

- Executing, ordering, or scheduling pipeline stages.
- Stable cursor semantics beyond storing opaque JSON checkpoint data.
- Budget, provider, notification, or production workflow behavior.
- Distributed ownership of multiple independent pipeline resources.

## Decisions

### 1. Use a singleton-row transactional lease, not advisory locks

`PipelineLease` has a unique resource key (`production-pipeline`) and nullable
current ownership fields. Acquisition runs in a Prisma interactive transaction
at PostgreSQL `Serializable` isolation. It creates the singleton when absent or
replaces ownership only when the row is unowned or expired. Serialization
conflicts receive a small bounded retry; contention returns a normal
not-acquired result.

This works entirely through Prisma, persists across connections and worker
death, is inspectable by operators, and is straightforward to test with
independent clients and processes. PostgreSQL advisory locks were rejected
because they are connection-scoped, disappear on disconnect without a durable
takeover record, and interact poorly with pooled/serverless connections.

Each successful acquisition increments `generation`. Heartbeat and release use
the resource key, owner token, run ID, and generation as compare-and-set
conditions. A stale owner therefore cannot heartbeat or release after takeover.

### 2. Keep append-only lease audit records

`PipelineLeaseEvent` records acquisition, release, and stale takeover. A
takeover event stores both the new owner/run and displaced owner/run, plus the
prior expiration time. The current singleton row provides fast ownership
queries; events provide immutable operational history.

Owner tokens are opaque caller-generated UUIDs and are never included in public
errors or logs. Heartbeats do not create events because that would produce
unbounded low-value rows; the singleton's `heartbeatAt` and `expiresAt` are the
current heartbeat audit state.

### 3. Model run and stage state explicitly

`PipelineRun` stores trigger, status, start/heartbeat/finish/deadline/eligibility
timestamps, summary JSON, sanitized error code/message, and audit timestamps.
State-query indexes cover `(status, nextEligibleAt)`, `heartbeatAt`, and
`createdAt`.

`PipelineStageRun` belongs to one run and is unique by `(pipelineRunId, stage)`.
It stores status, cursor JSON, attempts, lifecycle timestamps, metrics JSON, and
sanitized error state. Indexes cover run/status and stage/status queries.

Run transitions are declared in one pure map:

```text
queued -> running
running -> completed | paused_budget | paused_deadline
        | blocked_moderation | failed_recoverable | failed_terminal
paused_budget | paused_deadline | blocked_moderation
        | failed_recoverable -> running
completed | failed_terminal -> (terminal)
```

The repository guards transitions with the pure state machine and an
`updateMany({ id, status: from })` compare-and-set, so stale callers cannot
overwrite a concurrent transition. Stage state is persisted now for later
orchestration, but executing stages remains out of scope.

### 4. Sanitize persistence and public failures

Repository inputs pass error text through a deterministic sanitizer that
removes URL credentials, common secret-bearing key/value forms, control
characters, and excess length. Stable public error codes describe invalid
transition, ownership loss, invalid lease duration, or database unavailability;
raw Prisma messages and connection strings never cross the repository boundary.

### 5. Use one additive, lock-minimal migration

The migration creates enums and new tables only, then adds foreign keys and
indexes. It does not rewrite or alter existing tables and does not seed the
singleton row; first acquisition creates it transactionally. Rollback at the
application layer stops consumers and leaves additive structures in place until
a later cleanup is proven safe.

## Control Flow

```text
runner A -----------+
                    v
runner B ---> acquire(resource, run, owner, ttl)
                    |
                    v
        SERIALIZABLE Prisma transaction
        read/create singleton lease row
          | healthy owner      | free/stale
          v                    v
       not acquired      CAS owner + generation
                               |
                         stale?+--> append takeover event
                               |
                               v
                         acquired result
                               |
             +-----------------+------------------+
             v                                    v
 owner+generation heartbeat             owner+generation release
 extends expiry or reports loss          clears owner + audit event
```

## Trust Boundaries

- **Worker input:** Resource keys, owner tokens, timestamps, lease durations,
  cursors, metrics, and errors are untrusted. Durations are bounded; JSON is
  stored but not executed; errors are sanitized.
- **PostgreSQL/Prisma:** The database is authoritative for ordering and
  ownership. Transaction failures are mapped to stable errors without leaking
  database URLs, SQL, or driver detail.
- **Operational readers:** Indexed state and audit rows are internal data.
  Owner tokens and sanitized error text must not be exposed on public health
  surfaces.
- **Tests:** Disposable PostgreSQL on host port 55435 uses synthetic
  credentials and no production data or secrets.

## Failure Modes and Recovery

- Concurrent first acquisition or stale takeover serializes to one winner; the
  loser receives `acquired: false`.
- Serialization conflicts retry a bounded number of times, then fail with a
  sanitized availability error.
- A dead owner expires naturally; takeover atomically changes ownership and
  appends the displaced owner/run audit event.
- A stale owner heartbeat or release matches zero rows and returns ownership
  lost without changing the winner's lease.
- Invalid state transitions fail before mutation; concurrent valid transitions
  use compare-and-set so only one source state wins.
- Process termination before protected mutation leaves no mutation; termination
  after acquisition is recoverable when the lease expires.

## Test Mapping

- **Unit:** Evaluate every pair of run statuses and prove only the declared
  edges pass; cover sanitization and validation boundaries.
- **Integration:** Independent Prisma clients concurrently acquire, heartbeat,
  release, and take over a stale lease, asserting singular current ownership and
  displaced-run audit history.
- **E2E:** Spawn two Node processes behind a synchronization barrier against
  PostgreSQL; exactly one lease winner inserts the protected fixture mutation.
- **Regression:** Run the complete existing workspace suite and schema tests.
- **Migration:** Apply the full chain to an empty disposable database and apply
  the new migration to a production-like database initialized from the prior
  Prisma schema.

## Risks / Trade-offs

- [Serializable transactions can abort under contention] → Retry only known
  serialization conflicts with a small bound and return a stable failure.
- [Clock skew can cause premature takeover] → Use PostgreSQL `CURRENT_TIMESTAMP`
  for ownership decisions and persist caller-independent expiry.
- [Lease events grow over time] → Events occur only on ownership boundaries and
  are indexed by resource/time and run/time; retention can be added separately.
- [Additive enums are difficult to remove] → Keep names narrowly scoped and use
  application rollback without destructive migration.
- [A caller can acquire and then die before mutation] → E2E proves losers never
  mutate, while expiry provides bounded recovery for the winner.

## Migration Plan

1. Generate and review additive SQL for enums, run/stage tables, lease singleton,
   lease events, indexes, and foreign keys.
2. Apply the complete migration chain to an empty disposable PostgreSQL 16
   database on host port 55435.
3. Build a production-like database at the previous schema, insert
   representative records, deploy the new migration, and verify preservation.
4. Generate Prisma Client and run unit, concurrent integration, process E2E,
   regression, and production build verification.
5. Deploy repository code before any future worker consumes it.

Rollback disables prospective callers and reverts application code. The new
tables remain unused; dropping them is deferred to a separate reviewed
migration to avoid destroying audit state.
