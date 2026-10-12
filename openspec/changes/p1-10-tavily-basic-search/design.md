# Design

## Context

See `proposal.md` and `specs/tavily-basic-search/spec.md`. The slice currently
skips Tavily. Budgeted LLM work needs a cheap trend input.

## Goals / Non-Goals

**Goals:**

- Run at most five basic searches per UTC day and 155 per UTC month.
- Persist normalized, URL-unique trend signals.
- Degrade without blocking RSS when Tavily fails or is exhausted.

**Non-Goals:**

- Matching signals to topics or articles.
- Using Tavily text as verdict evidence.
- Extract or search depth beyond `basic`.

## Decisions

### 1. Five default query groups

1. global politics and security
2. climate and energy
3. technology and AI
4. economics and trade
5. public health and social policy

Queries request last-24-hour news. One search per group until the daily cap.

### 2. Degrade, do not fail the slice

Timeout, malformed JSON, empty results, HTTP 402/429, missing key, and cap
exhaustion return `{ degraded: true, reason }` with no rows. The stage completes
so RSS and later deterministic work continue.

### 3. Deduplicate URL then domain

Normalize scheme/host/path, drop fragments, keep the first score-bearing result
per URL and per domain in a search. Database uniqueness is the normalized URL.

### 4. Search log is the cap source

`tavily_search_logs` counts attempts, including degraded ones, so retries cannot
bypass the daily cap.

## Test Mapping

- **Unit:** duplicate, malformed, and boundary results plus cap arithmetic.
- **Integration:** mocked success persists one valid URL; quota does not persist.
- **E2E:** a successful trends stage then a quota-exhausted stage leave stored
  signals in place and complete RSS.

## Rollback

Revert application code. Leave `trend_signals` and `tavily_search_logs` in place.
