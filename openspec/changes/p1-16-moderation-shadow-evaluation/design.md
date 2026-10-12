# Design

## Context

Shadow policy already records `ModerationPolicyDecision` rows. Evaluation
classifies those rows against owner labels.

## Decisions

### 1. False-approval tolerance is zero

Any `propose_approve` labeled `hold` is a no-go.

### 2. False holds do not block a conservative go

They are counted and documented. Thresholds stay at defaults on go.

### 3. Completeness gate

Only `completed` pipeline runs count toward seven successful days.

```text
stored decisions + owner labels -> classify -> counted days / false approvals
                                            -> go | no-go + proposed thresholds
```

## Test Mapping

- **Unit:** classification and report validation.
- **Integration:** stored evidence and policy version on every included row.
- **E2E:** seven successful fixture days emit a valid go with default thresholds.
