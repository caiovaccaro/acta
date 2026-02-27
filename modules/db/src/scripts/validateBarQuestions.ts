/**
 * Bar Question Validation Script
 * Validates all successfully validated and stored questions to check if they would be asked in a bar conversation
 * 
 * Usage:
 *   npm run db:validate:bar-questions
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
} from '@acta/db';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import { validateBarQuestions } from '@acta/core/validation';

/**
 * Main execution function
 */
async function main() {
  console.log('🍺 Starting Bar Question Validation...\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Initialize LLM provider
    const llmConfig = createLLMConfigFromEnv('validation');
    const llmProvider = createLLMProvider(llmConfig);
    console.log(`✅ LLM Provider initialized: ${llmProvider.getName()}\n`);

    // Get all validated and active questions
    console.log('📋 Loading validated questions...');
    const validatedQuestions = await findQuestionsByValidationStatus('validated');
    console.log(`   Found ${validatedQuestions.length} validated questions\n`);

    if (validatedQuestions.length === 0) {
      console.log('⚠️  No validated questions found. Run seed script first:');
      console.log('   npm run db:seed:questions');
      return;
    }

    // Filter to only active questions
    const activeQuestions = validatedQuestions.filter(q => q.isActive);
    console.log(`   ${activeQuestions.length} active questions to validate\n`);

    if (activeQuestions.length === 0) {
      console.log('⚠️  No active questions found.');
      return;
    }

    // Validate questions (without auto-applying reformulations - they'll be suggested only)
    console.log('🍺 Validating questions for bar conversation suitability...\n');
    console.log('   Note: Reformulations will be suggested for questions with score < 90 (aiming for golden status).\n');
    const results = await validateBarQuestions(activeQuestions, llmProvider, false);

    // Debug: Log reformulations received
    console.log('🔍 Debug: Checking received reformulations...\n');
    results.forEach((r, idx) => {
      const hasReformulation = r.reformulatedQuestion && 
        r.reformulatedQuestion.trim() !== r.question.questionText.trim();
      const reformulationText = r.reformulatedQuestion || '(none)';
      console.log(`   ${idx + 1}. Score: ${r.barReadinessScore}/100, Has reformulation: ${hasReformulation}`);
      if (hasReformulation) {
        console.log(`      Original: "${r.question.questionText}"`);
        console.log(`      Reformulated: "${reformulationText}"`);
        console.log(`      Reformulation Score: ${r.reformulationScore}/100`);
      }
    });
    console.log('');

    // Report results
    const goldenQuestions = results.filter(r => r.barReadinessScore >= 90).length;
    const goodQuestions = results.filter(r => r.barReadinessScore >= 70 && r.barReadinessScore < 90).length;
    const needsImprovement = results.filter(r => r.barReadinessScore < 70).length;
    const withReformulations = results.filter(r => 
      r.reformulatedQuestion && 
      r.reformulatedQuestion !== r.question.questionText &&
      r.reformulatedQuestion.trim() !== r.question.questionText.trim()
    ).length;
    const avgScore = results.reduce((sum, r) => sum + r.barReadinessScore, 0) / results.length;
    
    console.log('\n📊 Bar Readiness Results:');
    console.log(`   🏆 Golden questions (90-100): ${goldenQuestions}`);
    console.log(`   ✅ Good questions (70-89): ${goodQuestions}`);
    console.log(`   ⚠️  Needs improvement (<70): ${needsImprovement}`);
    console.log(`   💡 With suggested reformulations: ${withReformulations}`);
    console.log(`   📈 Average bar readiness score: ${avgScore.toFixed(1)}/100`);
    console.log('');

    // Show questions by score category
    if (needsImprovement > 0) {
      console.log('⚠️  Questions needing improvement (score < 70):\n');
      results
        .filter(r => r.barReadinessScore < 70)
        .sort((a, b) => a.barReadinessScore - b.barReadinessScore) // Lowest scores first
        .forEach((result, index) => {
          console.log(`   ${index + 1}. "${result.question.questionText}"`);
          console.log(`      Topic: ${result.question.topic?.name || 'Unknown'}`);
          console.log(`      Bar Readiness Score: ${result.barReadinessScore}/100`);
          if (result.issues && result.issues.length > 0) {
            console.log(`      Issues: ${result.issues.join(', ')}`);
          }
          if (result.reformulatedQuestion && result.reformulatedQuestion !== result.question.questionText) {
            console.log(`      💡 Suggested reformulation: "${result.reformulatedQuestion}"`);
            console.log(`         Reformulation score: ${result.reformulationScore}/100`);
          }
          if (result.suggestions && result.suggestions.length > 0) {
            console.log(`      Suggestions: ${result.suggestions[0]}`);
          }
          console.log('');
        });
    }

    if (goodQuestions > 0) {
      console.log('✅ Good questions (score 70-89):\n');
      results
        .filter(r => r.barReadinessScore >= 70 && r.barReadinessScore < 90)
        .sort((a, b) => b.barReadinessScore - a.barReadinessScore) // Highest scores first
        .forEach((result, index) => {
          console.log(`   ${index + 1}. "${result.question.questionText}"`);
          console.log(`      Topic: ${result.question.topic?.name || 'Unknown'}`);
          console.log(`      Bar Readiness Score: ${result.barReadinessScore}/100`);
          if (result.reformulatedQuestion && result.reformulatedQuestion !== result.question.questionText) {
            console.log(`      💡 Suggested reformulation: "${result.reformulatedQuestion}"`);
            console.log(`         Reformulation score: ${result.reformulationScore}/100`);
          }
          if (result.issues && result.issues.length > 0) {
            console.log(`      Issues: ${result.issues.join(', ')}`);
          }
          if (result.suggestions && result.suggestions.length > 0) {
            console.log(`      Suggestions: ${result.suggestions[0]}`);
          }
          console.log('');
        });
    }

    if (goldenQuestions > 0) {
      console.log('🏆 Golden questions (score 90-100):\n');
      results
        .filter(r => r.barReadinessScore >= 90)
        .sort((a, b) => b.barReadinessScore - a.barReadinessScore) // Highest scores first
        .forEach((result, index) => {
          console.log(`   ${index + 1}. "${result.question.questionText}"`);
          console.log(`      Topic: ${result.question.topic?.name || 'Unknown'}`);
          console.log(`      Bar Readiness Score: ${result.barReadinessScore}/100`);
          console.log('');
        });
    }

    console.log('✅ Bar question validation complete!');
    console.log('\n💡 Reformulations are suggested for questions with score < 90 (aiming for golden status).');
    console.log('   Reformulations are NOT automatically applied - review and apply manually if desired.');
    console.log('   Check validationResults.barValidation.reformulatedQuestion in the database for detailed results.');

  } catch (error) {
    console.error('❌ Error validating bar questions:', error);
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

export { main as validateBarQuestionsScript };

