/**
 * Test script for Playwright extraction
 * Tests article extraction with a real browser (non-headless)
 * Usage: npm run test:playwright -- <url> <outlet>
 * Example: npm run test:playwright -- "https://www.wsj.com/articles/example" "Wall Street Journal"
 */

import { PlaywrightExtractor } from '../extractors/playwrightExtractor.js';
import IngestionLogger from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const url = process.argv[2];
const outlet = process.argv[3] || 'Wall Street Journal';

if (!url) {
  console.error('❌ Error: URL parameter is required');
  console.log('Usage: npm run test:playwright -- <url> [outlet]');
  console.log('Example: npm run test:playwright -- "https://www.wsj.com/articles/example" "Wall Street Journal"');
  process.exit(1);
}

async function testPlaywrightExtraction() {
  console.log('🔧 Playwright Extraction Test');
  console.log('='.repeat(50));
  console.log(`📄 URL: ${url}`);
  console.log(`📰 Outlet: ${outlet}`);
  console.log('');

  const logger = new IngestionLogger();

  // Get credentials from environment
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

  const extractor = new PlaywrightExtractor({
    logger,
    credentials,
    userDataDir: process.env.PLAYWRIGHT_USER_DATA_DIR || null,
  });

  try {
    console.log('🚀 Starting extraction...');
    console.log('   Browser window will open (non-headless mode)');
    console.log('   You can watch the process in real-time');
    console.log('');

    const result = await extractor.extractArticle(url, {
      outlet: outlet,
    });

    console.log('');
    console.log('✅ Extraction completed!');
    console.log('='.repeat(50));
    console.log('📊 Results:');
    console.log('');
    console.log(`Title: ${result.title || 'N/A'}`);
    console.log(`Author: ${result.author || 'N/A'}`);
    console.log(`Published Date: ${result.publishedDate || 'N/A'}`);
    console.log(`Content Length: ${result.textContent?.length || 0} characters`);
    console.log('');
    console.log('Content Preview (first 500 chars):');
    console.log(result.textContent?.substring(0, 500) || 'No content extracted');
    console.log('');

    if (result.textContent && result.textContent.length > 0) {
      console.log('✅ Successfully extracted article content!');
    } else {
      console.warn('⚠️  Warning: No content was extracted. This might indicate:');
      console.warn('   1. Login failed (check credentials)');
      console.warn('   2. Paywall blocking content');
      console.warn('   3. Selectors need adjustment');
    }

    logger.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    logger.error('Extraction failed', { error: error.message, stack: error.stack });
    logger.close();
    process.exit(1);
  }
}

testPlaywrightExtraction();

