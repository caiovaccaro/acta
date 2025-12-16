-- Rename table: article_question_matches -> article_stances (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_question_matches') THEN
    ALTER TABLE "article_question_matches" RENAME TO "article_stances";
  END IF;
END $$;

-- Only proceed if table exists (either article_question_matches or article_stances)
DO $$
BEGIN
  -- Check if article_stances exists (already renamed) or article_question_matches exists (needs renaming)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_stances') THEN
    -- Table already renamed, just clean up and modify
    DELETE FROM "article_stances" WHERE "articleAnalysisAttemptId" IS NULL;
    
    -- Make articleAnalysisAttemptId required if it's nullable
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'article_stances' 
      AND column_name = 'articleAnalysisAttemptId'
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE "article_stances" ALTER COLUMN "articleAnalysisAttemptId" SET NOT NULL;
    END IF;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_question_matches') THEN
    -- Delete records with NULL articleAnalysisId (these are rejected/pending matches that shouldn't be in this table)
    -- ArticleStance should only contain successfully classified matches
    DELETE FROM "article_question_matches" WHERE "articleAnalysisId" IS NULL;

    -- Rename column: articleAnalysisId -> articleAnalysisAttemptId
    ALTER TABLE "article_question_matches" RENAME COLUMN "articleAnalysisId" TO "articleAnalysisAttemptId";

    -- Make articleAnalysisAttemptId required (NOT NULL)
    ALTER TABLE "article_question_matches" ALTER COLUMN "articleAnalysisAttemptId" SET NOT NULL;
  END IF;
END $$;

-- Rename indexes (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'article_question_matches_articleId_idx') THEN
    ALTER INDEX "article_question_matches_articleId_idx" RENAME TO "article_stances_articleId_idx";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'article_question_matches_questionId_idx') THEN
    ALTER INDEX "article_question_matches_questionId_idx" RENAME TO "article_stances_questionId_idx";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'article_question_matches_matchedAt_idx') THEN
    ALTER INDEX "article_question_matches_matchedAt_idx" RENAME TO "article_stances_matchedAt_idx";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'article_question_matches_questionId_matchedAt_idx') THEN
    ALTER INDEX "article_question_matches_questionId_matchedAt_idx" RENAME TO "article_stances_questionId_matchedAt_idx";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'article_question_matches_articleId_questionId_key') THEN
    ALTER INDEX "article_question_matches_articleId_questionId_key" RENAME TO "article_stances_articleId_questionId_key";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'article_question_matches_articleAnalysisId_key') THEN
    ALTER INDEX "article_question_matches_articleAnalysisId_key" RENAME TO "article_stances_articleAnalysisAttemptId_key";
  END IF;
END $$;

-- Rename foreign key constraints (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'article_question_matches_articleId_fkey') THEN
    ALTER TABLE "article_stances" RENAME CONSTRAINT "article_question_matches_articleId_fkey" TO "article_stances_articleId_fkey";
  END IF;
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'article_question_matches_questionId_fkey') THEN
    ALTER TABLE "article_stances" RENAME CONSTRAINT "article_question_matches_questionId_fkey" TO "article_stances_questionId_fkey";
  END IF;
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'article_question_matches_articleAnalysisId_fkey') THEN
    ALTER TABLE "article_stances" RENAME CONSTRAINT "article_question_matches_articleAnalysisId_fkey" TO "article_stances_articleAnalysisAttemptId_fkey";
  END IF;
END $$;

-- Note: article_analyses table name stays the same (only model name changes)
-- The table mapping in Prisma schema handles the model name change
