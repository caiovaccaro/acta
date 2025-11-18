# Quick Start: Article Analysis Pipeline

**Feature**: Article Analysis & Verdict Pipeline  
**Date**: 2025-01-27

## Overview

This guide provides a quick start for implementing and using the article analysis pipeline. The pipeline processes crawled articles to extract questions, classify stances, and generate consensus verdicts.

**Important**: Ideology exists in the backend (tied to outlets) and is used for internal weighting calculations, but is **NEVER exposed in the UI or API responses**. Article ideology is inferred from outlet ideology when needed for consensus calculations.

## Prerequisites

- Node.js 20+
- PostgreSQL with pgvector
- OpenAI API key
- pnpm workspace setup

## Setup

### 1. Database Schema

Add new models to `modules/db/prisma/schema.prisma`:

```prisma
// Add enums
enum Stance {
  Yes
  LeaningYes
  Neutral
  LeaningNo
  No
}

enum VerdictLabel {
  Yes
  LeaningYes
  Split
  LeaningNo
  No
}

enum EvidenceType {
  Why
  Dissent
  Unknown
}

// Add models (see data-model.md for full schema)
model Topic { ... }
model Question { ... }
model TopicArticle { ... }
model ArticleAnalysis { ... }
model Verdict { ... }
model EvidenceBullet { ... }
```

Run migration:
```bash
cd modules/db
pnpm db:migrate
```

### 2. Install Dependencies

Add OpenAI SDK to `modules/core`:
```bash
cd modules/core
pnpm add openai
```

### 3. Environment Variables

Add to `.env`:
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
BATCH_SIZE=10
MAX_RETRIES=3
CONFIDENCE_THRESHOLD=0.7
```

## Implementation Steps

### Step 1: Create LLM Client

Create `modules/core/src/llm/client.ts`:

```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  // Implementation with exponential backoff
}
```

### Step 2: Create Prompt Templates

Create `modules/core/src/llm/prompts/stanceClassification.ts`:

```typescript
export function createStanceClassificationPrompt(
  question: string,
  articleTitle: string,
  articleContent: string
): string {
  return `Question: ${question}

Article Title: ${articleTitle}
Article Content: ${articleContent.substring(0, 2000)}

Classify the article's stance on this question:
- Yes: Strongly supports
- Leaning Yes: Moderately supports
- Neutral: No clear stance
- Leaning No: Moderately opposes
- No: Strongly opposes

Return: stance, confidence (0-1), reasoning`;
}
```

### Step 3: Create Topic Matcher

Create `modules/core/src/analysis/topicMatcher.ts`:

```typescript
export async function matchArticlesToTopics(
  articles: Article[],
  topics: Topic[]
): Promise<TopicArticle[]> {
  // Keyword-based matching logic
  // Returns TopicArticle[] for matching articles
}
```

### Step 4: Create Stance Classifier

Create `modules/core/src/analysis/stanceClassifier.ts`:

```typescript
export async function classifyStance(
  article: Article,
  question: Question
): Promise<ArticleAnalysis> {
  // LLM-based classification
  // Returns ArticleAnalysis with stance, confidence, reasoning
}
```

### Step 5: Create Verdict Calculator

Create `modules/core/src/analysis/verdictCalculator.ts`:

```typescript
export function calculateVerdict(
  analyses: ArticleAnalysis[],
  outlets: Outlet[]
): Verdict {
  // Pure function for consensus calculation
  // Infer article ideology from article.outlet.ideology (backend-only)
  // Weight by outlet credibility and normalize by ideology buckets
  // Returns Verdict with label, confidence, supportShare, variance
  // Note: Ideology used internally only, NEVER exposed in API/UI
}
```

### Step 6: Create Batch Processing Job

Create `apps/api/src/jobs/analysisPipeline.ts`:

```typescript
export async function processAnalysisPipeline() {
  // 1. Match articles to topics
  // 2. Match articles to questions
  // 3. Classify stances (batch)
  // 4. Calculate verdicts
  // 5. Extract evidence
}
```

## Usage

### 1. Create Topics

```typescript
import { createTopic } from '@acta/db';

const topic = await createTopic({
  name: 'Gaza',
  description: 'Gaza/Israel conflict',
  safetyNoteRequired: true,
});
```

### 2. Create Questions

```typescript
import { createQuestion } from '@acta/db';

const question = await createQuestion({
  topicId: topic.id,
  questionText: 'Is what\'s happening in Gaza a genocide?',
  sourceArticlesCount: 0,
});
```

### 3. Run Topic Matching

```typescript
import { matchArticlesToTopics } from '@acta/core';

const topicArticles = await matchArticlesToTopics(articles, topics);
```

### 4. Run Stance Classification

```typescript
import { classifyStance } from '@acta/core';

for (const article of articles) {
  for (const question of questions) {
    const analysis = await classifyStance(article, question);
    // Store in database
  }
}
```

### 5. Calculate Verdicts

```typescript
import { calculateVerdict } from '@acta/core';

const verdict = await calculateVerdict(analyses, outlets);
// Store in database
```

## Testing

### Unit Tests

```typescript
// modules/core/tests/analysis/verdictCalculator.test.ts
describe('calculateVerdict', () => {
  it('should calculate correct verdict from analyses', () => {
    const analyses = [/* ... */];
    const outlets = [/* ... */];
    const verdict = calculateVerdict(analyses, outlets);
    expect(verdict.verdictLabel).toBe('LeaningYes');
    expect(verdict.confidence).toBeGreaterThan(60);
  });
});
```

### Integration Tests

```typescript
// apps/api/tests/jobs/analysisPipeline.test.ts
describe('analysisPipeline', () => {
  it('should process articles end-to-end', async () => {
    // Test full pipeline
  });
});
```

## Monitoring

### Key Metrics

- Articles processed per hour
- Stance classification accuracy
- API cost per article
- Queue depth
- Error rate

### Logging

```typescript
console.log(`📊 Processed ${count} articles`);
console.log(`✅ Stance classification: ${successRate}% success`);
console.log(`💰 API cost: $${cost}`);
```

## Troubleshooting

### Low Confidence Classifications

- Review flagged analyses manually
- Adjust confidence threshold
- Improve prompts

### API Rate Limits

- Reduce batch size
- Implement exponential backoff
- Use batch API when possible

### High Costs

- Optimize prompts (reduce tokens)
- Use caching
- Batch API calls
- Review unnecessary LLM calls

## Next Steps

1. Implement topic matching
2. Implement question matching
3. Implement stance classification
4. Implement verdict calculation
5. Implement evidence extraction
6. Add batch processing job
7. Add monitoring and logging

