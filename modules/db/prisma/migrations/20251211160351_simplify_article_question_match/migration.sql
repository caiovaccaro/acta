-- Delete records where articleAnalysisId is NULL (these are rejected/pending matches that shouldn't be in this table)
DELETE FROM "article_question_matches" WHERE "articleAnalysisId" IS NULL;

-- Note: We'll keep the existing unique constraint on articleId_questionId, just recreate it at the end if needed

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

-- Make articleAnalysisId required and add unique constraint
ALTER TABLE "article_question_matches" 
  ALTER COLUMN "articleAnalysisId" SET NOT NULL;

-- Add unique constraint on articleAnalysisId
ALTER TABLE "article_question_matches" 
  ADD CONSTRAINT "article_question_matches_articleAnalysisId_key" UNIQUE ("articleAnalysisId");

-- Unique constraint on articleId_questionId should already exist, but ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'article_question_matches_articleId_questionId_key'
  ) THEN
    ALTER TABLE "article_question_matches" 
      ADD CONSTRAINT "article_question_matches_articleId_questionId_key" UNIQUE ("articleId", "questionId");
  END IF;
END $$;

-- Add index for querying by question and matched date
CREATE INDEX IF NOT EXISTS "article_question_matches_questionId_matchedAt_idx" ON "article_question_matches"("questionId", "matchedAt");

-- Drop the MatchClassificationStatus enum (no longer needed)
DROP TYPE IF EXISTS "MatchClassificationStatus";
