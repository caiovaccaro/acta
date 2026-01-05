# Database Sync Guide

## Quick Sync: Local → Production

### Option 1: Full Data Sync (Recommended for First Time)

Syncs everything from your local database to production:

```bash
npm run db:sync:production -- --target-url="postgresql://user:password@host:5432/database"
```

Or set `PRODUCTION_DATABASE_URL` in your `.env` file:
```bash
PRODUCTION_DATABASE_URL="postgresql://user:password@host:5432/database"
```

Then run:
```bash
npm run db:sync:production
```

### Option 2: Schema Only (For Initial Setup)

If you just want to set up the database structure without data:

```bash
npm run db:sync:schema-only -- --target-url="postgresql://user:password@host:5432/database"
```

## Step-by-Step: First Time Setup

### 1. Create Production Database

Choose a managed PostgreSQL service:
- **Neon**: https://neon.tech (recommended)
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app
- **Render**: https://render.com

Create a new database and copy the connection string.

### 2. Sync Your Local Data

```bash
# Add production URL to .env (optional, for convenience)
echo 'PRODUCTION_DATABASE_URL="postgresql://user:pass@host:5432/db"' >> .env

# Sync everything
npm run db:sync:production
```

The script will:
1. Create a dump of your local database
2. Restore it to production
3. Clean up temporary files

### 3. Set Environment Variable in Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add: `DATABASE_URL` = (your production connection string)
3. Save

### 4. Deploy

Push to main branch - Vercel will use the production database automatically!

## Requirements

You need `pg_dump` and `psql` installed (usually comes with PostgreSQL):

**macOS:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql-client  # Ubuntu/Debian
```

**Windows:**
- Install PostgreSQL from https://www.postgresql.org/download/
- Or use WSL with Linux instructions

## What Gets Synced

The sync includes:
- ✅ All tables and data
- ✅ Indexes
- ✅ Foreign key constraints
- ✅ Sequences (auto-increment counters)

## Safety Features

- ⚠️  The script shows a 5-second warning before overwriting production data
- Use `--skip-confirm` or `-y` to skip the confirmation
- The script masks passwords in output for security

## Alternative: Using Prisma Migrate

If you prefer using Prisma migrations:

```bash
# 1. Generate migration from your local schema
npm run db:migrate

# 2. Apply migrations to production
DATABASE_URL="your-production-url" npm run db:migrate:deploy
```

**Note:** This only syncs the schema, not the data. Use the sync script above for data.

## Troubleshooting

### "pg_dump: command not found"
- Install PostgreSQL client tools (see Requirements above)

### "Server version mismatch" (pg_dump version vs PostgreSQL server version)

**Quick Fix:** The script now includes `--no-version-check` flag which bypasses this check. This is safe for forward compatibility (newer server with older client).

**Proper Fix:** Update your PostgreSQL client tools to match your server version:

**macOS:**
```bash
# Uninstall old version
brew uninstall postgresql@15

# Install latest (matches your server)
brew install postgresql@16

# Or install latest version
brew install postgresql
```

**Verify:**
```bash
pg_dump --version
# Should show version 16.x or higher
```

### "Connection refused"
- Check your production database allows connections from your IP
- Verify the connection string is correct
- Some services require IP whitelisting

### "Permission denied"
- Check database user has CREATE/DROP permissions
- Some managed services require specific user permissions

### "Database does not exist"
- Create the database first in your managed service dashboard
- Or the connection string should include the database name

## Regular Updates

After initial sync, you can:

1. **Sync again** (overwrites production with local):
   ```bash
   npm run db:sync:production
   ```

2. **Use Prisma migrations** for schema changes:
   ```bash
   npm run db:migrate  # Create migration
   DATABASE_URL="production-url" npm run db:migrate:deploy  # Apply
   ```

3. **Manual data updates** via admin interface or scripts

## Best Practices

- **First time**: Use full sync to get all your data
- **Schema changes**: Use Prisma migrations
- **Data updates**: Use admin interface or custom scripts
- **Backup**: Always backup production before syncing!

