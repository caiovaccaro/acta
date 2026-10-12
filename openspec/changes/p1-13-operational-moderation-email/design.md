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

## Decisions

### 1. Delivery is post-commit

`finishSlice` persists run status first, then sends email. A Resend timeout
cannot roll back a completed or failed run.

### 2. Sender is `PIPELINE_EMAIL_FROM`

No sender domain is hardcoded. Tests use
`Acta Pipeline <pipeline@example.invalid>`.

### 3. Attempt ledger stores metadata only

`pipeline_notifications` stores kind, status, redacted subject, and optional
provider id. It never stores `to`, `from`, HTML, article text, or API keys.

### 4. Public and admin links are configuration

`ACTA_PUBLIC_URL` and `ACTA_ADMIN_URL` default to `https://acta.example.invalid`
in tests.

## Test Mapping

- **Unit:** success, pause, budget, moderation, and failure templates plus
  redaction.
- **Integration:** mocked Resend acceptance, rejection, and timeout persist
  attempts without changing run status.
- **E2E:** one receipt for a successful fixture slice and one for a forced
  terminal failure.

## Rollback

Disable by unsetting `RESEND_API_KEY` or setting `PIPELINE_EMAIL_DISABLED=1`.
Revert application code; leave the additive table.
