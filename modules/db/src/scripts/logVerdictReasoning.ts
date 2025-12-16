/**
 * Log Verdict Reasoning Script
 * Pulls and displays comprehensive verdict reasoning results in a readable format.
 *
 * Usage:
 *   npm run db:log:verdict-reasoning
 *   npm run db:log:verdict-reasoning -- --questionId=<id>
 *   npm run db:log:verdict-reasoning -- --topicId=<id>
 *   npm run db:log:verdict-reasoning -- --include-articles
 *   npm run db:log:verdict-reasoning -- --include-articles --questionId=<id>
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
  prisma,
  findAllVerdicts,
  findVerdictByQuestionId,
  findArticleStancesByQuestionId,
  findArticleStancesByQuestionAndMonth,
  findQuestionsByTopicId,
} from '@acta/db';
import { getMonthPeriod } from '@acta/core/analysis';

type VerdictWithQuestion = Awaited<ReturnType<typeof findAllVerdicts>>[0];

interface VerdictOverviewRow {
  question_id: string;
  question_text: string;
  topic_id: string;
  verdict_id: string;
  verdict_label: string;
  verdict_confidence: number;
  support_share: number;
  variance: number;
  verdict_reasoning: string | null;
  verdict_calculated_at: Date;
  article_id: string | null;
  article_title: string | null;
  article_url: string | null;
  article_published_date: Date | null;
  outlet_id: string | null;
  outlet_name: string | null;
  outlet_credibility: number | null;
  outlet_ideology: string | null;
  article_stance: string | null;
  article_stance_confidence: number | null;
  article_stance_reasoning: string | null;
}

async function main() {
  console.log('📋 Pulling verdict reasoning results...\n');

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    const args = process.argv.slice(2);
    const questionIdArg = args.find((a) => a.startsWith('--questionId='));
    const topicIdArg = args.find((a) => a.startsWith('--topicId='));
    const includeArticles = args.includes('--include-articles');

    let verdicts: VerdictWithQuestion[];
    if (questionIdArg) {
      const questionId = questionIdArg.split('=')[1];
      const verdict = await findVerdictByQuestionId(questionId);
      verdicts = verdict ? [verdict] : [];
      console.log(`📌 Filtering by question ID: ${questionId}\n`);
    } else if (topicIdArg) {
      const topicId = topicIdArg.split('=')[1];
      // Get all verdicts for questions in this topic
      const questions = await findQuestionsByTopicId(topicId, false);
      const allVerdicts: VerdictWithQuestion[] = [];
      for (const q of questions) {
        if (q.verdicts && q.verdicts.length > 0) {
          for (const v of q.verdicts) {
            allVerdicts.push({
              ...v,
              question: {
                questionText: q.questionText,
                topic: q.topic,
              },
            } as VerdictWithQuestion);
          }
        }
      }
      verdicts = allVerdicts;
      console.log(`📌 Filtering by topic ID: ${topicId}\n`);
    } else {
      verdicts = await findAllVerdicts();
    }

    if (verdicts.length === 0) {
      console.log('⚠️  No verdicts found.\n');
      await disconnectDatabase();
      return;
    }

    console.log(`📊 Found ${verdicts.length} verdict(s)\n`);
    console.log('═'.repeat(80));
    console.log('');

    // Get verdict overview data if including articles
    let overviewData: VerdictOverviewRow[] = [];
    if (includeArticles) {
      const questionIds = verdicts.map((v: { questionId: string }) => v.questionId);
      const result = await prisma.$queryRaw<VerdictOverviewRow[]>`
        SELECT * FROM verdict_overview
        WHERE question_id = ANY(${questionIds})
        ORDER BY verdict_calculated_at DESC, outlet_credibility DESC, article_stance_confidence DESC
      `;
      overviewData = result;
    }

    // Group overview data by question_id
    const overviewByQuestion = new Map<string, VerdictOverviewRow[]>();
    for (const row of overviewData) {
      const existing = overviewByQuestion.get(row.question_id) || [];
      existing.push(row);
      overviewByQuestion.set(row.question_id, existing);
    }

    // Display each verdict
    for (let i = 0; i < verdicts.length; i++) {
      const verdict = verdicts[i];
      const question = verdict.question;
      const topic = question.topic;

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`VERDICT ${i + 1}/${verdicts.length}`);
      console.log('─'.repeat(80));
      console.log('');

      // Question & Topic
      console.log('📌 QUESTION:');
      console.log(`   ${question.questionText}`);
      console.log('');
      console.log('🏷️  TOPIC:');
      console.log(`   ${topic?.name || 'N/A'} (ID: ${topic?.id || 'N/A'})`);
      console.log('');

      // Verdict Metrics
      console.log('⚖️  VERDICT METRICS:');
      console.log(`   Label:      ${verdict.verdictLabel}`);
      console.log(`   Confidence: ${verdict.confidence.toFixed(1)}%`);
      console.log(`   Support:    ${(verdict.supportShare * 100).toFixed(1)}%`);
      console.log(`   Variance:   ${(verdict.variance * 100).toFixed(1)}%`);
      console.log(`   Calculated: ${verdict.calculatedAt.toISOString()}`);
      console.log('');

      // Get article stances for statistics
      // Use the month period from the verdict (stored in month field)
      const verdictMonthPeriod = verdict.month;
      const articleStances = await findArticleStancesByQuestionAndMonth(
        verdict.questionId,
        verdictMonthPeriod
      );
      
      // Also get all-time count for comparison
      const allTimeStances = await findArticleStancesByQuestionId(verdict.questionId);
      
      // Calculate statistics
      const totalArticles = articleStances.length;
      const uniqueOutlets = new Set(articleStances.map(s => s.article.outlet.id));
      const totalOutlets = uniqueOutlets.size;
      
      // Count articles per stance
      const articlesByStance = new Map<string, number>();
      for (const stance of articleStances) {
        const stanceLabel = stance.articleAnalysisAttempt.stance;
        articlesByStance.set(stanceLabel, (articlesByStance.get(stanceLabel) || 0) + 1);
      }
      
      // Count outlets per stance
      const outletsByStance = new Map<string, Set<string>>();
      for (const stance of articleStances) {
        const stanceLabel = stance.articleAnalysisAttempt.stance;
        const outletId = stance.article.outlet.id;
        if (!outletsByStance.has(stanceLabel)) {
          outletsByStance.set(stanceLabel, new Set());
        }
        outletsByStance.get(stanceLabel)!.add(outletId);
      }
      
      // Article & Outlet Statistics
      console.log('📊 ARTICLE & OUTLET STATISTICS:');
      console.log(`   Month Period:       ${verdictMonthPeriod.toISOString().slice(0, 7)}`);
      console.log(`   Total Articles:     ${totalArticles} (for this month)`);
      if (allTimeStances.length !== totalArticles) {
        console.log(`   All-Time Articles:  ${allTimeStances.length} (total across all months)`);
      }
      console.log(`   Total Outlets:      ${totalOutlets}`);
      console.log('');
      
      if (articlesByStance.size > 0) {
        console.log('   Articles by Stance:');
        const sortedStances = Array.from(articlesByStance.entries()).sort((a, b) => b[1] - a[1]);
        for (const [stanceLabel, count] of sortedStances) {
          const outletCount = outletsByStance.get(stanceLabel)?.size || 0;
          const percentage = totalArticles > 0 ? ((count / totalArticles) * 100).toFixed(1) : '0.0';
          console.log(`     ${stanceLabel.padEnd(20)} ${count.toString().padStart(3)} articles (${percentage}%) | ${outletCount} outlet(s)`);
        }
        console.log('');
      } else {
        console.log('   ⚠️  No articles found for this verdict');
        console.log('');
      }

      // Reasoning
      console.log('💭 REASONING:');
      if (verdict.reasoning) {
        const lines = verdict.reasoning.split('\n');
        for (const line of lines) {
          console.log(`   ${line}`);
        }
      } else {
        console.log('   ⚠️  No reasoning available (run db:summarize:verdicts to generate)');
      }
      console.log('');

      // Contributing Articles (if requested)
      if (includeArticles) {
        const articles = overviewByQuestion.get(verdict.questionId) || [];
        const uniqueArticles = Array.from(
          new Map(articles.map((a) => [a.article_id, a])).values()
        ).filter((a) => a.article_id !== null);

        if (uniqueArticles.length > 0) {
          console.log(`📰 CONTRIBUTING ARTICLES (${uniqueArticles.length}):`);
          console.log('');

          for (const article of uniqueArticles) {
            console.log(`   • ${article.article_title || 'Untitled'}`);
            console.log(`     Outlet: ${article.outlet_name || 'N/A'} (credibility: ${article.outlet_credibility?.toFixed(1) || 'N/A'})`);
            console.log(`     Stance: ${article.article_stance || 'N/A'} (confidence: ${article.article_stance_confidence ? (article.article_stance_confidence * 100).toFixed(1) + '%' : 'N/A'})`);
            if (article.article_url) {
              console.log(`     URL: ${article.article_url}`);
            }
            if (article.article_stance_reasoning) {
              const reasoningLines = article.article_stance_reasoning.split('\n');
              console.log(`     Reasoning: ${reasoningLines[0]}`);
              if (reasoningLines.length > 1) {
                reasoningLines.slice(1).forEach((line) => {
                  console.log(`                ${line}`);
                });
              }
            }
            console.log('');
          }
        } else {
          console.log('📰 CONTRIBUTING ARTICLES:');
          console.log('   ⚠️  No articles found for this verdict');
          console.log('');
        }
      }

      console.log('');
    }

    // Summary Statistics
    console.log('═'.repeat(80));
    console.log('📊 SUMMARY STATISTICS');
    console.log('═'.repeat(80));
    console.log('');

    const withReasoning = verdicts.filter((v) => v.reasoning).length;
    const withoutReasoning = verdicts.length - withReasoning;

    console.log(`Total Verdicts:        ${verdicts.length}`);
    console.log(`With Reasoning:        ${withReasoning}`);
    console.log(`Without Reasoning:     ${withoutReasoning}`);

    if (verdicts.length > 0) {
      const avgConfidence =
        verdicts.reduce((sum: number, v: { confidence: number }) => sum + v.confidence, 0) / verdicts.length;
      const avgSupport =
        verdicts.reduce((sum: number, v: { supportShare: number }) => sum + v.supportShare, 0) / verdicts.length;
      const avgVariance =
        verdicts.reduce((sum: number, v: { variance: number }) => sum + v.variance, 0) / verdicts.length;

      console.log(`Average Confidence:    ${avgConfidence.toFixed(1)}%`);
      console.log(`Average Support:       ${(avgSupport * 100).toFixed(1)}%`);
      console.log(`Average Variance:      ${(avgVariance * 100).toFixed(1)}%`);
    }

    // Verdict label distribution
    const labelCounts = new Map<string, number>();
    for (const v of verdicts) {
      labelCounts.set(v.verdictLabel, (labelCounts.get(v.verdictLabel) || 0) + 1);
    }

    console.log('');
    console.log('Verdict Label Distribution:');
    for (const [label, count] of Array.from(labelCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${label.padEnd(20)} ${count}`);
    }

    console.log('');
    console.log('✅ Verdict reasoning log complete!');
    console.log('');

    await disconnectDatabase();
  } catch (error) {
    console.error('❌ Error logging verdict reasoning:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

main();

