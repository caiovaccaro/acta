# Design

## Context

See `proposal.md` and `specs/pipeline-run-slice/spec.md`. CAI-252 persists
runs, stages, and singleton leases. CAI-250 defines stable cursors and
bounded units. Independent scripts still have no shared entry point.

## Goals / Non-Goals

**Goals:**

- Validate slice flags and required configuration first.
- Acquire the singleton lease, load or create the active run, and heartbeat.
- Execute the documented stage order through a stage adapter contract.
- Checkpoint after committed work and persist a structured summary.
- Return success when useful progress is saved, including remaining backlog.

**Non-Goals:**

- Tavily collection, matching, or corroboration.
- Email transport.
- Monthly budget reservation or rejection.

## Decisions

### 1. Keep adapters as the only stage boundary

The orchestrator does not import crawler or LLM jobs. Each stage is a named
adapter that returns a completed, paused, blocked, or failed outcome. Default
adapters complete empty work. Tavily adapters record `tavily_out_of_scope`.
Finalize records that no receipt was sent. Later tickets replace those
adapters without changing the slice loop.

### 2. Configuration fails before lease or paid work

Missing `DATABASE_URL`, non-positive caps, or an unknown trigger return
`failed_terminal` with `INVALID_CONFIGURATION` and exit status 1. No run,
lease, or adapter is started.

### 3. Backlog remaining is success

A stage may complete a bounded unit and report `backlogRemaining`. The slice
continues later deterministic stages, stores that flag on the summary, and
exits 0. Deadline, recoverable failure, and moderation blocks persist their
run status and also exit 0. Only terminal configuration or unrecoverable
slice errors exit 1.

### 4. Heartbeat after every checkpoint

The runner heartbeats the lease and the run after acquire and after every
checkpoint. A lost heartbeat persists `failed_recoverable` with `LEASE_LOST`.
Lease TTL remains 15 minutes unless a test overrides `PIPELINE_LEASE_MS`.

## Control Flow

```text
parse flags + DATABASE_URL
        |
        +-- invalid --> failed_terminal exit 1
        v
load or create PipelineRun
acquire singleton lease
        |
        +-- not acquired --> lease_not_acquired exit 0
        v
refresh slice deadline
for each incomplete stage
  stop claiming if reserve exhausted -> paused_deadline
  adapter.run(checkpoint, heartbeat)
  persist stage outcome
  evaluate next action
release lease
print summary JSON
```

## Test Mapping

- **Unit:** configuration rejection and next-action selection for stage
  outcomes, deadlines, and heartbeat loss.
- **Integration:** real repositories plus fixture adapters persist pause and
  recoverable failure at the last committed unit.
- **E2E:** a killed process leaves a checkpoint; a later process resumes and
  completes one coherent summary.

## Risks / Trade-offs

- [Default adapters do no product work] → Later tickets own Tavily, crawl,
  analysis, and email. Empty eligible work still completes.
- [A kill after commit and before checkpoint] → Domain uniqueness remains the
  second defense; resume reloads the last persisted cursor.
- [Budget unread] → Summary records `budget.enforced=false` so later ledger
  work can attach without changing this contract.

## Rollback

Revert repository code. No migration is introduced.
