# @acta/api

Service layer for topics, questions, verdicts, consensus, debate, and timeline.

Public HTTP lives in Next.js: `apps/web/app/api/*` (`npm run web:dev`). Those routes import this package.

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

## Tests

```bash
npm run test:api
```
