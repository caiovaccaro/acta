# Article Analysis & Verdict Pipeline

## Overview

This specification defines the implementation of the article analysis pipeline that processes crawled articles to extract questions, classify stances, and generate consensus verdicts.

## Key Decisions

- **LLM**: OpenAI GPT-4 Turbo (latest available)
- **Processing**: Batch with queue
- **Budget**: $200-300/month
- **Topics**: Pre-defined with **proactive matching** (only matching articles processed)
- **Questions**: Pre-defined with **proactive matching** and LLM validation
- **Future**: **Reactive detection** - all topics/questions detected, moderated later
- **Ideology**: Backend-only (tied to outlets) - Used for internal weighting, **NEVER exposed in UI**
- **Stance**: LLM-based (embeddings comparison later)
- **Synthesis**: Argument extraction + aggregation (RAG later)
- **Database**: Normalized + views/indexes
- **Caching**: Smart caching
- **Errors**: Retry with backoff (DLQ later)
- **QA**: Confidence thresholds + sample review

## Processing Modes

### MVP: Proactive Matching
- Articles matched to pre-defined topics/questions
- Only matching articles are processed
- Filtering approach - articles that don't match are skipped

### Future: Reactive Detection
- All topics/questions detected from articles
- Detected items require moderation/approval
- All articles processed, topics/questions discovered reactively

## Data Flow

```
Articles → Topics → Questions → Article Analyses → Verdict → Evidence Bullets
```

## Database Schema

See `documentation/research/DATA_MODEL.md` for complete schema.

Key tables:
- `Topic` - Broad themes
- `Question` - Questions extracted from articles
- `ArticleAnalysis` - Per-article stance on questions
- `Verdict` - Consensus stance on questions
- `EvidenceBullet` - Evidence supporting verdicts
- `TopicArticle` - Many-to-many link

## Implementation Phases

### Phase 1: Foundation
- Database schema
- LLM integration
- Pre-defined topics/questions
- Basic processing

### Phase 2: Core Analysis ✅
- Question extraction
- Stance classification
- Topic/question matching
- Article stance classification

### Phase 3: Verdict Calculation ✅
- Weighted consensus verdict calculation
- Monthly verdict tracking (one verdict per question per month)
- Historical verdict preservation
- LLM-based verdict reasoning generation
- Verdict summarization and logging tools

### Phase 4: Optimization (Future)
- Batch processing
- Caching
- Error handling
- Quality assurance
- Evidence extraction

## Related Documents

- `spec.md` - Full specification
- `documentation/research/article-analysis-pipeline.md` - Research
- `documentation/research/DECISION_MATRIX.md` - Decision analysis
- `documentation/research/DATA_MODEL.md` - Database schema

