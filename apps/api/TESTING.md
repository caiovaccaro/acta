# API Testing Guide

## Integration Tests

The API includes comprehensive integration tests that use **real database data** to verify all endpoints work correctly.

### Running Tests

From the project root:
```bash
npm run api:test
```

From the `apps/api` directory:
```bash
npm run test:integration
```

### What Gets Tested

The integration tests verify:

1. **Health Endpoints**
   - `/api/health` - Database connection status
   - `/api/status` - System status information

2. **Topics Endpoints**
   - `GET /api/topics` - List all topics
   - `GET /api/topics/:id` - Topic details with questions
   - `GET /api/topics/:id/verdict` - Current verdict for topic

3. **Verdicts Endpoints**
   - `GET /api/verdicts/:questionId` - Verdict history
   - `GET /api/verdicts/:questionId/current` - Current month's verdict
   - `GET /api/verdicts/:questionId/:month` - Specific month verdict

4. **Consensus Thermometer**
   - `GET /api/consensus/:questionId/thermometer` - Outlet stances by publication

5. **Debate Card**
   - `GET /api/debate/:questionId` - Arguments, unknowns, sources

6. **Transparency**
   - `GET /api/transparency/outlets` - Outlet credibility data
   - `GET /api/transparency/methodology` - Methodology explanation

7. **Feedback**
   - `POST /api/feedback` - Submit feedback

### Test Output

The tests provide detailed, readable output in the terminal:

- ✅ **Success indicators** - Shows when endpoints work correctly
- ⚠️ **Warnings** - Indicates when data is missing (e.g., no topics, no verdicts)
- **Detailed information** - Displays counts, sample values, and data structures

Example output:
```
✅ Health check: { status: 'ok', database: 'connected', ... }
✅ Found 3 topics
   Sample topic: { name: 'Gaza', questions: 2, activeQuestions: 1 }
✅ Verdict for topic "Gaza":
   Question: "Is what's happening in Gaza a genocide?"
   Verdict: LeaningYes (75% confidence)
   Articles: 42, Outlets: 8
```

### Prerequisites

1. **Database must be running** - Tests connect to the database using `DATABASE_URL` from `.env`
2. **Data should exist** - Tests work best with real data (topics, questions, verdicts)
3. **Dependencies installed** - Run `npm install` first

### Test Behavior

- **Non-destructive** - Tests are read-only and don't modify data
- **Graceful handling** - Tests skip gracefully when required data doesn't exist
- **Real data** - Uses actual database records, not mocks
- **Fast execution** - All tests run in under 30 seconds

### Troubleshooting

**Tests fail with "Database connection failed"**
- Check that `DATABASE_URL` is set correctly in `.env`
- Ensure PostgreSQL is running
- Verify database credentials

**Tests show warnings about missing data**
- This is normal if you haven't seeded topics/questions yet
- Run `npm run db:seed:topics` and `npm run db:seed:questions` first
- Run `npm run analyze:articles` to generate verdicts

**Type errors**
- Run `npm run db:generate` to regenerate Prisma client
- Ensure all dependencies are installed: `npm install`

### Next Steps

After running tests successfully, you can:
1. Start the API server: `npm run api:start`
2. Test endpoints manually with `curl` or Postman
3. Proceed with Phase 2: Frontend Integration




