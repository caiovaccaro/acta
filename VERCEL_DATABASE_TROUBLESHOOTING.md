# Vercel Database Troubleshooting Guide

## Issue: LLM-generated content not showing (NOT_FOUND errors)

If you're seeing `NOT_FOUND` errors for verdicts, debate cards, and other LLM-generated content even though the database is in sync, follow these steps:

## 1. Check Database Connection

Visit `/api/health` in your deployed app. It should show:
```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "urlPresent": true
  }
}
```

If `database.status` is not `"connected"`, check:
- `DATABASE_URL` is set in Vercel environment variables
- The database URL is correct and accessible
- The database server allows connections from Vercel's IP ranges

## 2. Check Vercel Logs

In Vercel dashboard → Your Project → Logs, look for:
- `[@acta/db] DATABASE_URL is set, Prisma client initializing...`
- `[getVerdictCard] Looking for verdict...`
- `[getVerdictCard] Verdict not found...`

These logs will tell you:
- If DATABASE_URL is being loaded
- What questionId and month are being queried
- Whether the query is failing or just returning no results

## 3. Verify Data Exists

The most common issue is that verdicts exist for a different month than the current month. The API uses `getCurrentMonthPeriod()` which returns the current month.

To check what month your verdicts are for:
1. Connect to your production database
2. Run: `SELECT question_id, month, verdict_label FROM verdicts ORDER BY month DESC LIMIT 10;`
3. Compare the `month` values with the current date

## 4. Common Issues

### Issue: Verdicts exist but for different month
**Solution**: The API queries for the current month by default. If your verdicts are for a previous month, you need to either:
- Pass the `month` parameter in the API call
- Or ensure verdicts are calculated for the current month

### Issue: DATABASE_URL not set in Vercel
**Solution**: 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `DATABASE_URL` with your production database connection string
3. Redeploy

### Issue: Database connection timeout
**Solution**: 
- Use a connection pooler (like PgBouncer or Supabase connection pooler)
- Or use Prisma Data Proxy (recommended for serverless)

### Issue: Schema mismatch
**Solution**:
- Run migrations on production: `npm run db:migrate:deploy`
- Or sync schema: `npm run db:sync:schema-only`

## 5. Debugging Steps

1. **Check health endpoint**: `/api/health`
2. **Check logs**: Vercel dashboard → Logs
3. **Test database query directly**: Use a database client to verify data exists
4. **Check month matching**: Verify verdicts exist for the month being queried
5. **Check question IDs**: Verify the questionId in the API call matches questions in the database

## 6. Quick Fixes

### If verdicts exist but for wrong month:
Modify the API call to include the month parameter:
```
/api/verdicts/[questionId]/current?month=2024-01
```

### If DATABASE_URL is missing:
1. Set it in Vercel environment variables
2. Redeploy

### If connection is failing:
1. Check database firewall settings
2. Ensure connection string includes SSL parameters if required
3. Consider using a connection pooler

## 7. Next Steps

After checking the logs, you should see specific error messages that will guide you to the exact issue. The enhanced logging will show:
- Whether DATABASE_URL is present
- What questionId and month are being queried
- Whether the query succeeds but returns no results
- Any database connection errors

