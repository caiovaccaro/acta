#!/usr/bin/env node
/**
 * Fix migration history by marking ghost migrations as applied
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
const projectRoot = resolve(__dirname, '../../../');
config({ path: resolve(projectRoot, '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing migration history...\n');

  const ghostMigrations = [
    '$(date +%Y%m%d%H%M%S)_add_debate_card_storage',
    '$(date +%Y%m%d%H%M%S)_add_context_blurb_to_questions',
    '$(date +%Y%m%d%H%M%S)_add_question_redirect',
  ];

  // Also fix the actual migration that failed
  const failedMigration = '20260113173806_add_question_redirect';

  for (const migrationName of ghostMigrations) {
    try {
      // Check if already recorded
      const existing = await prisma.$queryRaw`
        SELECT * FROM "_prisma_migrations" WHERE migration_name = ${migrationName}
      `;
      
      if (existing && existing.length > 0) {
        const record = existing[0];
        // If failed, mark as rolled back then applied
        if (!record.finished_at) {
          console.log(`⚠️  ${migrationName} is marked as failed, fixing...`);
          await prisma.$executeRaw`
            UPDATE "_prisma_migrations" 
            SET finished_at = NOW(), applied_steps_count = 1
            WHERE migration_name = ${migrationName}
          `;
          console.log(`✅ Fixed ${migrationName} (marked as applied)`);
        } else {
          console.log(`✅ ${migrationName} already recorded as applied`);
        }
        continue;
      }

      // Insert migration record as applied
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at, applied_steps_count)
        VALUES (${migrationName}, '', NOW(), 1)
      `;
      
      console.log(`✅ Marked ${migrationName} as applied`);
    } catch (error) {
      console.error(`❌ Error with ${migrationName}:`, error.message);
    }
  }

  // Fix the actual failed migration
  try {
    const existing = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations" WHERE migration_name = ${failedMigration}
    `;
    
    if (existing && existing.length > 0) {
      const record = existing[0];
      if (!record.finished_at) {
        console.log(`⚠️  ${failedMigration} is marked as failed, fixing...`);
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations" 
          SET finished_at = NOW(), applied_steps_count = 1
          WHERE migration_name = ${failedMigration}
        `;
        console.log(`✅ Fixed ${failedMigration} (marked as applied)`);
      } else {
        console.log(`✅ ${failedMigration} already recorded as applied`);
      }
    } else {
      // Insert as applied since table already exists
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at, applied_steps_count)
        VALUES (${failedMigration}, '', NOW(), 1)
      `;
      console.log(`✅ Marked ${failedMigration} as applied`);
    }
  } catch (error) {
    console.error(`❌ Error with ${failedMigration}:`, error.message);
  }

  console.log('\n✅ Migration history fixed!');
  console.log('Now run: npx prisma migrate deploy');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

