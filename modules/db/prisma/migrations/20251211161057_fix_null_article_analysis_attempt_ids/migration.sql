-- Delete records with NULL articleAnalysisAttemptId (these are rejected/pending matches that shouldn't be in this table)
-- ArticleStance should only contain successfully classified matches
-- Only run if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_stances') THEN
    DELETE FROM "article_stances" WHERE "articleAnalysisAttemptId" IS NULL;
    
    -- Make articleAnalysisAttemptId required (NOT NULL) if column exists and is nullable
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'article_stances' 
      AND column_name = 'articleAnalysisAttemptId'
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE "article_stances" ALTER COLUMN "articleAnalysisAttemptId" SET NOT NULL;
    END IF;
  END IF;
END $$;
