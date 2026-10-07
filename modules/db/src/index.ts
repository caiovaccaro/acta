/**
 * @acta/db - Database Module
 * 
 * Exports Prisma client and database utilities
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables if not already loaded (for Next.js compatibility)
// In Next.js, env vars are loaded automatically, but we need this for other contexts
if (!process.env.DATABASE_URL) {
  try {
    const cwd = process.cwd();
    config({ path: resolve(cwd, '.env') });
    config({ path: resolve(cwd, '../../.env') });
    config({ path: resolve(cwd, '../../../.env') });
  } catch {
    // Silently fail - environment variables may be set elsewhere (e.g., Vercel)
  }
}

// Validate DATABASE_URL is present
if (!process.env.DATABASE_URL) {
  console.error('[@acta/db] ERROR: DATABASE_URL environment variable is not set!');
  console.error('[@acta/db] This will cause database connection failures.');
} else {
  // Log that DATABASE_URL is present (but don't log the actual URL for security)
  console.log('[@acta/db] DATABASE_URL is set, Prisma client initializing...');
}

// Singleton Prisma client instance
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Export Prisma types
export * from '@prisma/client';

// Export repositories
export * from './repositories/articleRepository';
export * from './repositories/outletRepository';
export * from './repositories/crawlRequestRepository';
export * from './repositories/topicRepository';
export * from './repositories/questionRepository';
export * from './repositories/articleAnalysisAttemptRepository';
export * from './repositories/verdictRepository';
export * from './repositories/topicArticleRepository';
export * from './repositories/evidenceBulletRepository';
export * from './repositories/articleStanceRepository';
export * from './repositories/timelineRepository';

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
// Note: healthCheck.js may not exist in all branches - commented out for now
// export { performHealthCheck, quickHealthCheck } from './healthCheck';
// export type { HealthCheckResult } from './healthCheck';

// Re-export repositories
export * from './repositories/outletRepository';
export * from './repositories/crawlRequestRepository';
export * from './repositories/articleRepository';
export * from './repositories/topicRepository';
export * from './repositories/questionRepository';
export * from './repositories/articleAnalysisAttemptRepository';
export * from './repositories/verdictRepository';
export * from './repositories/topicArticleRepository';
export * from './repositories/evidenceBulletRepository';
export * from './repositories/articleStanceRepository';
export * from './repositories/timelineRepository';

// Re-export countArticles for convenience
export { countArticles } from './repositories/articleRepository';
export { countArticlesByTopic } from './repositories/topicArticleRepository';

// Re-export findCrawlRequestById and resetStuckInProgressRequests for convenience
export { findCrawlRequestById, resetStuckInProgressRequests } from './repositories/crawlRequestRepository';

// Re-export retry limit constants for convenience
export { MAX_RETRY_ATTEMPTS, hasExceededRetryLimit } from './repositories/crawlRequestRepository';

// Re-export utilities
export * from './utils/urlNormalizer';

