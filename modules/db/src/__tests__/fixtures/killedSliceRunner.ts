import { PrismaClient } from '@prisma/client';
import { createFixtureStageAdapters } from '../../pipeline/sliceAdapters';
import { runPipelineSlice } from '../../pipeline/runSlice';

const mode = process.argv[2];
const db = new PrismaClient();

try {
  const result = await runPipelineSlice({
    argv: [
      '--max-runtime-minutes=285',
      '--max-new-articles=1',
      '--max-analysis-articles=1',
      '--trigger=retry',
    ],
    db,
    resource: 'p107-e2e-slice',
    ownerToken: mode === 'interrupt' ? 'owner-interrupt' : 'owner-resume',
    leaseMs: 400,
    interruptAfterStage: mode === 'interrupt' ? 'rss_refresh' : undefined,
    adapters: createFixtureStageAdapters({
      unitsByStage: {
        rss_refresh: ['one', 'two', 'three'],
        article_extraction: ['article-1'],
      },
      unitCap: 1,
      interruptAfterStage: mode === 'interrupt' ? 'rss_refresh' : undefined,
    }),
  });
  process.stdout.write(`${JSON.stringify(result.summary)}\n`);
  process.exit(result.exitCode);
} catch (error) {
  if (error instanceof Error && error.name === 'SliceInterruptedError') {
    process.stdout.write(`${JSON.stringify({ interrupted: true })}\n`);
    process.exit(0);
  }
  throw error;
} finally {
  await db.$disconnect();
}
