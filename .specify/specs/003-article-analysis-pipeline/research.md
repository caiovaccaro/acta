# Research: Article Analysis & Verdict Pipeline

**Feature**: Article Analysis & Verdict Pipeline  
**Date**: 2025-01-27  
**Status**: Complete

## Overview

This document consolidates research findings for implementing the article analysis pipeline that processes crawled articles to extract questions, classify stances, and generate consensus verdicts.

## Key Decisions

### Decision: LLM Provider and Model

**Decision**: OpenAI GPT-4 Turbo (or latest GPT-4 variant) with flexible, composable provider architecture

**Rationale**:
- Best-in-class performance for complex analysis tasks
- Excellent documentation and community support
- Reliable API with good uptime
- Strong embeddings model support
- Function calling support for structured outputs
- Budget acceptable ($200-300/month for 1000 articles)
- **Architecture**: Flexible provider abstraction allows switching to other providers (Anthropic, open-source, etc.) without changing core logic

**Alternatives Considered**:
- **Anthropic Claude**: Excellent for analysis but newer API, no native embeddings (supported via provider abstraction)
- **Open Source (Llama/Mistral)**: Lower cost at scale but requires infrastructure, lower quality (supported via provider abstraction)
- **Hybrid**: More complex, inconsistent quality

**Implementation Notes**:
- **Provider Abstraction**: Implement abstract LLM provider interface supporting multiple implementations
- **Configuration**: Provider selection via configuration (OpenAI initially, but composable)
- **Composability**: Easy to swap providers or add new ones without changing core logic
- Use GPT-4 Turbo for all LLM tasks initially (question validation, stance classification)
- Evaluate GPT-5 when released (not available as of 2025-01-27)
- Use batch API when possible (50% cost reduction)
- Implement retry with exponential backoff
- Cache results to avoid redundant calls
- Evidence extraction deferred to later phase

### Decision: Processing Strategy

**Decision**: Batch processing with queue system

**Rationale**:
- Cost-effective (can batch LLM calls)
- Easier to optimize and monitor
- Better error recovery
- Can prioritize important articles
- Handles rate limits gracefully

**Alternatives Considered**:
- **Real-time**: Higher infrastructure costs, harder to optimize
- **Pure batch without queue**: Less flexible, harder error handling

**Implementation Notes**:
- Database-backed queue (PostgreSQL)
- Configurable batch size (10-50 articles)
- Priority queue support
- Async processing
- Future: Dead Letter Queue (DLQ) for failed items

### Decision: Topic and Question Matching

**Decision**: Proactive matching for MVP, reactive detection for future

**Rationale**:
- **MVP (Proactive)**: Fast to implement, guaranteed coverage of PRD topics, cost-effective, predictable
- **Future (Reactive)**: Discovers new topics/questions automatically, adapts to evolving debates

**Implementation Notes**:
- **MVP**: Keyword-based matching to pre-defined topics/questions
- Only matching articles are processed (filtering approach)
- Articles that don't match are skipped
- **Future**: LLM-based clustering for topic detection, moderation workflow for approval

### Decision: Stance Classification Method

**Decision**: LLM-based classification (GPT-4 Turbo) with monthly tracking

**Rationale**:
- Fast to implement (no training data needed)
- Handles complex questions well
- Context-aware
- Can extract reasoning
- Good accuracy (85% target)
- Monthly tracking enables historical analysis and trend detection

**Alternatives Considered**:
- **Fine-tuned Model**: Faster and cheaper at scale but requires training data, time to develop
- **Embeddings-based**: Very fast but lower accuracy, needs labeled examples

**Implementation Notes**:
- Per article-question-month triad classification (Question > Article > Month)
- Always record stances per month, using data from the last month as the current month
- Track stances over time to enable historical analysis
- Store confidence score (0-1)
- Flag low-confidence results (< 0.7) for review
- Future: Evaluate embeddings-based approach for speed/accuracy trade-off

### Decision: Answer Synthesis Method

**Decision**: Argument extraction + aggregation (MVP), RAG (future)

**Rationale**:
- **MVP**: More transparent (can trace to sources), preserves diversity, better for ideological breakdown
- **Future (RAG)**: Grounded in source material, better citations, reduces hallucination

**Implementation Notes**:
- Extract arguments from each article
- Group by stance (Yes/No)
- Aggregate by outlet
- Generate summary from aggregated arguments
- Store evidence bullets with citations

### Decision: Database Design

**Decision**: Normalized schema with materialized views and indexes

**Rationale**:
- Data integrity (normalized)
- Performance (materialized views for reads)
- Maintainability (normalized for updates)
- Best of both worlds

**Implementation Notes**:
- Normalized tables: Topic, Question, ArticleAnalysis, Verdict, EvidenceBullet, TopicArticle
- Materialized views for read-heavy queries (verdicts, evidence)
- Indexes on foreign keys and frequently queried fields
- Use Prisma repositories for all access

### Decision: Caching Strategy

**Decision**: Smart caching (selective)

**Rationale**:
- Balance of speed and freshness
- Cost optimization
- Cache what makes sense

