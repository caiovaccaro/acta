/**
 * Backup Local Database
 *
 * Creates a local backup dump file from DATABASE_URL.
 *
 * Usage:
 *   npm run db:backup:local
 *   npm run db:backup:local -- --output="/path/to/backup.sql"
 *
 * Environment Variables:
 *   DATABASE_URL - Your local database (source)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
const projectRoot = resolve(__dirname, '../../../../');
config({ path: resolve(projectRoot, '.env') });

async function main() {
  const args = parseArgs();

  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) {
    console.error('❌ Error: DATABASE_URL not found in environment variables');
    console.error('   Make sure your .env file has DATABASE_URL set');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultOutputDir = resolve(projectRoot, 'backups');
  const outputPath = args.outputPath || resolve(defaultOutputDir, `acta-local-backup-${timestamp}.sql`);

  if (!existsSync(defaultOutputDir)) {
    mkdirSync(defaultOutputDir, { recursive: true });
  }

  console.log('💾 Creating local database backup\n');
  console.log('📊 Source (Local):', maskUrl(sourceUrl));
  console.log('📁 Output:', outputPath);
  console.log('');

  try {
    // Clean connection URL (remove Prisma-specific query parameters)
    const cleanSourceUrl = cleanConnectionUrl(sourceUrl);

    const host = extractHost(cleanSourceUrl);
    const port = extractPort(cleanSourceUrl);
    const user = extractUser(cleanSourceUrl);
    const password = extractPassword(cleanSourceUrl);
    const database = extractDatabase(cleanSourceUrl);

    const pgDump = findPgDump();
    const env = { ...process.env, PGPASSWORD: password };
    const dumpCommand = `"${pgDump}" -h "${host}" -p "${port}" -U "${user}" -d "${database}" --no-owner --no-acl --clean --if-exists > "${outputPath}"`;

    execSync(dumpCommand, {
      stdio: 'inherit',
      shell: true,
      env: env,
    });

    console.log('');
    console.log('✅ Backup created successfully');
  } catch (error) {
    console.error('❌ Error during backup:', error);
    process.exit(1);
  }
}

function parseArgs() {
  const args: any = {};
  const allArgs = process.argv.slice(2);

  allArgs.forEach((arg) => {
    if (arg.startsWith('--output=')) {
      args.outputPath = arg.split('=')[1];
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
    return `${urlObj.protocol}//${urlObj.username}:${urlObj.password}@${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ''}${urlObj.pathname}`;
  } catch {
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
    return urlObj.pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

function findPgDump(): string {
  const possiblePaths = [
    '/usr/local/opt/postgresql@16/bin/pg_dump',
    '/usr/local/opt/postgresql@15/bin/pg_dump',
    '/usr/local/opt/postgresql/bin/pg_dump',
    '/opt/homebrew/opt/postgresql@16/bin/pg_dump',
    '/opt/homebrew/opt/postgresql/bin/pg_dump',
    'pg_dump',
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

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.username}:***@${urlObj.hostname}:${urlObj.port ? `:${urlObj.port}` : ''}${urlObj.pathname}`;
  } catch {
    return url.substring(0, 20) + '...';
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as backupLocal };

