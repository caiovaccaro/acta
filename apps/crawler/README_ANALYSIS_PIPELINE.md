# Article Analysis Pipeline - Manual Execution Guide

## Overview

The article analysis pipeline processes crawled articles to:
1. **Match articles to topics** - Assign articles to pre-defined topics
2. **Match articles to questions** - Match articles to validated questions
3. **Classify stances** - Determine each article's stance on questions
4. **Calculate verdicts** - Generate consensus verdicts from article stances

## Workflow

The system is designed for **manual execution**:

1. **Daily**: Manually crawl articles from free outlets
   ```bash
   npm run crawler:start
   ```

2. **Regularly/Ad-hoc**: Manually execute the analysis pipeline
   ```bash
   npm run analyze:articles
   ```

## Manual Execution

### Basic Usage

Run the full analysis pipeline on all articles:

```bash
# From project root
npm run analyze:articles

# Or from crawler directory
cd apps/crawler
npm run analyze:articles
```

### Filtered Execution

Run analysis on specific topics or questions:

```bash
# Analyze articles for a specific topic
npm run analyze:articles -- --topic-id=<topic-id>

# Analyze articles for a specific question
npm run analyze:articles -- --question-id=<question-id>

# Limit number of articles processed
npm run analyze:articles -- --limit=50
```

## Environment Variables

Add to your `.env` file:

```env
# LLM Configuration
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT=30000
```

## Current Status

### ✅ Phase 1 Complete (Foundation)

- Database repositories for all entities
- LLM provider abstraction (OpenAI implemented)
- Validation framework with 7 default checks
- Manual execution script structure

### 🚧 Phase 2 In Progress

- Topic matching implementation
- Question matching implementation
- Stance classification implementation
- Verdict calculation implementation

## Pipeline Steps

When Phase 2 is complete, the pipeline will:

1. **Topic Matching**
   - Match articles to pre-defined topics using keyword matching
   - Create `TopicArticle` relationships
   - Only matching articles are processed further

2. **Question Matching**
   - Match articles to validated questions
   - Only matching articles are analyzed for stance

3. **Stance Classification**
   - For each article-question pair, classify stance using LLM
   - Store in `ArticleAnalysis` with month period
   - Track confidence and reasoning

4. **Verdict Calculation**
   - Aggregate all stances for each question
   - Calculate support share and variance
   - Determine verdict label and confidence
   - Store in `Verdict` table

## Database Schema

The pipeline uses these tables:
- `topics` - Pre-defined topics
- `questions` - Validated questions linked to topics
- `topic_articles` - Many-to-many article-topic relationships
- `article_analyses` - Per-article stance classifications
- `verdicts` - Consensus verdicts per question
- `evidence_bullets` - Evidence supporting verdicts (Phase 3)

## Next Steps

1. Implement topic matching logic
2. Implement question matching logic
3. Implement stance classification using LLM provider
4. Implement verdict calculation algorithm
5. Add monthly period tracking utilities

