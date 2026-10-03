# API tests

Unit and integration tests live in `apps/api`.

```bash
# from repo root
npm run test:api

# integration only
cd apps/api && npm run test:integration
```

Integration tests use `DATABASE_URL` from `.env` and real rows when present. They are read-only. Missing seed data shows as skipped/warnings, not necessarily a code failure.

Public HTTP is served by Next.js (`npm run web:dev`), not a separate Fastify port.
