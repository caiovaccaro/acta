-- Add month column to verdicts (nullable initially for data migration)
ALTER TABLE "verdicts" ADD COLUMN IF NOT EXISTS "month" TIMESTAMP(3);

-- Backfill existing verdicts: set month from calculatedAt (normalized to first day of month)
UPDATE "verdicts"
SET "month" = DATE_TRUNC('month', "calculatedAt")
WHERE "month" IS NULL;

-- Make month NOT NULL (now that all rows have values)
ALTER TABLE "verdicts" ALTER COLUMN "month" SET NOT NULL;

-- Drop the old unique constraint on questionId (try multiple possible names)
DO $$
BEGIN
  -- Try standard Prisma naming
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND conname = 'verdicts_questionId_key'
  ) THEN
    ALTER TABLE "verdicts" DROP CONSTRAINT "verdicts_questionId_key";
  END IF;
  
  -- Try alternative naming (if constraint was created differently)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) = 'questionId'
  ) THEN
    -- Find and drop any unique constraint on questionId alone
    FOR rec IN 
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'verdicts'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) = 'questionId'
    LOOP
      EXECUTE format('ALTER TABLE "verdicts" DROP CONSTRAINT %I', rec.conname);
    END LOOP;
  END IF;
END $$;

-- Add composite unique constraint (questionId, month)
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_questionId_month_key" UNIQUE ("questionId", "month");

-- Add index on month for efficient month-based queries
CREATE INDEX IF NOT EXISTS "verdicts_month_idx" ON "verdicts"("month");

-- Add composite index for common query pattern (questionId, month)
CREATE INDEX IF NOT EXISTS "verdicts_questionId_month_idx" ON "verdicts"("questionId", "month");

