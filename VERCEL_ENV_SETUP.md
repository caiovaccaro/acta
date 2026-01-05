# Vercel Environment Variables Setup

## Required Environment Variables

For the application to work on Vercel, you need to set the following environment variables in the Vercel dashboard:

### 1. DATABASE_URL (Required)

**Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public
```

**Example:**
```
postgresql://myuser:mypassword@db.example.com:5432/acta_db?schema=public
```

**Important Notes:**
- The database must be accessible from Vercel's serverless functions
- For production, use a connection pooler (PgBouncer, Prisma Data Proxy, or managed service pooler)
- Add `?sslmode=require` for SSL connections
- For serverless, consider using Prisma Data Proxy or a managed PostgreSQL service with built-in pooling

**Recommended Services:**
- **Neon** (serverless PostgreSQL) - Best for Vercel
- **Supabase** - Includes connection pooling
- **Railway** - Simple setup
- **Render** - Managed PostgreSQL

### 2. OPENAI_API_KEY (Optional)

Only needed if you're using LLM features (content generation, validation, etc.)

**Format:**
```
sk-...
```

## Setting Environment Variables in Vercel

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

## Next.js Environment Variable Loading

Next.js automatically loads environment variables from:
- `.env.local` (loaded in all environments, git-ignored)
- `.env.development` (development only)
- `.env.production` (production only)
- `.env` (default, loaded in all environments)

For local development, create `.env.local` in the project root:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/database?schema=public"
OPENAI_API_KEY="sk-..."
```

## Vercel-Specific Configuration

The application is configured to:
- Load environment variables automatically (Next.js handles this)
- Use Prisma client optimized for serverless
- Generate Prisma client during build (`postinstall` script)
- Transpile workspace packages (`@acta/db`, `@acta/core`, `@acta/api`)

## Testing Locally

1. Create `.env.local` in project root (or use existing `.env`)
2. Run `npm run web:dev`
3. The app will automatically load environment variables

## Troubleshooting

### "Environment variable not found: DATABASE_URL"

**Solution:**
- Ensure `.env.local` exists in project root for local development
- For Vercel, ensure `DATABASE_URL` is set in Environment Variables
- Check that the variable is available in the correct environment (Production/Preview/Development)

### Database Connection Issues

**Solution:**
- Verify the connection string is correct
- Check that the database allows connections from Vercel IPs
- For serverless, ensure you're using a connection pooler
- Test the connection string locally first

### Prisma Client Not Found

**Solution:**
- The `postinstall` script should generate Prisma client automatically
- If not, run `npm run db:generate` manually
- Check that `@acta/db` is properly installed in `node_modules`

