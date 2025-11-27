# @acta/db - Database Module

Database module using Prisma ORM for PostgreSQL with pgvector support.

## Overview

This module provides:
- **Prisma ORM** integration for type-safe database access
- **Three core models**: Outlet, CrawlRequest, and Article
- **Health checks** and validation utilities
- **Database connection** management

## Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- Docker & Docker Compose (for local PostgreSQL)
- pnpm (or npm)

### 1. Start PostgreSQL

```bash
# From project root
docker compose up -d
```

This starts PostgreSQL with pgvector extension on port 5432.

**Database Configuration:**
- Database: `acta_dev`
- User: `acta`
- Password: `acta_dev_password`
- Port: `5432`

### 2. Set Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"
NODE_ENV=development
```

You can also create a `.env` file in `modules/db/` if running commands from that directory.

### 3. Install Dependencies

```bash
# From project root
pnpm install

# Or from modules/db
cd modules/db && npm install
```

### 4. Generate Prisma Client

```bash
# From project root
pnpm --filter @acta/db db:generate

# Or from modules/db
cd modules/db && npm run db:generate
```

### 5. Run Migrations

```bash
# From project root
pnpm --filter @acta/db db:migrate

# Or from modules/db
cd modules/db && npm run db:migrate
```

This will:
- Create the database schema
- Generate the Prisma client
- Set up all tables, indexes, and constraints

**Note:** If the database isn't running, you can still create the migration file with `--create-only` flag, then apply it later with `db:migrate:deploy`.

### 6. Verify Setup

Run the health check to validate everything is working:

```bash
# From modules/db
npm run db:health

# Or using tsx directly
npx tsx src/scripts/healthCheck.ts
```

## Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Create and apply migrations (dev mode)
- `npm run db:migrate:deploy` - Apply migrations (production mode)
- `npm run db:studio` - Open Prisma Studio (database GUI at http://localhost:5555)
- `npm run db:health` - Run database health check
- `npm run db:reset` - Reset database (WARNING: deletes all data)
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode

## Database Schema

### Models

#### Outlet
News outlets with ideology and credibility scores.

**Fields:**
- `id` (UUID, primary key)
- `name` (string, unique)
- `ideology` (enum: Left, Center, Right)
- `credibilityScore` (float, 0-1, default: 0.5)
- `rssFeeds` (JSON array of RSS feed URLs)
- `createdAt`, `updatedAt` (timestamps)

**Indexes:**
- Unique on `name`
- Index on `ideology`
- Index on `credibilityScore`

#### CrawlRequest
URL queue with status tracking for articles to be crawled.

**Fields:**
- `id` (UUID, primary key)
- `url` (string, unique)
- `outletId` (foreign key to Outlet)
- `status` (enum: pending, in_progress, done, failed, default: pending)
- `attempts` (integer, default: 0)
- `errorMessage` (text, nullable)
- `createdAt`, `updatedAt` (timestamps)

**Indexes:**
- Unique on `url`
- Index on `status`
- Index on `outletId`
- Index on `createdAt`
- Composite index on `(status, createdAt)`

**Relations:**
- Belongs to `Outlet` (cascade delete)
- Has one `Article` (optional)

#### Article
Extracted article content and metadata.

**Fields:**
- `id` (UUID, primary key)
- `url` (string, unique)
- `crawlRequestId` (foreign key to CrawlRequest, optional, unique)
- `outletId` (foreign key to Outlet)
- `title` (text)
- `textContent` (text)
- `excerpt` (text, nullable)
- `publishedDate` (datetime, nullable)
- `extractedAt` (datetime, default: now)
- `createdAt`, `updatedAt` (timestamps)

**Indexes:**
- Unique on `url`
- Unique on `crawlRequestId`
- Index on `outletId`
- Index on `publishedDate`
- Index on `extractedAt`
- Index on `url`

**Relations:**
- Belongs to `Outlet` (cascade delete)
- Belongs to `CrawlRequest` (optional, set null on delete)

### Enums

- **Ideology**: `Left`, `Center`, `Right`
- **CrawlStatus**: `pending`, `in_progress`, `done`, `failed`

See `prisma/schema.prisma` for full schema definition.

## Usage

### Basic Usage

```typescript
import { prisma, connectDatabase, disconnectDatabase } from '@acta/db';

// Connect to database
await connectDatabase();

// Use Prisma client
const articles = await prisma.article.findMany({
  where: { outletId: 'some-id' },
  include: { outlet: true },
});

// Disconnect when done
await disconnectDatabase();
```

### Health Checks

```typescript
import { performHealthCheck, quickHealthCheck } from '@acta/db';

// Quick connectivity check
const isHealthy = await quickHealthCheck();

// Comprehensive health check
const result = await performHealthCheck();
if (result.success) {
  console.log('All checks passed!');
} else {
  console.error('Health check failed:', result.errors);
}
```

### Creating Records

```typescript
// Create an outlet
const outlet = await prisma.outlet.create({
  data: {
    name: 'The Guardian',
    ideology: 'Left',
    credibilityScore: 0.85,
    rssFeeds: ['https://www.theguardian.com/rss'],
  },
});

