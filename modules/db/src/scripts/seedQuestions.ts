/**
 * Seed Questions Script
 * Creates pre-defined questions from PRD and validates them
 * 
 * Usage:
 *   tsx src/scripts/seedQuestions.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  connectDatabase,
  disconnectDatabase,
} from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file at project root
config({ path: resolve(__dirname, '../../../../.env') });

import { findAllTopics } from '../repositories/topicRepository.js';
import {
  createQuestion,
  findQuestionsByTopicId,
  findQuestionsByValidationStatus,
  updateQuestion,
  deleteQuestion,
} from '../repositories/questionRepository.js';
import { createLLMConfigFromEnv, createLLMProvider } from '@acta/core/llm';
import { createDefaultValidationFramework } from '@acta/core/validation';
import {
  validateQuestion,
  activateValidatedQuestion,
} from '@acta/core/analysis';

// Pre-defined questions by topic
const QUESTIONS_BY_TOPIC: Record<string, string[]> = {
  Gaza: [
    'Is what\'s happening in Gaza a genocide?',
    'Should the United States stop providing military aid to Israel?',
    'Is a ceasefire the most effective way to reduce civilian casualties in Gaza?',
  ],
  'Drug Policy': [
    'Is decriminalization the most effective way to reduce drug-related harm?',
    'Should all drugs be legalized?',
    'Is harm reduction more effective than abstinence-based approaches for drug policy?',
  ],
  'AI Regulation': [
    'Should AI development be paused until safety measures are in place?',
    'Is government regulation the most effective way to ensure AI safety?',
    'Should AI companies be required to disclose their training data?',
  ],
};

const MAX_REFORMULATION_ROUNDS = 3;
const MAX_REFORMULATIONS_PER_ROUND = 2; // Limit reformulations per round to speed up

/**
 * Validates a question with recursive reformulation attempts
 * Tries all reformulation suggestions and keeps the best one
 * Returns the best validated question, or null if none can be validated
 */
async function validateWithReformulation(
  question,
  validationFramework,
  llmProvider
) {
  const originalText = question.originalQuestionText || question.questionText;
  let bestQuestion = question;
  let bestConfidence = 0;
  let attempts = 0;
  let roundsCompleted = 0;
  const triedTexts = new Set([question.questionText.toLowerCase()]);

  // First, try validating the original question
  let validationResult = await validateQuestion(
    bestQuestion,
    validationFramework
  );

  if (validationResult.isValid) {
    const activated = await activateValidatedQuestion(validationResult.question);
    return { validated: true, question: activated, attempts: 0, shouldDelete: false };
  }

  bestConfidence = validationResult.validationResults?.overallConfidence || 0;

  // Try reformulation rounds
  let brokeEarly = false;
  for (let round = 0; round < MAX_REFORMULATION_ROUNDS; round++) {
    roundsCompleted = round + 1;
    
    const checks = validationResult.validationResults?.checks || [];
    const failedChecks = checks
      .filter((check) => !check.passed)
      .map((check) => check.name);

    if (failedChecks.length === 0) {
      brokeEarly = true;
      break;
    }

    // Get reformulation suggestions
    const topicName = bestQuestion.topic?.name || 'Unknown';
    const reformulations = await llmProvider.reformulateQuestion({
      originalQuestion: bestQuestion.questionText,
      failedChecks,
      topic: topicName,
    });

    if (!reformulations || reformulations.length === 0) {
      brokeEarly = true;
      break;
    }

    // Try each reformulation suggestion
    let bestReformulation = null;
    let bestReformulationConfidence = bestConfidence;
    
    for (const reformulation of reformulations) {
      const reformulatedText = reformulation.text.trim();
      const normalizedText = reformulatedText.toLowerCase();

      // Skip if we've already tried this text
      if (triedTexts.has(normalizedText)) {
        continue;
      }

      triedTexts.add(normalizedText);
      attempts++;

      // Limit reformulations per round to speed up processing
      if (attempts > roundsCompleted * MAX_REFORMULATIONS_PER_ROUND) {
        break;
      }

      // Update question with reformulated text
      const updatedQuestion = await updateQuestion(bestQuestion.id, {
        questionText: reformulatedText,
        originalQuestionText: originalText,
      });

      // Validate the reformulated question
      const reformValidationResult = await validateQuestion(
        updatedQuestion,
        validationFramework
      );

      if (reformValidationResult.isValid) {
        const activated = await activateValidatedQuestion(
          reformValidationResult.question
        );
        return { validated: true, question: activated, attempts: roundsCompleted, shouldDelete: false };
      }

      // Keep track of the best reformulation (highest confidence)
      const currentConfidence =
        reformValidationResult.validationResults?.overallConfidence || 0;
      if (currentConfidence > bestReformulationConfidence) {
        bestReformulationConfidence = currentConfidence;
        bestReformulation = updatedQuestion;
        bestConfidence = currentConfidence;
      }
    }

    // Continue to next round with the best reformulation so far
    if (bestReformulation) {
      bestQuestion = bestReformulation;
      // Re-validate to get the latest validation result for next round
      validationResult = await validateQuestion(
        bestQuestion,
        validationFramework
      );
    } else {
      // No better reformulation found in this round - exhausted options
      brokeEarly = true;
      break;
    }
  }

  // Determine if we should delete (exhausted all reformulation attempts)
  // Delete if we completed all rounds OR broke early due to no reformulations available
  const exhaustedAllAttempts = 
    roundsCompleted >= MAX_REFORMULATION_ROUNDS || // Completed all rounds
    brokeEarly; // Broke early because no reformulations available or no failed checks

  // If we couldn't validate after all attempts, mark for potential deletion
  await updateQuestion(bestQuestion.id, {
    validationStatus: 'needs_reformulation',
  });

  return { 
    validated: false, 
    question: bestQuestion, 
    attempts: roundsCompleted, // Report rounds, not individual reformulation attempts
    shouldDelete: exhaustedAllAttempts // Delete if we exhausted all reformulation options
  };
}

