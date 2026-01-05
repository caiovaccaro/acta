/**
 * Sync Database Schema Only (No Data)
 * 
 * This script syncs only the database schema (structure) to production,
 * without transferring data. Useful for initial setup or schema updates.
 * 
 * Usage:
 *   npm run db:sync:schema-only
 *   npm run db:sync:schema-only -- --target-url="postgresql://user:pass@host:5432/db"
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
  
  const sourceUrl = process.env.DATABASE_URL;
  const targetUrl = args.targetUrl || process.env.PRODUCTION_DATABASE_URL;

  if (!sourceUrl) {
    console.error('❌ Error: DATABASE_URL not found');
    process.exit(1);
  }

  if (!targetUrl) {
    console.error('❌ Error: Target database URL not found');
    console.error('   Set PRODUCTION_DATABASE_URL or use --target-url flag');
    process.exit(1);
  }

  console.log('🔄 Syncing Database Schema to Production\n');
  console.log('📊 Source (Local):', maskUrl(sourceUrl));
  console.log('🎯 Target (Production):', maskUrl(targetUrl));
  console.log('');

  try {
    console.log('📦 Creating schema dump...');
    const dumpFile = resolve(__dirname, '../../../../.tmp-schema-dump.sql');
    
    // Clean connection URLs (remove Prisma-specific query parameters)
    const cleanSourceUrl = cleanConnectionUrl(sourceUrl);
    const cleanTargetUrl = cleanConnectionUrl(targetUrl);
    
    // Dump schema only (no data)
    // Use connection parameters instead of connection string to bypass version check
    const host = extractHost(cleanSourceUrl);
    const port = extractPort(cleanSourceUrl);
    const user = extractUser(cleanSourceUrl);
    const password = extractPassword(cleanSourceUrl);
    const database = extractDatabase(cleanSourceUrl);
    
    const pgDump = findPgDump();
    const env = { ...process.env, PGPASSWORD: password };
    const dumpCommand = `"${pgDump}" -h "${host}" -p "${port}" -U "${user}" -d "${database}" --schema-only --no-owner --no-acl --clean --if-exists > "${dumpFile}"`;
    execSync(dumpCommand, { stdio: 'inherit', shell: true, env: env });
    
    console.log('✅ Schema dump created\n');

    console.log('📤 Restoring schema to production...');
    const targetHost = extractHost(cleanTargetUrl);
    const targetPort = extractPort(cleanTargetUrl);
    const targetUser = extractUser(cleanTargetUrl);
    const targetPassword = extractPassword(cleanTargetUrl);
    const targetDatabase = extractDatabase(cleanTargetUrl);
    
    const psql = findPsql();
    const restoreEnv = { ...process.env, PGPASSWORD: targetPassword };
    const restoreCommand = `"${psql}" -h "${targetHost}" -p "${targetPort}" -U "${targetUser}" -d "${targetDatabase}" < "${dumpFile}"`;
    execSync(restoreCommand, { stdio: 'inherit', shell: true, env: restoreEnv });
    
    console.log('✅ Schema restored successfully\n');

    // Clean up
    try {
      execSync(`rm "${dumpFile}"`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore
    }

    console.log('✨ Schema sync complete!');
    console.log('   Note: This only synced the structure, not the data.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function parseArgs() {
  const args: any = {};
  const allArgs = process.argv.slice(2);
  
  allArgs.forEach((arg) => {
    if (arg.startsWith('--target-url=')) {
      args.targetUrl = arg.split('=')[1];
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

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.username}:***@${urlObj.hostname}:${urlObj.port ? `:${urlObj.port}` : ''}${urlObj.pathname}`;
  } catch {
    return url.substring(0, 20) + '...';
  }
}

/**
 * Find pg_dump executable in common locations
 */
function findPgDump(): string {
  const possiblePaths = [
    '/usr/local/opt/postgresql@16/bin/pg_dump',
    '/usr/local/opt/postgresql@15/bin/pg_dump',
    '/usr/local/opt/postgresql/bin/pg_dump',
    '/opt/homebrew/opt/postgresql@16/bin/pg_dump',
    '/opt/homebrew/opt/postgresql/bin/pg_dump',
    'pg_dump'
  ];

  for (const path of possiblePaths) {
    if (path === 'pg_dump') {
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
  return 'pg_dump';
}

/**
 * Find psql executable in common locations
 */
function findPsql(): string {
  const possiblePaths = [
    '/usr/local/opt/postgresql@16/bin/psql',
    '/usr/local/opt/postgresql@15/bin/psql',
    '/usr/local/opt/postgresql/bin/psql',
    '/opt/homebrew/opt/postgresql@16/bin/psql',
    '/opt/homebrew/opt/postgresql/bin/psql',
    'psql'
  ];

  for (const path of possiblePaths) {
    if (path === 'psql') {
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
  return 'psql';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as syncSchemaOnly };

