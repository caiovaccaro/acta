# Retry Failed Crawl Requests

This guide explains how to retry crawling articles that have failed 3 or more times.

## Quick Start

To retry all failed crawl requests (with 3+ attempts):

```bash
npm run db:retry:failed-crawls
```

This will:
- Find all crawl requests with `status = failed` and `attempts >= 3`
- Reset them to `status = pending`
- Clear their error messages
- Preserve the attempts counter (it will be incremented on the next retry)

## Options

### Retry for Specific Outlet

```bash
npm run db:retry:failed-crawls -- --outlet-id=<outlet-id>
```

Example:
```bash
npm run db:retry:failed-crawls -- --outlet-id=abc123-def456-ghi789
```

### Reset Attempts Counter

By default, the attempts counter is preserved. To reset it to 0:

```bash
npm run db:retry:failed-crawls -- --reset-attempts
```

This is useful if you want to give failed requests a fresh start.

### Custom Minimum Attempts

By default, only requests with 3+ attempts are retried. To change this:

```bash
npm run db:retry:failed-crawls -- --min-attempts=5
```

This will only retry requests that have failed 5 or more times.

## Combined Options

You can combine options:

```bash
# Retry failed requests for a specific outlet and reset attempts
npm run db:retry:failed-crawls -- --outlet-id=<id> --reset-attempts

# Retry requests with 5+ attempts and reset counter
npm run db:retry:failed-crawls -- --min-attempts=5 --reset-attempts
```

## After Retrying

After running the retry script, the requests will be in `pending` status. They will be automatically picked up by the crawler on the next run:

```bash
npm run crawler:start
```

## How It Works

1. **Finds Failed Requests**: The script queries for crawl requests with:
   - `status = 'failed'`
   - `attempts >= 3` (or your specified minimum)

2. **Resets to Pending**: Updates the requests to:
   - `status = 'pending'`
   - `errorMessage = null`
   - Optionally resets `attempts = 0` if `--reset-attempts` is used

3. **Crawler Processing**: On the next crawler run, these requests will be:
   - Fetched as pending requests
   - Processed normally
   - If they fail again, `attempts` will be incremented

## Example Output

```
🔄 Retrying Failed Crawl Requests...

✅ Database connected

📊 Found 42 failed crawl request(s) with 3+ attempts

   By outlet:
      - The New York Times: 15
      - The Guardian: 12
      - BBC News: 10
      - Reuters: 5

✅ Successfully reset 42 crawl request(s) to pending status
   (Attempts counter preserved - they will be incremented on next retry)

💡 These requests will be picked up by the crawler on the next run
   Run: npm run crawler:start
```

## Checking Failed Requests

To see how many failed requests exist before retrying, you can check the database:

```sql
-- Count failed requests with 3+ attempts
SELECT COUNT(*) 
FROM crawl_requests 
WHERE status = 'failed' 
  AND attempts >= 3;

-- See breakdown by outlet
SELECT o.name, COUNT(*) as failed_count
FROM crawl_requests cr
JOIN outlets o ON cr."outletId" = o.id
WHERE cr.status = 'failed' 
  AND cr.attempts >= 3
GROUP BY o.name
ORDER BY failed_count DESC;
```

## Notes

- **Default Retry Limit**: The system uses `MAX_RETRY_ATTEMPTS = 3` by default
- **Automatic Retries**: Requests with `attempts < 3` are automatically retried by the crawler
- **Manual Retry**: This script is for requests that have exceeded the automatic retry limit
- **Idempotent**: Running the script multiple times is safe - it only affects failed requests

