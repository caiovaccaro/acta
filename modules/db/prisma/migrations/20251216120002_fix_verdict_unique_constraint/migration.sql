-- Fix: Drop any remaining unique constraint on questionId alone
-- This handles cases where the previous migration didn't drop it properly

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find any unique constraint that only includes questionId
  FOR constraint_name IN
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND (
      SELECT attname 
      FROM pg_attribute 
      WHERE attrelid = conrelid 
      AND attnum = conkey[1]
    ) = 'questionId'
  LOOP
    EXECUTE format('ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END LOOP;
  
  -- Also try the standard Prisma naming
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND conname = 'verdicts_questionId_key'
  ) THEN
    ALTER TABLE "verdicts" DROP CONSTRAINT "verdicts_questionId_key";
    RAISE NOTICE 'Dropped constraint: verdicts_questionId_key';
  END IF;
END $$;

-- Ensure the composite unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND conname = 'verdicts_questionId_month_key'
  ) THEN
    ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_questionId_month_key" UNIQUE ("questionId", "month");
    RAISE NOTICE 'Added composite unique constraint: verdicts_questionId_month_key';
  END IF;
END $$;

