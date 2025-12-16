/**
 * Summarize Verdicts Script
 * Uses the LLM provider to generate short explanations for each verdict.
 *
 * Usage:
 *   npm run db:summarize:verdicts
 *   npm run db:summarize:verdicts -- --questionId=<id>
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file at project root
config({ path: resolve(__dirname, '../../../../.env') });

import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  findActiveQuestions,
  findVerdictByQuestionId,
  findArticleStancesByQuestionAndMonth,
} from '@acta/db';
import { createLLMProvider, createLLMConfigFromEnv } from '@acta/core/llm';
import { getMonthPeriod } from '@acta/core/analysis';

async function main() {
  console.log('🧾 Starting verdict summarization...\n');

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`🤖 Using LLM provider: ${llmProvider.getName()}\n`);

    const args = process.argv.slice(2);
    const questionIdArg = args.find((a) => a.startsWith('--questionId='));
    let questionIds: string[] = [];

    if (questionIdArg) {
      const id = questionIdArg.split('=')[1];
      questionIds = [id];
      console.log(`📌 Summarizing verdict for question: ${id}\n`);
    } else {
      const questions = await findActiveQuestions();
      questionIds = questions
        .filter((q) => q.verdicts && q.verdicts.length > 0) // only those with verdicts
        .map((q) => q.id);
      console.log(`📋 Found ${questionIds.length} questions with verdicts\n`);
    }

    if (questionIds.length === 0) {
      console.log('⚠️ No questions with verdicts found. Nothing to summarize.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const questionId of questionIds) {
      try {
        const question = await prisma.question.findUnique({
          where: { id: questionId },
          include: {
            topic: true,
            verdicts: {
              orderBy: { month: 'desc' },
            },
          },
        });

        if (!question || !question.verdicts || question.verdicts.length === 0) {
          console.warn(`⚠️ Skipping question ${questionId} (no verdict found)`);
          continue;
        }

        // Process all verdicts for this question (or filter by month if specified)
        const args = process.argv.slice(2);
        const monthArg = args.find((a) => a.startsWith('--month='));
        let verdictsToProcess = question.verdicts;

        if (monthArg) {
          const monthStr = monthArg.split('=')[1];
          const targetMonth = getMonthPeriod(new Date(monthStr));
          verdictsToProcess = question.verdicts.filter(
            (v) => v.month.getTime() === targetMonth.getTime()
          );
          if (verdictsToProcess.length === 0) {
            console.warn(`⚠️ Skipping question ${questionId} (no verdict for month ${monthStr})`);
            continue;
          }
        }

        // Process each verdict
        for (const verdict of verdictsToProcess) {
          // Fetch contributing article stances for the same month period as the verdict
          const verdictMonthPeriod = verdict.month;
        const stances = await findArticleStancesByQuestionAndMonth(
          questionId,
          verdictMonthPeriod
        );

          // Check if there are any articles
          if (stances.length === 0) {
            // No articles - set reasoning to indicate insufficient data
            const noArticlesReasoning = `This verdict is marked as "Unclear" because there are currently no articles that have been successfully classified for this question. The verdict metrics (support share: ${(verdict.supportShare * 100).toFixed(1)}%, variance: ${(verdict.variance * 100).toFixed(1)}%, confidence: ${verdict.confidence.toFixed(1)}%) reflect default values due to insufficient evidence. More articles need to be analyzed before a meaningful consensus can be determined.`;

            await prisma.verdict.update({
              where: { id: verdict.id },
              data: {
                reasoning: noArticlesReasoning,
              },
            });

            console.log(
              `⚠️  Skipped LLM summarization for question "${question.questionText.slice(
                0,
                80
              )}..." (month: ${verdictMonthPeriod.toISOString().slice(0, 7)}, 0 articles - using default reasoning)`,
            );
            continue;
          }

          const stanceSummaries = stances.map((s) => ({
            articleTitle: s.article.title,
            articleUrl: s.article.url,
            outletName: s.article.outlet.name,
            outletCredibility: s.article.outlet.credibilityScore,
            stance: s.articleAnalysisAttempt.stance,
            confidence: s.articleAnalysisAttempt.confidence,
            reasoning: s.articleAnalysisAttempt.reasoning || '',
          }));

          const summaryInput = {
            question: {
              id: question.id,
              text: question.questionText,
              topicName: question.topic?.name ?? null,
            },
            verdict: {
              label: verdict.verdictLabel,
              confidence: verdict.confidence,
              supportShare: verdict.supportShare,
              variance: verdict.variance,
              articleCount: stances.length, // Add article count for context
            },
            stances: stanceSummaries,
          };

          const summaryResult = await llmProvider.summarizeVerdict(summaryInput);

          await prisma.verdict.update({
            where: { id: verdict.id },
            data: {
              reasoning: summaryResult.summary,
            },
          });

          successCount += 1;
          console.log(
            `✅ Summarized verdict for question "${question.questionText.slice(
              0,
              80
            )}..." (month: ${verdictMonthPeriod.toISOString().slice(0, 7)})`,
          );
        }
      } catch (error) {
        errorCount += 1;
        console.error(`❌ Error summarizing verdict for question ${questionId}:`, error);
      }
    }

    console.log('\n📊 Summarization complete.');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️ Failed: ${errorCount}`);
  } catch (error) {
    console.error('❌ Fatal error in verdict summarization script:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as summarizeVerdictsScript };


