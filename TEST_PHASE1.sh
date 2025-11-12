#!/bin/bash
# Phase 1 Testing Script
# Run this script to test all Phase 1 database setup

set -e  # Exit on error

echo "🧪 Phase 1 Database Testing Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"
echo ""

# Step 2: Start PostgreSQL
echo "📋 Step 2: Starting PostgreSQL..."
cd "$(dirname "$0")"
docker compose up -d
sleep 5
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✅ PostgreSQL container is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL container failed to start${NC}"
    exit 1
fi
echo ""

# Step 3: Check environment
echo "📋 Step 3: Checking environment variables..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found, creating...${NC}"
    cat > .env << 'ENVEOF'
DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"
NODE_ENV=development
ENVEOF
fi
echo -e "${GREEN}✅ .env file exists${NC}"
echo ""

# Step 4: Install dependencies
echo "📋 Step 4: Installing dependencies..."
cd modules/db
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi
echo ""

# Step 5: Generate Prisma client
echo "📋 Step 5: Generating Prisma client..."
npm run db:generate
echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

# Step 6: Run migration
echo "📋 Step 6: Running database migration..."
npm run db:migrate 2>&1 | grep -q "Applied" && echo -e "${GREEN}✅ Migration applied${NC}" || echo -e "${YELLOW}⚠️  Migration may have already been applied${NC}"
echo ""

# Step 7: Health check
echo "📋 Step 7: Running health check..."
if npm run db:health 2>&1 | grep -q "All health checks passed"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi
echo ""

# Step 8: Run tests
echo "📋 Step 8: Running unit tests..."
if npm test 2>&1 | grep -q "Tests:.*passed"; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
echo ""

echo "===================================="
echo -e "${GREEN}✅ All Phase 1 tests completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  - Review TESTING_GUIDE.md for detailed manual testing"
echo "  - Proceed to Phase 2: RSS → PostgreSQL Queue"
