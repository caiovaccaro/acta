-- Drop the unique index on questionId alone
-- This index was created by Prisma for the old @unique constraint on questionId
DROP INDEX IF EXISTS "verdicts_questionId_key";

