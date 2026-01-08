/**
 * Deduplicate Verdict Reasoning
 * 
 * This script identifies verdicts with duplicate reasoning text.
 * Note: This is informational only - reasoning duplication might be intentional
 * (e.g., same verdict for different questions in the same month).
 * 
 * Usage:
 *   npm run db:dedupe:verdict-reasoning
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

/**
 * Normalize text for comparison (trim, lowercase, remove extra whitespace)
 */
function normalizeText(text: string | null): string {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function main() {
  console.log('🔍 Finding Duplicate Verdict Reasoning\n');
  
  try {
    await connectDatabase();
    
    // Get all verdicts with reasoning
    const allVerdicts = await prisma.verdict.findMany({
      where: {
        reasoning: {
          not: null,
        },
      },
      include: {
        question: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: [
        { questionId: 'asc' },
        { month: 'desc' },
      ],
    });
    
    console.log(`📊 Found ${allVerdicts.length} verdicts with reasoning\n`);
    
    // Group by normalized reasoning text
    const reasoningGroups = new Map<string, typeof allVerdicts>();
    
    for (const verdict of allVerdicts) {
      const normalized = normalizeText(verdict.reasoning);
      if (normalized.length === 0) continue;
      
      if (!reasoningGroups.has(normalized)) {
        reasoningGroups.set(normalized, []);
      }
      reasoningGroups.get(normalized)!.push(verdict);
    }
    
    // Find groups with duplicates (same reasoning for different questions/months)
    const duplicateGroups: Array<{ reasoning: string; verdicts: typeof allVerdicts }> = [];
    
    for (const [normalizedReasoning, verdicts] of reasoningGroups.entries()) {
      if (verdicts.length > 1) {
        // Check if they're for different questions or months
        const uniqueQuestions = new Set(verdicts.map(v => v.questionId));
        const uniqueMonths = new Set(verdicts.map(v => v.month.toISOString()));
        
        // If same reasoning appears for multiple questions or months, it might be a duplicate
        if (uniqueQuestions.size > 1 || uniqueMonths.size > 1) {
          duplicateGroups.push({
            reasoning: normalizedReasoning,
            verdicts,
          });
        }
      }
    }
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate reasoning found across different questions/months.\n');
      console.log('ℹ️  Note: Same reasoning for the same question in different months might be intentional.\n');
      return;
    }
    
    console.log(`🔍 Found ${duplicateGroups.length} group(s) with duplicate reasoning:\n`);
    
    // Show examples
    for (let i = 0; i < Math.min(5, duplicateGroups.length); i++) {
      const group = duplicateGroups[i];
      const reasoningPreview = group.reasoning.length > 80 
        ? group.reasoning.substring(0, 80) + '...' 
        : group.reasoning;
      
      console.log(`   Group ${i + 1}: "${reasoningPreview}"`);
      console.log(`     Appears in ${group.verdicts.length} verdict(s):`);
      
      for (const verdict of group.verdicts.slice(0, 3)) {
        const month = new Date(verdict.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        console.log(`       - ${verdict.id}: ${verdict.question.questionText.substring(0, 50)}... (${month})`);
      }
      if (group.verdicts.length > 3) {
        console.log(`       ... and ${group.verdicts.length - 3} more`);
      }
      console.log('');
    }
    
    if (duplicateGroups.length > 5) {
      console.log(`   ... and ${duplicateGroups.length - 5} more group(s)\n`);
    }
    
    console.log('ℹ️  Note: This script only identifies duplicates.');
    console.log('   Reasoning duplication might be intentional (e.g., similar verdicts for related questions).');
    console.log('   Review manually before deciding to deduplicate.\n');
    
  } catch (error) {
    console.error('❌ Error finding duplicate reasoning:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

