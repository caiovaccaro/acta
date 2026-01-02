# Hybrid Proactive/Reactive Approach - Implementation Plan

## Overview

This document outlines the plan to implement a hybrid approach that combines:
1. **Proactive Approach** (current): Pre-seeded topics and questions, validated afterwards
2. **Reactive Approach** (new): Auto-discover topics and questions from ingested articles, then validate them

## Updated Process Flow

```
1. Crawl Articles
   ↓
2. Seed Topics (Proactive)
   ↓
3. Seed Questions (Proactive)
   ↓
4. Validate Proactive Questions
   ↓
5. Topic Discovery (Reactive) - NEW
   ↓
6. Question Discovery (Reactive) - NEW
   ↓
7. Validate Reactive Topics & Questions
   ↓
8. Article Analysis (Topic/Question Matching + Stance Classification)
   ↓
9. Verdict Analysis
   ↓
10. Verdict Report
```

## Key Design Decisions

### 1. Source Tracking
- **Proactive items**: Created via seed scripts or admin interface
- **Reactive items**: Auto-discovered from articles, marked with `source: 'auto-discovered'`
- Both types go through the same validation pipeline
- Both types can be moderated/approved/rejected

### 2. Topic Discovery
- **Input**: All articles from recent crawl (configurable time window, e.g., last 7 days)
- **Method**: LLM-based topic extraction + clustering
- **Output**: Candidate topics with confidence scores
- **Status**: `pending_moderation` → `approved` / `rejected`
- **Deduplication**: Check against existing topics (by name similarity)

### 3. Question Discovery
- **Input**: Articles grouped by topic (both proactive and reactive topics)
- **Method**: LLM-based question extraction per topic
- **Output**: Candidate questions with confidence scores
- **Status**: `pending_moderation` → `validated` / `rejected`
- **Validation**: Same framework validation as proactive questions

### 4. Validation Pipeline
- **Unified**: Same validators work for both proactive and reactive items
- **Topics**: Basic validation (name uniqueness, description quality)
- **Questions**: Full framework validation (7 checks) + bar question validation

## Implementation Tasks

### Phase 1: Database Schema Updates

#### Task 1.1: Add Source Tracking to Topics
- **File**: `modules/db/prisma/schema.prisma`
- **Changes**:
  - Add `source` enum: `'seeded' | 'auto-discovered'`
  - Add `source` field to `Topic` model
  - Add `moderationStatus` enum: `'pending' | 'approved' | 'rejected'`
  - Add `moderationStatus` field to `Topic` model (default: `'approved'` for seeded, `'pending'` for auto-discovered)
  - Add `discoveredAt` DateTime field (nullable, for auto-discovered topics)
  - Add `discoveredFromArticles` Json field (array of article IDs that led to discovery)

#### Task 1.2: Add Source Tracking to Questions
- **File**: `modules/db/prisma/schema.prisma`
- **Changes**:
  - Add `source` field to `Question` model (same enum as topics)
  - Add `discoveredAt` DateTime field (nullable)
  - Add `discoveredFromArticles` Json field (array of article IDs)
  - Note: `validationStatus` already handles moderation for questions

#### Task 1.3: Migration
- **File**: `modules/db/prisma/migrations/YYYYMMDD_add_reactive_discovery_fields/migration.sql`
- **Changes**: Add new columns, update existing data (set `source: 'seeded'` for existing topics/questions)

### Phase 2: Topic Discovery Implementation

#### Task 2.1: Create Topic Discovery Service
- **File**: `modules/core/src/analysis/topicDiscovery.ts`
- **Functions**:
  - `discoverTopicsFromArticles(articles: Article[]): Promise<DiscoveredTopic[]>`
  - `deduplicateTopics(discovered: DiscoveredTopic[], existing: Topic[]): DiscoveredTopic[]`
- **LLM Prompt**: 
  - Analyze articles and extract main themes/topics
  - Return topics with names, descriptions, and confidence scores
  - Group similar topics together

#### Task 2.2: Create Topic Discovery LLM Provider Method
- **File**: `modules/core/src/llm/providers/openaiProvider.ts`
- **Method**: `discoverTopics(articles: Article[]): Promise<TopicDiscoveryResult>`
- **Prompt**: 
  ```
  Analyze the following articles and identify the main topics/themes being discussed.
  Return a JSON array of topics with:
  - name: Short, clear topic name
  - description: Brief description of what this topic covers
  - confidence: 0-1 confidence score
  - articleIds: Array of article IDs that support this topic
  ```

