#!/usr/bin/env node
/**
 * Database Health Check Script
 * 
 * Run this script to validate database structure and connectivity
 * Usage: npx tsx src/scripts/healthCheck.ts
 */

import { performHealthCheck, quickHealthCheck } from '../healthCheck.js';
import { connectDatabase, disconnectDatabase } from '../index.js';

async function main() {
  console.log('🔍 Starting database health check...\n');

  try {
    await connectDatabase();
    
    const result = await performHealthCheck();

    console.log('\n📊 Health Check Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Overall Status: ${result.success ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('Connectivity:', result.checks.connectivity ? '✅' : '❌');
    console.log('Schema:');
    console.log('  - Outlets table:', result.checks.schema.outlets ? '✅' : '❌');
    console.log('  - CrawlRequests table:', result.checks.schema.crawlRequests ? '✅' : '❌');
    console.log('  - Articles table:', result.checks.schema.articles ? '✅' : '❌');
    console.log('Enums:', result.checks.enums ? '✅' : '❌');
    console.log('Indexes:', result.checks.indexes ? '✅' : '❌');
    console.log('Constraints:', result.checks.constraints ? '✅' : '❌');

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (result.success) {
      console.log('✅ All health checks passed!');
      process.exit(0);
    } else {
      console.log('❌ Health check failed. Please review errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

