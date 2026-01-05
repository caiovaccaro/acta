/**
 * Pipeline Funnel Analysis Script
 * 
 * Analyzes the article analysis pipeline to identify bottlenecks and understand
 * why classifications are rejected and why verdicts are Unclear.
 * 
 * Usage:
 *   npm run db:analyze:funnel
 *   npm run db:analyze:funnel -- --question-id=<question-id>
 *   npm run db:analyze:funnel -- --topic-id=<topic-id>
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prisma, connectDatabase, disconnectDatabase } from '../index';
import { getCurrentMonthPeriod } from '@acta/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../../.env') });

async function main() {
  const args = parseArgs();
  const monthPeriod = getCurrentMonthPeriod();

  console.log('📊 Pipeline Funnel Analysis\n');
  console.log(`📅 Month period: ${monthPeriod.toISOString().slice(0, 7)}\n`);

  try {
    await connectDatabase();

    // Overall statistics
    const totalArticles = await prisma.article.count();
    const articlesWithTopics = await prisma.article.count({
      where: {
        topicArticles: {
          some: {},
        },
      },
    });

    console.log('📈 Overall Pipeline Statistics:');
    console.log(`   Total Articles: ${totalArticles}`);
    console.log(`   Articles Matched to Topics: ${articlesWithTopics} (${((articlesWithTopics / totalArticles) * 100).toFixed(1)}%)`);
    console.log('');

    // Analysis attempts statistics
    const totalAttempts = await prisma.articleAnalysisAttempt.count({
      where: {
        month: monthPeriod,
      },
    });

    const RELEVANCE_THRESHOLD = 0.2;
    const unclearLowConfidence = await prisma.articleAnalysisAttempt.count({
      where: {
        month: monthPeriod,
        stance: 'Unclear',
        confidence: {
          lt: RELEVANCE_THRESHOLD,
        },
      },
    });

    const unclearHighConfidence = await prisma.articleAnalysisAttempt.count({
      where: {
        month: monthPeriod,
        stance: 'Unclear',
        confidence: {
          gte: RELEVANCE_THRESHOLD,
        },
      },
    });

    const otherStances = await prisma.articleAnalysisAttempt.count({
      where: {
        month: monthPeriod,
        stance: {
          not: 'Unclear',
        },
      },
    });

    const storedStances = await prisma.articleStance.count({
      where: {
        articleAnalysisAttempt: {
          month: monthPeriod,
        },
      },
    });

    console.log('🎯 Stance Classification Statistics:');
    console.log(`   Total Classification Attempts: ${totalAttempts}`);
    console.log(`   Stored as ArticleStance: ${storedStances} (${((storedStances / totalAttempts) * 100).toFixed(1)}%)`);
    console.log(`   Rejected (Unclear, confidence < 0.3): ${unclearLowConfidence} (${((unclearLowConfidence / totalAttempts) * 100).toFixed(1)}%)`);
    console.log(`   Unclear (confidence ≥ 0.3): ${unclearHighConfidence} (${((unclearHighConfidence / totalAttempts) * 100).toFixed(1)}%)`);
    console.log(`   Other Stances (Yes/No/Probably): ${otherStances} (${((otherStances / totalAttempts) * 100).toFixed(1)}%)`);
    console.log('');

    // Verdict statistics
    const allVerdicts = await prisma.verdict.findMany({
      where: {
        month: monthPeriod,
      },
      include: {
        question: {
          include: {
            topic: true,
          },
        },
      },
    });

    const verdictsByLabel: Record<string, number> = {
      YesItSeemsSo: 0,
      ProbablyYes: 0,
      Unclear: 0,
      ProbablyNot: 0,
      NoItDoesntSeemSo: 0,
    };

    const verdictDetails: Array<{
      questionId: string;
      questionText: string;
      verdictLabel: string;
      confidence: number;
      supportShare: number;
      variance: number;
      articleCount: number;
      reason: string;
    }> = [];

    for (const verdict of allVerdicts) {
      verdictsByLabel[verdict.verdictLabel]++;

      // Get article count for this verdict
      const articleCount = await prisma.articleStance.count({
        where: {
          questionId: verdict.questionId,
          articleAnalysisAttempt: {
            month: monthPeriod,
          },
        },
      });

      const MIN_ARTICLES_FOR_VERDICT = 4;
      let reason = '';
      if (articleCount < MIN_ARTICLES_FOR_VERDICT) {
        reason = `Insufficient articles (${articleCount} < ${MIN_ARTICLES_FOR_VERDICT} minimum)`;
      } else if (verdict.variance > 0.5) {
        reason = `High variance (${verdict.variance.toFixed(2)} > 0.5)`;
      } else if (verdict.supportShare >= 0.45 && verdict.supportShare <= 0.55) {
        reason = `Support share in unclear range (${verdict.supportShare.toFixed(2)} between 0.45-0.55)`;
      } else {
        reason = `Support share: ${verdict.supportShare.toFixed(2)}, Variance: ${verdict.variance.toFixed(2)}`;
      }

      verdictDetails.push({
        questionId: verdict.questionId,
        questionText: verdict.question.questionText,
        verdictLabel: verdict.verdictLabel,
        confidence: verdict.confidence,
        supportShare: verdict.supportShare,
        variance: verdict.variance,
        articleCount,
        reason,
      });
    }

    console.log('⚖️  Verdict Statistics:');
    console.log(`   Total Verdicts: ${allVerdicts.length}`);
    console.log(`   "Yes, it seems so": ${verdictsByLabel.YesItSeemsSo}`);
    console.log(`   "Probably yes": ${verdictsByLabel.ProbablyYes}`);
    console.log(`   "Unclear": ${verdictsByLabel.Unclear} (${((verdictsByLabel.Unclear / allVerdicts.length) * 100).toFixed(1)}%)`);
    console.log(`   "Probably not": ${verdictsByLabel.ProbablyNot}`);
    console.log(`   "No, it doesn't seem so": ${verdictsByLabel.NoItDoesntSeemSo}`);
    console.log('');

    // Analyze Unclear verdicts
    const unclearVerdicts = verdictDetails.filter(v => v.verdictLabel === 'Unclear');
    if (unclearVerdicts.length > 0) {
      console.log('🔍 Analysis of Unclear Verdicts:');
      
      const insufficientArticles = unclearVerdicts.filter(v => v.articleCount < 6);
      const highVariance = unclearVerdicts.filter(v => v.variance > 0.5);
      const unclearRange = unclearVerdicts.filter(v => 
        v.supportShare >= 0.45 && v.supportShare <= 0.55 && v.variance <= 0.5
      );

      const MIN_ARTICLES_FOR_VERDICT = 4;
      console.log(`   Insufficient articles (< ${MIN_ARTICLES_FOR_VERDICT}): ${insufficientArticles.length}`);
      console.log(`   High variance (> 0.5): ${highVariance.length}`);
      console.log(`   Support share in unclear range (0.45-0.55): ${unclearRange.length}`);
      console.log('');

      if (insufficientArticles.length > 0) {
        console.log('   📋 Questions with insufficient articles:');
        insufficientArticles.slice(0, 10).forEach(v => {
          console.log(`      - "${v.questionText.substring(0, 60)}..." (${v.articleCount} articles)`);
        });
        if (insufficientArticles.length > 10) {
          console.log(`      ... and ${insufficientArticles.length - 10} more`);
        }
        console.log('');
      }
    }

    // Analyze rejected classifications
    if (unclearLowConfidence > 0) {
      console.log('🔍 Analysis of Rejected Classifications (Not Relevant):');
      
      // Sample some rejected classifications to show reasoning
      const sampleRejected = await prisma.articleAnalysisAttempt.findMany({
        where: {
          month: monthPeriod,
          stance: 'Unclear',
          confidence: {
            lt: RELEVANCE_THRESHOLD,
          },
        },
        include: {
          question: true,
          article: {
            select: {
              title: true,
            },
          },
        },
        take: 10,
      });

      console.log(`   Sample rejected classifications (showing first 10):`);
      for (const rejected of sampleRejected) {
        console.log(`      ⚠️  Article: "${rejected.article.title.substring(0, 50)}..."`);
        console.log(`         Question: "${rejected.question.questionText.substring(0, 60)}..."`);
        console.log(`         Confidence: ${(rejected.confidence * 100).toFixed(0)}%`);
        if (rejected.reasoning) {
          console.log(`         Reasoning: ${rejected.reasoning.substring(0, 100)}${rejected.reasoning.length > 100 ? '...' : ''}`);
        }
        console.log('');
      }
    }

    // Questions with most classifications
    const allQuestions = await prisma.question.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            articleStances: {
              where: {
                articleAnalysisAttempt: {
                  month: monthPeriod,
                },
              },
            },
          },
        },
      },
    });

    const questionsWithMostStances = allQuestions
      .sort((a, b) => b._count.articleStances - a._count.articleStances)
      .slice(0, 10);

    console.log('📊 Top 10 Questions by Stored Classifications:');
    questionsWithMostStances.forEach((q, i) => {
      console.log(`   ${i + 1}. "${q.questionText.substring(0, 60)}..." - ${q._count.articleStances} classifications`);
    });
    console.log('');

    // Questions with fewest classifications
    const questionsWithFewestStances = allQuestions
      .sort((a, b) => a._count.articleStances - b._count.articleStances)
      .slice(0, 10);

    console.log('📊 Bottom 10 Questions by Stored Classifications:');
    questionsWithFewestStances.forEach((q, i) => {
      console.log(`   ${i + 1}. "${q.questionText.substring(0, 60)}..." - ${q._count.articleStances} classifications`);
    });
    console.log('');

    // Recommendations
    console.log('💡 Recommendations:');
    
    const MIN_ARTICLES_FOR_VERDICT = 4;
    const avgClassificationsPerQuestion = storedStances / allVerdicts.length;
    if (avgClassificationsPerQuestion < MIN_ARTICLES_FOR_VERDICT) {
      console.log(`   ⚠️  Average ${avgClassificationsPerQuestion.toFixed(1)} classifications per question (need ${MIN_ARTICLES_FOR_VERDICT}+ for clear verdicts)`);
      console.log(`      Consider: Lowering relevance threshold (currently ${RELEVANCE_THRESHOLD}) or improving question matching`);
    }

    const rejectionRate = (unclearLowConfidence / totalAttempts) * 100;
    if (rejectionRate > 50) {
      console.log(`   ⚠️  High rejection rate: ${rejectionRate.toFixed(1)}% of classifications rejected as not relevant`);
      console.log(`      Consider: Lowering confidence threshold from ${RELEVANCE_THRESHOLD} or reviewing question specificity`);
    }

    const unclearVerdictRate = (verdictsByLabel.Unclear / allVerdicts.length) * 100;
    if (unclearVerdictRate > 50) {
      console.log(`   ⚠️  High unclear verdict rate: ${unclearVerdictRate.toFixed(1)}% of verdicts are Unclear`);
      console.log(`      Consider: Lowering MIN_ARTICLES_FOR_VERDICT from ${MIN_ARTICLES_FOR_VERDICT} or adjusting variance threshold`);
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error analyzing pipeline:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

function parseArgs() {
  const args: any = {};
  const allArgs = process.argv.slice(2);
  
  allArgs.forEach((arg) => {
    if (arg.startsWith('--question-id=')) {
      args.questionId = arg.split('=')[1];
    } else if (arg.startsWith('--topic-id=')) {
      args.topicId = arg.split('=')[1];
    }
  });

  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as analyzePipelineFunnel };

