# API Integration Tests

Integration tests for the Acta REST API that use real database data.

## Running Tests

```bash
# From project root
npm run api:test

# Or from apps/api directory
cd apps/api
npm run test:integration
```

## What These Tests Do

The integration tests:
1. Connect to the real database (using `DATABASE_URL` from `.env`)
2. Start the Fastify API server
3. Make actual HTTP requests to all endpoints
4. Verify response structure and data
5. Display results in the terminal with readable output

## Test Coverage

- ✅ Health & Status endpoints
- ✅ Topics endpoints (list, details, verdict)
- ✅ Verdicts endpoints (history, current, specific month)
- ✅ Consensus Thermometer endpoint
- ✅ Debate Card endpoint
- ✅ Transparency endpoints
- ✅ Feedback endpoint

## Expected Output

The tests will show:
- ✅ Success indicators for each endpoint
- ⚠️  Warnings when data is missing (e.g., no topics, no verdicts)
- Detailed information about the data returned (counts, sample values)

## Notes

- Tests require a running database with data
- Tests use real data from your database
- Some tests may be skipped if required data doesn't exist (e.g., no topics)
- All tests are designed to be non-destructive (read-only)

