# LLM Data Storage Implementation

## Overview

All LLM-generated data is now **stored in the database** to avoid repeated API costs. Data is generated once and reused for all subsequent requests.

## Storage Strategy

### 1. Question Context Blurbs
- **Storage**: `Question.contextBlurb` (Text field)
- **Generation**: Batch script `npm run db:generate:context-blurbs`
- **Usage**: Displayed on topic cards and question pages
- **Cost**: One-time per question

### 2. Timeline Events
- **Storage**: `TimelineEvent` table
- **Generation**: Batch script `npm run db:generate:timeline-events` OR first API call with `generate=true`
- **Usage**: Displayed on question/topic detail pages
- **Cost**: One-time per question/topic

### 3. Overview Bullets
- **Storage**: `Verdict.overviewBullets` (JSONB array of strings)
- **Generation**: First call to `/api/debate/<questionId>` for a verdict
- **Usage**: "Understand" section on debate cards
- **Cost**: One-time per verdict (question + month)

### 4. Quotes (Majority & Opposing)
- **Storage**: `EvidenceBullet` table
  - `type = 'Why'` → Quotes aligned with majority verdict
  - `type = 'Dissent'` → Quotes opposing the majority
- **Generation**: First call to `/api/debate/<questionId>` for a verdict
- **Usage**: "Quotes" section on debate cards
- **Cost**: One-time per verdict (question + month)

### 5. Featured Perspective
- **Storage**: `Verdict.featuredPerspective` (JSONB object)
- **Generation**: First call to `/api/debate/<questionId>` for a verdict
- **Usage**: "Featured Perspective" section on debate cards
- **Cost**: One-time per verdict (question + month)

### 6. Points for Debate
- **Storage**: `EvidenceBullet` table (`type = 'Unknown'`)
- **Generation**: First call to `/api/debate/<questionId>` for a verdict
- **Usage**: "Points for Debate" section on debate cards
- **Cost**: One-time per verdict (question + month)

## How It Works

### First Request Flow

1. User views question page → API calls `/api/debate/<questionId>`
2. Service checks `Verdict` table for stored data:
   - ✅ If `overviewBullets` exists → use stored
   - ❌ If missing → generate with LLM → store in `Verdict.overviewBullets`
3. Service checks `EvidenceBullet` for quotes:
   - ✅ If `Why`/`Dissent` bullets exist → use stored
   - ❌ If missing → generate with LLM → store in `EvidenceBullet`
4. Service checks `Verdict.featuredPerspective`:
   - ✅ If exists → use stored
   - ❌ If missing → generate with LLM → store in `Verdict.featuredPerspective`
5. Service checks `EvidenceBullet` for points:
   - ✅ If `Unknown` bullets exist → use stored
   - ❌ If missing → generate from opposing arguments → store in `EvidenceBullet`

### Subsequent Requests

- All data is read from database (no LLM calls)
- Zero additional LLM costs for the same question/month

## Data Regeneration

### When Does Data Regenerate?

- **New Month**: When a new verdict is calculated for a new month period, debate card data will be generated for that new month
- **Manual Regeneration**: Delete stored data and view page again, or update verdict to clear stored fields

### How to Force Regeneration

```sql
-- Clear overview bullets and featured perspective for a verdict
UPDATE verdicts 
SET "overviewBullets" = NULL, "featuredPerspective" = NULL 
WHERE id = '<verdict-id>';

-- Delete evidence bullets (quotes and points for debate)
DELETE FROM evidence_bullets WHERE "verdictId" = '<verdict-id>';
```

Then view the question page again - it will regenerate and store the data.

## Cost Optimization

### Before (On-Demand)
- Every page view = LLM calls for overview bullets, quotes, featured perspective
- 100 page views = 100x LLM costs

### After (Stored)
- First page view = LLM calls (one-time cost)
- Subsequent 99 page views = $0 LLM costs (read from DB)

### Estimated Savings
- **Per Question/Month**: ~$0.10-0.15 one-time cost
- **Per 1000 Views**: Saves ~$10-15 in repeated LLM costs

## Migration

The migration `20251224084249_add_debate_card_storage` adds:
- `Verdict.overviewBullets` (JSONB)
- `Verdict.featuredPerspective` (JSONB)

Run migrations:
```bash
npm run db:migrate:deploy
npm run db:generate
```

## Troubleshooting

### Data Not Storing

1. Check migration applied: `npm run db:migrate:deploy`
2. Check Prisma client regenerated: `npm run db:generate`
3. Check API logs for errors during generation
4. Verify `OPENAI_API_KEY` is set (generation will fail silently if not)

### Stale Data

If you want to regenerate data for a verdict:
1. Clear stored fields (see SQL above)
2. View the question page again
3. Data will regenerate and store

### Rate Limits

The batch scripts (`generateContextBlurbs`, `generateTimelineEvents`) include:
- 2-second delays between requests
- Exponential backoff for rate limit errors (10s, 20s, 40s)
- 3 retry attempts

If you still hit rate limits:
- Process fewer questions at once (use `--question-id` flag)
- Increase delays in scripts
- Use OpenAI's rate limit dashboard to check your limits

