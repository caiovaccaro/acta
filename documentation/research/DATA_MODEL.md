# Data Model for Article Analysis & Verdict Pipeline

## Overview

This document defines the database schema for the article analysis and verdict generation system.

## Key Concepts

1. **Topic**: Broad theme/subject (e.g., "Gaza", "Drug Policy", "AI Regulation")
2. **Question**: Specific ideological question extracted from articles about a topic (e.g., "Is what's happening in Gaza a genocide?")
3. **Article Analysis**: Per-article stance on a specific question
4. **Verdict**: Consensus stance on a question, calculated from all article analyses
5. **Evidence Bullet**: Supporting evidence for a verdict

## Data Flow

```
Articles → Topics → Questions → Article Analyses → Verdict → Evidence Bullets
```

1. Articles are assigned to Topics (many-to-many possible, but typically one-to-many)
2. Questions are extracted from articles about a Topic (one-to-many: Topic → Questions)
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
  topicArticles      TopicArticle[] // Many-to-many with Articles

  @@map("topics")
}
```

### Question

The specific ideological question extracted from articles about a topic.

```prisma
model Question {
  id                  String   @id @default(uuid())
  topicId             String
  questionText        String   @db.Text // e.g., "Is what's happening in Gaza a genocide?"
  extractedAt         DateTime @default(now())
  confidence          Float?   // LLM confidence in question extraction
  sourceArticlesCount Int      @default(0) // Number of articles used to extract question
  isActive            Boolean  @default(true) // Can deactivate outdated questions
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  topic               Topic            @relation(fields: [topicId], references: [id], onDelete: Cascade)
  articleAnalyses     ArticleAnalysis[]
  verdict             Verdict?
  evidenceBullets     EvidenceBullet[]

  @@index([topicId])
  @@index([isActive])
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

### ArticleAnalysis

Per-article stance on a specific question.

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
  stance      Stance
  ideology    Ideology // Actual article ideology (not outlet ideology)
  confidence  Float    // 0-1, LLM confidence in classification
  reasoning   String?  @db.Text // LLM reasoning for stance
  analyzedAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([articleId, questionId]) // One analysis per article-question pair
  @@index([questionId])
  @@index([articleId])
  @@index([stance])
  @@index([ideology])
  @@map("article_analyses")
}
```

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
  articleAnalyses  ArticleAnalysis[]
  evidenceBullets  EvidenceBullet[]
}
```

## Indexes Summary

**Performance Critical:**
- `questions.topicId` - Find questions for a topic
- `article_analyses.questionId` - Find all analyses for a question (consensus calculation)
- `article_analyses.articleId` - Find all analyses for an article
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

### Get all article analyses for a question
```typescript
const analyses = await prisma.articleAnalysis.findMany({
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

1. Create new tables (Topic, Question, ArticleAnalysis, Verdict, EvidenceBullet, TopicArticle)
2. Migrate existing data:
   - Create topics from PRD (3 initial topics)
   - Assign articles to topics (keyword-based initially)
   - Extract questions (LLM or pre-defined)
   - Analyze articles (batch process)
   - Calculate verdicts
   - Generate evidence bullets

