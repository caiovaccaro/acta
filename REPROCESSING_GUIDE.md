# Reprocessing Articles for New LLM Features

This guide explains how to reprocess articles to generate all the new LLM-based data points.

## Overview

The new features require different processing approaches:

1. **Question Context Blurbs** - Stored in database, needs batch generation
2. **Overview Bullets** - Generated on-demand when debate card is requested
3. **Quotes** - Generated on-demand when debate card is requested  
4. **Featured Perspective** - Generated on-demand when debate card is requested
5. **Timeline Events** - Generated on-demand when timeline is requested (or via API with `generate=true`)

## Required Commands

### 1. Reprocess Articles (Stance Classification & Verdicts)

This is the main pipeline that processes articles for stance classification and calculates verdicts. This needs to be run first because the new LLM features depend on article stances.

```bash
# Process all articles
npm run analyze:articles

# Process articles for a specific topic
npm run analyze:articles -- --topic-id=<topic-id>

# Process articles for a specific question
npm run analyze:articles -- --question-id=<question-id>

# Limit number of articles (useful for testing)
npm run analyze:articles -- --limit=50
```

**What this does:**
- Matches articles to topics
- Matches articles to questions
- Classifies article stances on questions (using LLM)
- Calculates verdicts from stances

**When to run:**
- After crawling new articles
- When you want to update stance classifications
- Before generating context blurbs (they need article data)

### 2. Generate Question Context Blurbs

Generates and stores 2-3 sentence context blurbs for questions. These are stored in the database and displayed on topic cards.

```bash
# Generate blurbs for all active questions that don't have one
npm run db:generate:context-blurbs

# Generate blurb for a specific question
npm run db:generate:context-blurbs -- --question-id=<question-id>

# Force regenerate (even if blurb exists)
npm run db:generate:context-blurbs -- --force
```

**What this does:**
- Finds active questions without context blurbs
- Gets articles for each question
- Uses LLM to generate 2-3 sentence context blurb
- Stores blurb in `Question.contextBlurb` field

**When to run:**
- After running article analysis pipeline
- When you want to populate context blurbs for topic cards
- After adding new questions

### 3. Generate Timeline Events

Generates and stores timeline events for questions. These are stored in the database and displayed on question/topic pages.

```bash
# Generate timeline events for all active questions that don't have them
npm run db:generate:timeline-events

# Generate for a specific question
npm run db:generate:timeline-events -- --question-id=<question-id>

# Generate for all questions in a topic
npm run db:generate:timeline-events -- --topic-id=<topic-id>

# Force regenerate (even if events exist)
npm run db:generate:timeline-events -- --force
```

**What this does:**
- Finds active questions without timeline events
- Gets articles for each question
- Uses LLM to generate chronological timeline events
- Stores events in `TimelineEvent` table

**When to run:**
- After running article analysis pipeline
- When you want to populate timeline sections
- After adding new questions

### 4. Debate Card Data (Auto-Generated on First View, Then Stored)

These are generated automatically the first time you view a question/topic page, then stored for reuse:

- **Overview Bullets** - Generated on first `/api/debate/<questionId>` call, stored in `Verdict.overviewBullets`
- **Quotes** - Generated on first call, stored in `EvidenceBullet` (Why = majority, Dissent = opposing)
- **Featured Perspective** - Generated on first call, stored in `Verdict.featuredPerspective`
- **Points for Debate** - Generated on first call, stored in `EvidenceBullet` (Unknown type)

**Note:** The first time you view a question page, these will be generated with LLM and stored. Subsequent views use the stored data (no LLM costs).

## Complete Workflow

### Initial Setup (First Time)

```bash
# 1. Ensure database is migrated
npm run db:migrate:deploy  # Apply pending migrations

# 2. Regenerate Prisma client (after schema changes)
npm run db:generate

# 3. Seed topics and questions (if needed)
npm run db:seed:topics
npm run db:seed:questions

# 4. Crawl articles (if you have articles to crawl)
npm run crawler:start

# 5. Process articles (stance classification & verdicts)
npm run analyze:articles

# 6. Generate context blurbs for questions
npm run db:generate:context-blurbs

# 7. Generate timeline events for questions
npm run db:generate:timeline-events

# 8. Calculate verdicts (if not done in step 5)
npm run db:calculate:verdicts

# 9. View question pages to trigger debate card generation (first time only)
# Open http://localhost:3000/questions/<question-id> for each question
# This will generate and store: overview bullets, quotes, featured perspective, points for debate
```

