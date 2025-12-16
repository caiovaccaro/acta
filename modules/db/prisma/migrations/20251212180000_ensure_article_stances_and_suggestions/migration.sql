-- Migration to ensure article_stances table exists with correct structure
-- and add suggestions column to questions table
-- This migration is idempotent and preserves existing data

-- ============================================================================
-- PART 1: Ensure article_stances table exists with correct structure
-- ============================================================================

DO $$
BEGIN
  -- Check if article_stances table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_stances') THEN
    -- Create article_stances table if it doesn't exist
    CREATE TABLE "article_stances" (
      "id" TEXT NOT NULL,
      "articleId" TEXT NOT NULL,
      "questionId" TEXT NOT NULL,
      "articleAnalysisAttemptId" TEXT NOT NULL,
      "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT "article_stances_pkey" PRIMARY KEY ("id")
    );
    
    -- Create indexes
    CREATE INDEX "article_stances_articleId_idx" ON "article_stances"("articleId");
    CREATE INDEX "article_stances_questionId_idx" ON "article_stances"("questionId");
    CREATE INDEX "article_stances_matchedAt_idx" ON "article_stances"("matchedAt");
    CREATE INDEX "article_stances_questionId_matchedAt_idx" ON "article_stances"("questionId", "matchedAt");
    
    -- Create unique constraints
    CREATE UNIQUE INDEX "article_stances_articleId_questionId_key" ON "article_stances"("articleId", "questionId");
    CREATE UNIQUE INDEX "article_stances_articleAnalysisAttemptId_key" ON "article_stances"("articleAnalysisAttemptId");
    
    -- Create foreign keys (only if referenced tables exist)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'articles') THEN
      ALTER TABLE "article_stances" ADD CONSTRAINT "article_stances_articleId_fkey" 
        FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'questions') THEN
      ALTER TABLE "article_stances" ADD CONSTRAINT "article_stances_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_analyses') THEN
      ALTER TABLE "article_stances" ADD CONSTRAINT "article_stances_articleAnalysisAttemptId_fkey" 
        FOREIGN KEY ("articleAnalysisAttemptId") REFERENCES "article_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  ELSE
    -- Table exists, ensure it has the correct structure
    
    -- Ensure articleAnalysisAttemptId column exists and is NOT NULL
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'article_stances' AND column_name = 'articleAnalysisAttemptId'
    ) THEN
      -- Add column if it doesn't exist
      ALTER TABLE "article_stances" ADD COLUMN "articleAnalysisAttemptId" TEXT;
      
      -- If there's an old articleAnalysisId column, migrate data
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'article_stances' AND column_name = 'articleAnalysisId'
      ) THEN
        UPDATE "article_stances" 
        SET "articleAnalysisAttemptId" = "articleAnalysisId" 
        WHERE "articleAnalysisAttemptId" IS NULL;
        
        ALTER TABLE "article_stances" DROP COLUMN IF EXISTS "articleAnalysisId";
      END IF;
      
      -- Make it NOT NULL after data migration
      ALTER TABLE "article_stances" ALTER COLUMN "articleAnalysisAttemptId" SET NOT NULL;
    ELSE
      -- Column exists, ensure it's NOT NULL
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'article_stances' 
        AND column_name = 'articleAnalysisAttemptId'
        AND is_nullable = 'YES'
      ) THEN
        -- Delete NULL records first
        DELETE FROM "article_stances" WHERE "articleAnalysisAttemptId" IS NULL;
        ALTER TABLE "article_stances" ALTER COLUMN "articleAnalysisAttemptId" SET NOT NULL;
      END IF;
    END IF;
    
    -- Ensure unique constraint on articleAnalysisAttemptId exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'article_stances_articleAnalysisAttemptId_key'
    ) THEN
      CREATE UNIQUE INDEX "article_stances_articleAnalysisAttemptId_key" 
        ON "article_stances"("articleAnalysisAttemptId");
    END IF;
    
    -- Ensure unique constraint on articleId_questionId exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'article_stances_articleId_questionId_key'
    ) THEN
      CREATE UNIQUE INDEX "article_stances_articleId_questionId_key" 
        ON "article_stances"("articleId", "questionId");
    END IF;
    
    -- Ensure indexes exist
    CREATE INDEX IF NOT EXISTS "article_stances_articleId_idx" ON "article_stances"("articleId");
    CREATE INDEX IF NOT EXISTS "article_stances_questionId_idx" ON "article_stances"("questionId");
    CREATE INDEX IF NOT EXISTS "article_stances_matchedAt_idx" ON "article_stances"("matchedAt");
    CREATE INDEX IF NOT EXISTS "article_stances_questionId_matchedAt_idx" ON "article_stances"("questionId", "matchedAt");
    
    -- Ensure foreign keys exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'articles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'article_stances_articleId_fkey'
      ) THEN
        ALTER TABLE "article_stances" ADD CONSTRAINT "article_stances_articleId_fkey" 
          FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'questions') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'article_stances_questionId_fkey'
      ) THEN
        ALTER TABLE "article_stances" ADD CONSTRAINT "article_stances_questionId_fkey" 
          FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_analyses') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'article_stances_articleAnalysisAttemptId_fkey'
      ) THEN
        ALTER TABLE "article_stances" ADD CONSTRAINT "article_stances_articleAnalysisAttemptId_fkey" 
          FOREIGN KEY ("articleAnalysisAttemptId") REFERENCES "article_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 2: Add suggestions column to questions table
-- ============================================================================

DO $$
BEGIN
  -- Add suggestions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'suggestions'
  ) THEN
    ALTER TABLE "questions" ADD COLUMN "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