// Create a crawl request
const request = await prisma.crawlRequest.create({
  data: {
    url: 'https://example.com/article',
    outletId: outlet.id,
    status: 'pending',
  },
});

// Create an article
const article = await prisma.article.create({
  data: {
    url: 'https://example.com/article',
    outletId: outlet.id,
    crawlRequestId: request.id,
    title: 'Article Title',
    textContent: 'Article content...',
  },
});
```

## Testing

### Quick Test

Run all tests:

```bash
npm test
```

**Expected output:** All 18 tests should pass, including health checks, model validation, constraints, relationships, and cascade deletes.

### Test Coverage

The test suite includes:
- ✅ Health check validation
- ✅ Schema validation tests
- ✅ Model creation and constraint tests
- ✅ Unique constraint enforcement
- ✅ Default value tests
- ✅ Enum validation tests
- ✅ Relationship tests
- ✅ Cascade delete tests

See `src/__tests__/schema.test.ts` for full test coverage.

### Complete Testing Workflow

To thoroughly test the database setup:

1. **Start PostgreSQL:**
   ```bash
   docker compose up -d
   sleep 5  # Wait for database to be ready
   ```

2. **Verify Container:**
   ```bash
   docker ps | grep postgres
   ```

3. **Run Health Check:**
   ```bash
   npm run db:health
   ```
   Should show: ✅ All health checks passed!

4. **Run Unit Tests:**
   ```bash
   npm test
   ```
   Should show: `Tests: 18 passed, 18 total`

5. **Verify Schema (Optional):**
   ```bash
   # Using Prisma Studio
   npm run db:studio
   # Opens at http://localhost:5555
   
   # Or using psql
   docker exec acta-postgres psql -U acta -d acta_dev -c "\dt"
   ```

### Manual Database Operations Test

Test creating and querying data:

```bash
# Create test script
cat > test-manual.js << 'EOF'
import { prisma, connectDatabase, disconnectDatabase } from './src/index.js';

async function test() {
  await connectDatabase();
  
  // Create outlet
  const outlet = await prisma.outlet.create({
    data: {
      name: 'Test Outlet',
      ideology: 'Center',
      credibilityScore: 0.8,
      rssFeeds: ['https://example.com/rss'],
    },
  });
  console.log('✅ Created outlet:', outlet.name);
  
  // Create crawl request
  const request = await prisma.crawlRequest.create({
    data: {
      url: 'https://example.com/test',
      outletId: outlet.id,
    },
  });
  console.log('✅ Created crawl request:', request.url);
  
  // Create article
  const article = await prisma.article.create({
    data: {
      url: 'https://example.com/test',
      outletId: outlet.id,
      crawlRequestId: request.id,
      title: 'Test Article',
      textContent: 'Test content.',
    },
  });
  console.log('✅ Created article:', article.title);
  
  // Query with relationships
  const outletWithData = await prisma.outlet.findUnique({
    where: { id: outlet.id },
    include: { crawlRequests: true, articles: true },
  });
  console.log('✅ Outlet relations:', {
    crawlRequests: outletWithData?.crawlRequests.length,
    articles: outletWithData?.articles.length,
  });
  
  // Cleanup
  await prisma.article.delete({ where: { id: article.id } });
  await prisma.crawlRequest.delete({ where: { id: request.id } });
  await prisma.outlet.delete({ where: { id: outlet.id } });
  console.log('✅ Cleaned up');
  
  await disconnectDatabase();
}

test().catch(console.error);
EOF

# Run test
npx tsx test-manual.js

