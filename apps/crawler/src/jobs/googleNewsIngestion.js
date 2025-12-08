/**
 * Google News + Playwright Ingestion Job
 * 
 * Discovers articles using Google News API and extracts content using Playwright
 * Supports both free sites (RSS) and paid sites (Google News + Playwright)
 */

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { GoogleNewsClient } from '../clients/googleNewsClient.js';
import { PlaywrightExtractor } from '../extractors/playwrightExtractor.js';
import IngestionLogger from '../utils/logger.js';
import { findOrCreateOutlet, Ideology } from '@acta/db';
import { createOrUpdateArticle } from '@acta/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Main ingestion function
 */
export async function runGoogleNewsIngestion(options = {}) {
  const startTime = Date.now();
  const logger = new IngestionLogger();

  try {
    logger.info('🚀 Starting Google News + Playwright Ingestion', {
      topics: options.topics || ['gaza'],
    });

    console.log('🚀 Starting Google News + Playwright Ingestion');
    console.log(`📋 Topics to process: ${(options.topics || ['gaza']).join(', ')}`);

    // Connect to database
    const { PrismaClient } = await import('@acta/db');
    const prisma = new PrismaClient();
    console.log('✅ Database connected successfully');

    // Get topics
    const topics = options.topics || ['gaza'];

    // Define paid outlets (use Playwright) vs free outlets (use RSS)
    const paidOutlets = [
      { name: 'Wall Street Journal', domain: 'wsj.com', ideology: Ideology.Center },
      { name: 'Financial Times', domain: 'ft.com', ideology: Ideology.Center },
      { name: 'The Economist', domain: 'economist.com', ideology: Ideology.Center },
    ];

    // Ensure outlets exist in database
    console.log('📰 Ensuring target outlets exist in database...');
    const outletMap = {};
    for (const outletConfig of paidOutlets) {
      const outlet = await findOrCreateOutlet(
        outletConfig.name,
        outletConfig.ideology,
        0.5,
        []
      );
      outletMap[outletConfig.domain] = outlet;
      console.log(`✅ ${outletConfig.name} (${outletConfig.domain})`);
    }

    // Initialize Google News client
    const googleNewsClient = new GoogleNewsClient({
      logger,
      useCustomSearch: !!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
      customSearchApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
      customSearchEngineId: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
    });

    // Initialize Playwright extractor
    const credentials = {
      'Wall Street Journal': {
        email: process.env.WSJ_EMAIL,
        password: process.env.WSJ_PASSWORD,
      },
      'Financial Times': {
        email: process.env.FT_EMAIL,
        password: process.env.FT_PASSWORD,
      },
      'The Economist': {
        email: process.env.ECONOMIST_EMAIL,
        password: process.env.ECONOMIST_PASSWORD,
      },
    };

    const playwrightExtractor = new PlaywrightExtractor({
      logger,
      credentials,
      userDataDir: process.env.PLAYWRIGHT_USER_DATA_DIR || null,
    });

    // Calculate date range
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const dateRange = {
      from: firstDayOfYear,
      to: today,
    };

    logger.info('Date range for article discovery', {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      days: Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)),
    });

    // Process topics
    const allArticles = [];
    const topicStats = {};

    for (const topic of topics) {
      console.log(`\n📚 Processing topic: ${topic}`);
      logger.info('Processing topic', { topic });

      try {
        const articles = await processTopic(
          topic,
          googleNewsClient,
          playwrightExtractor,
          paidOutlets,
          outletMap,
          dateRange,
          logger
        );

        allArticles.push(...articles);
        topicStats[topic] = {
          fetched: articles.length,
          errors: 0,
        };

        console.log(`✅ Found ${articles.length} articles for topic: ${topic}`);
      } catch (error) {
        console.error(`❌ Error processing topic ${topic}:`, error.message);
        logger.error('Topic processing error', { topic, error: error.message });
        topicStats[topic] = {
          fetched: 0,
          errors: 1,
        };
      }
    }

    // Deduplicate articles by URL
    const uniqueArticles = [];
    const seenUrls = new Set();

    for (const article of allArticles) {
      const normalizedUrl = article.url.toLowerCase().replace(/\/$/, '');
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueArticles.push(article);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total discovered: ${allArticles.length}`);
    console.log(`   Unique articles: ${uniqueArticles.length}`);
    console.log(`   Duplicates: ${allArticles.length - uniqueArticles.length}`);

    // Persist articles to database
    console.log(`\n💾 Persisting articles to database...`);
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const article of uniqueArticles) {
      try {
        const outlet = outletMap[article.sourceDomain];
        if (!outlet) {
          console.warn(`⚠️  No outlet found for domain: ${article.sourceDomain}`);
          continue;
        }

        await createOrUpdateArticle({
          url: article.url,
          title: article.title,
          textContent: article.textContent,
          excerpt: article.textContent?.substring(0, 500) || '',
          publishedDate: article.publishedDate,
          outletId: outlet.id,
          author: article.author || null,
        });

        created++;
      } catch (error) {
        errors++;
        logger.error('Error persisting article', {
          url: article.url,
          error: error.message,
        });
      }
    }

    console.log(`✅ Persisted: ${created} created, ${updated} updated, ${errors} errors`);

    const duration = Date.now() - startTime;
    console.log(`\n✅ Ingestion completed in ${(duration / 1000).toFixed(2)}s`);

    return {
      duration,
      topics: topicStats,
      totalFetched: allArticles.length,
      uniqueArticles: uniqueArticles.length,
      duplicates: allArticles.length - uniqueArticles.length,
      persisted: { created, updated, errors },
    };
  } catch (error) {
    console.error('❌ Fatal error:', error);
    logger.error('Fatal ingestion error', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Processes a single topic
 */
async function processTopic(
  topic,
  googleNewsClient,
  playwrightExtractor,
  paidOutlets,
  outletMap,
  dateRange,
  logger
) {
  const articles = [];
  const domains = paidOutlets.map(o => o.domain);

  // Discover articles using Google News
  logger.info('Discovering articles via Google News', { topic, domains });
  const discoveredArticles = await googleNewsClient.discoverArticles(topic, domains, dateRange);

  console.log(`   Found ${discoveredArticles.length} article URLs`);

  // Extract content for each article using Playwright
  for (const discovered of discoveredArticles) {
    try {
      const outlet = paidOutlets.find(o => o.domain === discovered.sourceDomain);
      if (!outlet) continue;

      console.log(`   Extracting: ${discovered.title?.substring(0, 60)}...`);

      const extracted = await playwrightExtractor.extractArticle(discovered.url, {
        outlet: outlet.name,
      });

      articles.push({
        url: extracted.url,
        title: extracted.title || discovered.title,
        textContent: extracted.textContent,
        author: extracted.author,
        publishedDate: extracted.publishedDate || discovered.publishedDate,
        sourceDomain: extracted.sourceDomain || discovered.sourceDomain,
      });

      // Add delay between extractions to appear more human
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    } catch (error) {
      logger.error('Error extracting article', {
        url: discovered.url,
        error: error.message,
      });
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  return articles;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runGoogleNewsIngestion()
    .then((stats) => {
      console.log('\n📊 Final Statistics:', JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

