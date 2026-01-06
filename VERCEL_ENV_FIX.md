# Fix: Vercel Environment Variable Error

## Problem

You're seeing: `Environment Variable "DATABASE_URL" references Secret "database_url", which does not exist.`

This happened because `vercel.json` was trying to reference secrets that don't exist.

## Solution

I've removed the secret references from `vercel.json`. Now you need to set the environment variables directly in Vercel:

### Step 1: Go to Vercel Dashboard

1. Go to https://vercel.com
2. Select your project
3. Click **Settings** → **Environment Variables**

### Step 2: Add DATABASE_URL

1. Click **Add New**
2. **Key**: `DATABASE_URL`
3. **Value**: Paste your production database connection string
   - Example: `postgresql://user:password@host:5432/database?sslmode=require`
4. **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 3: Add OPENAI_API_KEY (Optional)

Only if you're using LLM features:

1. Click **Add New**
2. **Key**: `OPENAI_API_KEY`
3. **Value**: Your OpenAI API key (starts with `sk-`)
4. **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 4: Redeploy

After adding the environment variables, trigger a new deployment:

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

Or just push a new commit to trigger a deployment.

## What Changed

I removed this from `vercel.json`:
```json
"env": {
  "DATABASE_URL": "@database_url",
  "OPENAI_API_KEY": "@openai_api_key"
}
```

Now environment variables are set directly in the Vercel dashboard, which is simpler and more straightforward.

## Alternative: Using Vercel Secrets (Advanced)

If you prefer using secrets (for sharing across projects), you can:

1. Go to **Settings** → **Secrets**
2. Create a secret named `database_url`
3. Add the connection string as the value
4. Then reference it in `vercel.json` as `"@database_url"`

But for most cases, setting environment variables directly is easier!

