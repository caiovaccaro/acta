/**
 * Deactivate Low-Evidence Questions
 *
 * Disables questions with <= 1 stance for a given month period.
 *
 * Usage:
 *   npm run db:deactivate:low-evidence-questions
 *   npm run db:deactivate:low-evidence-questions -- --month=2025-12
 *   npm run db:deactivate:low-evidence-questions -- --min-stances=1
 *   npm run db:deactivate:low-evidence-questions -- --execute
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prisma, connectDatabase, disconnectDatabase } from '../index';
import { formatMonthPeriod, getCurrentMonthPeriod, parseMonthPeriod } from '@acta/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../../.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: {
    month?: string;
    minStances: number;
    execute: boolean;
  } = {
    minStances: 1,
    execute: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--month=')) parsed.month = arg.split('=')[1];
    else if (arg.startsWith('--min-stances=')) {
      parsed.minStances = Number(arg.split('=')[1]);
    } else if (arg === '--execute') {
      parsed.execute = true;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();
  const monthPeriod = args.month
    ? parseMonthPeriod(args.month)
    : getCurrentMonthPeriod();

  console.log('🧹 Deactivating low-evidence questions');
  console.log(`📅 Month period: ${formatMonthPeriod(monthPeriod)}`);
  console.log(`🧪 Mode: ${args.execute ? 'execute' : 'dry-run'}`);
  console.log(`🔧 Threshold: <= ${args.minStances} stances\n`);

  try {
    await connectDatabase();

    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            articleStances: {
              where: {
                articleAnalysisAttempt: {
                  month: monthPeriod,
                },
              },
            },
          },
        },
      },
    });

    const toDeactivate = questions.filter(
      (q) => q._count.articleStances <= args.minStances
    );

    console.log(`Found ${toDeactivate.length} question(s) to deactivate.`);

    if (toDeactivate.length > 0) {
      toDeactivate.slice(0, 10).forEach((q) => {
        console.log(
          `   - "${q.questionText.substring(0, 80)}..." (${q._count.articleStances} stances)`
        );
      });
      if (toDeactivate.length > 10) {
        console.log(`   ... and ${toDeactivate.length - 10} more`);
      }
    }

    if (!args.execute) {
      console.log('\nDry run only. Re-run with --execute to apply.');
      return;
    }

    const result = await prisma.question.updateMany({
      where: {
        id: { in: toDeactivate.map((q) => q.id) },
      },
      data: {
        isActive: false,
      },
    });

    console.log(`✅ Deactivated ${result.count} question(s).`);
  } catch (error) {
    console.error('❌ Error deactivating questions:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();