### Regular Updates (After New Articles)

```bash
# 1. Crawl new articles
npm run crawler:start

# 2. Process new articles (this will recalculate verdicts)
npm run analyze:articles

# 3. Regenerate context blurbs for new/updated questions
npm run db:generate:context-blurbs

# 4. Regenerate timeline events (if needed)
npm run db:generate:timeline-events

# Note: Debate card data (overview bullets, quotes, featured perspective) 
# will be auto-regenerated when verdicts change (new month period)
# You don't need to manually regenerate these
```

### Testing Specific Question/Topic

```bash
# 1. Process articles for specific question
npm run analyze:articles -- --question-id=<question-id>

# 2. Generate context blurb for that question
npm run db:generate:context-blurbs -- --question-id=<question-id>

# 3. Generate timeline events for that question
npm run db:generate:timeline-events -- --question-id=<question-id>

# 4. View in frontend - overview bullets, quotes will generate on-demand (will be cached in next update)
```

## Environment Variables Required

Make sure your `.env` file has:

```env
# Database
DATABASE_URL=postgresql://...

# LLM (required for all new features)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview  # or gpt-4o, etc.
```

## What Gets Generated When

| Feature | When Generated | Stored? | Command |
|---------|---------------|---------|---------|
| Stance Classifications | `analyze:articles` | ✅ Yes (ArticleAnalysisAttempt) | `npm run analyze:articles` |
| Verdicts | `analyze:articles` or `db:calculate:verdicts` | ✅ Yes (Verdict) | `npm run analyze:articles` |
| Context Blurbs | `db:generate:context-blurbs` | ✅ Yes (Question.contextBlurb) | `npm run db:generate:context-blurbs` |
| Timeline Events | `db:generate:timeline-events` | ✅ Yes (TimelineEvent) | `npm run db:generate:timeline-events` |
| Overview Bullets | Auto (first API call) | ✅ Yes (Verdict.overviewBullets) | View question page (first time) |
| Quotes | Auto (first API call) | ✅ Yes (EvidenceBullet: Why/Dissent) | View question page (first time) |
| Featured Perspective | Auto (first API call) | ✅ Yes (Verdict.featuredPerspective) | View question page (first time) |
| Points for Debate | Auto (first API call) | ✅ Yes (EvidenceBullet: Unknown) | View question page (first time) |

## Troubleshooting

### No LLM Data Appearing

1. **Check API Key**: Ensure `OPENAI_API_KEY` is set in `.env`
2. **Check Logs**: Look for "LLM not available" warnings in API logs
3. **Check Articles**: Ensure articles have been processed (`npm run analyze:articles`)
4. **Check Questions**: Ensure questions are active (`isActive: true`)

### Context Blurbs Not Showing

1. **Generate them**: Run `npm run db:generate:context-blurbs`
2. **Check database**: Verify `Question.contextBlurb` field has data
3. **Check API response**: Verify `/api/topics` returns `firstQuestion.contextBlurb`

### Timeline Not Generating

1. **Call with generate flag**: Use `?generate=true` in API call
2. **Check articles**: Ensure articles exist for the question/topic
3. **Check logs**: Look for LLM errors in API logs

## Cost Considerations

- **Stance Classification**: ~$0.01-0.03 per article (one-time cost)
- **Context Blurbs**: ~$0.01 per question (one-time cost)
- **Overview Bullets**: ~$0.02 per request (on-demand)
- **Quotes**: ~$0.01 per article analyzed (on-demand)
- **Featured Perspective**: ~$0.02 per request (on-demand)
- **Timeline**: ~$0.03 per request (on-demand, cached after first generation)

**Tip**: For development, you can disable LLM and use fallback heuristics by not setting `OPENAI_API_KEY`. The app will still work but with simpler data.

