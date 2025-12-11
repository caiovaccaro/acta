-- Rename table: article_question_matches -> article_stances
ALTER TABLE "article_question_matches" RENAME TO "article_stances";

-- Delete records with NULL articleAnalysisId (these are rejected/pending matches that shouldn't be in this table)
-- ArticleStance should only contain successfully classified matches
DELETE FROM "article_stances" WHERE "articleAnalysisId" IS NULL;

-- Rename column: articleAnalysisId -> articleAnalysisAttemptId
ALTER TABLE "article_stances" RENAME COLUMN "articleAnalysisId" TO "articleAnalysisAttemptId";

-- Make articleAnalysisAttemptId required (NOT NULL)
ALTER TABLE "article_stances" ALTER COLUMN "articleAnalysisAttemptId" SET NOT NULL;

-- Rename indexes
ALTER INDEX IF EXISTS "article_question_matches_articleId_idx" RENAME TO "article_stances_articleId_idx";
ALTER INDEX IF EXISTS "article_question_matches_questionId_idx" RENAME TO "article_stances_questionId_idx";
ALTER INDEX IF EXISTS "article_question_matches_matchedAt_idx" RENAME TO "article_stances_matchedAt_idx";
ALTER INDEX IF EXISTS "article_question_matches_questionId_matchedAt_idx" RENAME TO "article_stances_questionId_matchedAt_idx";
ALTER INDEX IF EXISTS "article_question_matches_articleId_questionId_key" RENAME TO "article_stances_articleId_questionId_key";
ALTER INDEX IF EXISTS "article_question_matches_articleAnalysisId_key" RENAME TO "article_stances_articleAnalysisAttemptId_key";

-- Rename foreign key constraints
ALTER TABLE "article_stances" RENAME CONSTRAINT "article_question_matches_articleId_fkey" TO "article_stances_articleId_fkey";
ALTER TABLE "article_stances" RENAME CONSTRAINT "article_question_matches_questionId_fkey" TO "article_stances_questionId_fkey";
ALTER TABLE "article_stances" RENAME CONSTRAINT "article_question_matches_articleAnalysisId_fkey" TO "article_stances_articleAnalysisAttemptId_fkey";

-- Note: article_analyses table name stays the same (only model name changes)
-- The table mapping in Prisma schema handles the model name change
