/**
 * Revert Bar Question Reformulations Script
 * Reverts questions that were reformulated by bar validation back to their original text
 * 
 * Usage:
 *   npm run db:revert:bar-reformulations
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
  findQuestionsByValidationStatus,
  updateQuestion,
} from '@acta/db';

/**
 * Main execution function
 */
async function main() {
  console.log('↩️  Starting Bar Question Reformulation Revert...\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Get all validated questions
    console.log('📋 Loading validated questions...');
    const validatedQuestions = await findQuestionsByValidationStatus('validated');
    console.log(`   Found ${validatedQuestions.length} validated questions\n`);

    if (validatedQuestions.length === 0) {
      console.log('⚠️  No validated questions found.');
      return;
    }

    // Find questions that were reformulated (have originalQuestionText and barValidation.wasReformulated = true)
    const reformulatedQuestions = validatedQuestions.filter(q => {
      if (!q.originalQuestionText) return false;
      if (q.originalQuestionText === q.questionText) return false; // Not actually reformulated
      
      const validationResults = q.validationResults as any;
      const barValidation = validationResults?.barValidation;
      return barValidation?.wasReformulated === true;
    });

    console.log(`   Found ${reformulatedQuestions.length} questions that were reformulated by bar validation\n`);

    if (reformulatedQuestions.length === 0) {
      console.log('✅ No reformulated questions to revert.');
      return;
    }

    // Show what will be reverted
    console.log('📝 Questions to be reverted:\n');
    reformulatedQuestions.forEach((q, index) => {
      const validationResults = q.validationResults as any;
      const barValidation = validationResults?.barValidation;
      const currentScore = barValidation?.barReadinessScore || 'N/A';
      const originalScore = barValidation?.reformulationScore || 'N/A';
      
      console.log(`   ${index + 1}. Topic: ${q.topic?.name || 'Unknown'}`);
      console.log(`      Current: "${q.questionText}" (Bar Readiness: ${currentScore}/100)`);
      console.log(`      Original: "${q.originalQuestionText}" (Original Score: ${originalScore}/100)`);
      console.log('');
    });

    // Revert questions
    console.log('↩️  Reverting questions to original text...\n');
    let revertedCount = 0;

    for (const question of reformulatedQuestions) {
      try {
        // Update question text back to original
        await updateQuestion(question.id, {
          questionText: question.originalQuestionText!,
          originalQuestionText: null, // Clear originalQuestionText since we're reverting
        });

        // Update barValidation to mark as reverted
        const validationResults = (question.validationResults as any) || {};
        const barValidation = validationResults.barValidation || {};
        barValidation.wasReformulated = false;
        barValidation.revertedAt = new Date().toISOString();
        barValidation.revertedReason = 'Manual revert to original question text';

        await updateQuestion(question.id, {
          validationResults: {
            ...validationResults,
            barValidation,
          },
        });

        revertedCount++;
        console.log(`   ✓ Reverted: "${question.questionText.substring(0, 60)}..."`);
      } catch (error) {
        console.error(`   ✗ Error reverting question ${question.id}:`, error);
      }
    }

    console.log(`\n✅ Reverted ${revertedCount} questions to their original text.`);
    console.log('\n💡 Bar validation results are preserved in validationResults.barValidation');

  } catch (error) {
    console.error('❌ Error reverting bar reformulations:', error);
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

export { main as revertBarReformulationsScript };

