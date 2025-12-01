# Database Migration Plan: Article Analysis Pipeline

**Feature**: Article Analysis & Verdict Pipeline  
**Date**: 2025-01-27  
**Migration**: `20251201154345_add_article_analysis_pipeline`

## Overview

This document provides a detailed plan for applying the database migration that adds support for the Article Analysis Pipeline, including monthly stance tracking.

## Migration Summary

**Migration File**: `modules/db/prisma/migrations/20251201154345_add_article_analysis_pipeline/migration.sql`

**Changes**:
- 4 new enums: `QuestionValidationStatus`, `Stance`, `VerdictLabel`, `EvidenceType`
- 6 new tables: `topics`, `questions`, `topic_articles`, `article_analyses`, `verdicts`, `evidence_bullets`
- Multiple indexes for performance
- Foreign key constraints for data integrity

## Pre-Migration Checklist

- [ ] Backup production database (if applicable)
- [ ] Review migration SQL file
- [ ] Test migration on development database
- [ ] Verify Prisma schema matches migration
- [ ] Check disk space (estimate: ~100MB for initial data)
- [ ] Schedule maintenance window (if production)

## Migration Steps

### Step 1: Review Migration File

**Action**: Review the migration SQL file for correctness
- [ ] All CREATE TABLE statements present
- [ ] All CREATE ENUM statements present
- [ ] All indexes defined
- [ ] All foreign keys defined
- [ ] No syntax errors

**File**: `modules/db/prisma/migrations/20251201154345_add_article_analysis_pipeline/migration.sql`

### Step 2: Update Prisma Schema

**Action**: Ensure Prisma schema matches migration
- [ ] Schema includes all new models
- [ ] Schema includes all new enums
- [ ] Relations are correct
- [ ] Indexes match migration

**File**: `modules/db/prisma/schema.prisma`

**Status**: ✅ Already updated

### Step 3: Test Migration on Development

**Action**: Apply migration to development database

```bash
# From project root
cd modules/db

# Generate Prisma client (to verify schema)
npm run db:generate

# Apply migration
npm run db:migrate

# Or if using pnpm from root
pnpm --filter @acta/db db:migrate
```

**Verification**:
- [ ] Migration runs without errors
- [ ] All tables created
- [ ] All enums created
- [ ] All indexes created
- [ ] Foreign keys in place
- [ ] Prisma client regenerated successfully

### Step 4: Verify Database Structure

**Action**: Verify all tables and constraints are correct

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('topics', 'questions', 'topic_articles', 'article_analyses', 'verdicts', 'evidence_bullets');

-- Check enums exist
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
  AND typname IN ('QuestionValidationStatus', 'Stance', 'VerdictLabel', 'EvidenceType');

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('topics', 'questions', 'topic_articles', 'article_analyses', 'verdicts', 'evidence_bullets');

-- Check foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('topics', 'questions', 'topic_articles', 'article_analyses', 'verdicts', 'evidence_bullets');
```

**Expected Results**:
- [ ] 6 tables found
- [ ] 4 enums found
- [ ] All indexes present
- [ ] All foreign keys present

### Step 5: Test Prisma Client

**Action**: Verify Prisma client works with new schema

```typescript
// Test script
import { prisma } from '@acta/db';

async function testMigration() {
  // Test Topic model
  const topic = await prisma.topic.create({
    data: {
      name: 'Test Topic',
      description: 'Test description',
    },
  });
  console.log('Topic created:', topic);

  // Test Question model
  const question = await prisma.question.create({
    data: {
      topicId: topic.id,
      questionText: 'Is this a test question?',
      validationStatus: 'pending',
    },
  });
  console.log('Question created:', question);

  // Test ArticleAnalysis model (requires existing article)
  // Note: This requires an existing article in the database
  const article = await prisma.article.findFirst();
  if (article) {
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const analysis = await prisma.articleAnalysis.create({
      data: {
        articleId: article.id,
        questionId: question.id,
        month: currentMonth,
        stance: 'Unclear',
        confidence: 0.8,
      },
    });
    console.log('ArticleAnalysis created:', analysis);
  }

  // Cleanup
  await prisma.question.delete({ where: { id: question.id } });
  await prisma.topic.delete({ where: { id: topic.id } });
}

testMigration().catch(console.error);
```

**Verification**:
- [ ] All models can be created
- [ ] Relations work correctly
- [ ] Enums work correctly
- [ ] Unique constraints work
- [ ] Foreign key constraints work

### Step 6: Apply to Production (When Ready)

**Action**: Apply migration to production database

```bash
# Production migration (deploy mode)
cd modules/db
npm run db:migrate:deploy
```

**Pre-Production Checklist**:
- [ ] Migration tested on staging
- [ ] Backup created
- [ ] Maintenance window scheduled
- [ ] Rollback plan prepared
- [ ] Team notified

## Rollback Plan

If migration needs to be rolled back:

```sql
-- Rollback script (run in reverse order)
-- WARNING: This will delete all data in new tables

