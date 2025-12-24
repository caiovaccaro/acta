# Migration Fix Instructions

## Issue
The migration `20251216120000_add_month_to_verdicts` has a syntax error in the DO block that prevents new migrations from being created.

## Solution Options

### Option 1: Mark Migration as Applied (if already in database)
If the migration has already been applied to your database, mark it as applied:

```bash
cd modules/db
bash scripts/load-env-and-run.sh npx prisma migrate resolve --applied 20251216120000_add_month_to_verdicts
```

Then create a new migration for the timeline relations:
```bash
bash scripts/load-env-and-run.sh npx prisma migrate dev --name add_timeline_relations
```

### Option 2: Fix the Migration File
Edit `modules/db/prisma/migrations/20251216120000_add_month_to_verdicts/migration.sql` and fix the FOR loop syntax around line 33-41.

### Option 3: Use Prisma DB Push (Development Only)
For development, you can use `prisma db push` which doesn't use migrations:

```bash
cd modules/db
bash scripts/load-env-and-run.sh npx prisma db push
```

**Note**: `db push` is for development only and doesn't create migration files.

### Option 4: Reset and Reapply (⚠️ DESTRUCTIVE)
If you're in development and can lose data:

```bash
cd modules/db
bash scripts/load-env-and-run.sh npx prisma migrate reset
```

This will drop the database, recreate it, and apply all migrations.

## Current Status
✅ Prisma schema is valid
✅ Prisma Client generated successfully  
✅ Relations are properly defined (Topic.timelineEvents, Question.timelineEvents)
⚠️ Migration system blocked by existing migration syntax error

The relations don't require database changes (they're Prisma-level metadata), so the application should work even without the migration.

