-- Add fields to store LLM-generated debate card data
-- This avoids regenerating the same data on every API call

-- Add overviewBullets JSON field to store array of overview bullet strings
ALTER TABLE "verdicts" ADD COLUMN IF NOT EXISTS "overviewBullets" JSONB;

-- Add featuredPerspective JSON field to store featured perspective data
ALTER TABLE "verdicts" ADD COLUMN IF NOT EXISTS "featuredPerspective" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "verdicts"."overviewBullets" IS 'LLM-generated array of overview bullet strings, stored to avoid repeated generation';
COMMENT ON COLUMN "verdicts"."featuredPerspective" IS 'LLM-generated featured perspective {text, articleId, articleTitle, outletName}, stored to avoid repeated generation';
