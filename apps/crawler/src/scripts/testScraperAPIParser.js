/**
 * Test script for ScraperAPI AI Parser
 * Usage: npm run scraperai -- <url>
 * Example: npm run scraperai -- https://www.wsj.com/articles/example
 */

import { ScraperAPIParserClient } from '../clients/scraperAPIParserClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.SCRAPERAPI_API_KEY || '57076da3e417ac59577955cd54f22d86';

async function testScraperAPIParser(url) {
  if (!url) {
    console.error('❌ Error: URL parameter is required');
    console.log('Usage: npm run scraperai -- <url>');
    console.log('Example: npm run scraperai -- https://www.wsj.com/articles/example');
    process.exit(1);
  }

  console.log('🔧 ScraperAPI AI Parser Test');
  console.log('='.repeat(50));
  console.log(`📄 URL: ${url}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...`);
  console.log('');

  const client = new ScraperAPIParserClient(API_KEY);

  try {
    // Step 1: List existing parsers
    console.log('📋 Step 1: Listing existing parsers...');
    const parsers = await client.listParsers();
    console.log(`Found ${parsers.length} existing parser(s)`);
    if (parsers.length > 0) {
      console.log('Existing parsers:');
      parsers.forEach((p) => {
        console.log(`  - ${p.name} (ID: ${p.id}, Version: ${p.version}, Status: ${p.status})`);
      });
    }
    console.log('');

    // Step 2: Try to use existing parser or create new one
    let parserId;
    let parserVersion;

    // Try to find a finished parser first
    const finishedParser = parsers.find(p => p.status === 'FINISHED');
    
    if (finishedParser) {
      // Use the first finished parser
      parserId = finishedParser.id;
      parserVersion = finishedParser.version;
      console.log(`✅ Step 2: Using existing parser: ${finishedParser.name} (${parserId})`);
    } else {
      // Only create a new parser if no finished parsers exist
      // Don't try to use FAILED parsers as they're invalid
      console.log('📝 Step 2: Creating new parser...');
      if (parsers.length > 0) {
        console.log(`   Note: Found ${parsers.length} existing parser(s), but all are in FAILED status.`);
        console.log('   Creating a new parser...');
      }
      try {
          const parserName = `Article Parser ${new Date().toISOString().split('T')[0]}`;
          const createResult = await client.createParser(parserName, [url], {
            scraper_params: {
              render: true, // Enable JavaScript rendering
              country_code: 'US',
              premium: true, // Use residential proxies for paywalled sites
              ultra_premium: true, // Use advanced unblocking mechanisms
              follow_redirect: true,
              retry_404: true,
            },
            fields: [
              {
                name: 'title',
                description: 'Article title',
                type: 'string',
              },
              {
                name: 'textContent',
                description: 'Full article text content',
                type: 'string',
              },
              {
                name: 'publishedDate',
                description: 'Article publication date',
                type: 'string',
              },
              {
                name: 'author',
                description: 'Article author(s)',
                type: 'string',
              },
            ],
          });

          parserId = createResult.id;
          parserVersion = createResult.version;
          console.log(`✅ Parser created: ID=${parserId}, Version=${parserVersion}`);
          console.log('⏳ Waiting for parser to be generated (this may take a moment)...');
          
          // Poll for parser status
          let attempts = 0;
          const maxAttempts = 30;
          while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
            const details = await client.getParserDetails(parserId, parserVersion);
            
            if (details.error) {
              console.warn(`⚠️  Parser generation error: ${details.error}`);
              console.warn('   Will try to parse anyway with this parser...');
              break; // Don't throw, try to use the parser anyway
            }
            
            // Check if parser has example_results (indicates it's finished)
            if (details.example_results && details.example_results.length > 0) {
              console.log('✅ Parser generation completed!');
              break;
            }
            
            attempts++;
            if (attempts % 5 === 0) {
              console.log(`   Still processing... (${attempts * 2}s elapsed)`);
            }
          }
          
          if (attempts >= maxAttempts) {
            console.warn('⚠️  Parser generation is taking longer than expected. Trying to parse anyway...');
          }
        } catch (createError) {
          console.error(`❌ Failed to create parser: ${createError.message}`);
          console.error('   This might be due to the URL being blocked or inaccessible.');
          console.error('   You can try:');
          console.error('   1. Using a different URL');
          console.error('   2. Checking if the URL is accessible');
          console.error('   3. Using an existing parser if available');
          throw createError;
        }
    }
    console.log('');

    // Step 3: Parse the URL
    console.log('🔍 Step 3: Parsing URL...');
    console.log(`   Using parser: ${parserId}, version: ${parserVersion}`);
    
    try {
      const parseResult = await client.parseUrl(parserId, url, {
        version: parserVersion,
        scraper_params: {
          render: true,
          country_code: 'US',
          premium: true,
          ultra_premium: true, // Use advanced unblocking mechanisms
          follow_redirect: true,
          retry_404: true,
        },
      });

      console.log('✅ Parsing completed!');
      console.log('');
      console.log('📊 Results:');
      console.log('='.repeat(50));
      console.log(JSON.stringify(parseResult, null, 2));
      console.log('');

      // Step 4: Show parser details
      console.log('📋 Step 4: Parser details:');
      const details = await client.getParserDetails(parserId, parserVersion);
      console.log(`Parser: ${details.name}`);
      console.log(`Status: ${details.status || 'N/A'}`);
      console.log(`Fields: ${details.fields?.length || 0} fields detected`);
      if (details.fields && details.fields.length > 0) {
        console.log('Detected fields:');
        details.fields.forEach((field) => {
          console.log(`  - ${field.name} (${field.type || 'unknown'})`);
        });
      }

      console.log('');
      console.log('✅ Test completed successfully!');
    } catch (parseError) {
      console.error(`❌ Failed to parse URL: ${parseError.message}`);
      console.error('');
      console.error('Possible reasons:');
      console.error('  1. The URL might be blocked or inaccessible');
      console.error('  2. The parser might not be compatible with this URL');
      console.error('  3. The site might require additional authentication');
      console.error('');
      console.error('Suggestions:');
      console.error('  1. Try creating a new parser with a simpler/accessible URL first');
      console.error('  2. Check if the URL is accessible in a browser');
      console.error('  3. Try a different URL from the same domain');
      throw parseError;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Get URL from command line arguments
const url = process.argv[2];

// Run the test
testScraperAPIParser(url);

