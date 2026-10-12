# Proposal

## Why

CAI-259 evaluates seven successful daily shadow runs before Level 1
auto-approval may be considered.

## What Changes

- Add a labeled-decision rubric, false-approval tolerance of zero, and a
  go/no-go report builder over stored shadow decisions.
- Failed or incomplete runs do not count. Evaluation never reruns paid calls.
- Auto-approval stays disabled.

## Capabilities

### New Capabilities

- `moderation-shadow-evaluation`: Seven-day shadow go/no-go evaluation.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-259.
- **Affected systems:** moderation decisions, Linux CI.
- **Security:** Uses stored results only. No prompt or article text in reports.
- **Cost:** No additional paid provider calls.
- **Rollback:** Delete the evaluation report builder; shadow policy is unchanged.
- **Out of scope:** Enabling auto-approval.
