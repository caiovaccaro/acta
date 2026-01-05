# Vercel Deployment Guide

## Overview

The entire Acta application (frontend, admin, and API) is now configured for Vercel deployment as a single Next.js application.

## Architecture

- **Frontend**: Next.js app at `/` (public pages)
- **Admin**: Next.js app at `/admin/*` (admin interface)
- **API**: Next.js API routes at `/api/*` (public API endpoints)
- **Database**: Prisma ORM with PostgreSQL (configured via environment variables)

## Environment Variables

**It's simple!** Just set one environment variable in Vercel:

1. **DATABASE_URL**: Your PostgreSQL connection string
   - Get it from your database provider (Neon, Supabase, Railway, etc.)
   - Format: `postgresql://user:password@host:5432/database?schema=public`
   - That's it! No special configuration needed.

2. **OPENAI_API_KEY** (Optional): Only if using LLM features

## Build Configuration

The build process:
1. Generates Prisma client (`npm run db:generate`)
2. Builds Next.js application (`npm run build`)

This is configured in:
- `vercel.json` - Build command
- `apps/web/package.json` - Postinstall script

## API Routes

All public API routes have been migrated from Fastify to Next.js route handlers:

- `/api/topics` - List topics
- `/api/topics/[id]` - Get topic details
- `/api/topics/[id]/verdict` - Get topic verdict
- `/api/questions` - List questions
- `/api/questions/[id]` - Get question details
- `/api/verdicts/[questionId]` - Get verdict history
- `/api/verdicts/[questionId]/current` - Get current verdict
- `/api/verdicts/[questionId]/[month]` - Get verdict for specific month
- `/api/consensus/[questionId]/thermometer` - Get consensus thermometer
- `/api/debate/[questionId]` - Get debate card
- `/api/timeline` - Get timeline events
- `/api/health` - Health check

## Admin Routes

Admin interface is available at `/admin/*`:
- `/admin` - Dashboard
- `/admin/topics` - Topics management
- `/admin/questions` - Questions management
- `/admin/verdicts` - Verdicts management
- `/admin/articles` - Articles management
- `/admin/outlets` - Outlets management
- `/admin/crawl-requests` - Crawl requests management

## Prisma Configuration

Prisma is configured for serverless:
- Connection pooling optimized for Vercel
- No dotenv dependency (uses environment variables directly)
- Prisma client generated during build

## API Client

The frontend API client (`apps/web/lib/apiClient.ts`) is configured to:
- Use relative paths in production (same origin)
- Use `NEXT_PUBLIC_API_URL` if set (for development with external API)

## Deployment Steps

1. **Connect Repository to Vercel**
   - Import your Git repository
   - Vercel will detect Next.js automatically

2. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add `DATABASE_URL` and `OPENAI_API_KEY` (if needed)

3. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: (auto-detected from `vercel.json`)
   - Output Directory: `apps/web/.next`
   - Install Command: `npm install`

4. **Deploy**
   - Push to your main branch or use Vercel CLI
   - Vercel will automatically build and deploy

## Troubleshooting

### Prisma Client Not Found
- Ensure `postinstall` script runs: `cd ../../modules/db && npm run db:generate`
- Check that `@acta/db` is properly installed

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly in Vercel
- Most managed PostgreSQL services (Neon, Supabase, etc.) work out of the box
- No special connection pooling setup needed - managed services handle it automatically

### API Routes Not Working
- Check that routes are in `apps/web/app/api/` directory
- Verify imports are using correct relative paths
- Check server logs in Vercel dashboard

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all workspace dependencies are installed
- Verify TypeScript compilation passes locally

## Notes

- The crawler is **not** deployed to Vercel (runs separately)
- All API services are now Next.js route handlers (no separate Fastify server)
- Database must be accessible from Vercel's serverless functions
- Consider using Prisma Data Proxy for better connection pooling in serverless

