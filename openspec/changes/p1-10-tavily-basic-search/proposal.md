# Proposal

## Why

CAI-254 gives the pipeline a bounded current-events signal so later tickets can
prioritize work and corroborate moderation without spending Tavily overage.

## What Changes

- Add a Tavily basic-search client, five default query groups, and explicit
  daily/monthly request caps.
- Normalize and deduplicate URLs and domains, persist `TrendSignal` rows, and
  log each search attempt.
- Degrade on timeout, malformed payload, empty results, quota, or missing key
  without blocking RSS.
- Replace the `tavily_trends` default adapter with this collector.
- Add unit, HTTP/persistence integration, trend-stage E2E, and regression tests.

## Capabilities

### New Capabilities

- `tavily-basic-search`: Bounded basic search, normalization, trend persistence,
  and safe degradation.

### Modified Capabilities

- `pipeline-run-slice`: The trends stage collects signals or degrades instead of
  recording `tavily_out_of_scope`.

## Impact

- **Linear issue:** CAI-254.
- **Affected systems:** `@acta/core` Tavily client, Prisma trend tables, slice
  trends adapter, Linux CI, and pipeline docs.
- **Security:** The API key is only sent to Tavily and is never stored on
  `TrendSignal.rawResult` or in logs. Paid overage is disabled (`search_depth=basic`).
- **Cost:** Daily cap 5, monthly cap 155. Tests use mocked HTTP only.
- **Rollback:** Revert application code. Leave additive tables until a reviewed
  cleanup migration is authorized.
- **Out of scope:** Tavily content becoming verdict evidence or bypassing
  approved ingestion. Topic matching is P1-11.
