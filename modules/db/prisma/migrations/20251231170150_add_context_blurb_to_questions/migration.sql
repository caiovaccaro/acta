-- Add contextBlurb field to questions table
-- This field stores LLM-generated 2-3 sentence context blurbs about questions

ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "contextBlurb" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "questions"."contextBlurb" IS 'Optional 2–3 sentence LLM-generated context blurb about this question';
