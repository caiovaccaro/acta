/**
 * Fix Orphan Relations
 *
 * Cleans up records that reference missing parents, which can break Prisma Studio:
 * - Verdicts whose question no longer exists
 * - ArticleStances whose article or question no longer exists
 * - ArticleAnalysisAttempts whose article or question no longer exists
 * - TopicArticles whose topic or article no longer exists
 *
 * Usage:
 *   npm run db:fix:orphans
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prisma, connectDatabase, disconnectDatabase } from '../index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
const projectRoot = resolve(__dirname, '../../../../');
config({ path: resolve(projectRoot, '.env') });

async function main() {
  console.log('🧹 Fixing orphaned relational records (verdicts, stances, attempts, topic articles)\n');

  try {
    await connectDatabase();

    // 1) Orphan verdicts (question missing)
    // Use raw SQL so we don't trigger Prisma's relation consistency checks
    const orphanVerdicts = await prisma.$queryRawUnsafe<
      { id: string; questionId: string | null }[]
    >(
      `
      SELECT v.id, v."questionId"
      FROM verdicts v
      LEFT JOIN questions q ON q.id = v."questionId"
      WHERE q.id IS NULL
    `
    );

    if (orphanVerdicts.length > 0) {
      console.log(`🧾 Found ${orphanVerdicts.length} orphan verdict(s) (missing question):`);
      for (const v of orphanVerdicts.slice(0, 20)) {
        console.log(`   - Verdict ${v.id} (questionId=${v.questionId})`);
      }
      if (orphanVerdicts.length > 20) {
        console.log(`   ...and ${orphanVerdicts.length - 20} more`);
      }

      await prisma.verdict.deleteMany({
        where: {
          id: { in: orphanVerdicts.map((v) => v.id) },
        },
      });
      console.log(`✅ Deleted ${orphanVerdicts.length} orphan verdict(s)\n`);
    } else {
      console.log('✅ No orphan verdicts found\n');
    }

    // 2) Orphan article stances (article or question missing)
    const orphanStances = await prisma.$queryRawUnsafe<
      { id: string; articleId: string | null; questionId: string | null }[]
    >(
      `
      SELECT s.id, s."articleId", s."questionId"
      FROM article_stances s
      LEFT JOIN articles a ON a.id = s."articleId"
      LEFT JOIN questions q ON q.id = s."questionId"
      WHERE a.id IS NULL OR q.id IS NULL
    `
    );

    if (orphanStances.length > 0) {
      console.log(`🧾 Found ${orphanStances.length} orphan article stance(s) (missing article or question):`);
      for (const s of orphanStances.slice(0, 20)) {
        console.log(`   - Stance ${s.id} (articleId=${s.articleId}, questionId=${s.questionId})`);
      }
      if (orphanStances.length > 20) {
        console.log(`   ...and ${orphanStances.length - 20} more`);
      }

      await prisma.articleStance.deleteMany({
        where: {
          id: { in: orphanStances.map((s) => s.id) },
        },
      });
      console.log(`✅ Deleted ${orphanStances.length} orphan article stance(s)\n`);
    } else {
      console.log('✅ No orphan article stances found\n');
    }

    // 3) Orphan analysis attempts (article or question missing)
    const orphanAttempts = await prisma.$queryRawUnsafe<
      { id: string; articleId: string | null; questionId: string | null }[]
    >(
      `
      SELECT aa.id, aa."articleId", aa."questionId"
      FROM article_analyses aa
      LEFT JOIN articles a ON a.id = aa."articleId"
      LEFT JOIN questions q ON q.id = aa."questionId"
      WHERE a.id IS NULL OR q.id IS NULL
    `
    );

    if (orphanAttempts.length > 0) {
      console.log(`🧾 Found ${orphanAttempts.length} orphan analysis attempt(s) (missing article or question):`);
      for (const a of orphanAttempts.slice(0, 20)) {
        console.log(`   - Attempt ${a.id} (articleId=${a.articleId}, questionId=${a.questionId})`);
      }
      if (orphanAttempts.length > 20) {
        console.log(`   ...and ${orphanAttempts.length - 20} more`);
      }

      await prisma.articleAnalysisAttempt.deleteMany({
        where: {
          id: { in: orphanAttempts.map((a) => a.id) },
        },
      });
      console.log(`✅ Deleted ${orphanAttempts.length} orphan analysis attempt(s)\n`);
    } else {
      console.log('✅ No orphan analysis attempts found\n');
    }

    // 4) Orphan topic articles (topic or article missing)
    const orphanTopicArticles = await prisma.$queryRawUnsafe<
      { id: string; topicId: string | null; articleId: string | null }[]
    >(
      `
      SELECT ta.id, ta."topicId", ta."articleId"
      FROM topic_articles ta
      LEFT JOIN topics t ON t.id = ta."topicId"
      LEFT JOIN articles a ON a.id = ta."articleId"
      WHERE t.id IS NULL OR a.id IS NULL
    `
    );

    if (orphanTopicArticles.length > 0) {
      console.log(`🧾 Found ${orphanTopicArticles.length} orphan topic article(s) (missing topic or article):`);
      for (const ta of orphanTopicArticles.slice(0, 20)) {
        console.log(`   - TopicArticle ${ta.id} (topicId=${ta.topicId}, articleId=${ta.articleId})`);
      }
      if (orphanTopicArticles.length > 20) {
        console.log(`   ...and ${orphanTopicArticles.length - 20} more`);
      }

      await prisma.topicArticle.deleteMany({
        where: {
          id: { in: orphanTopicArticles.map((ta) => ta.id) },
        },
      });
      console.log(`✅ Deleted ${orphanTopicArticles.length} orphan topic article(s)\n`);
    } else {
      console.log('✅ No orphan topic articles found\n');
    }

    console.log('✨ Orphan cleanup complete');
  } catch (error) {
    console.error('❌ Error fixing orphan relations:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();


