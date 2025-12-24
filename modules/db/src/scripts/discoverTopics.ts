/**
 * Discover Topics Script (Reactive)
 * Discovers topics from recent articles and stores them as pending moderation.
 *
 * Usage:
 *   npm run db:discover:topics
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
  createTopic,
  findAllArticles,
} from '../index.js';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import { discoverTopics } from '@acta/core/analysis';

async function main() {
  try {
    console.log('🔎 Discovering topics from recent articles...');
    await connectDatabase();

    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);

    const articles = await findAllArticles(200);
    console.log(`📰 Loaded ${articles.length} articles for discovery`);

    const existingTopics = await findAllTopics(true);
    const articlePayload = articles.map((a) => ({
      id: a.id,
      title: a.title,
      textContent: a.textContent,
      excerpt: a.excerpt,
    }));

    const discovered = await discoverTopics(articlePayload, existingTopics, llmProvider, {
      maxTopics: 10,
      confidenceThreshold: 0.6,
    });

    if (discovered.length === 0) {
      console.log('ℹ️  No new topics discovered.');
      return;
    }

    console.log(`✅ Discovered ${discovered.length} new topic(s):`);
    for (const topic of discovered) {
      console.log(` - ${topic.name} (confidence: ${(topic.confidence * 100).toFixed(1)}%)`);

      await createTopic({
        name: topic.name,
        description: topic.description || null,
        safetyNoteRequired: false,
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredAt: new Date(),
        discoveredFromArticles: topic.articleIds || [],
      });
    }

    console.log('\n🎉 Topic discovery complete (pending moderation).');
  } catch (error) {
    console.error('❌ Error discovering topics:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();


