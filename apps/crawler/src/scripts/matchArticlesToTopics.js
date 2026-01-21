/**
 * Topic Matching Script
 * 
 * Maps articles to topics based on keyword matching.
 * 
 * Usage:
 *   npm run match:topics
 *   npm run match:topics -- --topic-id=<topic-id>
 *   npm run match:topics -- --limit=1000
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
  findArticlesByTopic,
  findAllArticles,
  countArticles,
  countArticlesByTopic,
} from '@acta/db';
import { processArticlesForTopics } from '@acta/core/analysis';

/**
 * Main execution function
 */
async function main() {
  const args = parseArgs();
  
  console.log('🚀 Starting Topic Matching...\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Load topics (only approved)
    const topics = await findAllTopics();
    console.log(`📋 Found ${topics.length} topics`);
    
    if (topics.length === 0) {
      console.log('⚠️  No topics found. Run seed script first:');
      console.log('   npm run db:seed:topics');
      return;
    }

    // Load and process articles in batches
    const batchSize = args.limit || 1000;
    let totalArticles = 0;
    let totalProcessed = 0;
    let totalMatched = 0;
    let totalAssignments = 0;
    const allMatchesByTopic = {};

    if (args.topicId) {
      totalArticles = await countArticlesByTopic(args.topicId);
      console.log(`📰 Processing articles for topic: ${args.topicId}`);
      console.log(`📊 Total articles: ${totalArticles}`);
      
      if (totalArticles === 0) {
        console.log('⚠️  No articles found to process');
        return;
      }

      let offset = args.offset || 0;
      let batchNumber = 1;
      const totalBatches = Math.ceil(totalArticles / batchSize);

      while (offset < totalArticles) {
        const batch = await findArticlesByTopic(args.topicId, batchSize, offset);
        if (batch.length === 0) break;

        const rangeEnd = Math.min(offset + batchSize, totalArticles);
        const percentage = ((offset + batch.length) / totalArticles * 100).toFixed(1);
        console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (articles ${offset + 1}-${rangeEnd} of ${totalArticles}, ${percentage}%)`);

        // Process this batch
        const topicMatchStats = await processArticlesForTopics(batch, topics, {
          minConfidence: 0.5,
        });

        totalMatched += topicMatchStats.matchedArticles;
        totalAssignments += topicMatchStats.totalAssignments;
        for (const [topicName, count] of Object.entries(topicMatchStats.matchesByTopic)) {
          allMatchesByTopic[topicName] = (allMatchesByTopic[topicName] || 0) + count;
        }

        totalProcessed += batch.length;
        offset += batchSize;
        batchNumber++;
      }
    } else {
      totalArticles = await countArticles();
      console.log(`📰 Processing all articles`);
      console.log(`📊 Total articles: ${totalArticles}`);
      
      if (totalArticles === 0) {
        console.log('⚠️  No articles found to process');
        return;
      }

      let offset = args.offset || 0;
      let batchNumber = 1;
      const totalBatches = Math.ceil(totalArticles / batchSize);

      while (offset < totalArticles) {
        const batch = await findAllArticles(batchSize, offset);
        if (batch.length === 0) break;

        const rangeEnd = Math.min(offset + batchSize, totalArticles);
        const percentage = ((offset + batch.length) / totalArticles * 100).toFixed(1);
        console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (articles ${offset + 1}-${rangeEnd} of ${totalArticles}, ${percentage}%)`);

        // Process this batch
        const topicMatchStats = await processArticlesForTopics(batch, topics, {
          minConfidence: 0.5,
        });

        totalMatched += topicMatchStats.matchedArticles;
        totalAssignments += topicMatchStats.totalAssignments;
        for (const [topicName, count] of Object.entries(topicMatchStats.matchesByTopic)) {
          allMatchesByTopic[topicName] = (allMatchesByTopic[topicName] || 0) + count;
        }

        totalProcessed += batch.length;
        offset += batchSize;
        batchNumber++;
      }
    }

    console.log(`\n📊 Topic Matching Summary:`);
    console.log(`   ✅ Processed ${totalProcessed} articles`);
    console.log(`   ✅ Matched ${totalMatched} articles to topics`);
    console.log(`   📊 Total assignments: ${totalAssignments}`);
    for (const [topicName, count] of Object.entries(allMatchesByTopic)) {
      console.log(`      - ${topicName}: ${count} articles`);
    }
    console.log('\n✅ Topic matching complete!');

  } catch (error) {
    console.error('❌ Error running topic matching:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = {
    topicId: null,
    limit: null,
    offset: null,
  };

  const allArgs = process.argv.slice(2);
  
  allArgs.forEach((arg) => {
    if (arg.startsWith('--topic-id=')) {
      args.topicId = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      args.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--offset=')) {
      args.offset = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--topic-id' || arg === '--limit') {
      const index = allArgs.indexOf(arg);
      if (index !== -1 && index + 1 < allArgs.length) {
        const value = allArgs[index + 1];
        if (arg === '--topic-id') {
          args.topicId = value;
        } else if (arg === '--limit') {
          args.limit = parseInt(value, 10);
        }
      }
    }
  });

  return args;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as matchArticlesToTopics };