async function seedQuestions() {
  console.log('🌱 Seeding initial questions...\n');
  
  try {
    await connectDatabase();
    
    // Initialize LLM provider and validation framework
    const llmConfig = createLLMConfigFromEnv();
    const llmProvider = createLLMProvider(llmConfig);
    const validationFramework = createDefaultValidationFramework(llmProvider);
    
    console.log(`✅ LLM Provider: ${llmProvider.getName()}`);
    console.log(`✅ Validation framework initialized\n`);
    
    // Get all topics
    const topics = await findAllTopics();
    const topicMap = new Map(topics.map((t) => [t.name, t]));
    
    let totalCreated = 0;
    let totalValidated = 0;
    let totalReformulated = 0;
    let totalExistingProcessed = 0;

    // Process questions per topic to ensure at least one survives per topic
    for (const [topicName, questionTexts] of Object.entries(QUESTIONS_BY_TOPIC)) {
      const topic = topicMap.get(topicName);
      
      if (!topic) {
        console.warn(`⚠️  Topic "${topicName}" not found, skipping questions`);
        continue;
      }
      
      console.log(`\n📋 Processing questions for topic: ${topicName}`);
      
      // Get existing questions for this topic
      const existingQuestions = await findQuestionsByTopicId(topic.id, true);
      const existingValidated = existingQuestions.filter(
        (q) => q.validationStatus === 'validated' && q.isActive
      );
      
      // Track best question per topic (to ensure at least one survives)
      let bestQuestionForTopic = existingValidated.length > 0 
        ? existingValidated[0] 
        : null;
      let bestConfidenceForTopic = bestQuestionForTopic 
        ? (bestQuestionForTopic.validationResults as any)?.overallConfidence || 0
        : 0;
      
      // Process existing non-validated questions for this topic
      const existingToProcess = existingQuestions.filter(
        (q) => 
          q.validationStatus !== 'validated' || 
          !q.isActive
      );
      
      if (existingToProcess.length > 0) {
        console.log(`   🔁 Processing ${existingToProcess.length} existing non-validated question(s)`);
        for (const q of existingToProcess) {
          try {
            const result = await validateWithReformulation(
              q,
              validationFramework,
              llmProvider
            );
            totalExistingProcessed++;
            
            if (result.validated) {
              totalValidated++;
              if (result.attempts > 0) {
                totalReformulated++;
                console.log(`      ✅ Validated after ${result.attempts} round(s): "${result.question.questionText.substring(0, 60)}..."`);
              } else {
                console.log(`      ✅ Validated: "${result.question.questionText.substring(0, 60)}..."`);
              }
              
              // Update best question if this is better
              const confidence = (result.question.validationResults as any)?.overallConfidence || 1.0;
              if (confidence > bestConfidenceForTopic) {
                bestQuestionForTopic = result.question;
                bestConfidenceForTopic = confidence;
              }
            } else {
              // Check if should be deleted (failed after max attempts)
              if (result.shouldDelete) {
                console.log(`      🗑️  Deleted after ${result.attempts} failed reformulation rounds: "${result.question.questionText.substring(0, 60)}..."`);
                await deleteQuestion(result.question.id);
              } else {
                // Keep the question marked as needs_reformulation
                const confidence = (result.question.validationResults as any)?.overallConfidence || 0;
                if (confidence > bestConfidenceForTopic) {
                  bestQuestionForTopic = result.question;
                  bestConfidenceForTopic = confidence;
                }
                console.log(`      ⚠️  Needs reformulation (kept): "${result.question.questionText.substring(0, 60)}..."`);
              }
            }
          } catch (error) {
            console.error(`      ❌ Error processing: "${q.questionText.substring(0, 60)}...":`, error.message);
          }
        }
      }
      
      // Process new questions for this topic
      for (const questionText of questionTexts) {
        // Check if exact question already exists
        const existing = existingQuestions.find(
          (q) => q.questionText.toLowerCase() === questionText.toLowerCase()
        );
        
        if (existing) {
          if (existing.validationStatus === 'validated' && existing.isActive) {
            console.log(`   ⏭️  Already validated: "${questionText.substring(0, 60)}..."`);
            continue;
          }
          // Skip creating duplicate, it was already processed above
          continue;
        }
        
        // Create new question
        const question = await createQuestion({
          topicId: topic.id,
          questionText,
          validationStatus: 'pending',
        });
        
        totalCreated++;
        console.log(`   📝 Created: "${questionText.substring(0, 60)}..."`);
        
        try {
          const result = await validateWithReformulation(
            question,
            validationFramework,
            llmProvider
          );

          if (result.validated) {
            totalValidated++;
            if (result.attempts > 0) {
              totalReformulated++;
              console.log(`      ✅ Validated after ${result.attempts} round(s)`);
            } else {
              console.log(`      ✅ Validated and activated`);
            }
            
            // Update best question if this is better
            const confidence = (result.question.validationResults as any)?.overallConfidence || 1.0;
            if (confidence > bestConfidenceForTopic) {
              bestQuestionForTopic = result.question;
              bestConfidenceForTopic = confidence;
            }
          } else {
            // Check if should be deleted (failed after max attempts)
            if (result.shouldDelete) {
              console.log(`      🗑️  Deleted after ${result.attempts} failed reformulation rounds`);
              await deleteQuestion(result.question.id);
            } else {
              // Keep the question marked as needs_reformulation
              const confidence = (result.question.validationResults as any)?.overallConfidence || 0;
              if (confidence > bestConfidenceForTopic) {
                bestQuestionForTopic = result.question;
                bestConfidenceForTopic = confidence;
              }
              console.log(`      ⚠️  Needs reformulation (kept): "${result.question.questionText.substring(0, 60)}..."`);
            }
          }
        } catch (error) {
          console.error(`      ❌ Validation error:`, error.message);
          // Don't delete on error, keep for manual review
        }
      }
      
      // Ensure at least one question per topic is validated
      // Check current state of questions for this topic
      const currentQuestions = await findQuestionsByTopicId(topic.id, true);
      const validatedQuestions = currentQuestions.filter(
        (q) => q.validationStatus === 'validated' && q.isActive
      );
      
      if (validatedQuestions.length === 0) {
        console.log(`   ⚠️  No validated questions for "${topicName}" - attempting to validate best question`);
        
        if (bestQuestionForTopic) {
          try {
            const result = await validateWithReformulation(
              bestQuestionForTopic,
              validationFramework,
              llmProvider
            );
            
            if (result.validated) {
              totalValidated++;
              if (result.attempts > 0) {
                totalReformulated++;
              }
              console.log(`      ✅ Best question validated for "${topicName}"`);
            } else {
              // If still not valid after all rounds, don't delete - keep it as fallback
              // Only delete if we have other questions to choose from
              if (result.shouldDelete && currentQuestions.length > 1) {
                console.log(`      🗑️  Deleting best question (have alternatives): "${bestQuestionForTopic.questionText.substring(0, 60)}..."`);
                await deleteQuestion(bestQuestionForTopic.id);
                
                // Try the next best question
                const remainingQuestions = currentQuestions.filter(q => q.id !== bestQuestionForTopic.id);
                if (remainingQuestions.length > 0) {
                  const nextBest = remainingQuestions[0];
                  const nextResult = await validateWithReformulation(
                    nextBest,
                    validationFramework,
                    llmProvider
                  );
                  if (nextResult.validated) {
                    totalValidated++;
                    console.log(`      ✅ Next best question validated for "${topicName}"`);
                  }
                }
              } else {
                // Keep it even if not validated - better than having no questions
                console.log(`      ⚠️  Keeping best question (even if not validated) to ensure topic has questions`);
              }
              
              // If we still have no validated questions, create a simple fallback
              const finalCheck = await findQuestionsByTopicId(topic.id, true);
              const finalValidated = finalCheck.filter(
                (q) => q.validationStatus === 'validated' && q.isActive
              );
              
              if (finalValidated.length === 0) {
                console.log(`      ⚠️  Creating fallback question for "${topicName}"`);
                const fallbackText = `What are the key debates and perspectives on ${topicName}?`;
                const fallbackQuestion = await createQuestion({
                  topicId: topic.id,
                  questionText: fallbackText,
                  validationStatus: 'pending',
                });
                
                const fallbackResult = await validateWithReformulation(
                  fallbackQuestion,
                  validationFramework,
                  llmProvider
                );
                
                if (fallbackResult.validated) {
                  totalValidated++;
                  console.log(`      ✅ Fallback question validated for "${topicName}"`);
                } else if (fallbackResult.shouldDelete) {
                  // Even fallback failed - delete it and keep the best we have
                  await deleteQuestion(fallbackQuestion.id);
                  console.log(`      ⚠️  Fallback also failed - keeping best available question for "${topicName}"`);
                }
              }
            }
          } catch (error) {
            console.error(`      ❌ Error ensuring question for "${topicName}":`, error.message);
          }
        } else {
          // No best question found - create a fallback
          console.log(`      ⚠️  No questions found for "${topicName}" - creating fallback`);
          const fallbackText = `What are the key debates and perspectives on ${topicName}?`;
          const fallbackQuestion = await createQuestion({
            topicId: topic.id,
            questionText: fallbackText,
            validationStatus: 'pending',
          });
          
          const fallbackResult = await validateWithReformulation(
            fallbackQuestion,
            validationFramework,
            llmProvider
          );
          
          if (fallbackResult.validated) {
            totalValidated++;
            console.log(`      ✅ Fallback question validated for "${topicName}"`);
          } else if (fallbackResult.shouldDelete) {
            // Even fallback failed - but we need at least one question, so keep it
            console.log(`      ⚠️  Fallback failed validation but keeping it to ensure topic has questions`);
          }
        }
      } else {
        console.log(`   ✅ Topic "${topicName}" has ${validatedQuestions.length} validated question(s)`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${totalCreated}`);
    console.log(`   Validated: ${totalValidated}`);
    console.log(`   Reformulated: ${totalReformulated}`);
    console.log(`   Existing processed: ${totalExistingProcessed}`);
    console.log(`\n✅ Seeding complete`);
    
  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuestions().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedQuestions };

