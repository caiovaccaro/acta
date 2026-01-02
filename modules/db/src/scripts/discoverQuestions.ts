/**
 * Discover Questions Script (Reactive)
 * Discovers questions for approved topics from articles and stores them as pending validation.
 * Processes all articles for each topic in batches.
 *
 * Usage:
 *   npm run db:discover:questions
 *   npm run db:discover:questions -- --batch-size=200
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
  findAllTopics,
  findQuestionsByTopicId,
  createQuestion,
  findArticlesByTopic,
  prisma,
} from '../index.js';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import { discoverQuestionsForTopic } from '@acta/core/analysis';

// Parse command line arguments
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '200');

async function main() {
  try {
    console.log('🔎 Discovering questions from articles (approved topics)...');
    console.log(`📦 Batch size: ${BATCH_SIZE} articles per batch\n`);
    await connectDatabase();

    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);

    const topics = await findAllTopics(false); // only approved
    if (topics.length === 0) {
      console.log('ℹ️  No approved topics found. Seed topics first.');
      return;
    }

    let totalQuestionsDiscovered = 0;
    let totalArticlesProcessed = 0;

    for (const topic of topics) {
      console.log(`\n🧭 Topic: ${topic.name}`);
      
      // Get total article count for this topic
      const totalArticlesForTopic = await prisma.article.count({
        where: {
          topicArticles: {
            some: {
              topicId: topic.id,
            },
          },
        },
      });

      if (totalArticlesForTopic === 0) {
        console.log(`   ⚠️  Skipping (no articles)`);
        continue;
      }

      console.log(`   📊 Total articles for this topic: ${totalArticlesForTopic}`);

      const existingQuestions = await findQuestionsByTopicId(topic.id, true);
      let offset = 0;
      let batchNumber = 0;
      const allDiscoveredQuestions = new Map<string, any>(); // Deduplicate by question text

      // Process articles in batches
      while (offset < totalArticlesForTopic) {
        batchNumber++;
        const remaining = totalArticlesForTopic - offset;
        const currentBatchSize = Math.min(BATCH_SIZE, remaining);
        
        console.log(`   📦 Batch ${batchNumber} (${offset + 1}-${offset + currentBatchSize} of ${totalArticlesForTopic})`);
        
        const articles = await findArticlesByTopic(topic.id, currentBatchSize, offset);
        console.log(`      📰 Loaded ${articles.length} articles`);

        const articlePayload = articles.map((a) => ({
          id: a.id,
          title: a.title,
          textContent: a.textContent,
          excerpt: a.excerpt,
        }));

        const discovered = await discoverQuestionsForTopic(
          topic,
          articlePayload,
          existingQuestions,
          llmProvider,
          {
            maxQuestionsPerTopic: 10,
            confidenceThreshold: 0.7,
          }
        );

        // Merge discovered questions (deduplicate by question text, keep highest confidence)
        for (const question of discovered) {
          const existing = allDiscoveredQuestions.get(question.questionText);
          if (!existing || question.confidence > existing.confidence) {
            allDiscoveredQuestions.set(question.questionText, question);
          }
        }

        if (discovered.length > 0) {
          console.log(`      ✅ Discovered ${discovered.length} new question(s) in this batch`);
        } else {
          console.log(`      ℹ️  No new questions discovered in this batch`);
        }

        offset += currentBatchSize;
        totalArticlesProcessed += articles.length;
        console.log(`      📈 Progress: ${((offset / totalArticlesForTopic) * 100).toFixed(1)}% (${offset}/${totalArticlesForTopic})`);
      }

      // Create all discovered questions for this topic
      if (allDiscoveredQuestions.size === 0) {
        console.log(`   ℹ️  No new questions discovered for this topic.`);
        continue;
      }

      console.log(`   📝 Creating ${allDiscoveredQuestions.size} unique question(s)...`);
      for (const [questionText, question] of allDiscoveredQuestions.entries()) {
        console.log(`    - ${questionText} (conf: ${(question.confidence * 100).toFixed(1)}%)`);

        await createQuestion({
          topicId: topic.id,
          questionText: question.questionText,
          confidence: question.confidence,
          sourceArticlesCount: question.articleIds?.length ?? 0,
          validationStatus: 'pending',
          isActive: false,
          source: 'auto_discovered',
          discoveredAt: new Date(),
          discoveredFromArticles: question.articleIds || [],
        });
        totalQuestionsDiscovered++;
      }

      console.log(`   ✅ Completed topic: ${totalArticlesForTopic} articles processed, ${allDiscoveredQuestions.size} questions discovered`);
    }

    console.log(`\n🎉 Question discovery complete!`);
    console.log(`   ✅ Processed ${totalArticlesProcessed} articles across ${topics.length} topic(s)`);
    console.log(`   ✅ Discovered ${totalQuestionsDiscovered} new question(s) (pending validation/moderation)`);
  } catch (error) {
    console.error('❌ Error discovering questions:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();
