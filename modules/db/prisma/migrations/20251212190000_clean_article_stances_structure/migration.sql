-- Clean up article_stances table to match schema
-- Remove old columns that shouldn't be there and fix foreign key constraints

DO $$
BEGIN
  -- Only proceed if article_stances table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_stances') THEN
    
    -- Remove old columns that are no longer in the schema
    -- These were from the old article_question_matches structure
    ALTER TABLE "article_stances" DROP COLUMN IF EXISTS "classificationStatus";
    ALTER TABLE "article_stances" DROP COLUMN IF EXISTS "classifiedAt";
    ALTER TABLE "article_stances" DROP COLUMN IF EXISTS "confidence";
    ALTER TABLE "article_stances" DROP COLUMN IF EXISTS "llmConfidence";
    ALTER TABLE "article_stances" DROP COLUMN IF EXISTS "rejectedReason";
    ALTER TABLE "article_stances" DROP COLUMN IF EXISTS "stance";
    
    -- Drop old indexes related to removed columns
    DROP INDEX IF EXISTS "article_question_matches_classificationStatus_idx";
    DROP INDEX IF EXISTS "article_question_matches_questionId_classificationStatus_idx";
    
    -- Fix foreign key constraint on articleAnalysisAttemptId
    -- Should be ON DELETE CASCADE, not ON DELETE SET NULL
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'article_stances_articleAnalysisAttemptId_fkey'
      AND confdeltype = 'n' -- 'n' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'a' = SET NULL
    ) THEN
      -- Drop and recreate with correct ON DELETE CASCADE
      ALTER TABLE "article_stances" DROP CONSTRAINT IF EXISTS "article_stances_articleAnalysisAttemptId_fkey";
      
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_analyses') THEN
        ALTER TABLE "article_stances" ADD CONSTRAINT "article_stances_articleAnalysisAttemptId_fkey" 
          FOREIGN KEY ("articleAnalysisAttemptId") REFERENCES "article_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END IF;
    
    -- Ensure primary key name is correct (not article_question_matches_pkey)
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'article_question_matches_pkey'
      AND conrelid = 'article_stances'::regclass
    ) THEN
      ALTER TABLE "article_stances" RENAME CONSTRAINT "article_question_matches_pkey" TO "article_stances_pkey";
    END IF;
    
  END IF;
END $$;

-- Drop the MatchClassificationStatus enum if it exists (no longer needed)
-- Use CASCADE to drop dependent objects (like columns in article_question_matches if it still exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchClassificationStatus') THEN
    DROP TYPE "MatchClassificationStatus" CASCADE;
  END IF;
END $$;

