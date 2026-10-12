# Proposal

## Why

CAI-260 gives the owner pipeline freshness, queues, moderation backlog, and
budget without exposing that data on public health.

## What Changes

- Map operational health from pipeline, queue, moderation, and budget records.
- Serve the payload only from the authenticated admin health endpoint.
- Show the summary on the admin dashboard. Public `/api/health` stays minimal.

## Capabilities

### New Capabilities

- `authenticated-operational-health`: Owner-only operational health.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-260.
- **Affected systems:** Admin API, admin dashboard, Linux CI.
- **Security:** Admin session required. Internal errors redact to `internal_error`.
- **Cost:** Read-only queries. No paid providers.
- **Rollback:** Revert the admin health payload and dashboard panel.
- **Out of scope:** A public status dashboard.
