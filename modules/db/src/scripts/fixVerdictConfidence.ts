/**
 * Fix Verdict Confidence
 * 
 * This script fixes existing verdicts that have confidence values exceeding 100%.
 * It caps all confidence values to the valid range of 0-100.
 * 
 * Usage:
 *   npm run db:fix:verdict-confidence
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prisma, connectDatabase, disconnectDatabase } from '../index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
const projectRoot = resolve(__dirname, '../../../../');
config({ path: resolve(projectRoot, '.env') });

async function main() {
  console.log('🔧 Fixing Verdict Confidence Values\n');
  
  try {
    await connectDatabase();
    
    // Find all verdicts with confidence > 100
    const verdictsToFix = await prisma.verdict.findMany({
      where: {
        confidence: {
          gt: 100,
        },
      },
      select: {
        id: true,
        questionId: true,
        confidence: true,
        verdictLabel: true,
        month: true,
      },
    });
    
    if (verdictsToFix.length === 0) {
      console.log('✅ No verdicts found with confidence > 100. All values are within valid range.');
      return;
    }
    
    console.log(`📊 Found ${verdictsToFix.length} verdict(s) with confidence > 100:\n`);
    
    // Display what will be fixed
    for (const verdict of verdictsToFix) {
      console.log(`   Verdict ${verdict.id}:`);
      console.log(`     Question: ${verdict.questionId}`);
      console.log(`     Current confidence: ${verdict.confidence.toFixed(2)}%`);
      console.log(`     Will be capped to: 100.00%`);
      console.log(`     Verdict: ${verdict.verdictLabel}`);
      console.log(`     Month: ${verdict.month.toISOString().split('T')[0]}\n`);
    }
    
    // Update all verdicts to cap confidence at 100
    const result = await prisma.verdict.updateMany({
      where: {
        confidence: {
          gt: 100,
        },
      },
      data: {
        confidence: 100,
      },
    });
    
    console.log(`✅ Successfully fixed ${result.count} verdict(s)`);
    console.log(`   All confidence values are now capped at 100%\n`);
    
    // Also check for any verdicts with confidence < 0 (shouldn't happen, but let's be safe)
    const negativeConfidence = await prisma.verdict.count({
      where: {
        confidence: {
          lt: 0,
        },
      },
    });
    
    if (negativeConfidence > 0) {
      console.log(`⚠️  Found ${negativeConfidence} verdict(s) with negative confidence. Fixing...`);
      await prisma.verdict.updateMany({
        where: {
          confidence: {
            lt: 0,
          },
        },
        data: {
          confidence: 0,
        },
      });
      console.log(`✅ Fixed ${negativeConfidence} verdict(s) with negative confidence\n`);
    }
    
    // Verify the fix
    const remaining = await prisma.verdict.count({
      where: {
        OR: [
          { confidence: { gt: 100 } },
          { confidence: { lt: 0 } },
        ],
      },
    });
    
    if (remaining === 0) {
      console.log('✨ All verdict confidence values are now within valid range (0-100)');
    } else {
      console.log(`⚠️  Warning: ${remaining} verdict(s) still have invalid confidence values`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing verdict confidence:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

