/**
 * Article Analysis Pipeline - Manual Execution Script
 * 
 * This script allows manual execution of the article analysis pipeline:
 * 1. Topic matching (assign articles to topics)
 * 2. Question matching (match articles to questions)
 * 3. Stance classification (classify article stances on questions)
 * 4. Verdict calculation (calculate consensus verdicts)
 * 
 * Usage:
 *   npm run analyze:articles
 *   npm run analyze:articles -- --topic-id=<topic-id>
 *   npm run analyze:articles -- --question-id=<question-id>
 *   npm run analyze:articles -- --limit=50
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
  findArticlesByTopic,
  findArticlesByQuestion,
  findAllArticles,
  findQuestionsByTopicId,
} from '@acta/db';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import { createDefaultValidationFramework } from '@acta/core/validation';
import {
  processArticlesForTopics,
  classifyArticleStances,
  getCurrentMonthPeriod,
  calculateAndStoreVerdicts,
} from '@acta/core/analysis';

/**
 * Main execution function
 */
async function main() {
  const args = parseArgs();
  
  console.log('🚀 Starting Article Analysis Pipeline...\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Initialize LLM provider
    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);

    // Initialize validation framework with LLM provider
    const validationFramework = createDefaultValidationFramework(llmProvider);
    console.log(`✅ Validation framework initialized (using LLM)\n`);

    // Phase 2: Core Analysis Pipeline
    console.log('📊 Phase 2: Core Analysis Pipeline\n');

    // Step 1: Load topics and questions (only approved)
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

    // Step 2: Load articles (filtered by args if provided)
    let articles = [];
    const offset = args.offset || 0;
    if (args.topicId) {
      console.log(`📰 Loading articles for topic: ${args.topicId}`);
      articles = await findArticlesByTopic(args.topicId, args.limit || 1000, offset);
    } else if (args.questionId) {
      console.log(`📰 Loading articles for question: ${args.questionId}`);
      articles = await findArticlesByQuestion(args.questionId, args.limit || 1000);
    } else {
      const limit = args.limit || 1000;
      console.log(`📰 Loading all articles${limit ? ` (limit: ${limit})` : ''}${offset ? ` (offset: ${offset})` : ''}`);
      articles = await findAllArticles(limit, offset);
    }
    
    console.log(`📰 Found ${articles.length} articles to process\n`);

    if (articles.length === 0) {
      console.log('⚠️  No articles found to process');
      return;
    }

    // Step 3: Topic Matching
    console.log('🔍 Step 1: Topic Matching...');
    const topicMatchStats = await processArticlesForTopics(articles, topics, {
      minConfidence: 0.5, // Increased threshold for better precision
    });
    console.log(`   ✅ Matched ${topicMatchStats.matchedArticles} articles to topics`);
    console.log(`   📊 Total assignments: ${topicMatchStats.totalAssignments}`);
    for (const [topicName, count] of Object.entries(topicMatchStats.matchesByTopic)) {
      console.log(`      - ${topicName}: ${count} articles`);
    }
    console.log('');

    // Step 4: Stance Classification using matched articles from current run
    console.log('🎯 Step 2: Stance Classification...');
    const monthPeriod = getCurrentMonthPeriod();
    console.log(`   📅 Month period: ${monthPeriod.toISOString().slice(0, 7)}`);
    
    // Use the matched articles from the current run (not querying database)
    const matchedArticles = topicMatchStats.matchedArticlesList;
    const articleTopicMap = topicMatchStats.articleTopicMap;
    
    console.log(`   📰 Processing ${matchedArticles.length} articles that matched topics (out of ${articles.length} total)`);
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
    const batchSize = 10;
    for (let i = 0; i < matchedArticles.length; i += batchSize) {
      const batch = matchedArticles.slice(i, i + batchSize);
      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matchedArticles.length / batchSize)} (${batch.length} articles)...`);
      
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
          
          // Classify stance for all relevant questions (skip keyword matching since article already matched topic)
          // ArticleStance records will be created automatically for successful classifications
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
          const storedClassifications = classifications.filter(c => 
            !(c.stance === 'Unclear' && c.confidence < 0.3)
          );
          
          const rejectedClassifications = classifications.length - storedClassifications.length;
          if (rejectedClassifications > 0) {
            articlesRejectedByLLM++;
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

    // Step 5: Verdict Calculation (Phase 3)
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

    // Step 6: Summary
    console.log('📊 Pipeline Summary:');
    console.log(`   Topics: ${topics.length}`);
    console.log(`   Active Questions: ${questions.length}`);
    console.log(`   Articles Processed: ${articles.length}`);
    console.log(`   Topic Matches: ${topicMatchStats.matchedArticles}`);
    console.log(`   Articles Matched to Questions: ${articlesMatchedToQuestions}`);
    console.log(`   Stance Classifications Stored: ${totalClassifications}`);
    console.log(`   Stance Classifications Attempted: ${totalClassificationsAttempted}`);
    console.log(`   Month Period: ${monthPeriod.toISOString().slice(0, 7)}`);
    console.log('\n✅ Phase 2 & 3 pipeline complete!');

  } catch (error) {
    console.error('❌ Error running analysis pipeline:', error);
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

  // Parse all arguments, including those passed through npm
  // npm passes arguments after '--', so we need to check all of process.argv
  const allArgs = process.argv.slice(2);
  
  // Debug: log all arguments to see what we're receiving
  if (process.env.DEBUG) {
    console.log('Debug: process.argv:', process.argv);
    console.log('Debug: allArgs:', allArgs);
  }
  
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
      // Handle space-separated arguments (not used but for completeness)
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

export { main as runAnalysisPipeline };

