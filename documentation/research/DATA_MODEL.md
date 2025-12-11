# Data Model for Article Analysis & Verdict Pipeline

## Overview

This document defines the database schema for the article analysis and verdict generation system.

**Important**: 
- **Question Validation**: All questions must be validated against the formulation framework (see `documentation/formulating_questions.md`) before activation. The `validationStatus` field tracks this process.
- **Ideology**: Ideology exists in the backend (tied to outlets) and is used for internal weighting calculations, but is **NEVER exposed in the UI or API responses**. Article ideology is inferred from outlet ideology when needed for consensus calculations.

## Key Concepts

1. **Topic**: Broad theme/subject (e.g., "Gaza", "Drug Policy", "AI Regulation")
2. **Question**: Specific ideological question extracted from articles about a topic (e.g., "Is what's happening in Gaza a genocide?")
3. **Article Analysis Attempt**: Per-article stance classification attempt on a specific question (includes all attempts, even rejections)
4. **Article Stance**: Successfully classified article stances on questions (only successful classifications)
5. **Verdict**: Consensus stance on a question, calculated from all article stances
6. **Evidence Bullet**: Supporting evidence for a verdict

## Data Flow

```
Articles → Topics → Questions → Article Analyses → Verdict → Evidence Bullets
```

1. Articles are assigned to Topics (many-to-many possible, but typically one-to-many)
2. Questions are extracted from articles about a Topic (one-to-many: Topic → Questions)
3. Each Article is analyzed for each Question (many-to-many: Articles ↔ Questions via ArticleAnalysisAttempt)
4. Successful classifications are tracked in ArticleStance (one-to-one: ArticleAnalysisAttempt → ArticleStance)
5. Verdict is calculated from all ArticleStances for a Question (one-to-one: Question → Verdict)
6. Evidence Bullets are generated from articles and linked to Verdict (one-to-many: Verdict → EvidenceBullets)

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
  topicArticles      TopicArticle[] // Many-to-many with Articles

  @@map("topics")
}
```

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
  articleAnalysisAttempts ArticleAnalysisAttempt[]
  articleStances      ArticleStance[]
  verdict             Verdict?
  evidenceBullets     EvidenceBullet[]

  @@index([topicId])
  @@index([isActive])
  @@index([validationStatus])
  @@map("questions")
}
```

### TopicArticle (Join Table)

Links articles to topics (many-to-many relationship).

```prisma
model TopicArticle {
  id        String   @id @default(uuid())
  topicId   String
  articleId String
  assignedAt DateTime @default(now())
  confidence Float?   // Confidence in topic assignment

  // Relations
  topic     Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([topicId, articleId])
  @@index([topicId])
  @@index([articleId])
  @@map("topic_articles")
}
```

### ArticleAnalysisAttempt

Per-article stance classification attempt on a specific question. This table stores **all** classification attempts, including rejections and unclear classifications, providing a complete audit trail.

```prisma
enum Stance {
  YesItSeemsSo
  ProbablyYes
  Unclear
  ProbablyNot
  NoItDoesntSeemSo
}

model ArticleAnalysisAttempt {
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
  articleStances ArticleStance[] // Link to ArticleStance if successfully classified

  @@unique([articleId, questionId, month]) // One analysis attempt per article-question-month triad
  @@index([questionId])
  @@index([articleId])
  @@index([month])
  @@index([questionId, month]) // Composite index for monthly verdict calculation
  @@index([stance])
  @@map("article_analyses")
}
```

**Note**: 
- Ideology is NOT stored in ArticleAnalysisAttempt. Article ideology is inferred from outlet ideology (`article.outlet.ideology`) for internal consensus calculations only. Ideology is **NEVER** exposed in API responses or UI - it is backend-only for weighting purposes.
- This table stores **all** classification attempts, including rejections (Unclear with low confidence). Only successful classifications are linked to `ArticleStance`.

### ArticleStance

Successfully classified article stances on questions. This table only contains stances that resulted in successful classifications (not rejected/unclear).

```prisma
model ArticleStance {
  id                    String   @id @default(uuid())
  articleId             String
  questionId            String
  articleAnalysisAttemptId String   @unique // Link to ArticleAnalysisAttempt (required)
  matchedAt             DateTime @default(now())
  
  // Relations
  article               Article       @relation(fields: [articleId], references: [id], onDelete: Cascade)
  question              Question      @relation(fields: [questionId], references: [id], onDelete: Cascade)
  articleAnalysisAttempt ArticleAnalysisAttempt @relation(fields: [articleAnalysisAttemptId], references: [id], onDelete: Cascade)
  
  @@unique([articleId, questionId]) // One stance per article-question pair
  @@index([articleId])
  @@index([questionId])
  @@index([matchedAt])
  @@index([questionId, matchedAt]) // For querying "which articles have stances on this question"
  @@map("article_stances")
}
```

**Note**: This table is a clean index for quickly querying article stances tied to questions. It only contains successfully classified matches, making it ideal for UI reporting and linking.

### Verdict

Consensus stance on a question, calculated from all article stances (via ArticleStance).

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
  articleId String?     // Source article (optional, can be synthesized)
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

## Updated Article Model

Add relation to ArticleAnalysis:

```prisma
model Article {
  // ... existing fields ...
  
  // New relations
  topicArticles    TopicArticle[]
  articleAnalysisAttempts ArticleAnalysisAttempt[]
  articleStances   ArticleStance[]
  evidenceBullets  EvidenceBullet[]
}
```

## Indexes Summary

**Performance Critical:**
- `questions.topicId` - Find questions for a topic
- `article_analyses.questionId` - Find all analysis attempts for a question
- `article_stances.questionId` - Find all successful stances for a question (consensus calculation)
- `article_stances.articleId` - Find all stances for an article
- `article_analyses.stance` - Filter by stance
- `verdicts.questionId` - Get verdict for a question
- `evidence_bullets.verdictId` - Get evidence for a verdict

## Example Queries

### Get all questions for a topic
```typescript
const questions = await prisma.question.findMany({
  where: { topicId: topicId, isActive: true }
});
```

### Get all article stances for a question (successful classifications only)
```typescript
const stances = await prisma.articleStance.findMany({
  where: { questionId: questionId },
  include: { 
    article: { include: { outlet: true } },
    articleAnalysisAttempt: true
  }
});
```

### Get all article analysis attempts for a question (including rejections)
```typescript
const attempts = await prisma.articleAnalysisAttempt.findMany({
  where: { questionId: questionId },
  include: { article: { include: { outlet: true } } }
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
    }
  }
});
```

## Migration Strategy

1. Create new tables (Topic, Question, ArticleAnalysisAttempt, ArticleStance, Verdict, EvidenceBullet, TopicArticle)
2. Migrate existing data:
   - Create topics from PRD (3 initial topics)
   - Assign articles to topics (keyword-based initially)
   - Extract questions (LLM or pre-defined)
   - Analyze articles (batch process) - creates ArticleAnalysisAttempt records
   - Successful classifications create ArticleStance records
   - Calculate verdicts from ArticleStance records
   - Generate evidence bullets

