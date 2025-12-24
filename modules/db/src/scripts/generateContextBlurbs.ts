/**
 * Generate Question Context Blurbs
 * 
 * Generates LLM-based context blurbs for all active questions that don't have one yet.
 * 
 * Usage:
 *   npm run db:generate:context-blurbs
 *   npm run db:generate:context-blurbs -- --question-id=<question-id>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseArgs } from 'util';
import {
  connectDatabase,
  disconnectDatabase,
  findActiveQuestions,
  findQuestionById,
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
  force?: boolean; // Regenerate even if blurb exists
}

function parseScriptArgs(): ScriptArgs {
  const { values } = parseArgs({
    options: {
      'question-id': { type: 'string' },
      force: { type: 'boolean' },
    },
  });

  return {
    questionId: values['question-id'],
    force: values.force || false,
  };
}

async function main() {
  const args = parseScriptArgs();

  console.log('🚀 Starting Question Context Blurb Generation...\n');

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
    } else {
      questions = await findActiveQuestions();
      // Filter to questions without blurbs (unless force)
      if (!args.force) {
        questions = questions.filter((q) => !(q as any).contextBlurb);
      }
      // Ensure questions have topic relation loaded
      questions = questions.map((q) => {
        if (!(q as any).topic) {
          // Topic should be included by findActiveQuestions, but ensure it's there
          return q;
        }
        return q;
      });
    }

    console.log(`📋 Found ${questions.length} question(s) to process\n`);

    if (questions.length === 0) {
      console.log('✅ No questions need context blurbs generated.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Helper to delay between requests
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n[${i + 1}/${questions.length}] Processing: "${question.questionText.substring(0, 60)}..."`);
      
      // Add delay between requests (OpenAI free tier: 3 req/min, paid: varies)
      // Using 20 seconds to be well under any limit
      if (i > 0) {
        const delayMs = 20000; // 20 seconds between requests
        console.log(`   ⏸️  Waiting ${delayMs / 1000}s before next request...`);
        await delay(delayMs);
      }

      try {
        // Get articles for this question
        const stances = await findArticleStancesByQuestionId(question.id);
        const articles = stances
          .slice(0, 10) // Limit to first 10 articles
          .map((s) => (s as any).article)
          .filter((a) => a && a.textContent);

        if (articles.length === 0) {
          console.log(`   ⚠️  No articles found for this question, skipping...\n`);
          continue;
        }

        console.log(`   📰 Found ${articles.length} articles`);

        // Get topic name
        const topic = (question as any).topic;
        const topicName = topic?.name || 'Unknown';

        // Generate context blurb
        // Note: withRetry in the provider already handles retries with exponential backoff
        console.log(`   🤖 Calling LLM to generate context blurb...`);
        const startTime = Date.now();
        
        const result = await llmProvider.generateQuestionContextBlurb({
          question: {
            text: question.questionText,
            topicName,
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

