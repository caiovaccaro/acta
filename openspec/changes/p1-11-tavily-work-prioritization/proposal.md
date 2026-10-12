# Proposal

## Why

CAI-258 spends the remaining extraction and analysis budget on the highest-value
approved topics and Tavily-matched articles without starving older work.

## What Changes

- Match trend signals to approved topics and existing articles/crawl requests
  using exact URL, title/domain, and topic alias rules.
- Score work with weights 40/30/15/15 and allocate 70% to the priority pool and
  30% to the oldest-work pool, with unused capacity flowing to the other pool.
- Derive each stage's effective cap as the lower of the configured cap and the
  remaining-budget affordable-unit estimate.
- Add unit, ordering integration, priority E2E, and regression tests.

## Capabilities

### New Capabilities

- `tavily-work-prioritization`: Deterministic matching, scoring, 70/30
  allocation, and budget-derived caps for capped stage selection.

### Modified Capabilities

- `pipeline-run-slice`: Default `tavily_priority`, extraction, and analysis
  adapters consume the allocator. Summaries report configured, budget-derived,
  and effective caps.

## Impact

- **Linear issue:** CAI-258.
- **Affected systems:** `@acta/core` matcher/allocator, slice adapters, crawl
  claiming, Linux CI, and pipeline docs.
- **Security:** Ambiguous and unmatched signals stay unlinked and cannot publish
  content. Matching is deterministic; no extra paid LLM calls.
- **Cost:** Tests use disposable PostgreSQL only. Effective caps fall as remaining
  LLM budget falls.
- **Rollback:** Revert application code. No schema migration.
- **Out of scope:** Topic approval.
