-- Drop deprecated mainQuestionId from topics
ALTER TABLE "topics"
DROP COLUMN IF EXISTS "mainQuestionId";

-- Drop legacy index/constraint if they still exist
DROP INDEX IF EXISTS "topics_mainQuestionId_idx";
ALTER TABLE IF EXISTS "topics"
DROP CONSTRAINT IF EXISTS "topics_mainQuestionId_fkey";

