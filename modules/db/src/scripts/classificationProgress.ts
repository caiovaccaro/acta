/**
 * Classification progress summary (matched articles vs attempts)
 *
 * Usage:
 *   npm run db:classification:progress
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  const matched = await prisma.article.count({
    where: { topicArticles: { some: {} } },
  });
  const withAttempts = await prisma.article.count({
    where: {
      topicArticles: { some: {} },
      articleAnalysisAttempts: { some: {} },
    },
  });
  const withStances = await prisma.article.count({
    where: { topicArticles: { some: {} }, articleStances: { some: {} } },
  });
  const remaining = matched - withAttempts;

  const processedPct = matched === 0 ? 0 : (withAttempts / matched) * 100;
  const remainingPct = matched === 0 ? 0 : (remaining / matched) * 100;
  const stancePct = matched === 0 ? 0 : (withStances / matched) * 100;

  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // last 60 minutes
  const attemptsLastHour = await prisma.articleAnalysisAttempt.count({
    where: { analyzedAt: { gte: cutoff } },
  });

  const perHour = attemptsLastHour;
  const hoursRemaining = perHour > 0 ? remaining / perHour : null;

  console.log(`Matched: ${matched}`);
  console.log(`Processed (attempts): ${withAttempts} (${processedPct.toFixed(1)}%)`);
  console.log(`Remaining: ${remaining} (${remainingPct.toFixed(1)}%)`);
  console.log(`With stances: ${withStances} (${stancePct.toFixed(1)}%)`);
  console.log(`Attempts in last hour: ${attemptsLastHour}`);
  if (hoursRemaining !== null) {
    console.log(`Estimated hours remaining (based on last hour): ${hoursRemaining.toFixed(1)}h`);
  } else {
    console.log('Estimated hours remaining: unknown (no attempts in last hour)');
  }
}

main()
  .catch((error) => {
    console.error('❌ Error calculating progress:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



