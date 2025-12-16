-- Clean up duplicate verdicts before applying the unique constraint
-- If multiple verdicts exist for the same question and month, keep only the most recent one

DO $$
DECLARE
  duplicate_rec RECORD;
BEGIN
  -- Find all duplicate (questionId, month) pairs
  FOR duplicate_rec IN
    SELECT "questionId", "month", COUNT(*) as count, MAX("calculatedAt") as latest_calculated
    FROM "verdicts"
    GROUP BY "questionId", "month"
    HAVING COUNT(*) > 1
  LOOP
    -- Delete all but the most recent verdict for each (questionId, month) pair
    DELETE FROM "verdicts"
    WHERE "questionId" = duplicate_rec."questionId"
    AND "month" = duplicate_rec."month"
    AND "calculatedAt" < duplicate_rec.latest_calculated;
    
    RAISE NOTICE 'Cleaned up duplicates for questionId: %, month: %, kept most recent', 
      duplicate_rec."questionId", duplicate_rec."month";
  END LOOP;
END $$;

-- Final check: Drop any remaining unique constraint on questionId
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND contype = 'u'
    AND (
      -- Constraint on questionId alone
      (array_length(conkey, 1) = 1 AND 
       (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) = 'questionId')
      OR
      -- Or explicitly named constraint
      conname LIKE '%questionId%' AND conname NOT LIKE '%month%'
    )
  LOOP
    EXECUTE format('ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END LOOP;
END $$;

-- Ensure composite constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND conname = 'verdicts_questionId_month_key'
  ) THEN
    ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_questionId_month_key" UNIQUE ("questionId", "month");
  END IF;
END $$;

