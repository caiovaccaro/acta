# Design

## Context

See `proposal.md` and Section 11 of the Phase 1 plan. Destination and sender
are environment secrets. Tests use reserved example-domain addresses.

## Goals / Non-Goals

**Goals:**

- One receipt after every finished slice.
- Immediate failure receipt for terminal errors.
- Moderation digest when pending topics exist.
- Budget pause uses the budget subject.
- Delivery failure is recorded and never corrupts pipeline state.

**Non-Goals:**

- Newsletters.
- Hardcoding the owner destination.
- Requiring email for Vercel web production configuration.
- Retries, backoff, or intermediate emails. Native GitHub failure
  notification remains the operator alert when Resend cannot send.
- Using a missing or disabled mailer to skip budget enforcement.

## Decisions

### 1. Delivery is post-commit

`finishSlice` persists run status and releases the lease first, then sends
email. `deliverReceiptSafely` swallows delivery exceptions so a Resend
timeout, rejection, or network error cannot roll back a completed or failed
run. The owner receipt is recorded before the optional moderation digest;
digest failure cannot change the committed status or the owner receipt.

### 2. Sender is `PIPELINE_EMAIL_FROM`

No sender domain is hardcoded. Tests use
`Acta Pipeline <pipeline@example.invalid>`.

### 3. Receipt reasons replace the old placeholder

When Resend, `PIPELINE_EMAIL_FROM`, or `PIPELINE_EMAIL_TO` is absent, the
receipt reason is `missing_config` (not `email_out_of_scope`).
`PIPELINE_EMAIL_DISABLED=1` records `disabled`. Transient fetch errors
record `network`. None of these reasons retry.

### 4. Attempt ledger stores metadata only

`pipeline_notifications` stores kind, status, redacted subject, and optional
provider id. It never stores `to`, `from`, HTML, article text, or API keys.

### 5. Public and admin links are configuration

`ACTA_PUBLIC_URL` and `ACTA_ADMIN_URL` default to `https://acta.example.invalid`
in tests.

## Test Mapping

- **Unit:** success, pause, budget, moderation, and failure templates plus
  redaction.
- **Integration:** mocked Resend acceptance, rejection, timeout, and network
  errors persist attempts without changing run status. A pending topic
  produces a digest; digest failure leaves the run completed.
- **E2E:** one receipt for a successful fixture slice and one for a forced
  terminal failure.

## Rollback

Disable by unsetting `RESEND_API_KEY` or setting `PIPELINE_EMAIL_DISABLED=1`.
Revert application code; leave the additive table.
