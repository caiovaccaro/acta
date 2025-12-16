-- Force drop any unique constraint on questionId alone
-- This is a more aggressive approach to ensure the old constraint is removed

DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  -- Find and drop ALL unique constraints that only include questionId
  FOR constraint_rec IN
    SELECT conname, conrelid
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
    EXECUTE format('ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
    RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
  END LOOP;
  
  -- Also explicitly try common Prisma constraint names
  ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS "verdicts_questionId_key";
  ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS "verdicts.questionId_unique";
END $$;

-- Verify the composite constraint exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND conname = 'verdicts_questionId_month_key'
  ) THEN
    ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_questionId_month_key" UNIQUE ("questionId", "month");
    RAISE NOTICE 'Created composite unique constraint: verdicts_questionId_month_key';
  ELSE
    RAISE NOTICE 'Composite unique constraint already exists: verdicts_questionId_month_key';
  END IF;
END $$;

