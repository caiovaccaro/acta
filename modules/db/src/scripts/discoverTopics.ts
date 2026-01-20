/**
 * Discover Topics Script (Reactive)
 * Discovers topics from recent articles and stores them as pending moderation.
 * Processes all articles in batches.
 *
 * Usage:
 *   npm run db:discover:topics
 *   npm run db:discover:topics -- --batch-size=200
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
  countArticles,
} from '../index';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import { discoverTopics } from '@acta/core/analysis';

// Parse command line arguments
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '200');
const OFFSET_ARG = process.argv.find(arg => arg.startsWith('--offset='))?.split('=')[1];
const START_BATCH_ARG = process.argv.find(arg => arg.startsWith('--start-batch='))?.split('=')[1];
const START_OFFSET = OFFSET_ARG ? parseInt(OFFSET_ARG, 10) : null;
const START_BATCH = START_BATCH_ARG ? parseInt(START_BATCH_ARG, 10) : null;

async function main() {
  try {
    console.log('🔎 Discovering topics from articles...');
    console.log(`📦 Batch size: ${BATCH_SIZE} articles per batch\n`);
    await connectDatabase();

    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);

    // Get total article count
    const totalArticles = await countArticles();
    console.log(`📊 Total articles in database: ${totalArticles}`);
    
    if (totalArticles === 0) {
      console.log('ℹ️  No articles found. Run crawler first.');
      return;
    }

    const existingTopics = await findAllTopics(true);
    const existingById = new Map(existingTopics.map((t) => [t.id, t]));
    let offset = 0;
    let batchNumber = 0;

    if (START_BATCH && START_BATCH > 0) {
      offset = (START_BATCH - 1) * BATCH_SIZE;
      batchNumber = START_BATCH - 1;
      console.log(`↪️  Resuming from batch ${START_BATCH} (offset ${offset})`);
    } else if (START_OFFSET && START_OFFSET >= 0) {
      offset = START_OFFSET;
      batchNumber = Math.floor(offset / BATCH_SIZE);
      console.log(`↪️  Resuming from offset ${offset} (batch ${batchNumber + 1})`);
    }
    let totalDiscovered = 0;
    const allDiscoveredTopics = new Map<string, any>(); // Use Map to deduplicate by name

    // Process articles in batches
    while (offset < totalArticles) {
      batchNumber++;
      const remaining = totalArticles - offset;
      const currentBatchSize = Math.min(BATCH_SIZE, remaining);
      
      console.log(`\n📦 Batch ${batchNumber} (${offset + 1}-${offset + currentBatchSize} of ${totalArticles})`);
      
      const articles = await findAllArticles(currentBatchSize, offset);
      console.log(`   📰 Loaded ${articles.length} articles`);

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

      // Merge discovered topics (deduplicate by name, keep highest confidence)
      for (const topic of discovered) {
        if (topic.matchedTopicId) {
          const matched = existingById.get(topic.matchedTopicId);
          console.log(
            `   🔗 Matched "${topic.name}" -> "${matched?.name || topic.matchedTopicId}" (${topic.matchReason}, ${((topic.matchConfidence ?? 0) * 100).toFixed(1)}%)`
          );
          continue;
        }
        const existing = allDiscoveredTopics.get(topic.name);
        if (!existing || topic.confidence > existing.confidence) {
          allDiscoveredTopics.set(topic.name, topic);
        }
      }

      const newCount = discovered.filter((t) => !t.matchedTopicId).length;
      if (newCount > 0) {
        console.log(`   ✅ Discovered ${newCount} new topic(s) in this batch`);
      } else {
        console.log(`   ℹ️  No new topics discovered in this batch`);
      }

      offset += currentBatchSize;
      console.log(`   📈 Progress: ${((offset / totalArticles) * 100).toFixed(1)}% (${offset}/${totalArticles})`);
    }

    // Create all discovered topics
    if (allDiscoveredTopics.size === 0) {
      console.log('\nℹ️  No new topics discovered from all articles.');
      return;
    }

    console.log(`\n📝 Creating ${allDiscoveredTopics.size} unique topic(s)...`);
    for (const [name, topic] of allDiscoveredTopics.entries()) {
      console.log(` - ${name} (confidence: ${(topic.confidence * 100).toFixed(1)}%)`);

      await createTopic({
        name: topic.name,
        description: topic.description || null,
        safetyNoteRequired: false,
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredAt: new Date(),
        discoveredFromArticles: topic.articleIds || [],
      });
      totalDiscovered++;
    }

    console.log(`\n🎉 Topic discovery complete!`);
    console.log(`   ✅ Processed ${totalArticles} articles in ${batchNumber} batch(es)`);
    console.log(`   ✅ Discovered ${totalDiscovered} new topic(s) (pending moderation)`);
  } catch (error) {
    console.error('❌ Error discovering topics:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();
