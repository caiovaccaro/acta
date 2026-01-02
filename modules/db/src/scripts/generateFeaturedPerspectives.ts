/**
 * Generate Featured Perspectives
 * 
 * Generates LLM-based featured perspectives for all questions with current-month verdicts
 * that don't have featured perspectives yet.
 * 
 * Usage:
 *   npm run db:generate:featured-perspectives
 *   npm run db:generate:featured-perspectives -- --question-id=<question-id>
 *   npm run db:generate:featured-perspectives -- --topic-id=<topic-id>
 *   npm run db:generate:featured-perspectives -- --force  # Regenerate even if content exists
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseArgs } from 'util';
import {
  connectDatabase,
  disconnectDatabase,
  findActiveQuestions,
  findQuestionById,
  findTopicById,
  findQuestionsByTopicId,
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
  force?: boolean; // Regenerate even if content exists
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

  console.log('🚀 Starting Featured Perspective Generation...\n');
  if (args.force) {
    console.log('⚠️  --force mode: Will regenerate perspectives even if they already exist\n');
  }

  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Initialize LLM provider
    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);

    // Get questions to process
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

    // Filter to questions with current-month verdicts
    const currentMonth = getCurrentMonthPeriod();
    const questionsWithVerdicts = [];
    for (const question of questions) {
      const verdict = await findVerdictByQuestionAndMonth(question.id, currentMonth);
      if (verdict) {
        questionsWithVerdicts.push({ question, verdict });
      }
    }

    // Filter to questions that need featured perspective generation (unless force)
    const questionsToProcess = [];
    for (const { question, verdict } of questionsWithVerdicts) {
      if (args.force) {
        questionsToProcess.push({ question, verdict });
        continue;
      }

      // Check if featured perspective already exists
      const hasFeaturedPerspective = verdict.featuredPerspective && 
        typeof verdict.featuredPerspective === 'object' &&
        (verdict.featuredPerspective as any).articleUrl;

      if (hasFeaturedPerspective) {
        continue;
      }

      questionsToProcess.push({ question, verdict });
    }

    console.log(`📋 Found ${questionsToProcess.length} question(s) to process\n`);

    if (questionsToProcess.length === 0) {
      console.log('✅ No questions need featured perspectives generated.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each question
    for (let i = 0; i < questionsToProcess.length; i++) {
      const { question, verdict } = questionsToProcess[i];
      const topicName = (question as any).topic?.name || 'Unknown';
      console.log(`\n[${i + 1}/${questionsToProcess.length}] Processing: "${question.questionText.substring(0, 60)}..."`);
      console.log(`   📂 Topic: ${topicName}`);

      try {
        // Get article stances for this question
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
          console.log(`   ⚠️  No articles found for this question, skipping...`);
          skippedCount++;
          continue;
        }

        console.log(`   📰 Found ${monthStances.length} articles`);

        // Filter to aligned stances (matching the verdict)
        const alignedStances = monthStances.filter((stance) => {
          const attempt = (stance as any).articleAnalysisAttempt;
          if (!attempt) return false;
          const isYes = verdict.verdictLabel === 'YesItSeemsSo' || verdict.verdictLabel === 'ProbablyYes';
          const isNo = verdict.verdictLabel === 'NoItDoesntSeemSo' || verdict.verdictLabel === 'ProbablyNot';
          if (isYes) {
            return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
          }
          if (isNo) {
            return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
          }
          return true;
        });

        if (alignedStances.length === 0) {
          console.log(`   ⚠️  No aligned articles found for this verdict, skipping...`);
          skippedCount++;
          continue;
        }

        // Generate featured perspective
        try {
          console.log(`   🤖 Generating featured perspective...`);
          const articlesForLLM = alignedStances.slice(0, 5).map((stance) => {
            const attempt = (stance as any).articleAnalysisAttempt;
            const article = (stance as any).article;
            const outlet = article?.outlet;
            return {
              id: article.id,
              title: article.title,
              textContent: article.textContent,
              outletName: outlet?.name || '',
              stance: attempt?.stance || 'Unclear',
              reasoning: attempt?.reasoning || '',
              confidence: attempt?.confidence || 0.5,
            };
          });

          const result = await llmProvider.generateFeaturedPerspective({
            question: {
              text: question.questionText,
              topicName,
            },
            verdict: {
              label: verdict.verdictLabel as string,
            },
            articles: articlesForLLM,
          });

          // Find article URL - ensure we always have it
          const featuredStance = alignedStances.find((s) => {
            const article = (s as any).article;
            return article?.id === result.quote.articleId && article?.url; // Only use articles with URLs
          });
          const article = featuredStance ? (featuredStance as any).article : null;

          // Only store if we have an article URL
          if (article?.url) {
            await updateVerdict(verdict.id, {
              featuredPerspective: {
                text: result.quote.text,
                articleId: result.quote.articleId,
                articleTitle: result.quote.articleTitle,
                outletName: result.quote.outletName,
                articleUrl: article.url, // Always required
              },
            });
            console.log(`   ✅ Generated featured perspective`);
            successCount++;
          } else {
            console.log(`   ⚠️  Skipped - article URL not found for article ${result.quote.articleId}`);
            skippedCount++;
          }
        } catch (error) {
          console.error(`   ❌ Error generating featured perspective: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${questionsToProcess.length}\n`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

