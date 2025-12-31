/**
 * Discover Questions Script (Reactive)
 * Discovers questions for approved topics from recent articles and stores them as pending validation.
 *
 * Usage:
 *   npm run db:discover:questions
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
} from '../index.js';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import { discoverQuestionsForTopic } from '@acta/core/analysis';

async function main() {
  try {
    console.log('🔎 Discovering questions from articles (approved topics)...');
    await connectDatabase();

    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);

    const topics = await findAllTopics(false); // only approved
    if (topics.length === 0) {
      console.log('ℹ️  No approved topics found. Seed topics first.');
      return;
    }

    for (const topic of topics) {
      console.log(`\n🧭 Topic: ${topic.name}`);
      const articles = await findArticlesByTopic(topic.id, 200);
      console.log(`   📰 Articles: ${articles.length}`);

      if (articles.length === 0) {
        console.log('   ⚠️  Skipping (no articles)');
        continue;
      }

      const existingQuestions = await findQuestionsByTopicId(topic.id, true);
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

      if (discovered.length === 0) {
        console.log('   ℹ️  No new questions discovered.');
        continue;
      }

      console.log(`   ✅ Discovered ${discovered.length} question(s):`);
      for (const question of discovered) {
        console.log(`    - ${question.questionText} (conf: ${(question.confidence * 100).toFixed(1)}%)`);

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
      }
    }

    console.log('\n🎉 Question discovery complete (pending validation/moderation).');
  } catch (error) {
    console.error('❌ Error discovering questions:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();




