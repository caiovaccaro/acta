# Proposal

## Why

CAI-256 adds owner-visible pipeline receipts so autonomous slices do not
require terminal monitoring.

## What Changes

- Add a Resend adapter, redacted templates, and a `PipelineNotification` ledger.
- Send success, pause, failure, budget, and moderation-digest messages with
  production and admin links.
- Record delivery attempts without storing destinations, bodies, or secrets.
- Email failure never changes a successful pipeline result.

## Capabilities

### New Capabilities

- `operational-moderation-email`: Aggregated owner receipts and moderation
  digests with fail-open delivery.

### Modified Capabilities

- `pipeline-run-slice`: Slice summaries report real receipt delivery instead of
  `email_out_of_scope`.

## Impact

- **Linear issue:** CAI-256.
- **Affected systems:** `@acta/core` notifications, `@acta/db` slice finish,
  Linux CI, governance fixtures, and pipeline docs.
- **Security:** `PIPELINE_EMAIL_TO` exists only as a secret. Tests use
  `owner@example.invalid`. Secrets and article text are redacted.
- **Cost:** Mocked Resend in tests. Production stays on Resend's free
  transactional tier.
- **Rollback:** Revert application code. Leave the additive table.
- **Out of scope:** End-user newsletters.
