/**
 * Generate Debate Card Content
 * 
 * Generates LLM-based debate card content (overview bullets, quotes, featured perspective, points for debate)
 * for all questions with current-month verdicts that don't have this content yet.
 * 
 * Usage:
 *   npm run db:generate:debate-content
 *   npm run db:generate:debate-content -- --question-id=<question-id>
 *   npm run db:generate:debate-content -- --topic-id=<topic-id>
 *   npm run db:generate:debate-content -- --force  # Regenerate even if content exists
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
  createEvidenceBullets,
  findEvidenceBulletsByVerdictId,
  deleteEvidenceBulletsByVerdictId,
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

function isNonQuoteResponse(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    normalized.startsWith("i'm sorry") ||
    normalized.includes('provided text does not contain') ||
    normalized.includes('does not contain any direct quotes') ||
    normalized.includes('no direct quotes') ||
    normalized.includes('cannot find any direct quotes') ||
    normalized.includes('does not include any direct quotes')
  );
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

  console.log('🚀 Starting Debate Card Content Generation...\n');
  if (args.force) {
    console.log('⚠️  --force mode: Will regenerate content even if it already exists\n');
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

    // Filter to questions that need content generation (unless force)
    const questionsToProcess = [];
    for (const { question, verdict } of questionsWithVerdicts) {
      if (args.force) {
        questionsToProcess.push({ question, verdict });
        continue;
      }

      // Check if content already exists
      const hasOverviewBullets = verdict.overviewBullets && Array.isArray(verdict.overviewBullets) && verdict.overviewBullets.length > 0;
      const hasFeaturedPerspective = verdict.featuredPerspective && typeof verdict.featuredPerspective === 'object';
      const evidenceBullets = await findEvidenceBulletsByVerdictId(verdict.id);
      const hasPointsForDebate = evidenceBullets.some((eb) => eb.type === 'Unknown');

      // Only skip if all content exists
      if (hasOverviewBullets && hasFeaturedPerspective && hasPointsForDebate) {
        continue;
      }

      questionsToProcess.push({ question, verdict });
    }

    console.log(`📋 Found ${questionsToProcess.length} question(s) to process\n`);

    if (questionsToProcess.length === 0) {
      console.log('✅ No questions need debate card content generated.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

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
          continue;
        }

        console.log(`   📰 Found ${monthStances.length} articles`);

        // Generate overview bullets if missing
        if (!verdict.overviewBullets || !Array.isArray(verdict.overviewBullets) || verdict.overviewBullets.length === 0 || args.force) {
          try {
            console.log(`   🤖 Generating overview bullets...`);
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

            await updateVerdict(verdict.id, {
              overviewBullets: result.bullets,
            });

            console.log(`   ✅ Generated ${result.bullets.length} overview bullets`);
          } catch (error) {
            console.error(`   ❌ Error generating overview bullets: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Generate quotes and featured perspective
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

        // Generate featured perspective if missing
        if ((!verdict.featuredPerspective || typeof verdict.featuredPerspective !== 'object' || args.force) && alignedStances.length > 0) {
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
            } else {
              console.log(`   ⚠️  Skipped featured perspective - article URL not found`);
            }
          } catch (error) {
            console.error(`   ❌ Error generating featured perspective: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Generate points for debate if missing
        const evidenceBullets = await findEvidenceBulletsByVerdictId(verdict.id);
        const hasPointsForDebate = evidenceBullets.some((eb) => eb.type === 'Unknown');

        if ((!hasPointsForDebate || args.force) && monthStances.length > 0) {
          try {
            console.log(`   🤖 Generating points for debate...`);
            const opposingStances = monthStances.filter((stance) => {
              const attempt = (stance as any).articleAnalysisAttempt;
              if (!attempt) return false;
              const isYes = verdict.verdictLabel === 'YesItSeemsSo' || verdict.verdictLabel === 'ProbablyYes';
              const isNo = verdict.verdictLabel === 'NoItDoesntSeemSo' || verdict.verdictLabel === 'ProbablyNot';
              if (isYes) {
                return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
              }
              if (isNo) {
                return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
              }
              return false;
            });

            const pointsForDebate = [];
            for (const stance of opposingStances.slice(0, 5)) {
              const attempt = (stance as any).articleAnalysisAttempt;
              const article = (stance as any).article;
              const outlet = article?.outlet;

              if (!attempt || !article || !outlet) continue;

              try {
                const quoteResult = await llmProvider.extractQuotes({
                  article: {
                    id: article.id,
                    title: article.title,
                    textContent: article.textContent,
                    url: article.url,
                  },
                  question: {
                    text: question.questionText,
                    topicName,
                  },
                  stance: attempt.stance,
                  maxQuotes: 1,
                });

                if (quoteResult.quotes.length > 0) {
                  const quote = quoteResult.quotes[0];
                  // Only store if we have a valid quote and article URL
                  if (
                    quote.text &&
                    quote.text.trim().length > 0 &&
                    !isNonQuoteResponse(quote.text) &&
                    article.url
                  ) {
                    pointsForDebate.push({
                      verdictId: verdict.id,
                      text: quote.text,
                      articleId: article.id,
                      type: 'Unknown' as const,
                      order: pointsForDebate.length,
                    });
                  }
                }
              } catch (error) {
                // Skip this article if quote extraction fails
                console.warn(`      ⚠️  Failed to extract quote from article ${article.id}`);
              }
            }

            if (pointsForDebate.length > 0) {
              // Delete existing points for debate if force
              if (args.force) {
                const existingPoints = evidenceBullets.filter((eb) => eb.type === 'Unknown');
                if (existingPoints.length > 0) {
                  await deleteEvidenceBulletsByVerdictId(verdict.id);
                }
              }
              await createEvidenceBullets(pointsForDebate);
              console.log(`   ✅ Generated ${pointsForDebate.length} points for debate`);
            }
          } catch (error) {
            console.error(`   ❌ Error generating points for debate: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        successCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
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

