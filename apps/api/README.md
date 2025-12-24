# Acta REST API

RESTful API server for the Acta Platform, built with Fastify and TypeScript.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the project root (or use the existing one):
   ```env
   DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"
   NODE_ENV=development
   PORT=3001
   HOST=0.0.0.0
   CORS_ORIGIN=http://localhost:3000
   LOG_LEVEL=info
   ```

3. **Start the server:**
   ```bash
   npm run api:start
   # or for development with auto-reload:
   npm run api:dev
   ```

   The API will be available at `http://localhost:3001`

## API Endpoints

### Health & Status

- `GET /api/health` - Health check endpoint
- `GET /api/status` - System status (last crawl, analysis, verdict calculation)

### Topics

- `GET /api/topics` - List all approved topics
  - Query params: `?includeInactive=true` (optional)
- `GET /api/topics/:id` - Get topic details with questions
- `GET /api/topics/:id/verdict` - Get current verdict for topic's active question

### Verdicts

- `GET /api/verdicts/:questionId` - Get verdict history for a question
  - Query params: `?limit=12` (optional, default: 12)
- `GET /api/verdicts/:questionId/current` - Get current month's verdict
- `GET /api/verdicts/:questionId/:month` - Get specific month's verdict
  - Month format: `YYYY-MM` (e.g., `2025-01`)

### Consensus Thermometer

- `GET /api/consensus/:questionId/thermometer` - Get consensus breakdown by publication/outlet
  - Query params: `?month=2025-01` (optional, defaults to current month)

### Debate Card

- `GET /api/debate/:questionId` - Get debate card data (arguments, unknowns, overview)
  - Query params: `?month=2025-01` (optional)

### Transparency

- `GET /api/transparency/outlets` - Get all outlets with credibility scores
- `GET /api/transparency/methodology` - Get methodology explanation

### Feedback

- `POST /api/feedback` - Submit feedback on a verdict
  - Body: `{ verdictId: string, type: 'useful' | 'biased' | 'inaccurate', notes?: string }`

## Project Structure

```
apps/api/
  src/
    index.ts              # Entry point
    server.ts             # Fastify server setup
    routes/               # Route handlers
      health.ts
      topics.ts
      verdicts.ts
      consensus.ts
      debate.ts
      transparency.ts
      feedback.ts
      index.ts
    services/             # Business logic
      topicsService.ts
      verdictsService.ts
      consensusService.ts
      debateService.ts
      transparencyService.ts
      feedbackService.ts
    middleware/           # Middleware
      errorHandler.ts
      logger.ts
  package.json
  tsconfig.json
```

## Dependencies

- **Fastify** - Web framework
- **@acta/db** - Database access (Prisma)
- **@acta/core** - Domain logic
- **@acta/shared** - Shared DTOs

## Development

The API uses TypeScript with strict mode. Run type checking:

```bash
npm run type-check
```

## Notes

- All endpoints return JSON
- Error responses follow the `ErrorResponse` format
- Ideology is **never exposed** in API responses (backend-only)
- Monthly verdicts default to current month period
- CORS is configured to allow requests from the frontend


