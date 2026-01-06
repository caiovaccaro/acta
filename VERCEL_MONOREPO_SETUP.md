# Vercel Monorepo Setup

## Critical: Set Root Directory in Vercel Dashboard

For this monorepo, you **MUST** set the root directory in Vercel dashboard:

1. Go to your Vercel project → **Settings** → **General**
2. Scroll to **Root Directory**
3. Set it to: `apps/web`
4. Click **Save**

This tells Vercel where your Next.js app is located in the monorepo.

## Why This Is Needed

The build outputs to `apps/web/.next/`, but Vercel looks for `routes-manifest.json` in the root `.next/` by default. Setting the root directory to `apps/web` tells Vercel:
- Where to find your Next.js app
- Where to look for the `.next` build output
- Where to run the build commands from

## Alternative: If You Can't Set Root Directory

If for some reason you can't set the root directory in Vercel dashboard, you can modify the build to output to the root:

1. Change `apps/web/next.config.js` to output to root:
   ```js
   const nextConfig = {
     distDir: '../../.next', // Output to root .next
     // ... rest of config
   }
   ```

2. Update `vercel.json`:
   ```json
   {
     "outputDirectory": ".next"
   }
   ```

**However, setting the root directory in Vercel dashboard is the recommended approach.**

## Verification

After setting the root directory, the build should:
- ✅ Find `routes-manifest.json` in `apps/web/.next/`
- ✅ Successfully deploy
- ✅ All routes work correctly

