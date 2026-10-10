# Pipeline run and lease coordination

CAI-252 adds the persistence boundary used by future disposable pipeline
workers. It does not execute stages.

## Model

- `PipelineRun` stores the trigger, guarded lifecycle state, deadlines,
  heartbeat, summary, and sanitized failure data.
- `PipelineStageRun` stores one checkpoint per `(pipelineRunId, stage)`.
- `PipelineLease` is a singleton row per resource. The production resource will
  be `production-pipeline`.
- `PipelineLeaseEvent` is append-only ownership audit history. Stale takeover
  events identify both the new and displaced run and owner.

Acquisition uses a Prisma transaction at PostgreSQL `Serializable` isolation.
Every ownership mutation includes the current owner, run, and monotonically
increasing generation. A displaced process therefore cannot heartbeat or
release its successor's lease.

PostgreSQL timestamps decide expiry. Future workers should heartbeat at least
every five minutes and use a 15-minute lease. Owner tokens are internal opaque
UUIDs and must not be exposed by public health endpoints.

## Local verification

Start the dedicated PostgreSQL 16 container on the ticket's unique host port:

```sh
docker run --name acta-cai-252-postgres \
  -e POSTGRES_USER=acta \
  -e POSTGRES_PASSWORD=acta \
  -e POSTGRES_DB=acta_cai252 \
  -p 55435:5432 -d postgres:16-alpine
```

Run the ticket checks:

```sh
npm run db:generate
npm run test:p1-05:migrations
npm run test:p1-05:unit
npm run test:p1-05:integration
npm run test:p1-05:e2e
npm run test:p1-05:regression
```

`test:p1-05:integration` and `test:p1-05:e2e` push the current schema to
`acta_cai252` on host port 55435 before running. They never target production.

The migration check recreates only `acta_cai252_empty` and
`acta_cai252_prodlike` inside the named disposable container. It proves the full
chain on an empty database, then applies the CAI-252 migration over the previous
schema and verifies a representative row is preserved.

## Failure and recovery

- Lease contention is a normal not-acquired result.
- Known serialization conflicts receive bounded retries.
- A stale lease is replaced atomically and records the displaced ownership.
- Heartbeat and release return false after ownership loss.
- Invalid run transitions fail before mutation; concurrent transitions use a
  compare-and-set state predicate.
- Stored error messages remove URL credentials and common secret assignments
  and are bounded to 1,000 characters.

## Rollback

Stop future worker consumers and revert application code. The migration is
additive and does not alter existing domain tables, so leave the coordination
tables and audit records in place. Any destructive cleanup requires a separate
reviewed migration.

The models add negligible storage and query cost and no paid service calls.
