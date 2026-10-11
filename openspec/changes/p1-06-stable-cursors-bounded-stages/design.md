# Design

## Context

See `proposal.md` and `specs/stable-stage-cursors/spec.md`. Numeric offsets
over mutating tables skip or repeat work. CAI-252 can store opaque cursor JSON
on `PipelineStageRun`; this change defines the cursor and unit contract that
later stages will persist there. Cross-stage orchestration remains out of
scope.

## Goals / Non-Goals

**Goals:**

- Encode and decode a stable `(createdAt, id)` cursor.
- Select the next bounded window with keyset comparison.
- Checkpoint only after a unit commits; leave the cursor unchanged on failure.
- Stop claiming new units when a deadline signal says remaining time is too
  small.
- Require explicit unit caps in production.

**Non-Goals:**

- Running product pipeline stages or `pipeline:run-slice`.
- Changing Prisma schema.
- Provider calls, email, or budget enforcement.

## Decisions

### 1. Use keyset comparison, not offsets

Windows are selected with:

```text
(createdAt, id) > (cursor.createdAt, cursor.id)
ORDER BY createdAt ASC, id ASC
LIMIT unitCap
```

Equal timestamps stay ordered by `id`. A deleted earlier row cannot move a
later row into a previously consumed offset.

### 2. Advance the cursor only after commit

The unit runner invokes an untrusted `processUnit` callback. On success it
encodes that record as the new cursor. On throw or rejected promise the
previous cursor is returned unchanged and later records are not claimed in
that attempt.

### 3. Deadline stops claiming, not in-flight commits

`shouldStopClaiming(deadlineAt, now, reserveMs)` is checked before each new
window. An already-claimed unit may finish. This keeps checkpoints aligned
with committed work and avoids starting work that cannot heartbeat.

### 4. Production caps are mandatory

`resolveStageUnitLimit` accepts an explicit cap. In `NODE_ENV=production` a
missing or non-positive cap fails closed before any claim. Tests and local
runs may supply a positive fixture cap.

## Test Mapping

- **Unit:** codec, equal timestamps, deleted predecessors, empty windows,
  failed-unit non-advance, production cap, and deadline boundaries.
- **Integration:** PostgreSQL table mutated between pages; each eligible id
  committed exactly once.
- **E2E:** first process checkpoints page one and exits; a second process
  resumes and finishes without duplicate writes.

## Risks / Trade-offs

- [Clock skew in `createdAt`] → Persist PostgreSQL timestamps and compare the
  stored pair, not caller clocks.
- [UUID ordering] → IDs are compared as text; uniqueness, not randomness,
  provides the tie-break.
- [A unit dies after commit but before checkpoint] → Domain uniqueness remains
  the second defense; resume reloads the last persisted cursor.

## Rollback

Revert repository code. No migration is introduced.
