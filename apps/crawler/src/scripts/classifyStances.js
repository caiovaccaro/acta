/**
 * Stance Classification Script
 * 
 * Classifies article stances on questions for articles that have been matched to topics.
 * 
 * Usage:
 *   npm run classify:stances
 *   npm run classify:stances -- --topic-id=<topic-id>
 *   npm run classify:stances -- --question-id=<question-id>
 *   npm run classify:stances -- --limit=1000
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
  findActiveQuestions,
  findQuestionsByTopicId,
  prisma,
} from '@acta/db';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import {
  getCurrentMonthPeriod,
  calculateAndStoreVerdicts,
} from '@acta/core/analysis';

/**
 * Main execution function
 */
async function main() {
  const args = parseArgs();
  
  console.log('🚀 Starting Stance Classification...\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Initialize LLM provider
    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);

    // Load topics and questions (only approved/active)
    const topics = await findAllTopics();
    console.log(`📋 Found ${topics.length} topics`);
    
    if (topics.length === 0) {
      console.log('⚠️  No topics found. Run seed script first:');
      console.log('   npm run db:seed:topics');
      return;
    }

    const questions = await findActiveQuestions();
    console.log(`❓ Found ${questions.length} active questions\n`);

    if (questions.length === 0) {
      console.log('⚠️  No active questions found. Run seed script first:');
      console.log('   npm run db:seed:questions');
      return;
    }

    // Load articles that have been matched to topics
    const batchSize = args.limit || 1000;
    let totalArticles = 0;
    let allMatchedArticles = [];
    let allArticleTopicMap = new Map();
    let totalProcessed = 0;

    if (args.topicId) {
      totalArticles = await prisma.article.count({
        where: {
          topicArticles: {
            some: {
              topicId: args.topicId,
            },
          },
        },
      });
      console.log(`📰 Loading articles for topic: ${args.topicId}`);
      console.log(`📊 Total articles: ${totalArticles}`);
      
      if (totalArticles === 0) {
        console.log('⚠️  No articles found to process');
        return;
      }

      let offset = args.offset || 0;
      let batchNumber = 1;
      const totalBatches = Math.ceil(totalArticles / batchSize);

      while (offset < totalArticles) {
        const batch = await prisma.article.findMany({
          where: {
            topicArticles: {
              some: {
                topicId: args.topicId,
              },
            },
          },
          take: batchSize,
          skip: offset,
          orderBy: { extractedAt: 'desc' },
          include: {
            outlet: true,
            topicArticles: {
              include: {
                topic: true,
              },
            },
          },
        });
        if (batch.length === 0) break;

        const rangeEnd = Math.min(offset + batchSize, totalArticles);
        const percentage = ((offset + batch.length) / totalArticles * 100).toFixed(1);
        console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (articles ${offset + 1}-${rangeEnd} of ${totalArticles}, ${percentage}%)`);

        // All articles in this batch are already matched to topics
        for (const article of batch) {
          const topicIds = article.topicArticles.map(ta => ta.topicId);
          allArticleTopicMap.set(article.id, topicIds);
        }

        allMatchedArticles.push(...batch);
        totalProcessed += batch.length;
        offset += batchSize;
        batchNumber++;
      }
    } else if (args.questionId) {
      console.log(`📰 Loading articles for question: ${args.questionId}`);
      const articles = await prisma.article.findMany({
        where: {
          articleAnalysisAttempts: {
            some: {
              questionId: args.questionId,
            },
          },
          topicArticles: {
            some: {},
          },
        },
        take: args.limit || 1000,
        orderBy: { extractedAt: 'desc' },
        include: {
          outlet: true,
          topicArticles: {
            include: {
              topic: true,
            },
          },
        },
      });
      totalArticles = articles.length;
      totalProcessed = articles.length;
      
      if (articles.length === 0) {
        console.log('⚠️  No articles found to process');
        return;
      }

      for (const article of articles) {
        const topicIds = article.topicArticles.map(ta => ta.topicId);
        allArticleTopicMap.set(article.id, topicIds);
      }

      allMatchedArticles = articles;
    } else {
      totalArticles = await prisma.article.count({
        where: {
          topicArticles: {
            some: {},
          },
        },
      });
      console.log(`📰 Loading articles that have been matched to topics`);
      console.log(`📊 Total articles in database: ${totalArticles}`);
      
      if (totalArticles === 0) {
        console.log('⚠️  No articles found to process');
        return;
      }

      let offset = args.offset || 0;
      let batchNumber = 1;
      const totalBatches = Math.ceil(totalArticles / batchSize);

      while (offset < totalArticles) {
        const batch = await prisma.article.findMany({
          where: {
            topicArticles: {
              some: {},
            },
          },
          take: batchSize,
          skip: offset,
          orderBy: { extractedAt: 'desc' },
          include: {
            outlet: true,
            topicArticles: {
              include: {
                topic: true,
              },
            },
          },
        });
        if (batch.length === 0) break;

        const rangeEnd = Math.min(offset + batchSize, totalArticles);
        const percentage = ((offset + batch.length) / totalArticles * 100).toFixed(1);
        console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (articles ${offset + 1}-${rangeEnd} of ${totalArticles}, ${percentage}%)`);

        // All articles in this batch are already matched to topics
        for (const article of batch) {
          const topicIds = article.topicArticles.map(ta => ta.topicId);
          allArticleTopicMap.set(article.id, topicIds);
        }

        allMatchedArticles.push(...batch);
        totalProcessed += batch.length;
        offset += batchSize;
        batchNumber++;
      }
      
      // Update total count to reflect only matched articles
      totalArticles = await prisma.article.count({
        where: {
          topicArticles: {
            some: {},
          },
        },
      });
    }

    const matchedArticles = allMatchedArticles;
    const articleTopicMap = allArticleTopicMap;
    
    console.log(`\n🎯 Stance Classification`);
    console.log(`   📰 Processing ${matchedArticles.length} articles that matched topics (out of ${totalProcessed} total)`);
    
    const monthPeriod = getCurrentMonthPeriod();
    console.log(`   📅 Month period: ${monthPeriod.toISOString().slice(0, 7)}`);
    console.log('');
    
    let totalClassifications = 0;
    let totalClassificationsAttempted = 0;
    let articlesWithClassifications = 0;
    let articlesMatchedToQuestions = 0;
    let articlesRejectedByLLM = 0;
    let articlesSkippedNoQuestions = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process matched articles in batches
    const classificationBatchSize = 10;
    for (let i = 0; i < matchedArticles.length; i += classificationBatchSize) {
      const batch = matchedArticles.slice(i, i + classificationBatchSize);
      const batchNum = Math.floor(i / classificationBatchSize) + 1;
      const totalBatches = Math.ceil(matchedArticles.length / classificationBatchSize);
      console.log(`   Processing classification batch ${batchNum}/${totalBatches} (${batch.length} articles)...`);
      
      for (const article of batch) {
        try {
          // Get topics this article matched to
          const topicIds = articleTopicMap.get(article.id) || [];
          
          // Get all questions for these topics
          const relevantQuestions = [];
          for (const topicId of topicIds) {
            const topicQuestions = await findQuestionsByTopicId(topicId, false); // Only active questions
            relevantQuestions.push(...topicQuestions);
          }
          
          // Remove duplicates
          const uniqueQuestions = Array.from(
            new Map(relevantQuestions.map(q => [q.id, q])).values()
          );
          
          if (uniqueQuestions.length === 0) {
            articlesSkippedNoQuestions++;
            continue;
          }
          
          // Track that this article matched to these questions
          articlesMatchedToQuestions++;
          
          // Classify stance for all relevant questions
          const { classifyStances } = await import('@acta/core/analysis');
          const items = uniqueQuestions.map(question => ({ article, question }));
          const classifications = await classifyStances(
            items,
            llmProvider,
            monthPeriod,
            { skipExisting: true }
          );
          
          totalClassificationsAttempted += classifications.length;
          
          // Filter out classifications that were rejected (Unclear with low confidence)
          // "Not relevant" = LLM returned "Unclear" stance with confidence < 0.2 (20%)
          // This means the article doesn't address, discuss, or relate to the question meaningfully
          const RELEVANCE_THRESHOLD = 0.2;
          const storedClassifications = classifications.filter(c => 
            !(c.stance === 'Unclear' && c.confidence < RELEVANCE_THRESHOLD)
          );
          
          const rejectedClassifications = classifications.filter(c => 
            c.stance === 'Unclear' && c.confidence < RELEVANCE_THRESHOLD
          );
          
          if (rejectedClassifications.length > 0) {
            articlesRejectedByLLM++;
            // Show reasoning for rejected classifications
            rejectedClassifications.forEach((rejected) => {
              const questionText = uniqueQuestions.find(q => q.id === rejected.questionId)?.questionText || 'Unknown';
              console.log(`         ⚠️  Rejected: "${questionText.substring(0, 60)}..." - ${(rejected.confidence * 100).toFixed(0)}% confidence`);
              if (rejected.reasoning) {
                console.log(`            Reason: ${rejected.reasoning.substring(0, 100)}${rejected.reasoning.length > 100 ? '...' : ''}`);
              }
            });
          }
          
          totalClassifications += storedClassifications.length;
          successCount++;
          
          if (storedClassifications.length > 0) {
            articlesWithClassifications++;
            console.log(`      ✓ Article "${article.title.substring(0, 50)}..." - ${storedClassifications.length}/${classifications.length} classifications stored`);
          } else if (classifications.length > 0) {
            console.log(`      ⚠️  Article "${article.title.substring(0, 50)}..." - ${classifications.length} classifications rejected (not relevant)`);
          }
        } catch (error) {
          errorCount++;
          console.error(`      ✗ Error classifying article ${article.id}:`, error.message);
        }
      }
    }

    console.log(`\n   ✅ Classification complete:`);
    console.log(`      - Articles matched to questions: ${articlesMatchedToQuestions}`);
    console.log(`      - Articles with classifications: ${articlesWithClassifications}`);
    console.log(`      - Articles rejected by LLM (not relevant): ${articlesRejectedByLLM}`);
    console.log(`      - Articles skipped (no questions): ${articlesSkippedNoQuestions}`);
    console.log(`      - Total classifications attempted: ${totalClassificationsAttempted}`);
    console.log(`      - Total classifications stored: ${totalClassifications}`);
    console.log(`      - Errors: ${errorCount}`);
    console.log('');

    // Verdict Calculation
    console.log('⚖️  Step 3: Verdict Calculation...');
    console.log(`   📅 Month period: ${monthPeriod.toISOString().slice(0, 7)}`);
    
    // Get unique question IDs from the questions we processed
    const processedQuestionIds = Array.from(
      new Set(
        questions
          .filter(q => {
            // Check if any matched article's topics include this question's topic
            const questionTopicId = q.topicId;
            return matchedArticles.some(article => {
              const articleTopicIds = articleTopicMap.get(article.id) || [];
              return articleTopicIds.includes(questionTopicId);
            });
          })
          .map(q => q.id)
      )
    );

    if (processedQuestionIds.length === 0) {
      console.log('   ⚠️  No questions to calculate verdicts for');
    } else {
      console.log(`   📋 Calculating verdicts for ${processedQuestionIds.length} questions...`);
      
      try {
        const verdicts = await calculateAndStoreVerdicts(processedQuestionIds, monthPeriod);
        
        const verdictCounts = {
          YesItSeemsSo: 0,
          ProbablyYes: 0,
          Unclear: 0,
          ProbablyNot: 0,
          NoItDoesntSeemSo: 0,
        };
        
        verdicts.forEach((verdict) => {
          verdictCounts[verdict.verdictLabel]++;
        });
        
        console.log(`   ✅ Verdicts calculated: ${verdicts.length}`);
        console.log(`   📊 Breakdown:`);
        console.log(`      "Yes, it seems so": ${verdictCounts.YesItSeemsSo}`);
        console.log(`      "Probably yes": ${verdictCounts.ProbablyYes}`);
        console.log(`      "Unclear": ${verdictCounts.Unclear}`);
        console.log(`      "Probably not": ${verdictCounts.ProbablyNot}`);
        console.log(`      "No, it doesn't seem so": ${verdictCounts.NoItDoesntSeemSo}`);
      } catch (error) {
        console.error(`   ❌ Error calculating verdicts:`, error.message);
      }
    }
    console.log('');

    // Summary
    console.log('📊 Pipeline Summary:');
    console.log(`   Topics: ${topics.length}`);
    console.log(`   Active Questions: ${questions.length}`);
    console.log(`   Articles Processed: ${totalProcessed}`);
    console.log(`   Articles Matched to Questions: ${articlesMatchedToQuestions}`);
    console.log(`   Stance Classifications Stored: ${totalClassifications}`);
    console.log(`   Stance Classifications Attempted: ${totalClassificationsAttempted}`);
    console.log(`   Month Period: ${monthPeriod.toISOString().slice(0, 7)}`);
    console.log('\n✅ Stance classification complete!');

  } catch (error) {
    console.error('❌ Error running stance classification:', error);
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
    questionId: null,
    limit: null,
    offset: null,
  };

  const allArgs = process.argv.slice(2);
  
  allArgs.forEach((arg) => {
    if (arg.startsWith('--topic-id=')) {
      args.topicId = arg.split('=')[1];
    } else if (arg.startsWith('--question-id=')) {
      args.questionId = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      args.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--offset=')) {
      args.offset = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--topic-id' || arg === '--question-id' || arg === '--limit') {
      const index = allArgs.indexOf(arg);
      if (index !== -1 && index + 1 < allArgs.length) {
        const value = allArgs[index + 1];
        if (arg === '--topic-id') {
          args.topicId = value;
        } else if (arg === '--question-id') {
          args.questionId = value;
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

export { main as classifyStances };

