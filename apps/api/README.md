# @acta/api

Service layer for topics, questions, verdicts, consensus, debate, and timeline.

The public HTTP API is **Next.js** under `apps/web/app/api/*` (`npm run web:dev`). Those routes import functions from this package. Do not treat Fastify as the production server.

## Setup

Install and run the web app from the repo root (see root `README.md`). This package is consumed as `@acta/api`.

## HTTP surface (via Next.js)

Examples, all under the Next.js origin:

- `GET /api/health`
- `GET /api/topics`, `GET /api/topics/:id`, `GET /api/topics/:id/verdict`
- `GET /api/questions`, `GET /api/questions/:id`, `GET /api/questions/:id/country-stances`
- `GET /api/verdicts/:questionId`, `.../current`, `.../:month`
- `GET /api/consensus/:questionId/thermometer`
- `GET /api/debate/:questionId`
- `GET /api/timeline`

Ideology is not exposed in API responses.

## Layout

```
apps/api/src/
  services/   # used by apps/web
  routes/     # Fastify wrappers (legacy; not used by Next.js)
  server.ts   # optional Fastify listener (`npm run api:dev`)
```

`npm run api:dev` starts the leftover Fastify process. The site does not call it.

## Tests

```bash
npm run test:api
# or
cd apps/api && npm test
```
