# Design

## Context

See `proposal.md` and `specs/tavily-work-prioritization/spec.md`. P1-10 stores
trend signals. Capped extraction and analysis still claim oldest-first.

## Goals / Non-Goals

**Goals:**

- Deterministic URL, title/domain, and topic-alias matching.
- Priority score weights: topic trend 40, exact Tavily article match 30,
  recency 15, backlog age 15.
- 70/30 allocation with unused capacity flowing to the other pool.
- Effective cap = min(configured, floor(remainingUsd / 0.05)).

**Non-Goals:**

- Topic approval.
- LLM disambiguation.
- Publishing unmatched Tavily URLs as Acta evidence.

## Decisions

### 1. Ambiguous matches stay unlinked

Exact URL wins when unique. Title plus domain is the fallback. Topic aliases
require every name token to appear in the signal title. Multiple candidates, a
duplicate signal URL, or an unapproved topic leave the signal unlinked.

### 2. Integer 70/30 split

`priorityCap = floor(cap * 0.7)` and `ageCap = cap - priorityCap`. Filling the
age pool after the priority pool, then overflowing unused slots, keeps at least
about 30% available to oldest exclusive work whenever it exists.

### 3. Affordable units use the classification estimate

Unit cost is USD 0.05, the stance-classification reservation. The effective cap
never exceeds that floor division. Extraction and analysis consume their own
effective caps.

### 4. Analysis selection does not mutate status

Extraction claims crawl rows with `FOR UPDATE SKIP LOCKED`. Analysis returns an
ordered id list and does not write moderation or stance rows.

## Test Mapping

- **Unit:** exact URL, title/domain, topic alias, ambiguous, duplicate, unmatched,
  score weights, 70/30 queues, and effective cap.
- **Integration:** persisted signals and eligible work claim the specified
  proportions without duplicate ids.
- **E2E:** low remaining budget, repeated slices, trending first, oldest not
  starved.

## Rollback

Revert application code. Matching columns on `trend_signals` already exist.
