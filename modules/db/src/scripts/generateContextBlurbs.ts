/**
 * Generate Question Context Blurbs
 * 
 * Generates LLM-based context blurbs for all active questions that don't have one yet.
 * 
 * Usage:
 *   npm run db:generate:context-blurbs
 *   npm run db:generate:context-blurbs -- --question-id=<question-id>
 *   npm run db:generate:context-blurbs -- --topic-name="Gaza"
 *   npm run db:generate:context-blurbs -- --topic-id=<topic-id>
 *   npm run db:generate:context-blurbs -- --force  # Regenerate even if blurb exists
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
  findTopicByName,
  findTopicById,
  findArticleStancesByQuestionId,
  updateQuestion,
} from '@acta/db';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

interface ScriptArgs {
  questionId?: string;
  topicId?: string;
  topicName?: string;
  force?: boolean; // Regenerate even if blurb exists
}

function parseScriptArgs(): ScriptArgs {
  const { values } = parseArgs({
    options: {
      'question-id': { type: 'string' },
      'topic-id': { type: 'string' },
      'topic-name': { type: 'string' },
      force: { type: 'boolean' },
    },
  });

  return {
    questionId: values['question-id'],
    topicId: values['topic-id'],
    topicName: values['topic-name'],
    force: values.force || false,
  };
}

async function main() {
  const args = parseScriptArgs();

  console.log('🚀 Starting Question Context Blurb Generation...\n');
  if (args.force) {
    console.log('⚠️  --force mode: Will regenerate blurbs even if they already exist\n');
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
      // Filter by topic ID
      questions = await findQuestionsByTopicId(args.topicId, false);
      // Filter to questions without blurbs (unless force)
      // Check for null/undefined/empty string - only process if truly missing
      if (!args.force) {
        questions = questions.filter((q) => {
          const blurb = (q as any).contextBlurb;
          return !blurb || (typeof blurb === 'string' && blurb.trim().length === 0);
        });
      }
    } else if (args.topicName) {
      // Filter by topic name
      const topic = await findTopicByName(args.topicName);
      if (!topic) {
        console.error(`❌ Topic not found: "${args.topicName}"`);
        console.log('💡 Available topics can be found in the database.');
        return;
      }
      questions = await findQuestionsByTopicId(topic.id, false);
      // Filter to questions without blurbs (unless force)
      // Check for null/undefined/empty string - only process if truly missing
      if (!args.force) {
        questions = questions.filter((q) => {
          const blurb = (q as any).contextBlurb;
          return !blurb || (typeof blurb === 'string' && blurb.trim().length === 0);
        });
      }
    } else {
      questions = await findActiveQuestions();
    }

    // Filter to questions without blurbs (unless force) for all modes.
    if (!args.force) {
      questions = questions.filter((q) => {
        const blurb = (q as any).contextBlurb;
        return !blurb || (typeof blurb === 'string' && blurb.trim().length === 0);
      });
    }

    // Log topic breakdown
    const topicMap = new Map<string, number>();
    questions.forEach((q) => {
      const topicName = (q as any).topic?.name || 'Unknown';
      topicMap.set(topicName, (topicMap.get(topicName) || 0) + 1);
    });

    console.log(`📋 Found ${questions.length} question(s) to process`);
    if (topicMap.size > 0) {
      console.log('   By topic:');
      Array.from(topicMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([topic, count]) => {
          console.log(`      - ${topic}: ${count}`);
        });
    }
    console.log();

    if (questions.length === 0) {
      console.log('✅ No questions need context blurbs generated.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const topicName = (question as any).topic?.name || 'Unknown';
      console.log(`\n[${i + 1}/${questions.length}] Processing: "${question.questionText.substring(0, 60)}..."`);
      console.log(`   📂 Topic: ${topicName}`);

      try {
        // Get articles for this question (only analyzed stances)
        const stances = await findArticleStancesByQuestionId(question.id);
        const articles = stances
          .slice(0, 10) // Limit to first 10 articles
          .map((s) => (s as any).article)
          .filter((a) => a && a.textContent);

        if (articles.length === 0) {
          console.log(`   ⚠️  No analyzed articles found for this question, skipping...`);
          console.log(`   💡 This question needs articles to be analyzed and matched first.`);
          continue;
        }

        console.log(`   📰 Found ${articles.length} articles`);

        // Get topic name
        const topic = (question as any).topic;
        const topicNameForLLM = topic?.name || 'Unknown';

        // Generate context blurb
        // Note: withRetry in the provider already handles retries with exponential backoff
        console.log(`   🤖 Calling LLM to generate context blurb...`);
        const startTime = Date.now();
        
        const result = await llmProvider.generateQuestionContextBlurb({
          question: {
            text: question.questionText,
            topicName: topicNameForLLM,
          },
          articles: articles.map((a) => ({
            id: a.id,
            title: a.title,
            textContent: a.textContent,
          })),
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ✅ LLM call completed in ${duration}s`);

        // Update question with context blurb
        await updateQuestion(question.id, {
          contextBlurb: result.blurb,
        });

        console.log(`   ✅ Generated: "${result.blurb.substring(0, 80)}..."\n`);
        successCount++;
      } catch (error) {
        const errorDetails = error instanceof Error ? {
          message: error.message,
          name: error.name,
          cause: (error as any).cause,
        } : { message: String(error) };
        
        console.error(`   ❌ Error generating context blurb:`);
        console.error(`      Message: ${errorDetails.message}`);
        console.error(`      Type: ${errorDetails.name || 'Unknown'}`);
        
        // Check error type
        if (error instanceof Error) {
          const isQuotaExceeded = error.message.toLowerCase().includes('quota') || 
                                  error.message.toLowerCase().includes('billing');
          const isRateLimit = error.message.includes('rate limit') || error.message.includes('429');
          
          if (isQuotaExceeded) {
            console.error(`      💳 QUOTA EXCEEDED - This is not a rate limit issue`);
            console.error(`      ❌ Your OpenAI account has no remaining credits`);
            console.error(`      💡 Action required:`);
            console.error(`         1. Go to https://platform.openai.com/account/billing`);
            console.error(`         2. Add credits to your account`);
            console.error(`         3. Then re-run this script`);
            console.error(`\n   ⛔ Stopping - cannot proceed without OpenAI credits\n`);
            break; // Exit loop - no point continuing
          } else if (isRateLimit) {
            const retryAfter = (error as any).retryAfter;
            if (retryAfter) {
              console.error(`      ⏳ Rate limit - OpenAI suggests retry after ${retryAfter} seconds`);
              console.error(`      💡 Recommendation: Wait ${retryAfter} seconds, then run:`);
              console.error(`         npm run db:generate:context-blurbs -- --question-id=${question.id}`);
            } else {
              console.error(`      ⏳ Rate limit detected (check OpenAI dashboard for limits)`);
              console.error(`      💡 Recommendation: Wait 60 seconds, then continue`);
            }
            
            // If rate limit, skip remaining questions and suggest manual continuation
            const remaining = questions.length - (i + 1);
            if (remaining > 0) {
              console.error(`\n   ⚠️  Stopping batch processing due to rate limit.`);
              console.error(`   📝 Remaining questions: ${remaining}`);
              console.error(`   💡 To continue later, run:`);
              console.error(`      npm run db:generate:context-blurbs`);
              console.error(`   (It will skip questions that already have blurbs)\n`);
              break; // Exit loop, don't process remaining questions
            }
          }
        }
        
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



