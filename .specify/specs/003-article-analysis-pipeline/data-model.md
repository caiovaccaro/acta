# Data Model: Article Analysis & Verdict Pipeline

**Feature**: Article Analysis & Verdict Pipeline  
**Date**: 2025-01-27

## Overview

This document defines the database schema for the article analysis and verdict generation system. The model extends the existing `modules/db` Prisma schema with new entities for topics, questions, article analyses, verdicts, and evidence.

**Important**: Ideology exists in the backend (tied to outlets) and is used for internal weighting calculations, but is **NEVER exposed in the UI or API responses**. Article ideology is inferred from outlet ideology when needed for consensus calculations.

## Key Concepts

1. **Topic**: Broad theme/subject (e.g., "Gaza", "Drug Policy", "AI Regulation")
2. **Question**: Specific ideological question extracted from articles about a topic (e.g., "Is what's happening in Gaza a genocide?")
3. **ArticleAnalysis**: Per-article stance on a specific question
4. **Verdict**: Consensus stance on a question, calculated from all article analyses
5. **EvidenceBullet**: Supporting evidence for a verdict

## Data Flow

```
Articles → Topics → Questions → Article Analyses → Verdict → Evidence Bullets
```

1. Articles are assigned to Topics (many-to-many via TopicArticle)
2. Questions are linked to Topics (one-to-many: Topic → Questions)
3. Each Article is analyzed for each Question (many-to-many: Articles ↔ Questions via ArticleAnalysis)
4. Verdict is calculated from all ArticleAnalyses for a Question (one-to-one: Question → Verdict)
5. Evidence Bullets are generated from articles and linked to Verdict (one-to-many: Verdict → EvidenceBullets)

## Database Schema

### Topic

The broad theme or subject matter.

```prisma
model Topic {
  id                  String   @id @default(uuid())
  name                String   @unique // e.g., "Gaza", "Drug Policy"
  description         String?  @db.Text
  safetyNoteRequired  Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  questions           Question[]
  topicArticles      TopicArticle[]

  @@map("topics")
}
```

**Validation Rules**:
- `name` must be unique
- `name` is required
- `description` is optional

**Indexes**:
- Primary key on `id`
- Unique index on `name`

### Question

The specific ideological question extracted from articles about a topic.

```prisma
enum QuestionValidationStatus {
  pending
  validated
  rejected
  needs_reformulation
}

model Question {
  id                  String                    @id @default(uuid())
  topicId             String
  questionText        String                    @db.Text // e.g., "Is what's happening in Gaza a genocide?"
  originalQuestionText String?                  @db.Text // Original text before reformulation (if polished)
  extractedAt         DateTime                  @default(now())
  confidence          Float?                    // LLM confidence in question extraction (0-1)
  sourceArticlesCount Int                       @default(0) // Number of articles used to extract question
  validationStatus    QuestionValidationStatus  @default(pending) // Framework validation status
  validationResults   Json?                     // Results of 7 framework checks with pass/fail and notes
  isActive            Boolean                   @default(false) // Only true if validationStatus = 'validated'
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt

  // Relations
  topic               Topic            @relation(fields: [topicId], references: [id], onDelete: Cascade)
  articleAnalyses     ArticleAnalysis[]
  verdict             Verdict?
  evidenceBullets     EvidenceBullet[]

  @@index([topicId])
  @@index([isActive])
  @@index([validationStatus])
  @@map("questions")
}
```

**Validation Rules**:
- `questionText` must be non-empty
- `topicId` must reference existing Topic
- `confidence` must be between 0 and 1 if provided
- `sourceArticlesCount` must be >= 0

**Indexes**:
- Primary key on `id`
- Index on `topicId` (foreign key)
- Index on `isActive` (for filtering active questions)

### TopicArticle (Join Table)

Links articles to topics (many-to-many relationship).