# Cleanup
rm test-manual.js
```

## Health Check

The health check validates:
- ✅ Database connectivity
- ✅ All tables exist (outlets, crawl_requests, articles)
- ✅ All enums exist (Ideology, CrawlStatus)
- ✅ Required indexes are present
- ✅ Foreign key constraints are set up correctly

Run it with:
```bash
npm run db:health
```

## Prisma Studio

Visual database browser:

```bash
npm run db:studio
```

Opens at http://localhost:5555 where you can:
- View all tables
- See the schema structure
- Test queries
- Edit data (with caution)

## DBeaver Connection

Connect DBeaver (database management tool) to visualize and query the database.

### Connection Details

- **Host:** `localhost` (or `127.0.0.1`)
- **Port:** `5432`
- **Database:** `acta_dev`
- **Username:** `acta`
- **Password:** `acta_dev_password`
- **Driver:** PostgreSQL
- **Authentication:** SCRAM-SHA-256

### Step-by-Step Connection

1. **Open DBeaver**
   - Launch DBeaver application

2. **Create New Connection**
   - Click the **"New Database Connection"** button (plug icon) in the toolbar
   - Or go to: **Database → New Database Connection**
   - Or press: `Ctrl+Shift+N` (Windows/Linux) or `Cmd+Shift+N` (Mac)

3. **Select PostgreSQL**
   - In the connection type list, find and select **PostgreSQL**
   - Click **Next**

4. **Enter Connection Details**
   
   In the **Main** tab:
   - **Host:** `localhost` (if this doesn't work, try `127.0.0.1`)
   - **Port:** `5432`
   - **Database:** `acta_dev`
   - **Username:** `acta`
   - **Password:** `acta_dev_password`
   
   ⚠️ **Important:** 
   - Check the **"Save password"** checkbox
   - Make sure password is entered exactly: `acta_dev_password` (no extra spaces)

5. **Configure Driver Properties** (Click "Driver properties" tab)
   - `sslmode`: `disable` (for local development)
   - `useSSL`: `false` (if present)
   
   These settings disable SSL which is not needed for local connections.

6. **Test Connection**
   - Click **"Test Connection"** button at the bottom
   - If prompted to download PostgreSQL driver, click **Download**
   - You should see: **"Connected"** message
   - Click **OK** to close the test dialog

7. **Finish**
   - Click **Finish** to create the connection
   - The connection will appear in the **Database Navigator** panel on the left

### Verify Connection

Once connected, you should see:

```
📁 acta_dev (PostgreSQL)
  📁 Schemas
    📁 public
      📁 Tables
        📄 articles
        📄 crawl_requests
        📄 outlets
      📁 Types
        📄 CrawlStatus
        📄 Ideology
      📁 Indexes
      📁 Constraints
```

### Useful DBeaver Features

**View Table Data:**
1. Expand: `acta_dev → Schemas → public → Tables`
2. Right-click on a table (e.g., `outlets`)
3. Select **"View Data"** or **"Read Data in SQL Editor"**

**Run SQL Queries:**
1. Right-click on `acta_dev` connection
2. Select **"SQL Editor → New SQL Script"**
3. Write and execute queries:

```sql
-- View all outlets
SELECT * FROM outlets;

-- View pending crawl requests
SELECT * FROM crawl_requests WHERE status = 'pending';

-- View articles with outlet info
SELECT a.title, a.url, o.name as outlet_name, o.ideology
FROM articles a
JOIN outlets o ON a."outletId" = o.id
LIMIT 10;
```

### DBeaver Troubleshooting

**Error: "FATAL: role 'acta' does not exist"**

This usually means DBeaver is connecting to a different PostgreSQL instance (likely a local one instead of Docker). Solutions:

1. **Check what's using port 5432:**
   ```bash
   lsof -i :5432
   ```

2. **If local PostgreSQL is running, either:**
   - Stop it: `brew services stop postgresql` (macOS) or stop the service
   - Or change Docker port in `docker-compose.yml` to `5433:5432` and use port `5433` in DBeaver

3. **Verify Docker container is running:**
   ```bash
   docker ps | grep postgres
   ```

**Error: "password authentication failed"**

1. Verify password matches exactly: `acta_dev_password`
2. Reset password if needed:
   ```bash
   docker exec acta-postgres psql -U acta -d postgres -c "ALTER USER acta WITH PASSWORD 'acta_dev_password';"
   ```

**Error: "Connection refused"**

1. Verify container is running: `docker ps | grep postgres`
2. Check container logs: `docker logs acta-postgres`
3. Restart container: `docker compose restart`

**Alternative: Connection URL**

If the form doesn't work, use connection URL:

1. Check **"Use URL"** checkbox
2. Enter URL:
   ```
   jdbc:postgresql://localhost:5432/acta_dev?user=acta&password=acta_dev_password&sslmode=disable
   ```

## Migration Management

### Create a New Migration

```bash
npm run db:migrate
```

This will:
1. Detect schema changes
2. Create a new migration file
3. Apply it to the database

### Apply Migrations (Production)

```bash
npm run db:migrate:deploy
```

Use this in production to apply migrations without creating new ones.

### Reset Database

⚠️ **WARNING**: This deletes all data!

```bash
npm run db:reset
```

## Troubleshooting

### Database Connection Failed

1. Check if PostgreSQL is running: `docker ps`
2. Verify DATABASE_URL in `.env` file
3. Check database credentials match docker-compose.yml

### Migration Errors

1. Ensure database is running
2. Check if migration was already applied: `npx prisma migrate status`
3. Reset if needed (WARNING: deletes data): `npm run db:reset`

### Prisma Client Not Found

Regenerate the client:
```bash
npm run db:generate
```

## Next Steps

Phase 1 is complete! You can now proceed to:
- **Phase 2**: RSS → PostgreSQL Queue
- **Phase 3**: Crawler → PostgreSQL Batch Processing
- **Phase 4**: Persist Results to PostgreSQL

## Files Structure

```
modules/db/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── migrations/            # Migration files
├── src/
│   ├── index.ts               # Main exports
│   ├── healthCheck.ts         # Health check utilities
│   ├── scripts/
│   │   └── healthCheck.ts    # CLI health check script
│   └── __tests__/
│       └── schema.test.ts    # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```
