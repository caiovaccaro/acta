/**
 * Sync Production Database to Local while preserving crawler-heavy local tables.
 *
 * Default preserved tables:
 * - crawl_requests
 * - articles
 * - article_analyses
 * - topic_articles
 * - article_stances
 * - evidence_bullets
 *
 * Usage:
 *   npm run db:sync:from-production:preserve-crawler
 *   npm run db:sync:from-production:preserve-crawler -- --skip-confirm
 *   npm run db:sync:from-production:preserve-crawler -- --dry-run
 *   npm run db:sync:from-production:preserve-crawler -- --preserve-table=articles --preserve-table=crawl_requests
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '../../../../');
config({ path: resolve(projectRoot, '.env') });

const DEFAULT_PRESERVE_TABLES = [
  'crawl_requests',
  'articles',
  'article_analyses',
  'topic_articles',
  'article_stances',
  'evidence_bullets',
];

type Args = {
  sourceUrl?: string;
  targetUrl?: string;
  skipConfirm: boolean;
  dryRun: boolean;
  preserveTables: string[];
};

async function main() {
  const args = parseArgs();
  const sourceUrl = args.sourceUrl || process.env.PRODUCTION_DATABASE_URL;
  const targetUrl = args.targetUrl || process.env.DATABASE_URL;

  if (!sourceUrl) {
    console.error('❌ Error: Source database URL not found');
    console.error('   Set PRODUCTION_DATABASE_URL in .env or use --source-url flag');
    process.exit(1);
  }

  if (!targetUrl) {
    console.error('❌ Error: DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const cleanSourceUrl = cleanConnectionUrl(sourceUrl);
  const cleanTargetUrl = cleanConnectionUrl(targetUrl);
  const preserveTables = dedupe(args.preserveTables.map((t) => normalizeTableName(t)));

  console.log('🔄 Syncing Production -> Local (preserving local crawler tables)\n');
  console.log('📊 Source (Production):', maskUrl(sourceUrl));
  console.log('🎯 Target (Local):', maskUrl(targetUrl));
  console.log('🛟 Preserving local tables:', preserveTables.join(', '));
  console.log('');

  if (!args.skipConfirm) {
    console.log('⚠️  This will overwrite local DB, then restore preserved local tables.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await sleep(5000);
  }

  const prodDumpFile = resolve(projectRoot, '.tmp-prod-full-sync.sql');

  try {
    console.log('📥 Step 1/2: Dumping production database (excluding preserved local tables)...');
    const fullProdDumpCommand = buildFullDumpExcludingTablesCommand(
      cleanSourceUrl,
      prodDumpFile,
      preserveTables
    );
    runCommand(fullProdDumpCommand, extractPassword(cleanSourceUrl), args.dryRun);
    console.log('✅ Production dump created\n');

    console.log('📤 Step 2/2: Restoring production dump to local...');
    const restoreProdCommand = buildRestoreCommand(cleanTargetUrl, prodDumpFile);
    runCommand(restoreProdCommand, extractPassword(cleanTargetUrl), args.dryRun);
    console.log('✅ Local DB synced from production (preserved tables untouched)\n');

    cleanupFile(prodDumpFile, args.dryRun);

    console.log('✨ Sync complete!');
    console.log('   Local DB now has production data for included tables.');
    console.log('   Preserved crawler-heavy local tables were not modified.');
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

function parseArgs(): Args {
  const args: Args = {
    skipConfirm: false,
    dryRun: false,
    preserveTables: [...DEFAULT_PRESERVE_TABLES],
  };
  const allArgs = process.argv.slice(2);

  allArgs.forEach((arg) => {
    if (arg.startsWith('--source-url=')) {
      args.sourceUrl = arg.split('=')[1];
    } else if (arg.startsWith('--target-url=')) {
      args.targetUrl = arg.split('=')[1];
    } else if (arg === '--skip-confirm' || arg === '-y') {
      args.skipConfirm = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg.startsWith('--preserve-table=')) {
      args.preserveTables.push(arg.split('=')[1]);
    }
  });

  return args;
}

function normalizeTableName(name: string): string {
  return name.replace(/^public\./, '').trim();
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function buildFullDumpExcludingTablesCommand(
  url: string,
  dumpFile: string,
  excludedTables: string[]
): string {
  const host = extractHost(url);
  const port = extractPort(url);
  const user = extractUser(url);
  const database = extractDatabase(url);
  const pgDump = findPgDump();
  const excludeFlags = excludedTables.map((t) => `--exclude-table "public.${t}"`).join(' ');

  return `"${pgDump}" -h "${host}" -p "${port}" -U "${user}" -d "${database}" --no-owner --no-acl --clean --if-exists ${excludeFlags} > "${dumpFile}"`;
}

function buildRestoreCommand(url: string, dumpFile: string): string {
  const host = extractHost(url);
  const port = extractPort(url);
  const user = extractUser(url);
  const database = extractDatabase(url);
  const psql = findPsql();

  return `"${psql}" -h "${host}" -p "${port}" -U "${user}" -d "${database}" -v ON_ERROR_STOP=1 --single-transaction < "${dumpFile}"`;
}

function cleanupFile(path: string, dryRun: boolean): void {
  const command = `rm "${path}"`;
  if (dryRun) {
    console.log(`[dry-run] ${command}`);
    return;
  }
  try {
    execSync(command, { stdio: 'ignore', shell: true });
  } catch {
    // Ignore cleanup errors
  }
}

function runCommand(command: string, password: string, dryRun: boolean): void {
  if (dryRun) {
    console.log(`[dry-run] ${command}`);
    return;
  }
  const env = { ...process.env, PGPASSWORD: password };
  execSync(command, { stdio: 'inherit', shell: true, env });
}

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
    return new URL(url).hostname;
  } catch {
    return 'localhost';
  }
}

function extractPort(url: string): string {
  try {
    return new URL(url).port || '5432';
  } catch {
    return '5432';
  }
}

function extractUser(url: string): string {
  try {
    return new URL(url).username;
  } catch {
    return '';
  }
}

function extractPassword(url: string): string {
  try {
    return new URL(url).password;
  } catch {
    return '';
  }
}

function extractDatabase(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, '');
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
    if (existsSync(path)) return path;
  }
  return 'pg_dump';
}

function findPsql(): string {
  const possiblePaths = [
    '/usr/local/opt/postgresql@16/bin/psql',
    '/usr/local/opt/postgresql@15/bin/psql',
    '/usr/local/opt/postgresql/bin/psql',
    '/opt/homebrew/opt/postgresql@16/bin/psql',
    '/opt/homebrew/opt/postgresql/bin/psql',
    'psql',
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
    if (existsSync(path)) return path;
  }
  return 'psql';
}

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.username}:***@${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ''}${urlObj.pathname}`;
  } catch {
    return `${url.slice(0, 20)}...`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as syncFromProductionPreserveCrawler };
