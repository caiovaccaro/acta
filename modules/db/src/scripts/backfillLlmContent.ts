/**
 * Backfill LLM Content
 *
 * Ensures LLM-generated content is persisted for questions:
 * - Context blurbs
 * - Timeline events
 * - Debate card content (overview bullets, quotes, featured perspective, points for debate)
 *
 * Usage:
 *   npm run db:backfill:llm-content
 *   npm run db:backfill:llm-content -- --question-id=<question-id>
 *   npm run db:backfill:llm-content -- --topic-id=<topic-id>
 *   npm run db:backfill:llm-content -- --force
 *   npm run db:backfill:llm-content -- --write
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
  updateQuestion,
  updateVerdict,
  findEvidenceBulletsByVerdictId,
  createEvidenceBullets,
  deleteEvidenceBulletsByVerdictId,
  findTimelineEventsByTopicOrQuestion,
  createTimelineEvents,
  deleteTimelineEventsByQuestionId,
} from '@acta/db';
import { getCurrentMonthPeriod } from '@acta/core';
import { createLLMConfigFromEnv, createLLMProvider, type LLMProvider } from '@acta/core/llm';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

interface ScriptArgs {
  questionId?: string;
  topicId?: string;
  force?: boolean;
  write?: boolean;
}

function parseScriptArgs(): ScriptArgs {
  const { values } = parseArgs({
    options: {
      'question-id': { type: 'string' },
      'topic-id': { type: 'string' },
      force: { type: 'boolean' },
      write: { type: 'boolean' },
    },
  });

  return {
    questionId: values['question-id'],
    topicId: values['topic-id'],
    force: values.force || false,
    write: values.write || false,
  };
}

function isSameMonth(date: Date, month: Date): boolean {
  return (
    date.getFullYear() === month.getFullYear() &&
    date.getMonth() === month.getMonth()
  );
}

function hasValidQuoteText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  const hasIncompleteEscape =
    trimmed.endsWith('\\') ||
    trimmed.endsWith('\\ ') ||
    trimmed.endsWith(' \\') ||
    trimmed.endsWith('\\"') ||
    trimmed.endsWith('\\" ') ||
    trimmed.endsWith(' \\"') ||
    trimmed.endsWith(' \\" ') ||
    Boolean(trimmed.slice(-10).match(/\\\s*"[\s]*$/)) ||
    Boolean(trimmed.slice(-10).match(/\\[\s]*$/));
  if (hasIncompleteEscape) return false;
  if (trimmed.endsWith('"') && trimmed.length < 50 && !trimmed.slice(0, -1).match(/[.!?]$/)) {
    return false;
  }
  return true;
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

async function main() {
  const args = parseScriptArgs();

  const isDryRun = !args.write;
  console.log(`🚀 Starting LLM content backfill (${isDryRun ? 'dry run' : 'write mode'})...\n`);
  if (args.force) {
    console.log('⚠️  --force mode: Will regenerate content even if it already exists\n');
  }
  if (isDryRun) {
    console.log('ℹ️  Dry run: no LLM calls and no database writes\n');
  }

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    let llmProvider: LLMProvider | null = null;
    if (!isDryRun) {
      const llmConfig = createLLMConfigFromEnv();
      llmProvider = createLLMProvider(llmConfig);
      console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);
    }

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
      console.log(`   📂 Topic: ${topicName}`);

      try {
        const stances = await findArticleStancesByQuestionId(question.id);
        const monthStances = stances.filter((stance) => {
          const attempt = (stance as any).articleAnalysisAttempt;
          if (!attempt) return false;
          return isSameMonth(new Date(attempt.month), currentMonth);
        });

        const stanceArticles = stances
          .map((s) => (s as any).article)
          .filter((a) => a && a.textContent);

        if (stanceArticles.length === 0) {
          console.log(`   ⚠️  No analyzed articles found, skipping...`);
          skippedCount++;
          continue;
        }

        // Context blurb
        const contextBlurb = (question as any).contextBlurb;
        if (args.force || !contextBlurb || (typeof contextBlurb === 'string' && contextBlurb.trim().length === 0)) {
          try {
            if (isDryRun) {
              console.log('   📝 Missing context blurb');
            } else {
              console.log('   🤖 Generating context blurb...');
              const result = await llmProvider!.generateQuestionContextBlurb({
                question: {
                  text: question.questionText,
                  topicName,
                },
                articles: stanceArticles.slice(0, 10).map((a) => ({
                  id: a.id,
                  title: a.title,
                  textContent: a.textContent,
                })),
              });
              await updateQuestion(question.id, { contextBlurb: result.blurb });
              console.log('   ✅ Context blurb saved');
            }
          } catch (error) {
            console.error(`   ❌ Context blurb error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Timeline events
        const existingEvents = await findTimelineEventsByTopicOrQuestion(undefined, question.id);
        if (args.force || existingEvents.length === 0) {
          if (isDryRun) {
            console.log('   📝 Missing timeline events');
          } else if (args.force && existingEvents.length > 0) {
            await deleteTimelineEventsByQuestionId(question.id);
          }
          if (!isDryRun) {
            console.log('   🤖 Generating timeline events...');
          }
          const articlesForTimeline = stances.slice(0, 20).map((stance) => {
            const article = (stance as any).article;
            const outlet = article?.outlet;
            return {
              id: article.id,
              title: article.title,
              textContent: article.textContent,
              publishedDate: article.publishedDate,
              outletName: outlet?.name || 'Unknown',
            };
          });

          if (!isDryRun && articlesForTimeline.length > 0) {
            const result = await llmProvider!.generateTimelineEvents({
              question: {
                text: question.questionText,
                topicName,
              },
              articles: articlesForTimeline.map((a) => ({
                id: a.id,
                title: a.title,
                textContent: a.textContent,
                publishedDate: a.publishedDate?.toISOString() || null,
                outletName: a.outletName,
              })),
            });

            if (result.events.length > 0) {
              const eventsToCreate = result.events.map((e, idx) => ({
                questionId: question.id,
                date: new Date(e.date),
                title: e.title,
                description: e.description,
                order: idx,
              }));
              await createTimelineEvents(eventsToCreate);
              console.log(`   ✅ Stored ${result.events.length} timeline events`);
            } else {
              console.log('   ⚠️  No timeline events generated');
            }
          } else if (!isDryRun) {
            console.log('   ⚠️  No articles available for timeline generation');
          }
        }

        // Debate content (requires verdict for current month)
        const verdict = await findVerdictByQuestionAndMonth(question.id, currentMonth);
        if (!verdict) {
          console.log('   ⚠️  No current-month verdict found, skipping debate content');
          successCount++;
          continue;
        }

        if (monthStances.length === 0) {
          console.log('   ⚠️  No articles for current month, skipping debate content');
          successCount++;
          continue;
        }

        const isYes = verdict.verdictLabel === 'YesItSeemsSo' || verdict.verdictLabel === 'ProbablyYes';
        const isNo = verdict.verdictLabel === 'NoItDoesntSeemSo' || verdict.verdictLabel === 'ProbablyNot';
        const alignedStances = monthStances.filter((stance) => {
          const attempt = (stance as any).articleAnalysisAttempt;
          if (!attempt) return false;
          if (isYes) return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
          if (isNo) return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
          return true;
        });
        const opposingStances = monthStances.filter((stance) => {
          const attempt = (stance as any).articleAnalysisAttempt;
          if (!attempt) return false;
          if (isYes) return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
          if (isNo) return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
          return false;
        });

        let evidenceBullets = await findEvidenceBulletsByVerdictId(verdict.id);
        if (!isDryRun && args.force && evidenceBullets.length > 0) {
          await deleteEvidenceBulletsByVerdictId(verdict.id);
          evidenceBullets = [];
        }

        const hasOverviewBullets = Array.isArray(verdict.overviewBullets) && verdict.overviewBullets.length > 0;
        const hasFeaturedPerspective = verdict.featuredPerspective && typeof verdict.featuredPerspective === 'object';
        const hasQuotesFor = evidenceBullets.some((eb) => eb.type === 'Why');
        const hasQuotesAgainst = evidenceBullets.some((eb) => eb.type === 'Dissent');
        const hasPointsForDebate = evidenceBullets.some((eb) => eb.type === 'Unknown');

        // Overview bullets
        if (args.force || !hasOverviewBullets) {
          try {
            if (isDryRun) {
              console.log('   📝 Missing overview bullets');
            } else {
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
              const result = await llmProvider!.generateOverviewBullets({
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
            }
          } catch (error) {
            console.error(`   ❌ Overview bullets error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Quotes (Why / Dissent)
        if (args.force || !hasQuotesFor || !hasQuotesAgainst) {
          const quotesToStore: Array<{
            verdictId: string;
            text: string;
            articleId: string | null;
            type: 'Why' | 'Dissent';
            order: number;
          }> = [];
          let quoteOrder = 0;

          if (isDryRun) {
            console.log('   📝 Missing quotes (Why/Dissent)');
          } else {
            console.log('   🤖 Generating quotes...');
          }
          for (const stance of alignedStances.slice(0, 10)) {
            const attempt = (stance as any).articleAnalysisAttempt;
            const article = (stance as any).article;
            if (!attempt || !article?.textContent || !article?.url) continue;
            try {
              if (!isDryRun) {
                const quoteResult = await llmProvider!.extractQuotes({
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
                  if (quote.text && hasValidQuoteText(quote.text) && !isNonQuoteResponse(quote.text)) {
                    quotesToStore.push({
                      verdictId: verdict.id,
                      text: quote.text,
                      articleId: article.id,
                      type: 'Why',
                      order: quoteOrder++,
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(`      ⚠️  Failed to extract aligned quote from article ${article.id}`);
            }
          }

          for (const stance of opposingStances.slice(0, 5)) {
            const attempt = (stance as any).articleAnalysisAttempt;
            const article = (stance as any).article;
            if (!attempt || !article?.textContent || !article?.url) continue;
            try {
              if (!isDryRun) {
                const quoteResult = await llmProvider!.extractQuotes({
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
                  if (quote.text && hasValidQuoteText(quote.text) && !isNonQuoteResponse(quote.text)) {
                    quotesToStore.push({
                      verdictId: verdict.id,
                      text: quote.text,
                      articleId: article.id,
                      type: 'Dissent',
                      order: quoteOrder++,
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(`      ⚠️  Failed to extract opposing quote from article ${article.id}`);
            }
          }

          if (!isDryRun && quotesToStore.length > 0) {
            await createEvidenceBullets(quotesToStore);
            console.log(`   ✅ Stored ${quotesToStore.length} quotes`);
          } else if (!isDryRun) {
            console.log('   ⚠️  No quotes generated');
          }
        }

        // Featured perspective
        if ((args.force || !hasFeaturedPerspective) && alignedStances.length > 0) {
          try {
            if (isDryRun) {
              console.log('   📝 Missing featured perspective');
            } else {
              console.log('   🤖 Generating featured perspective...');
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
                  confidence: attempt?.confidence ?? 0.5,
                };
              });
              const result = await llmProvider!.generateFeaturedPerspective({
                question: {
                  text: question.questionText,
                  topicName,
                },
                verdict: {
                  label: verdict.verdictLabel as string,
                },
                articles: articlesForLLM,
              });
              const featuredStance = alignedStances.find((s) => {
                const article = (s as any).article;
                return article?.id === result.quote.articleId && article?.url;
              });
              const article = featuredStance ? (featuredStance as any).article : null;
              if (article?.url) {
                await updateVerdict(verdict.id, {
                  featuredPerspective: {
                    text: result.quote.text,
                    articleId: result.quote.articleId,
                    articleTitle: result.quote.articleTitle,
                    outletName: result.quote.outletName,
                    articleUrl: article.url,
                  },
                });
                console.log('   ✅ Stored featured perspective');
              } else {
                console.log('   ⚠️  Featured perspective skipped (no article URL)');
              }
            }
          } catch (error) {
            console.error(`   ❌ Featured perspective error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Points for debate (Unknown)
        if (args.force || !hasPointsForDebate) {
          if (isDryRun) {
            console.log('   📝 Missing points for debate');
          } else {
            console.log('   🤖 Generating points for debate...');
          }
          const pointsForDebate: Array<{
            verdictId: string;
            text: string;
            articleId: string;
            type: 'Unknown';
            order: number;
          }> = [];

          for (const stance of opposingStances.slice(0, 5)) {
            const attempt = (stance as any).articleAnalysisAttempt;
            const article = (stance as any).article;
            if (!attempt || !article?.textContent || !article?.url) continue;
            try {
              if (!isDryRun) {
                const quoteResult = await llmProvider!.extractQuotes({
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
                  if (quote.text && quote.text.trim().length > 0 && !isNonQuoteResponse(quote.text) && article.url) {
                    pointsForDebate.push({
                      verdictId: verdict.id,
                      text: quote.text,
                      articleId: article.id,
                      type: 'Unknown',
                      order: pointsForDebate.length,
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(`      ⚠️  Failed to extract point from article ${article.id}`);
            }
          }

          if (!isDryRun && pointsForDebate.length > 0) {
            await createEvidenceBullets(pointsForDebate);
            console.log(`   ✅ Stored ${pointsForDebate.length} points for debate`);
          } else if (!isDryRun) {
            console.log('   ⚠️  No points for debate generated');
          }
        }

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