**Implementation Notes**:
- **Cache**: Question extraction results (questions don't change often)
- **Cache**: Stance classifications for stable questions
- **Don't Cache**: Verdicts (need recalculation with new articles)
- **Don't Cache**: Evidence bullets (depend on current articles)
- Cache invalidation on data updates

### Decision: Error Handling

**Decision**: Retry with exponential backoff (MVP), DLQ (future)

**Rationale**:
- **MVP**: Handles transient failures, industry standard, good reliability
- **Future (DLQ)**: No lost work, can investigate failures, best reliability

**Implementation Notes**:
- Retry failed LLM API calls with exponential backoff
- Maximum 3 retry attempts
- Log all failures for investigation
- Future: Dead Letter Queue for persistent failures

### Decision: Question Validation Framework

**Decision**: Configurable, composable validation framework (default: 7 checks)

**Rationale**:
- Framework checks may need to evolve over time
- Different questions may require different validation criteria
- Allows experimentation and iteration
- Maintains flexibility for future requirements

**Implementation Notes**:
- **Framework Architecture**: Composable check system - individual checks can be added, removed, or modified
- **Default Checks**: 7 framework checks (Public Clarity, Alignment with Real Debate, Simplicity Without Bias, Anchoring in Current News, Explicit Objective, Clear Binary Nature, Answerable with Evidence)
- **Configuration**: Framework checks configurable via configuration file/interface
- **Custom Checks**: Support for custom check implementations
- **Validation Logic**: Each check is independently implementable and testable
- **Future**: Easy to add new checks or modify existing ones without changing core validation logic

### Decision: Quality Assurance

**Decision**: Confidence thresholds + sample human review

**Rationale**:
- Filters low-confidence results
- Better quality
- Can flag for review
- Builds trust through validation

**Implementation Notes**:
- Apply confidence thresholds to all LLM outputs
- Flag low-confidence results (< 0.7) for review
- Support sample-based human review workflow
- Track review status and outcomes

### Decision: Ideology Handling

**Decision**: Ideology exists in backend (tied to outlets), inferred on articles, never exposed in UI

**Rationale**:
- Outlet ideology needed for internal weighting calculations
- Article ideology inferred from outlet (simplifies schema)
- Never exposed to users (privacy/ethical considerations)

**Implementation Notes**:
- No ideology field in ArticleAnalysis
- Article ideology inferred from `article.outlet.ideology` when needed
- Outlet ideology used for:
  - Credibility weighting in consensus calculation
  - Normalizing weights across ideology buckets
  - Internal calculations only
- **NEVER** include ideology in API responses or UI components
- Backend-only data for weighting purposes

## Technology Research

### OpenAI API Best Practices

**Findings**:
- Use batch API for cost optimization (50% discount)
- Optimize prompts to reduce token usage
- Implement rate limiting and retry logic
- Use function calling for structured outputs
- Cache results when possible

**Resources**:
- OpenAI Cookbook: https://cookbook.openai.com/
- Batch Processing Guide: https://cookbook.openai.com/examples/batch_processing
- Prompt Engineering: https://platform.openai.com/docs/guides/prompt-engineering

### Stance Classification Research

**Findings**:
- LLM-based classification achieves 85-90% accuracy for stance detection
- Prompt engineering critical for accuracy
- Confidence scores help identify uncertain classifications
- Per-question classification more accurate than general sentiment

**Resources**:
- Stance Detection Survey: https://arxiv.org/abs/2008.04914
- Fine-tuning BERT: https://huggingface.co/docs/transformers/training

### Multi-Document Summarization

**Findings**:
- Argument extraction + aggregation preserves source transparency
- RAG approach better for citations but more complex
- LLM summarization good for coherence but may lose nuance

**Resources**:
- Multi-Document Summarization Survey: https://arxiv.org/abs/2004.14784
- RAG Explained: https://www.pinecone.io/learn/retrieval-augmented-generation/

## Cost Analysis

### Monthly Cost Estimate (1000 articles)

**OpenAI GPT-4 Turbo**:
- Question validation: ~$20/month
- Stance classification: ~$50/month (per article-question-month triad)
- Evidence extraction: ~$40/month (deferred to later phase)
- Embeddings (if used): ~$5/month
- **Total: ~$75/month** (within $200-300 budget, evidence extraction deferred)

**Optimization Strategies**:
- Batch API: 50% cost reduction
- Prompt optimization: 20-30% token reduction
- Caching: 10-20% cost reduction
- **Optimized Total: ~$70-90/month**

## Performance Targets

- Question extraction: < 30 seconds per topic (10-50 articles)
- Stance classification: 10 articles per minute
- Verdict calculation: < 5 seconds per question
- Batch processing: 100 articles per hour
- API success rate: 99% (after retries)

## Risk Mitigation

1. **LLM Inconsistency**: Validation rules, confidence thresholds, sample review
2. **API Costs**: Batch processing, caching, model selection, prompt optimization
3. **Bias in Classification**: Regular audits, manual review samples
4. **Performance**: Async processing, queue system, materialized views
5. **Data Quality**: Validation at each step, error handling

## Implementation Readiness

✅ **All research complete** - No NEEDS CLARIFICATION items remaining

All technical decisions made:
- LLM provider and model selected
- Processing strategy defined
- Database design determined
- Caching strategy defined
- Error handling approach defined
- Quality assurance method defined

Ready to proceed to Phase 1: Design & Contracts

