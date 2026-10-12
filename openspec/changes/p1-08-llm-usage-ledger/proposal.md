# Proposal

## Why

CAI-251 replaces console-only LLM cost logs with an auditable usage ledger so
later budget enforcement can see every successful paid call.

## What Changes

- Add an additive `LlmUsage` model and migration.
- Map provider token usage to fixed-precision estimated cost and redacted
  metadata from the central OpenAI provider.
- Persist usage through a repository sink and block further paid requests when
  persistence fails.
- Include ledger cost on the slice run summary.
- Add unit, provider integration, run-summary E2E, and regression tests.

## Capabilities

### New Capabilities

- `llm-usage-ledger`: Central provider usage recording with a redacted
  PostgreSQL audit ledger and run-summary totals.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-251.
- **Affected systems:** `@acta/core` OpenAI provider, `@acta/db` schema and
  slice summary, Linux CI, governance fixtures, and pipeline docs.
- **Security:** Prompts, completions, API keys, and article text are never
  stored. Persist failure is visible and fail-closed for later paid calls.
- **Cost:** No live provider calls in tests. Estimated cost uses configured
  per-million prices and six-decimal arithmetic.
- **Rollback:** Revert repository code. Leave the additive table until a
  separately reviewed cleanup migration is safe.
- **Out of scope:** Rejecting calls by monthly budget.
