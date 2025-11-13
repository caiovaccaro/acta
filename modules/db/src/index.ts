/**
 * @acta/db - Database Module
 * 
 * Exports Prisma client and database utilities
 */

import { PrismaClient } from '@prisma/client';

// Singleton Prisma client instance
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export Prisma types
export * from '@prisma/client';

// Database connection utilities
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

// Health check (legacy - use performHealthCheck for detailed checks)
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Re-export health check utilities (detailed checks)
export { performHealthCheck, quickHealthCheck } from './healthCheck.js';
export type { HealthCheckResult } from './healthCheck.js';

// Re-export repositories
export * from './repositories/outletRepository.js';
export * from './repositories/crawlRequestRepository.js';
export * from './repositories/articleRepository.js';

// Re-export findCrawlRequestById and resetStuckInProgressRequests for convenience
export { findCrawlRequestById, resetStuckInProgressRequests } from './repositories/crawlRequestRepository.js';

// Re-export retry limit constants for convenience
export { MAX_RETRY_ATTEMPTS, hasExceededRetryLimit } from './repositories/crawlRequestRepository.js';

// Re-export utilities
export * from './utils/urlNormalizer.js';