#### Task 2.3: Create Topic Discovery Script
- **File**: `modules/db/src/scripts/discoverTopics.ts`
- **Functionality**:
  - Fetch recent articles (configurable time window)
  - Call topic discovery service
  - Deduplicate against existing topics
  - Create topics with `source: 'auto-discovered'`, `moderationStatus: 'pending'`
  - Log discovered topics for review

#### Task 2.4: Add Topic Moderation Repository Methods
- **File**: `modules/db/src/repositories/topicRepository.ts`
- **Methods**:
  - `findTopicsByModerationStatus(status: ModerationStatus): Promise<Topic[]>`
  - `approveTopic(topicId: string): Promise<Topic>`
  - `rejectTopic(topicId: string): Promise<Topic>`

### Phase 3: Question Discovery Implementation

#### Task 3.1: Create Question Discovery Service
- **File**: `modules/core/src/analysis/questionDiscovery.ts`
- **Functions**:
  - `discoverQuestionsFromArticles(articles: Article[], topic: Topic): Promise<DiscoveredQuestion[]>`
  - `deduplicateQuestions(discovered: DiscoveredQuestion[], existing: Question[]): DiscoveredQuestion[]>`
- **LLM Prompt**:
  - Analyze articles about a topic and extract main questions being debated
  - Return questions with confidence scores
  - Focus on binary, evidence-based questions

#### Task 3.2: Create Question Discovery LLM Provider Method
- **File**: `modules/core/src/llm/providers/openaiProvider.ts`
- **Method**: `discoverQuestions(articles: Article[], topic: Topic): Promise<QuestionDiscoveryResult>`
- **Prompt**:
  ```
  Analyze the following articles about the topic "{topic.name}" and identify the main questions being debated.
  Return a JSON array of questions with:
  - questionText: The question as it appears in the articles
  - confidence: 0-1 confidence score
  - articleIds: Array of article IDs that mention this question
  Focus on questions that are:
  - Binary (yes/no, effective/ineffective)
  - Evidence-based
  - Currently being debated
  ```

#### Task 3.3: Create Question Discovery Script
- **File**: `modules/db/src/scripts/discoverQuestions.ts`
- **Functionality**:
  - Fetch articles for approved topics (both seeded and auto-discovered)
  - For each topic, call question discovery service
  - Deduplicate against existing questions
  - Create questions with `source: 'auto-discovered'`, `validationStatus: 'pending'`
  - Log discovered questions for review

#### Task 3.4: Update Question Repository
- **File**: `modules/db/src/repositories/questionRepository.ts`
- **Methods**:
  - `findQuestionsBySource(source: 'seeded' | 'auto-discovered'): Promise<Question[]>`
  - `findQuestionsPendingModeration(): Promise<Question[]>` (already exists via `findQuestionsByValidationStatus`)

### Phase 4: Integration into Pipeline

#### Task 4.1: Update Analysis Pipeline Script
- **File**: `apps/crawler/src/scripts/runAnalysisPipeline.js`
- **New Flow**:
  1. Crawl articles (existing)
  2. Seed topics (if not already seeded) - `npm run db:seed:topics`
  3. Seed questions (if not already seeded) - `npm run db:seed:questions`
  4. Validate proactive questions (existing)
  5. **Topic Discovery** - `npm run db:discover:topics`
  6. **Question Discovery** - `npm run db:discover:questions`
  7. **Validate reactive questions** - `npm run db:validate:questions` (works for both)
  8. Article Analysis (existing - works with all approved topics/questions)
  9. Verdict Analysis (existing)
  10. Verdict Report (existing)

#### Task 4.2: Create Unified Pipeline Script
- **File**: `apps/crawler/src/scripts/runFullPipeline.js`
- **Functionality**: Orchestrates the entire flow from crawl to verdict report
- **Options**:
  - `--skip-proactive`: Skip proactive seeding
  - `--skip-reactive`: Skip reactive discovery
  - `--auto-approve`: Auto-approve discovered topics/questions (for testing)

#### Task 4.3: Update Article Analysis to Use All Approved Topics/Questions
- **File**: `apps/crawler/src/scripts/runAnalysisPipeline.js`
- **Changes**:
  - Topic matching: Use all topics with `moderationStatus: 'approved'` (regardless of source)
  - Question matching: Use all questions with `validationStatus: 'validated'` and `isActive: true` (regardless of source)
  - No distinction between proactive and reactive items in analysis

### Phase 5: Moderation Interface (Future - Optional for MVP)

#### Task 5.1: Admin Interface for Topic Moderation
- **File**: `apps/admin/src/pages/topics/moderation.tsx` (future)
- **Functionality**:
  - List topics with `moderationStatus: 'pending'`
  - Show discovered topics with source articles
  - Approve/reject topics
  - Edit topic names/descriptions before approval

