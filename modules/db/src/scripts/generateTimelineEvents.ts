/**
 * Generate Timeline Events
 * 
 * Generates LLM-based timeline events for all active questions that don't have timeline events yet.
 * 
 * Usage:
 *   npm run db:generate:timeline-events
 *   npm run db:generate:timeline-events -- --question-id=<question-id>
 *   npm run db:generate:timeline-events -- --topic-id=<topic-id>
 *   npm run db:generate:timeline-events -- --force  # Regenerate even if events exist
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
  createTimelineEvents,
  deleteTimelineEventsByQuestionId,
} from '@acta/db';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';

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
  if (args.force) {
    console.log('⚠️  --force mode: Will regenerate events even if they already exist\n');
  }

  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Initialize LLM provider
    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);

    let questions: Array<{ id: string; questionText: string; topicId: string }> = [];

    // Get questions/topics to process
    if (args.questionId) {
      const question = await findQuestionById(args.questionId);
      if (question) {
        questions = [question];
      }
    } else if (args.topicId) {
      const topic = await findTopicById(args.topicId);
      if (topic) {
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

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`[${i + 1}/${questions.length}] Processing: "${question.questionText.substring(0, 60)}..."`);

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

        // If force, remove existing events to avoid duplicates
        if (args.force) {
          const existing = await findTimelineEventsByTopicOrQuestion(undefined, question.id);
          if (existing.length > 0) {
            await deleteTimelineEventsByQuestionId(question.id);
          }
        }

        // Generate timeline using LLM
        // Note: withRetry in the provider already handles retries with exponential backoff
        console.log(`   🤖 Calling LLM to generate timeline events...`);
        const startTime = Date.now();
        
        const result = await llmProvider.generateTimelineEvents({
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
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ✅ LLM call completed in ${duration}s`);

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
        const errorDetails = error instanceof Error ? {
          message: error.message,
          name: error.name,
        } : { message: String(error), name: 'Unknown' };
        
        console.error(`   ❌ Error generating timeline events:`);
        console.error(`      Message: ${errorDetails.message}`);
        console.error(`      Type: ${errorDetails.name}\n`);
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