```prisma
model TopicArticle {
  id        String   @id @default(uuid())
  topicId   String
  articleId String
  assignedAt DateTime @default(now())
  confidence Float?   // Confidence in topic assignment (0-1)

  // Relations
  topic     Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([topicId, articleId])
  @@index([topicId])
  @@index([articleId])
  @@map("topic_articles")
}
```

**Validation Rules**:
- Unique constraint on `(topicId, articleId)` - one assignment per article-topic pair
- `confidence` must be between 0 and 1 if provided

**Indexes**:
- Primary key on `id`
- Unique constraint on `(topicId, articleId)`
- Index on `topicId` (for finding articles by topic)
- Index on `articleId` (for finding topics by article)

### ArticleAnalysis

Per-article stance on a specific question for a specific month period.

**Key Concept**: Stances are always recorded per month, using data from the last month as the current month. This creates a triad relationship: Question > Article > Month, allowing tracking of how stances evolve over time.

```prisma
enum Stance {
  Yes
  LeaningYes
  Neutral
  LeaningNo
  No
}

model ArticleAnalysis {
  id          String   @id @default(uuid())
  articleId   String
  questionId  String
  month       DateTime // Month period (YYYY-MM-01 format, always first day of month)
  stance      Stance
  confidence  Float    // 0-1, LLM confidence in classification
  reasoning   String?  @db.Text // LLM reasoning for stance
  analyzedAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([articleId, questionId, month]) // One analysis per article-question-month triad
  @@index([questionId])
  @@index([articleId])
  @@index([month])
  @@index([questionId, month]) // Composite index for monthly verdict calculation
  @@index([stance])
  @@map("article_analyses")
}
```

**Validation Rules**:
- `stance` must be one of: Yes, LeaningYes, Neutral, LeaningNo, No
- `confidence` must be between 0 and 1
- `month` must be the first day of a month (YYYY-MM-01 format)
- Unique constraint on `(articleId, questionId, month)` - one analysis per article-question-month triad
- `articleId` must reference existing Article
- `questionId` must reference existing Question

**Indexes**:
- Primary key on `id`
- Unique constraint on `(articleId, questionId, month)`
- Index on `questionId` (for finding all analyses for a question)
- Index on `articleId` (for finding all analyses for an article)
- Index on `month` (for filtering by time period)
- Composite index on `(questionId, month)` (for monthly verdict calculation)
- Index on `stance` (for filtering by stance)

**Note**: 
- Ideology is NOT stored in ArticleAnalysis. Article ideology is inferred from outlet ideology (`article.outlet.ideology`) for internal consensus calculations only. Ideology is **NEVER** exposed in API responses or UI - it is backend-only for weighting purposes.
- The `month` field always uses the first day of the month (e.g., 2025-01-01 for January 2025) to ensure consistent grouping and querying.
- Stances are calculated using data from the last month as the current month, enabling historical tracking and trend analysis.

### Verdict

Consensus stance on a question, calculated from all article analyses.

```prisma
enum VerdictLabel {
  Yes
  LeaningYes
  Split
  LeaningNo
  No
}

model Verdict {
  id           String      @id @default(uuid())
  questionId   String      @unique // One verdict per question
  verdictLabel VerdictLabel
  confidence   Float       // 0-100, overall confidence
  supportShare Float       // 0-1, aggregate support (S)
  variance     Float       // 0-1, ideological dispersion
  calculatedAt DateTime    @default(now())
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  // Relations
  question     Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)
  evidenceBullets EvidenceBullet[]

  @@index([verdictLabel])
  @@index([confidence])
  @@map("verdicts")
}
```

**Validation Rules**:
- `verdictLabel` must be one of: Yes, LeaningYes, Split, LeaningNo, No
- `confidence` must be between 0 and 100
- `supportShare` must be between 0 and 1
- `variance` must be between 0 and 1
- Unique constraint on `questionId` - one verdict per question

**Indexes**:
- Primary key on `id`
- Unique constraint on `questionId`
- Index on `verdictLabel` (for filtering by verdict)
- Index on `confidence` (for sorting/filtering)