#### Task 5.2: Admin Interface for Question Moderation
- **File**: `apps/admin/src/pages/questions/moderation.tsx` (future)
- **Functionality**:
  - List questions with `validationStatus: 'pending'` or `'needs_reformulation'`
  - Show discovered questions with source articles
  - Review validation results
  - Approve/reject questions
  - Edit questions before approval

## Database Schema Changes

### Topic Model Updates
```prisma
enum TopicSource {
  seeded
  auto_discovered
}

enum ModerationStatus {
  pending
  approved
  rejected
}

model Topic {
  // ... existing fields ...
  source            TopicSource        @default(seeded)
  moderationStatus  ModerationStatus  @default(approved)
  discoveredAt      DateTime?
  discoveredFromArticles Json?        // Array of article IDs
  // ... rest of fields ...
}
```

### Question Model Updates
```prisma
model Question {
  // ... existing fields ...
  source            TopicSource        @default(seeded) // Reuse enum
  discoveredAt      DateTime?
  discoveredFromArticles Json?        // Array of article IDs
  // ... rest of fields ...
  // Note: validationStatus already handles moderation
}
```

## Scripts & Commands

### New Scripts
- `npm run db:discover:topics` - Discover topics from recent articles
- `npm run db:discover:questions` - Discover questions from articles by topic
- `npm run db:moderate:topics` - List pending topics for moderation
- `npm run db:approve:topic -- --topicId=<id>` - Approve a discovered topic
- `npm run db:reject:topic -- --topicId=<id>` - Reject a discovered topic

### Updated Scripts
- `npm run db:seed:topics` - Unchanged (creates proactive topics)
- `npm run db:seed:questions` - Unchanged (creates proactive questions)
- `npm run db:validate:questions` - Works for both proactive and reactive questions
- `npm run analyze:articles` - Unchanged (uses all approved topics/questions)

## Validation & Deduplication

### Topic Deduplication
- **Method**: Name similarity (fuzzy matching)
- **Threshold**: If similarity > 0.8, consider duplicate
- **Action**: Skip creation, log as duplicate

### Question Deduplication
- **Method**: Text similarity (fuzzy matching)
- **Threshold**: If similarity > 0.85, consider duplicate
- **Action**: Skip creation, log as duplicate

## Configuration

### Discovery Settings
```typescript
// config/discovery.ts
export const DISCOVERY_CONFIG = {
  topicDiscovery: {
    articleTimeWindow: 7, // days
    minArticlesPerTopic: 3,
    maxTopicsPerDiscovery: 20,
    confidenceThreshold: 0.6,
  },
  questionDiscovery: {
    minArticlesPerQuestion: 2,
    maxQuestionsPerTopic: 10,
    confidenceThreshold: 0.7,
  },
};
```

## Testing Strategy

### Unit Tests
- Topic discovery service
- Question discovery service
- Deduplication logic
- LLM provider methods

### Integration Tests
- Full pipeline with both proactive and reactive items
- Validation pipeline for discovered items
- Article analysis with mixed sources

### Manual Testing
- Run discovery on sample articles
- Verify deduplication works
- Verify validation pipeline works for discovered items
- Verify article analysis uses all approved items

## Migration Path

1. **Phase 1**: Add database fields (backward compatible)
2. **Phase 2**: Implement discovery services (no breaking changes)
3. **Phase 3**: Integrate into pipeline (optional, can run separately)
4. **Phase 4**: Add moderation interface (optional for MVP)

## Open Questions

1. **Auto-approval threshold**: Should high-confidence discovered items be auto-approved?
   - **Decision**: No for MVP, all require manual approval
   - **Future**: Configurable threshold

2. **Discovery frequency**: How often should discovery run?
   - **Decision**: Manual trigger for MVP, can be scheduled later
   - **Future**: Daily/weekly scheduled discovery

3. **Article grouping**: Should discovery analyze all articles together or by time period?
   - **Decision**: Configurable time window (default: last 7 days)
   - **Future**: Clustering by content similarity

4. **Topic merging**: Should similar discovered topics be merged automatically?
   - **Decision**: No for MVP, show as separate for moderation
   - **Future**: Suggest merges during moderation

## Success Criteria

- ✅ Topics can be discovered from articles
- ✅ Questions can be discovered from articles
- ✅ Discovered items go through same validation as proactive items
- ✅ Article analysis works with both proactive and reactive items
- ✅ No distinction in analysis pipeline between sources
- ✅ Deduplication prevents duplicate topics/questions
- ✅ Moderation workflow allows approval/rejection




