-- Check if table exists before modifying it
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_question_matches') THEN
    -- Delete records where articleAnalysisId is NULL (these are rejected/pending matches that shouldn't be in this table)
    DELETE FROM "article_question_matches" WHERE "articleAnalysisId" IS NULL;
  END IF;
END $$;

-- Note: We'll keep the existing unique constraint on articleId_questionId, just recreate it at the end if needed

-- Only proceed if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_question_matches') THEN
    -- Drop indexes that reference columns we're removing
    DROP INDEX IF EXISTS "article_question_matches_classificationStatus_idx";
    DROP INDEX IF EXISTS "article_question_matches_questionId_classificationStatus_idx";

    -- Remove columns that are no longer needed
    ALTER TABLE "article_question_matches" 
      DROP COLUMN IF EXISTS "classificationStatus",
      DROP COLUMN IF EXISTS "classifiedAt",
      DROP COLUMN IF EXISTS "rejectedReason",
      DROP COLUMN IF EXISTS "llmConfidence",
      DROP COLUMN IF EXISTS "stance",
      DROP COLUMN IF EXISTS "confidence";

    -- Make articleAnalysisId required and add unique constraint (only if column exists and is nullable)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'article_question_matches' 
      AND column_name = 'articleAnalysisId'
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE "article_question_matches" 
        ALTER COLUMN "articleAnalysisId" SET NOT NULL;
    END IF;

    -- Add unique constraint on articleAnalysisId (only if it doesn't exist)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'article_question_matches_articleAnalysisId_key'
    ) THEN
      ALTER TABLE "article_question_matches" 
        ADD CONSTRAINT "article_question_matches_articleAnalysisId_key" UNIQUE ("articleAnalysisId");
    END IF;

    -- Unique constraint on articleId_questionId should already exist, but ensure it's there
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'article_question_matches_articleId_questionId_key'
    ) THEN
      ALTER TABLE "article_question_matches" 
        ADD CONSTRAINT "article_question_matches_articleId_questionId_key" UNIQUE ("articleId", "questionId");
    END IF;

    -- Add index for querying by question and matched date
    CREATE INDEX IF NOT EXISTS "article_question_matches_questionId_matchedAt_idx" ON "article_question_matches"("questionId", "matchedAt");
  END IF;
END $$;

-- Drop the MatchClassificationStatus enum (no longer needed)
DROP TYPE IF EXISTS "MatchClassificationStatus";
