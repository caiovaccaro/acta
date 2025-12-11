-- Delete records with NULL articleAnalysisAttemptId (these are rejected/pending matches that shouldn't be in this table)
-- ArticleStance should only contain successfully classified matches
DELETE FROM "article_stances" WHERE "articleAnalysisAttemptId" IS NULL;

-- Make articleAnalysisAttemptId required (NOT NULL)
ALTER TABLE "article_stances" ALTER COLUMN "articleAnalysisAttemptId" SET NOT NULL;
