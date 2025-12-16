-- Aggressively drop ALL unique constraints on questionId alone
-- This migration will find and drop any constraint that enforces uniqueness on questionId

DO $$
DECLARE
  constraint_record RECORD;
  constraint_names TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Find all unique constraints on verdicts table
  FOR constraint_record IN
    SELECT 
      conname,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'verdicts'::regclass
    AND contype = 'u'
  LOOP
    -- Check if this constraint only involves questionId (not month)
    IF constraint_record.definition LIKE '%questionId%' 
       AND constraint_record.definition NOT LIKE '%month%' THEN
      constraint_names := array_append(constraint_names, constraint_record.conname);
      RAISE NOTICE 'Found constraint to drop: % (definition: %)', constraint_record.conname, constraint_record.definition;
    END IF;
  END LOOP;
  
  -- Drop all found constraints
  FOREACH constraint_record.conname IN ARRAY constraint_names
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to drop constraint %: %', constraint_record.conname, SQLERRM;
    END;
  END LOOP;
  
  -- Also try dropping by checking the actual constraint keys
  FOR constraint_record IN
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
    BEGIN
      EXECUTE format('ALTER TABLE "verdicts" DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
      RAISE NOTICE 'Dropped single-column constraint on questionId: %', constraint_record.conname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to drop constraint %: %', constraint_record.conname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Verify composite constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'verdicts'::regclass
    AND conname = 'verdicts_questionId_month_key'
  ) THEN
    ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_questionId_month_key" UNIQUE ("questionId", "month");
    RAISE NOTICE 'Created composite unique constraint';
  ELSE
    RAISE NOTICE 'Composite unique constraint already exists';
  END IF;
END $$;

