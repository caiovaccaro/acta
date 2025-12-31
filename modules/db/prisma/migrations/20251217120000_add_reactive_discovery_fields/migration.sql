-- Add enums for topic/question source and moderation status (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TopicSource') THEN
    CREATE TYPE "TopicSource" AS ENUM ('seeded', 'auto_discovered');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModerationStatus') THEN
    CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Add columns to topics
ALTER TABLE "topics"
  ADD COLUMN IF NOT EXISTS "source" "TopicSource" NOT NULL DEFAULT 'seeded',
  ADD COLUMN IF NOT EXISTS "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS "discoveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "discoveredFromArticles" JSONB;

-- Backfill existing topics as seeded/approved
UPDATE "topics"
SET "source" = 'seeded',
    "moderationStatus" = 'approved'
WHERE "source" IS NULL OR "moderationStatus" IS NULL;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS "topics_moderationStatus_idx" ON "topics"("moderationStatus");
CREATE INDEX IF NOT EXISTS "topics_source_idx" ON "topics"("source");

-- Add columns to questions
ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "source" "TopicSource" NOT NULL DEFAULT 'seeded',
  ADD COLUMN IF NOT EXISTS "discoveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "discoveredFromArticles" JSONB;

-- Backfill existing questions as seeded
UPDATE "questions"
SET "source" = 'seeded'
WHERE "source" IS NULL;





