# Design

## Context

The six-hour workflow and usage ledger already exist. Soak is a report over
those records, not a new stage.

## Decisions

### 1. Unrecovered failure restarts the clock

A terminal failure without a later completed recovery does not count.

### 2. Monthly projection is 30 × daily average of the seven counted days

Compared against USD 50. The application LLM ceiling remains USD 30.

### 3. Fixture vs production

The PR ships fixture seven-day evidence. Production evidence is a post-merge
next step.

```text
scheduled runs + ledger + receipts -> soak report
  freshness ≤ 48h
  7 days, 0 unrecovered failures
  receipts present
  projected monthly ≤ 50
```

## Test Mapping

- **Unit:** freshness, reliability, cost pass/fail.
- **Integration:** values trace to stored runs and ledger rows.
- **E2E:** seven consecutive scheduled days close as steady.
