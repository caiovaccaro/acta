# Admin Integration into Next.js Web App

The admin functionality has been integrated into the Next.js web application, allowing both to be served from the same port and deployed together to Vercel.

## Structure

### Admin Routes

All admin functionality is now under `/admin`:

- **`/admin`** - Admin dashboard (landing page)
- **`/admin/topics`** - Topics management
- **`/admin/questions`** - Questions management  
- **`/admin/settings`** - Settings
- **`/admin/api/health`** - Health check endpoint

### Files Created

1. **`apps/web/app/admin/layout.tsx`** - Admin layout with navigation bar
2. **`apps/web/app/admin/page.tsx`** - Admin dashboard/landing page
3. **`apps/web/app/admin/topics/page.tsx`** - Topics management page (placeholder)
4. **`apps/web/app/admin/questions/page.tsx`** - Questions management page (placeholder)
5. **`apps/web/app/admin/settings/page.tsx`** - Settings page (placeholder)
6. **`apps/web/app/admin/api/health/route.ts`** - Health check API route
7. **`apps/web/app/components/ConditionalHeader.tsx`** - Conditionally shows header (hidden on admin routes)
8. **`apps/web/app/components/ConditionalFooter.tsx`** - Conditionally shows footer (hidden on admin routes)
9. **`vercel.json`** - Vercel deployment configuration

### Navigation Bar

The admin section has its own navigation bar with:
- **Dashboard** - Main admin landing page
- **Topics** - Manage topics
- **Questions** - Manage questions
- **Settings** - System settings
- **Back to Site** - Link to return to main site

The navigation highlights the active route and uses icons from `lucide-react`.

## How It Works

1. **Conditional Layout**: The root layout uses `ConditionalHeader` and `ConditionalFooter` components that check the pathname and hide the main site header/footer when on `/admin/*` routes.

2. **Admin Layout**: The `/admin` route group has its own layout that provides:
   - Admin-specific navigation bar
   - Consistent styling
   - Back to site link

3. **Single Port**: Both web and admin are served from the same Next.js app on the same port (default: 3000).

## Deployment to Vercel

The `vercel.json` configuration ensures:
- Build command points to `apps/web`
- Output directory is `apps/web/.next`
- Framework is set to Next.js
- Admin routes are properly handled

### Vercel Setup

1. Connect your repository to Vercel
2. Set root directory to `apps/web` (or configure in Vercel dashboard)
3. Vercel will automatically detect Next.js and use the configuration

### Environment Variables

Make sure to set all required environment variables in Vercel:
- `DATABASE_URL`
- `OPENAI_API_KEY` (if using LLM features)
- Any other environment variables your app needs

## Development

Run the development server:

```bash
npm run web:dev
```

Then access:
- Main site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Next Steps

The admin pages are currently placeholders. You'll need to implement:

1. **Topics Management** (`/admin/topics`):
   - List all topics
   - Create/edit/delete topics
   - Approve/reject discovered topics
   - Set featured questions

2. **Questions Management** (`/admin/questions`):
   - List all questions
   - Create/edit/delete questions
   - Validate questions
   - View validation results

3. **Settings** (`/admin/settings`):
   - System configuration
   - Feature flags
   - API keys management

4. **Dashboard** (`/admin`):
   - Real-time statistics
   - System health monitoring
   - Recent activity

## Migration Notes

- The old Express.js admin server (`apps/admin`) is no longer needed for the web deployment
- All admin routes are now Next.js pages/API routes
- The health endpoint moved from `/health` to `/admin/api/health`
- Both web and admin share the same Next.js app, making deployment simpler

