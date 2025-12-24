/**
 * Generate Timeline Events
 * 
 * Generates LLM-based timeline events for all active questions that don't have timeline events yet.
 * 
 * Usage:
 *   npm run db:generate:timeline-events
 *   npm run db:generate:timeline-events -- --question-id=<question-id>
 *   npm run db:generate:timeline-events -- --topic-id=<topic-id>
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
  findArticleStancesByQuestionId,
  findTopicArticlesByTopicId,
  findTimelineEventsByTopicOrQuestion,
} from '@acta/db';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import {
  findArticleStancesByQuestionId,
  findTopicArticlesByTopicId,
  createTimelineEvents,
} from '@acta/db';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

interface ScriptArgs {
  questionId?: string;
  topicId?: string;
  force?: boolean; // Regenerate even if events exist
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

  console.log('🚀 Starting Timeline Events Generation...\n');

  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Initialize LLM provider
    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);

    let questions: Array<{ id: string; questionText: string; topicId: string }> = [];
    let topics: Array<{ id: string; name: string }> = [];

    // Get questions/topics to process
    if (args.questionId) {
      const question = await findQuestionById(args.questionId);
      if (question) {
        questions = [question];
      }
    } else if (args.topicId) {
      const topic = await findTopicById(args.topicId);
      if (topic) {
        topics = [topic];
        const topicQuestions = await findQuestionsByTopicId(topic.id, false);
        questions = topicQuestions.filter((q) => q.isActive);
      }
    } else {
      // Process all active questions
      const allQuestions = await findActiveQuestions();
      questions = allQuestions;
    }

    // Filter to questions without timeline events (unless force)
    if (!args.force) {
      const questionsWithEvents = new Set<string>();
      for (const q of questions) {
        const existing = await findTimelineEventsByTopicOrQuestion(undefined, q.id);
        if (existing.length > 0) {
          questionsWithEvents.add(q.id);
        }
      }
      questions = questions.filter((q) => !questionsWithEvents.has(q.id));
    }

    console.log(`📋 Found ${questions.length} question(s) to process\n`);

    if (questions.length === 0) {
      console.log('✅ No questions need timeline events generated.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Helper to delay between requests (avoid rate limits)
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`[${i + 1}/${questions.length}] Processing: "${question.questionText.substring(0, 60)}..."`);

      // Add delay between requests to avoid rate limits (5 seconds)
      // OpenAI free tier: 3 requests/minute, paid tier: varies by model
      if (i > 0) {
        await delay(5000);
      }

      try {
        // Get articles for this question
        const stances = await findArticleStancesByQuestionId(question.id);
        const articles = stances.slice(0, 20).map((stance) => {
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

        if (articles.length === 0) {
          console.log(`   ⚠️  No articles found for this question, skipping...\n`);
          continue;
        }

        console.log(`   📰 Found ${articles.length} articles`);

        // Get topic name
        const topic = (question as any).topic;
        const topicName = topic?.name || 'Unknown';

        // Generate timeline using LLM with retry logic
        let result;
        let retries = 3;
        let lastError: Error | null = null;

        while (retries > 0) {
          try {
            result = await llmProvider.generateTimelineEvents({
              question: {
                text: question.questionText,
                topicName,
              },
              articles: articles.map((a) => ({
                id: a.id,
                title: a.title,
                textContent: a.textContent,
                publishedDate: a.publishedDate?.toISOString() || null,
                outletName: a.outletName,
              })),
            });
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries--;

            // Check if it's a rate limit error
            const isRateLimit = error instanceof Error && (
              error.message.includes('rate limit') ||
              error.message.includes('429') ||
              error.message.includes('too many requests')
            );

            if (isRateLimit && retries > 0) {
              // Exponential backoff for rate limits: 20s, 40s, 80s
              // This gives OpenAI time to reset rate limit counters
              const backoffMs = Math.pow(2, 3 - retries) * 10000; // 20s, 40s, 80s
              console.log(`   ⏳ Rate limit hit, waiting ${backoffMs / 1000}s before retry (${retries} retries left)...`);
              await delay(backoffMs);
            } else if (retries > 0) {
              // Other errors: shorter delay
              console.log(`   ⚠️  Error, retrying in 5s (${retries} retries left)...`);
              await delay(5000);
            }
          }
        }

        if (!result) {
          throw lastError || new Error('Failed to generate timeline events after retries');
        }

        // Store generated events in database
        if (result.events.length > 0) {
          const eventsToCreate = result.events.map((e, idx) => ({
            questionId: question.id,
            date: new Date(e.date),
            title: e.title,
            description: e.description,
            order: idx,
          }));

          await createTimelineEvents(eventsToCreate);
          console.log(`   ✅ Generated and stored ${result.events.length} timeline events\n`);
          successCount++;
        } else {
          console.log(`   ⚠️  No timeline events generated (may need more articles)\n`);
          successCount++; // Still count as success
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
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

