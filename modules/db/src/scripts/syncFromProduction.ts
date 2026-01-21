/**
 * Sync Production Database to Local
 *
 * This script syncs your production PostgreSQL database to your local database.
 * It uses pg_dump and psql to transfer data.
 *
 * Usage:
 *   npm run db:sync:from-production
 *   npm run db:sync:from-production -- --source-url="postgresql://user:pass@host:5432/db"
 *
 * Environment Variables:
 *   PRODUCTION_DATABASE_URL - Your production database (source)
 *   DATABASE_URL - Your local database (target)
 *
 * ⚠️  WARNING: This will overwrite data in the local database!
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
const projectRoot = resolve(__dirname, '../../../../');
config({ path: resolve(projectRoot, '.env') });

async function main() {
  const args = parseArgs();

  const sourceUrl = args.sourceUrl || process.env.PRODUCTION_DATABASE_URL;
  const targetUrl = args.targetUrl || process.env.DATABASE_URL;

  if (!sourceUrl) {
    console.error('❌ Error: Source database URL not found');
    console.error('   Set PRODUCTION_DATABASE_URL in .env or use --source-url flag');
    console.error('');
    console.error('   Example:');
    console.error('   npm run db:sync:from-production -- --source-url="postgresql://user:pass@host:5432/db"');
    process.exit(1);
  }

  if (!targetUrl) {
    console.error('❌ Error: DATABASE_URL not found in environment variables');
    console.error('   Make sure your .env file has DATABASE_URL set');
    process.exit(1);
  }

  console.log('🔄 Syncing Production Database to Local\n');
  console.log('📊 Source (Production):', maskUrl(sourceUrl));
  console.log('🎯 Target (Local):', maskUrl(targetUrl));
  console.log('');

  // Confirm before proceeding
  if (!args.skipConfirm) {
    console.log('⚠️  WARNING: This will overwrite all data in your local database!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await sleep(5000);
  }

  try {
    console.log('📦 Step 1: Creating database dump from production database...');
    const dumpFile = resolve(__dirname, '../../../../.tmp-dump.sql');

    // Clean connection URLs (remove Prisma-specific query parameters)
    const cleanSourceUrl = cleanConnectionUrl(sourceUrl);
    const cleanTargetUrl = cleanConnectionUrl(targetUrl);

    // Create dump using pg_dump with individual connection parameters
    // This bypasses version check that occurs with connection string format
    const host = extractHost(cleanSourceUrl);
    const port = extractPort(cleanSourceUrl);
    const user = extractUser(cleanSourceUrl);
    const password = extractPassword(cleanSourceUrl);
    const database = extractDatabase(cleanSourceUrl);

    const pgDump = findPgDump();
    const env = { ...process.env, PGPASSWORD: password };
    const dumpCommand = `"${pgDump}" -h "${host}" -p "${port}" -U "${user}" -d "${database}" --no-owner --no-acl --clean --if-exists > "${dumpFile}"`;

    execSync(dumpCommand, {
      stdio: 'inherit',
      shell: true,
      env: env
    });

    console.log('✅ Dump created successfully\n');

    console.log('📤 Step 2: Restoring dump to local database...');

    // Restore to target database using connection parameters
    const targetHost = extractHost(cleanTargetUrl);
    const targetPort = extractPort(cleanTargetUrl);
    const targetUser = extractUser(cleanTargetUrl);
    const targetPassword = extractPassword(cleanTargetUrl);
    const targetDatabase = extractDatabase(cleanTargetUrl);

    const psql = findPsql();
    const restoreEnv = { ...process.env, PGPASSWORD: targetPassword };
    const restoreCommand = `"${psql}" -h "${targetHost}" -p "${targetPort}" -U "${targetUser}" -d "${targetDatabase}" < "${dumpFile}"`;
    execSync(restoreCommand, { stdio: 'inherit', shell: true, env: restoreEnv });

    console.log('✅ Data restored successfully\n');

    // Clean up
    try {
      execSync(`rm "${dumpFile}"`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore cleanup errors
    }

    console.log('✨ Sync complete! Your local database now matches production.');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Restart local services if needed');
    console.log('   2. Re-run any local data generation if required');

  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

function parseArgs() {
  const args: any = { skipConfirm: false };
  const allArgs = process.argv.slice(2);

  allArgs.forEach((arg) => {
    if (arg.startsWith('--source-url=')) {
      args.sourceUrl = arg.split('=')[1];
    } else if (arg.startsWith('--target-url=')) {
      args.targetUrl = arg.split('=')[1];
    } else if (arg === '--skip-confirm' || arg === '-y') {
      args.skipConfirm = true;
    }
  });

  return args;
}

/**
 * Clean connection URL for pg_dump/psql
 * Removes Prisma-specific query parameters like ?schema=public
 */
function cleanConnectionUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query parameters (like ?schema=public) as pg_dump/psql don't support them
    return `${urlObj.protocol}//${urlObj.username}:${urlObj.password}@${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ''}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, try to remove ?schema=public manually
    return url.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
  }
}

function extractHost(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'localhost';
  }
}

function extractPort(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.port || '5432';
  } catch {
    return '5432';
  }
}

function extractUser(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.username;
  } catch {
    return '';
  }
}

function extractPassword(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.password;
  } catch {
    return '';
  }
}

function extractDatabase(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, ''); // Remove leading slash
  } catch {
    return '';
  }
}

/**
 * Find pg_dump executable in common locations
 */
function findPgDump(): string {
  // Common locations for pg_dump on macOS
  const possiblePaths = [
    '/usr/local/opt/postgresql@16/bin/pg_dump',
    '/usr/local/opt/postgresql@15/bin/pg_dump',
    '/usr/local/opt/postgresql/bin/pg_dump',
    '/opt/homebrew/opt/postgresql@16/bin/pg_dump',
    '/opt/homebrew/opt/postgresql/bin/pg_dump',
    'pg_dump' // Fallback to PATH
  ];

  for (const path of possiblePaths) {
    if (path === 'pg_dump') {
      // Check if it's in PATH
      try {
        execSync('which pg_dump', { stdio: 'ignore' });
        return 'pg_dump';
      } catch {
        continue;
      }
    }
    if (existsSync(path)) {
      return path;
    }
  }

  // Default to pg_dump and hope it's in PATH
  return 'pg_dump';
}

/**
 * Find psql executable in common locations
 */
function findPsql(): string {
  // Common locations for psql on macOS
  const possiblePaths = [
    '/usr/local/opt/postgresql@16/bin/psql',
    '/usr/local/opt/postgresql@15/bin/psql',
    '/usr/local/opt/postgresql/bin/psql',
    '/opt/homebrew/opt/postgresql@16/bin/psql',
    '/opt/homebrew/opt/postgresql/bin/psql',
    'psql' // Fallback to PATH
  ];

  for (const path of possiblePaths) {
    if (path === 'psql') {
      // Check if it's in PATH
      try {
        execSync('which psql', { stdio: 'ignore' });
        return 'psql';
      } catch {
        continue;
      }
    }
    if (existsSync(path)) {
      return path;
    }
  }

  // Default to psql and hope it's in PATH
  return 'psql';
}

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.username}:***@${urlObj.hostname}:${urlObj.port ? `:${urlObj.port}` : ''}${urlObj.pathname}`;
  } catch {
    return url.substring(0, 20) + '...';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as syncFromProduction };