-- Drop foreign keys first
ALTER TABLE "evidence_bullets" DROP CONSTRAINT IF EXISTS "evidence_bullets_verdictId_fkey";
ALTER TABLE "evidence_bullets" DROP CONSTRAINT IF EXISTS "evidence_bullets_articleId_fkey";
ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS "verdicts_questionId_fkey";
ALTER TABLE "article_analyses" DROP CONSTRAINT IF EXISTS "article_analyses_articleId_fkey";
ALTER TABLE "article_analyses" DROP CONSTRAINT IF EXISTS "article_analyses_questionId_fkey";
ALTER TABLE "topic_articles" DROP CONSTRAINT IF EXISTS "topic_articles_topicId_fkey";
ALTER TABLE "topic_articles" DROP CONSTRAINT IF EXISTS "topic_articles_articleId_fkey";
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_topicId_fkey";

-- Drop tables
DROP TABLE IF EXISTS "evidence_bullets";
DROP TABLE IF EXISTS "verdicts";
DROP TABLE IF EXISTS "article_analyses";
DROP TABLE IF EXISTS "topic_articles";
DROP TABLE IF EXISTS "questions";
DROP TABLE IF EXISTS "topics";

-- Drop enums
DROP TYPE IF EXISTS "EvidenceType";
DROP TYPE IF EXISTS "VerdictLabel";
DROP TYPE IF EXISTS "Stance";
DROP TYPE IF EXISTS "QuestionValidationStatus";
```

**Note**: Rollback will delete all data in new tables. Ensure backup is available.

## Post-Migration Tasks

### 1. Seed Initial Data

**Action**: Create initial topics and questions

```bash
# Run seed script
cd modules/db
npm run db:seed:topics
npm run db:seed:questions
```

**Files to Create**:
- `modules/db/src/scripts/seedTopics.ts`
- `modules/db/src/scripts/seedQuestions.ts`

### 2. Update Application Code

**Action**: Update code to use new models

- [ ] Update repositories to use new models
- [ ] Update analysis logic to use monthly tracking
- [ ] Update API endpoints (if applicable)
- [ ] Update tests

### 3. Monitor Performance

**Action**: Monitor database performance after migration

- [ ] Check query performance on new tables
- [ ] Verify indexes are being used
- [ ] Monitor disk space usage
- [ ] Check for slow queries

### 4. Documentation

**Action**: Update documentation

- [ ] Update API documentation
- [ ] Update developer guide
- [ ] Update database schema documentation

## Performance Considerations

### Indexes

The migration creates the following performance-critical indexes:

1. **Composite Index on `article_analyses(questionId, month)`**
   - Critical for monthly verdict calculation
   - Enables efficient filtering by question and month

2. **Index on `article_analyses.month`**
   - Enables time-based queries
   - Supports historical analysis

3. **Index on `questions.isActive`**
   - Filters active questions efficiently
   - Used in question matching

### Query Optimization

After migration, verify these queries are optimized:

```sql
-- Monthly verdict calculation (should use composite index)
EXPLAIN ANALYZE
SELECT * FROM article_analyses
WHERE questionId = '...' AND month = '2025-01-01';

-- Active questions (should use isActive index)
EXPLAIN ANALYZE
SELECT * FROM questions
WHERE isActive = true AND topicId = '...';
```

## Data Migration (If Needed)

If migrating existing data:

### Example: Migrate Existing Analyses

If you have existing stance data in another format:

```sql
-- Example: Migrate from old format to new monthly format
INSERT INTO article_analyses (id, articleId, questionId, month, stance, confidence, analyzedAt, createdAt, updatedAt)
SELECT 
    gen_random_uuid(),
    article_id,
    question_id,
    DATE_TRUNC('month', analyzed_at) as month, -- Normalize to first of month
    stance,
    confidence,
    analyzed_at,
    analyzed_at,
    NOW()
FROM old_article_analyses;
```

## Troubleshooting

### Issue: Migration Fails with "Type Already Exists"

**Solution**: Check if enums already exist
```sql
SELECT typname FROM pg_type WHERE typtype = 'e';
```

### Issue: Foreign Key Constraint Fails

**Solution**: Ensure referenced tables exist and have data
```sql
-- Check if articles exist
SELECT COUNT(*) FROM articles;

-- Check if topics exist
SELECT COUNT(*) FROM topics;
```

### Issue: Unique Constraint Violation

**Solution**: Check for duplicate data
```sql
-- Check for duplicate article-question-month combinations
SELECT articleId, questionId, month, COUNT(*)
FROM article_analyses
GROUP BY articleId, questionId, month
HAVING COUNT(*) > 1;
```

## Success Criteria

Migration is successful when:

- [ ] All tables created without errors
- [ ] All enums created without errors
- [ ] All indexes created
- [ ] All foreign keys in place
- [ ] Prisma client regenerated successfully
- [ ] Test data can be inserted
- [ ] Queries perform well
- [ ] No errors in application logs

## Timeline

- **Development**: Immediate (test migration)
- **Staging**: After development verification
- **Production**: After staging verification + backup

## Notes

- Migration is **non-destructive** - does not modify existing tables
- Migration is **additive** - only adds new tables/enums
- No downtime required (new tables only)
- Can be applied incrementally (test → staging → production)

