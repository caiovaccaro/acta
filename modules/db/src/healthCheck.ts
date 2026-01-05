/**
 * @acta/db - Database Health Check
 * 
 * Validates database structure, connectivity, and schema integrity
 */

import { prisma } from './index';
import type { Prisma } from '@prisma/client';

export interface HealthCheckResult {
  success: boolean;
  checks: {
    connectivity: boolean;
    schema: {
      outlets: boolean;
      crawlRequests: boolean;
      articles: boolean;
    };
    indexes: boolean;
    constraints: boolean;
    enums: boolean;
  };
  errors: string[];
}

/**
 * Comprehensive database health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    success: true,
    checks: {
      connectivity: false,
      schema: {
        outlets: false,
        crawlRequests: false,
        articles: false,
      },
      indexes: false,
      constraints: false,
      enums: false,
    },
    errors: [],
  };

  try {
    // 1. Connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      result.checks.connectivity = true;
    } catch (error) {
      result.success = false;
      result.errors.push(`Connectivity failed: ${error instanceof Error ? error.message : String(error)}`);
      return result; // Can't continue without connectivity
    }

    // 2. Schema checks - verify tables exist
    try {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('outlets', 'crawl_requests', 'articles')
      `;
      
      const tableNames = tables.map(t => t.tablename);
      result.checks.schema.outlets = tableNames.includes('outlets');
      result.checks.schema.crawlRequests = tableNames.includes('crawl_requests');
      result.checks.schema.articles = tableNames.includes('articles');

      if (!result.checks.schema.outlets) {
        result.errors.push('Table "outlets" not found');
      }
      if (!result.checks.schema.crawlRequests) {
        result.errors.push('Table "crawl_requests" not found');
      }
      if (!result.checks.schema.articles) {
        result.errors.push('Table "articles" not found');
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Schema check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 3. Enum checks
    try {
      const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
        SELECT typname 
        FROM pg_type 
        WHERE typname IN ('Ideology', 'CrawlStatus')
      `;
      
      const enumNames = enums.map(e => e.typname);
      const hasIdeology = enumNames.includes('Ideology');
      const hasCrawlStatus = enumNames.includes('CrawlStatus');
      
      result.checks.enums = hasIdeology && hasCrawlStatus;

      if (!hasIdeology) {
        result.errors.push('Enum "Ideology" not found');
      }
      if (!hasCrawlStatus) {
        result.errors.push('Enum "CrawlStatus" not found');
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Enum check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 4. Index checks - verify key indexes exist
    try {
      const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND (
          indexname LIKE '%outlets%' OR
          indexname LIKE '%crawl_requests%' OR
          indexname LIKE '%articles%'
        )
      `;
      
      const indexNames = indexes.map(i => i.indexname);
      const requiredIndexes = [
        'outlets_name_key', // unique constraint
        'outlets_ideology_idx',
        'crawl_requests_url_key', // unique constraint
        'crawl_requests_status_idx',
        'crawl_requests_status_createdAt_idx',
        'articles_url_key', // unique constraint
      ];

      const missingIndexes = requiredIndexes.filter(idx => 
        !indexNames.some(name => name === idx)
      );

      result.checks.indexes = missingIndexes.length === 0;
      if (missingIndexes.length > 0) {
        result.errors.push(`Missing indexes: ${missingIndexes.join(', ')}`);
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Index check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. Foreign key constraints check
    try {
      const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
        SELECT conname 
        FROM pg_constraint 
        WHERE contype = 'f'
        AND (
          conname LIKE '%outlet%' OR
          conname LIKE '%crawl%' OR
          conname LIKE '%article%'
        )
      `;
      
      const constraintNames = constraints.map(c => c.conname);
      const requiredConstraints = [
        'crawl_requests_outletId_fkey',
        'articles_outletId_fkey',
        'articles_crawlRequestId_fkey',
      ];

      const missingConstraints = requiredConstraints.filter(con => 
        !constraintNames.some(name => name === con)
      );

      result.checks.constraints = missingConstraints.length === 0;
      if (missingConstraints.length > 0) {
        result.errors.push(`Missing foreign key constraints: ${missingConstraints.join(', ')}`);
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Constraint check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Update overall success
    if (result.errors.length > 0) {
      result.success = false;
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Quick connectivity check
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

