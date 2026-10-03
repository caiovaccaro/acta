# Pipeline Low-Effort Improvements

## Overview
Add low-effort, near-term optimizations to the article analysis pipeline to reduce duplicate processing and non-generative LLM spend without changing the overall pipeline shape.

## Documentation

- **Implementation Plan**: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

## Quick Reference

### Feature Summary
- **Purpose**: Lower pipeline cost and improve throughput with early gates and smarter defaults
- **Scope**: Post-crawl analysis flow through verdict/content generation runbook
- **Main Levers**: convergence gates, prefilter hardening, fanout caps, N+1 removal, cheap-model routing, funnel observability
- **Constraint**: Keep existing command order as baseline; optimize around it

### In Scope
- Insert/standardize early convergence checks before classification.
- Raise question match threshold defaults and apply fanout caps.
- Remove N+1 question fetching in classification scripts.
- Route non-generative checks to cheaper LLM tier.
- Add quick-win funnel and projected cost metrics.

### Out of Scope
- Full pipeline redesign or orchestration rewrite.
- Large data model refactors.
- Replacing generative model path for summary/content generation.

## Related pipeline docs

- [Article analysis pipeline spec](../003-article-analysis-pipeline/README.md)
