# Design

## Context

See `proposal.md` and `specs/transactional-llm-budget/spec.md`. CAI-251 records
actual usage after the fact. Concurrent slices can still overspend without a
reservation.

## Goals / Non-Goals

**Goals:**

- Reserve conservative cost before each paid request.
- Reject work that would exceed the USD 30 ceiling.
- Settle actual cost or expire abandoned reservations when the owner lease is
  stale.
- Pause paid stages and continue deterministic stages.

**Non-Goals:**

- Changing OpenAI price configuration.
- Email budget-warning transport.

## Decisions

### 1. Conservative estimates, actual settlement

Classification 0.05, validation 0.04, topic/question discovery 0.15,
generation 0.20, default 0.10. After a successful response, settle the mapped
ledger cost. Provider failures expire the reservation at 0.000000.

### 2. Serializable month-scoped accounting

Reservation insert runs in a PostgreSQL Serializable transaction after summing
settled actuals plus active reserved amounts. Serialization conflicts retry.
The application ceiling is 30.000000; `ACTA_LLM_MONTHLY_CEILING_USD` may lower
it for tests but is clamped at 30.

### 3. Stale-lease expiry stays conservative

Reserved rows past `expiresAt` remain counted until their pipeline run has no
healthy lease. Then they expire and free budget.

### 4. Slice continues deterministic work

A `paused_budget` paid stage does not stop the slice. Later paid stages skip.
RSS, extraction, matching, verdict math, Tavily placeholders, and finalize
still run. The run status is `paused_budget`.

## Control Flow

```text
before paid OpenAI call
  expire stale-lease reservations
  if settled + reserved + estimate > ceiling -> reject
  insert reserved row
OpenAI call
  success -> settle actual
  failure -> expire 0.000000
slice
  paid reject -> skip remaining paid stages
  deterministic stages continue
  summary.status = paused_budget
```

## Test Mapping

- **Unit:** precision, month boundary, ceiling clamp, and estimate tables.
- **Integration:** two concurrent reservations near the ceiling.
- **E2E:** low test ceiling exhausts a paid stage; deterministic stages
  complete; run reports `paused_budget`.

## Risks / Trade-offs

- [Estimate > actual] → Conservative until settle. Small unused budget is
  preferred over overspend.
- [Persist ledger after settle] → Budget is correct even if the audit row
  fails closed.

## Rollback

Revert application code. Leave `llm_budget_reservations` in place.
