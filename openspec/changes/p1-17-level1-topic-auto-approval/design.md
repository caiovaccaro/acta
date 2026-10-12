# Design

## Context

P1-12 records shadow proposals. P1-16 fixture evaluation is go with zero
false approvals. Mutation is still default-off.

## Decisions

### 1. Exact string `true`

Any other value, including unset and `false`, keeps shadow behavior.

### 2. One transaction per topic

Audit row + `pending -> approved` commit together. Conflict rolls back that
topic only and records the shadow proposal.

### 3. Email names every mutation

A dedicated `auto_approval` notice lists topic name and id.

```text
AUTO_APPROVE_TOPICS=true -> eligible propose_approve -> tx(audit, approved)
                         -> extra email
AUTO_APPROVE_TOPICS=false -> shadow only
```

## Test Mapping

- **Unit:** flag, eligibility, rollback disable.
- **Integration:** atomic status+audit for eligible topics only.
- **E2E:** public filter shows the eligible topic; receipt names it.
