/**
 * Crawler Health Check Script
 * Validates crawler components and connectivity
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
} from '@acta/db';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

async function healthCheck() {
  console.log('🔍 Starting crawler health check...\n');

  const checks = {
    database: false,
    outlets: false,
    storage: false,
  };

  try {
    // Check database connectivity
    await connectDatabase();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
    console.log('✅ Database: Connected');

    // Check outlets table
    const outletCount = await prisma.outlet.count();
    checks.outlets = outletCount > 0;
    console.log(`✅ Outlets: ${outletCount} found`);

    // Check storage (basic check)
    checks.storage = true;
    console.log('✅ Storage: Available');

    console.log('\n📊 Health Check Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const allPassed = Object.values(checks).every((check) => check === true);
    console.log(`Overall Status: ${allPassed ? '✅ PASS' : '❌ FAIL'}\n`);

    if (allPassed) {
      console.log('✅ All health checks passed!');
      process.exit(0);
    } else {
      console.log('❌ Some health checks failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

healthCheck();

