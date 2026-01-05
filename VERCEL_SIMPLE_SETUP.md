# Simple Vercel + PostgreSQL Setup

## It's Actually Simple! 🎉

Yes, it can just work! Here's the straightforward setup:

## Step 1: Get a PostgreSQL Database

Choose one of these (all work the same way):

### Option A: Neon (Recommended - Free tier available)
1. Go to https://neon.tech
2. Sign up (free)
3. Create a new project
4. Copy the connection string (looks like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`)

### Option B: Supabase (Free tier available)
1. Go to https://supabase.com
2. Sign up (free)
3. Create a new project
4. Go to Settings → Database
5. Copy the connection string

### Option C: Railway (Simple, paid)
1. Go to https://railway.app
2. Create new project → Add PostgreSQL
3. Copy the connection string from the database service

### Option D: Render (Free tier available)
1. Go to https://render.com
2. Create new PostgreSQL database
3. Copy the connection string

## Step 2: Set Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your connection string from Step 1
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

## Step 3: Deploy

That's it! Push to your main branch and Vercel will:
- Build your Next.js app
- Generate Prisma client
- Connect to your database
- Everything just works ✨

## That's It!

No connection pooling configuration needed for most cases. The managed services handle it automatically.

## For Local Development

Create `.env.local` in your project root:
```bash
DATABASE_URL="your-connection-string-here"
```

Or use the same connection string from your managed service.

## Why It Works

- Next.js automatically loads environment variables
- Prisma connects using the `DATABASE_URL`
- Managed PostgreSQL services handle connection pooling automatically
- No extra configuration needed

## Troubleshooting

**"Can't connect to database"**
- Check the connection string is correct
- Make sure the database allows connections from anywhere (most managed services do by default)
- Verify the database is running

**"Too many connections"**
- This rarely happens with managed services
- If it does, the service usually has a connection pooler built-in (just use their pooler URL instead)

## Recommended: Neon

Neon is specifically designed for serverless (like Vercel) and handles everything automatically. Just copy the connection string and you're done!

