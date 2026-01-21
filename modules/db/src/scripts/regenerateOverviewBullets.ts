/**
 * Regenerate Overview Bullets (Understand section)
 *
 * Regenerates only verdict.overviewBullets for questions.
 *
 * Usage:
 *   npm run db:regenerate:overview-bullets
 *   npm run db:regenerate:overview-bullets -- --question-id=<question-id>
 *   npm run db:regenerate:overview-bullets -- --topic-id=<topic-id>
 *   npm run db:regenerate:overview-bullets -- --force
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseArgs } from 'util';
import {
  connectDatabase,
  disconnectDatabase,
  findActiveQuestions,
  findQuestionById,
  findQuestionsByTopicId,
  findTopicById,
  findVerdictByQuestionAndMonth,
  findArticleStancesByQuestionId,
  updateVerdict,
} from '@acta/db';
import { getCurrentMonthPeriod } from '@acta/core';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

interface ScriptArgs {
  questionId?: string;
  topicId?: string;
  force?: boolean;
}

function parseScriptArgs(): ScriptArgs {
  const { values } = parseArgs({
    options: {
      'question-id': { type: 'string' },
      'topic-id': { type: 'string' },
      force: { type: 'boolean' },
    },
  });

  return {
    questionId: values['question-id'],
    topicId: values['topic-id'],
    force: values.force || false,
  };
}

async function main() {
  const args = parseScriptArgs();

  console.log('🚀 Regenerating overview bullets (Understand section)...\n');
  if (args.force) {
    console.log('⚠️  --force mode: Will regenerate even if bullets already exist\n');
  }

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);

    let questions;
    if (args.questionId) {
      const question = await findQuestionById(args.questionId);
      questions = question ? [question] : [];
    } else if (args.topicId) {
      const topic = await findTopicById(args.topicId);
      if (!topic) {
        console.error(`❌ Topic not found: "${args.topicId}"`);
        return;
      }
      questions = await findQuestionsByTopicId(topic.id, false);
    } else {
      questions = await findActiveQuestions();
    }

    console.log(`📋 Found ${questions.length} question(s) to process\n`);
    if (questions.length === 0) {
      console.log('✅ No questions to process.');
      return;
    }

    const currentMonth = getCurrentMonthPeriod();
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const topicName = (question as any).topic?.name || 'Unknown';
      console.log(`\n[${i + 1}/${questions.length}] Processing: "${question.questionText.substring(0, 60)}..."`);

      try {
        const verdict = await findVerdictByQuestionAndMonth(question.id, currentMonth);
        if (!verdict) {
          console.log('   ⚠️  No current-month verdict found, skipping...');
          skippedCount++;
          continue;
        }

        const hasExisting = Array.isArray(verdict.overviewBullets) && verdict.overviewBullets.length > 0;
        if (hasExisting && !args.force) {
          console.log('   ⏭️  Overview bullets already exist, skipping...');
          skippedCount++;
          continue;
        }

        const stances = await findArticleStancesByQuestionId(question.id);
        const monthStances = stances.filter((stance) => {
          const attempt = (stance as any).articleAnalysisAttempt;
          if (!attempt) return false;
          const attemptMonth = new Date(attempt.month);
          return (
            attemptMonth.getFullYear() === currentMonth.getFullYear() &&
            attemptMonth.getMonth() === currentMonth.getMonth()
          );
        });

        if (monthStances.length === 0) {
          console.log('   ⚠️  No current-month stances, skipping...');
          skippedCount++;
          continue;
        }

        console.log(`   📰 Found ${monthStances.length} articles`);
        console.log('   🤖 Generating overview bullets...');

        const stancesForLLM = monthStances.slice(0, 10).map((stance) => {
          const attempt = (stance as any).articleAnalysisAttempt;
          const article = (stance as any).article;
          const outlet = article?.outlet;
          return {
            articleTitle: article?.title || '',
            outletName: outlet?.name || '',
            stance: attempt?.stance || 'Unclear',
            reasoning: attempt?.reasoning || '',
          };
        });

        const result = await llmProvider.generateOverviewBullets({
          question: {
            id: question.id,
            text: question.questionText,
            topicName,
          },
          verdict: {
            label: verdict.verdictLabel as string,
            confidence: verdict.confidence,
          },
          stances: stancesForLLM,
        });

        await updateVerdict(verdict.id, { overviewBullets: result.bullets });
        console.log(`   ✅ Stored ${result.bullets.length} overview bullets`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${questions.length}\n`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

