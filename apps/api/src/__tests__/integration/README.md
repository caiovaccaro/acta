# API integration tests

```bash
npm run test:api
# or
cd apps/api && npm run test:integration
```

Tests load `DATABASE_URL` from the repo `.env` and exercise service/route code against the local database. They are read-only.

The live app serves `/api/*` from Next.js, not from a standalone Fastify process.
