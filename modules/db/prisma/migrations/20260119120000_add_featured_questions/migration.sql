-- Add featured flags and ordering for questions
ALTER TABLE "questions"
ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "featuredOrder" INTEGER;

-- Index to speed up featured queries
CREATE INDEX IF NOT EXISTS "questions_isFeatured_idx" ON "questions"("isFeatured");