### EvidenceBullet

Supporting evidence for a verdict.

```prisma
enum EvidenceType {
  Why      // Supporting evidence
  Dissent  // Opposing view
  Unknown  // What's still unclear
}

model EvidenceBullet {
  id        String       @id @default(uuid())
  verdictId String
  text      String       @db.Text
  articleId String?      // Source article (optional, can be synthesized)
  type      EvidenceType
  order     Int          // For ordering bullets
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  // Relations
  verdict   Verdict      @relation(fields: [verdictId], references: [id], onDelete: Cascade)
  article   Article?     @relation(fields: [articleId], references: [id], onDelete: SetNull)

  @@index([verdictId])
  @@index([type])
  @@map("evidence_bullets")
}
```

**Validation Rules**:
- `text` must be non-empty
- `type` must be one of: Why, Dissent, Unknown
- `order` must be >= 0 (for ordering)
- `verdictId` must reference existing Verdict
- `articleId` is optional (can be synthesized)

**Indexes**:
- Primary key on `id`
- Index on `verdictId` (for finding all evidence for a verdict)
- Index on `type` (for filtering by type)

## Updated Article Model

Add relations to new entities:

```prisma
model Article {
  // ... existing fields ...
  
  // New relations
  topicArticles    TopicArticle[]
  articleAnalyses  ArticleAnalysis[]
  evidenceBullets  EvidenceBullet[]
}
```

## Indexes Summary

**Performance Critical Indexes**:
- `questions.topicId` - Find questions for a topic
- `article_analyses.questionId` - Find all analyses for a question
- `article_analyses.articleId` - Find all analyses for an article
- `article_analyses.month` - Filter by time period
- `article_analyses(questionId, month)` - Composite index for monthly verdict calculation
- `article_analyses.stance` - Filter by stance
- `verdicts.questionId` - Get verdict for a question (unique)
- `evidence_bullets.verdictId` - Get evidence for a verdict (future phase)
- `topic_articles.topicId` - Find articles by topic
- `topic_articles.articleId` - Find topics by article

## Example Queries

### Get all questions for a topic
```typescript
const questions = await prisma.question.findMany({
  where: { topicId: topicId, isActive: true },
  include: { verdict: true }
});
```

### Get all article analyses for a question (current month)
```typescript
const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const analyses = await prisma.articleAnalysis.findMany({
  where: { 
    questionId: questionId,
    month: currentMonth
  },
  include: { 
    article: { 
      include: { outlet: true } 
    } 
  }
});
```

### Get article analyses for a question over time (all months)
```typescript
const analyses = await prisma.articleAnalysis.findMany({
  where: { questionId: questionId },
  orderBy: { month: 'asc' },
  include: { 
    article: { 
      include: { outlet: true } 
    } 
  }
});
```

### Get verdict with evidence for a question
```typescript
const verdict = await prisma.verdict.findUnique({
  where: { questionId: questionId },
  include: {
    evidenceBullets: {
      include: { article: true },
      orderBy: { order: 'asc' }
    },
    question: {
      include: { topic: true }
    }
  }
});
```

### Get articles for a topic
```typescript
const articles = await prisma.topicArticle.findMany({
  where: { topicId: topicId },
  include: { article: { include: { outlet: true } } }
});
```

## Migration Strategy

1. Create new tables (Topic, Question, ArticleAnalysis, Verdict, EvidenceBullet, TopicArticle)
2. Add relations to existing Article model
3. Create indexes for performance
4. Migrate existing data:
   - Create topics from PRD (3 initial topics)
   - Assign articles to topics (keyword-based initially)
   - Create pre-defined questions
   - Process articles (batch)
   - Calculate verdicts
   - Generate evidence bullets

## Data Integrity

- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicates (TopicArticle, ArticleAnalysis)
- Cascade deletes: Deleting Topic deletes Questions, deleting Question deletes Verdict
- Set null: Deleting Article sets articleId to null in EvidenceBullet (preserves evidence text)

