/**
 * Calculate Verdicts Script
 * Calculates and stores verdicts for all active questions
 * 
 * Usage:
 *   npm run db:calculate:verdicts
 *   npm run db:calculate:verdicts -- --month=2025-01
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
  findActiveQuestions,
} from '@acta/db';
import {
  calculateAndStoreAllVerdicts,
  calculateAndStoreVerdicts,
  parseMonthPeriod,
} from '@acta/core/analysis';

/**
 * Main execution function
 */
async function main() {
  console.log('⚖️  Starting Verdict Calculation...\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let month: Date | undefined;
    
    const monthArg = args.find(arg => arg.startsWith('--month='));
    if (monthArg) {
      const monthStr = monthArg.split('=')[1];
      month = parseMonthPeriod(monthStr);
      console.log(`📅 Calculating verdicts for month: ${monthStr}\n`);
    } else {
      console.log('📅 Calculating verdicts for current month period\n');
    }

    // Get active questions
    console.log('📋 Loading active questions...');
    const activeQuestions = await findActiveQuestions();
    console.log(`   Found ${activeQuestions.length} active questions\n`);

    if (activeQuestions.length === 0) {
      console.log('⚠️  No active questions found.');
      return;
    }

    // Calculate verdicts
    console.log('⚖️  Calculating verdicts...\n');
    const verdicts = await calculateAndStoreAllVerdicts(month);

    // Report results
    console.log('\n📊 Verdict Calculation Results:\n');
    
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
    console.log(`   📈 Breakdown:`);
    console.log(`      "Yes, it seems so": ${verdictCounts.YesItSeemsSo}`);
    console.log(`      "Probably yes": ${verdictCounts.ProbablyYes}`);
    console.log(`      "Unclear": ${verdictCounts.Unclear}`);
    console.log(`      "Probably not": ${verdictCounts.ProbablyNot}`);
    console.log(`      "No, it doesn't seem so": ${verdictCounts.NoItDoesntSeemSo}`);
    console.log('');

    // Show verdicts with details
    if (verdicts.length > 0) {
      console.log('📋 Verdict Details:\n');
      verdicts.forEach((verdict, index) => {
        const question = activeQuestions.find(q => q.id === verdict.questionId);
        console.log(`   ${index + 1}. Question: "${question?.questionText || 'Unknown'}"`);
        console.log(`      Verdict: ${verdict.verdictLabel}`);
        console.log(`      Confidence: ${verdict.confidence.toFixed(1)}%`);
        console.log(`      Support Share: ${(verdict.supportShare * 100).toFixed(1)}%`);
        console.log(`      Variance: ${(verdict.variance * 100).toFixed(1)}%`);
        console.log('');
      });
    }

    console.log('✅ Verdict calculation complete!');

  } catch (error) {
    console.error('❌ Error calculating verdicts:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as calculateVerdictsScript };

