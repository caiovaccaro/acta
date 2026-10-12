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

## Stable cursors and bounded units

CAI-250 adds the cursor contract later stages persist on `PipelineStageRun.cursor`.
Work is selected with a `(createdAt, id)` keyset, not a numeric offset. A unit
cap is required. The cursor advances only after that unit commits. Deleted
earlier rows do not skip later ids, and equal timestamps stay ordered by id.

```sh
npm run test:p1-06:unit
npm run test:p1-06:integration
npm run test:p1-06:e2e
npm run test:p1-06:regression
```

The database tests reuse disposable PostgreSQL on host port 55435. Production
unit caps remain mandatory; missing caps fail closed before any claim.

## Slice runner

CAI-249 adds `pipeline:run-slice`. The command validates flags and
`DATABASE_URL`, acquires the singleton lease, loads or creates the active run,
heartbeats after every checkpoint, and prints one JSON summary.

```sh
npm run pipeline:run-slice -- \
  --max-runtime-minutes=285 \
  --max-new-articles=40 \
  --max-analysis-articles=40 \
  --trigger=scheduled
```

Default adapters complete stages that have no eligible work. Tavily and email
are out of scope and are recorded as skipped. Remaining backlog is a successful
resumable outcome. Invalid configuration exits 1 before a lease is acquired.

```sh
npm run test:p1-07:unit
npm run test:p1-07:integration
npm run test:p1-07:e2e
npm run test:p1-07:regression
```

## LLM usage ledger

CAI-251 records every successful central OpenAI completion in `llm_usage`.
Rows store model, operation, tokens, estimated USD cost, run, and stage.
Prompts, completions, API keys, and article text are never stored. If ledger
persistence fails, that provider instance blocks further paid requests.

Slice summaries include `ledger.estimatedCostUsd` and `ledger.requestCount`
summed from the run's rows. Budget rejection remains out of scope.

```sh
npm run test:p1-08:unit
npm run test:p1-08:integration
npm run test:p1-08:e2e
npm run test:p1-08:regression
```

## Transactional monthly budget

CAI-253 reserves conservative cost before each paid OpenAI call. Settled actual
cost plus active reservations cannot exceed USD 30. Tests may lower
`ACTA_LLM_MONTHLY_CEILING_USD`; values above 30 are clamped. CLI flags cannot
raise the ceiling. Abandoned reservations stay conservative until the owner
lease is stale.

Paid stages pause when a reservation is rejected. Deterministic stages
continue. The run reports `paused_budget`.

```sh
npm run test:p1-09:unit
npm run test:p1-09:integration
npm run test:p1-09:e2e
npm run test:p1-09:regression
```

## Tavily basic search

CAI-254 runs five basic news searches per UTC day (155 per month) and stores
normalized `trend_signals`. Timeout, malformed, empty, missing-key, and quota
responses degrade the trends stage without blocking RSS. Tavily content is not
verdict evidence. Paid overage is disabled.

```sh
npm run test:p1-10:unit
npm run test:p1-10:integration
npm run test:p1-10:e2e
npm run test:p1-10:regression
```

## Tavily work prioritization

CAI-258 matches stored trend signals to approved topics, queued crawl requests,
and extracted articles using exact URL, title/domain, and topic alias rules.
Ambiguous and unmatched signals stay unlinked. Work is scored 40/30/15/15 and
claimed 70% from the priority pool and 30% from the oldest-work pool. Unused
capacity flows to the other pool. The effective cap is the lower of the
configured cap and `floor(remainingUsd / 0.05)`. Slice summaries report both
caps. Unmatched Tavily URLs are never inserted as evidence.

```sh
npm run test:p1-11:unit
npm run test:p1-11:integration
npm run test:p1-11:e2e
npm run test:p1-11:regression
```

## Shadow moderation policy

CAI-255 evaluates every Level 1 topic auto-approval condition in shadow mode.
Decisions store the policy version, mode, and per-condition evidence. Safety
tokens, missing evidence, near-duplicates, and budget failure stay pending.
`AUTO_APPROVE_TOPICS=true` still cannot mutate `moderationStatus` in this change.
The default finalize adapter writes proposals without sending email. Receipt
delivery is a post-commit step in CAI-256.

```sh
npm run test:p1-12:unit
npm run test:p1-12:integration
npm run test:p1-12:e2e
npm run test:p1-12:regression
```

## Operational and moderation email

CAI-256 sends one owner receipt after every finished slice and a moderation
digest when pending topics exist. Delivery uses Resend with
`PIPELINE_EMAIL_FROM` / `PIPELINE_EMAIL_TO` secrets, never stored in the
repository. Attempts are recorded on `pipeline_notifications` without
destinations or bodies. A Resend timeout cannot change a committed run
status.

```sh
npm run test:p1-13:unit
npm run test:p1-13:integration
npm run test:p1-13:e2e
npm run test:p1-13:regression
```

## Production pipeline workflow

CAI-257 adds `.github/workflows/production-pipeline.yml`. It runs every six
hours and on `workflow_dispatch`, uses `contents: read`, a 330-minute timeout,
concurrency group `acta-production-pipeline` with `cancel-in-progress: false`,
and the standard `ubuntu-latest` runner. Overlap is also blocked by the
`production-pipeline` database lease.

Required secrets: `DATABASE_URL`, `OPENAI_API_KEY`, `TAVILY_API_KEY`,
`RESEND_API_KEY`, `PIPELINE_EMAIL_TO`, `PIPELINE_EMAIL_FROM`,
`ACTA_PUBLIC_URL`, `ACTA_ADMIN_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_SESSION_SECRET`. Native GitHub failure notification remains if email
cannot send.

```sh
npm run test:p1-14:unit
npm run test:p1-14:integration
npm run test:p1-14:e2e
npm run test:p1-14:regression
```

## Production soak and steady-state

CAI-262 evaluates seven consecutive scheduled days. Unrecovered failures
restart the soak. Freshness must be within 48 hours. Projected monthly run
rate must stay below USD 50. `AUTO_APPROVE_TOPICS` stays false until that
report is signed off in production.

Steady-state slice caps: `--max-runtime-minutes=285`, `--max-new-articles=20`,
`--max-analysis-articles=20`, application LLM ceiling USD 30.

See `documentation/pipeline-soak.md`.

```sh
npm run test:p1-18:unit
npm run test:p1-18:integration
npm run test:p1-18:e2e
npm run test:p1-18:regression
```


