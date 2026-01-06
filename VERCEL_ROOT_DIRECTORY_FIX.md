# Vercel Root Directory Configuration - REQUIRED

## The Problem

Vercel is looking for `routes-manifest.json` in `/vercel/path0/.next/` but your build outputs to `/vercel/path0/apps/web/.next/`.

This happens because Vercel doesn't know your Next.js app is in a subdirectory of the monorepo.

## The Solution: Set Root Directory in Vercel Dashboard

**You MUST do this in the Vercel dashboard - it cannot be configured in vercel.json:**

1. Go to https://vercel.com
2. Select your project
3. Go to **Settings** → **General**
4. Scroll down to **Root Directory**
5. Click **Edit**
6. Enter: `apps/web`
7. Click **Save**

## Why This Works

Setting the root directory to `apps/web` tells Vercel:
- The Next.js app is located in `apps/web/`
- The build output (`.next/`) is in `apps/web/.next/`
- All paths are relative to `apps/web/`

After setting this, Vercel will:
- ✅ Find `routes-manifest.json` in the correct location
- ✅ Successfully complete the deployment
- ✅ Serve your app correctly

## Alternative: Modify Build Output (Not Recommended)

If you absolutely cannot set the root directory in Vercel dashboard, you could modify the build to output to the root, but this is **not recommended** as it can cause other issues:

1. Modify `apps/web/next.config.js`:
   ```js
   distDir: '../../.next'
   ```

2. Update `vercel.json`:
   ```json
   {
     "outputDirectory": ".next"
   }
   ```

**But setting the root directory in Vercel dashboard is the correct and recommended solution.**

## Verification

After setting the root directory, redeploy and check:
- ✅ Build completes without "routes-manifest.json not found" error
- ✅ All routes work correctly
- ✅ Admin interface loads
- ✅ API routes respond

