/**
 * Stance Classifier
 * Implements LLM-based stance classification with monthly tracking
 * 
 * Classifies article stance on questions per article-question-month triad
 */

import type { LLMProvider } from '../llm/provider.js';
import type { Article, Question } from '@acta/db';
import type { Stance } from '@prisma/client';
import {
  createOrUpdateArticleAnalysisAttempt,
  findArticleAnalysisAttemptByTriad,
  createArticleStance,
  findArticleStanceByArticleAndQuestion,
} from '@acta/db';
import { getCurrentMonthPeriod } from '../utils/monthPeriod.js';

/**
 * Minimum confidence threshold for "not relevant" classifications
 * Articles with "Unclear" stance and confidence below this threshold are rejected
 * Lower values allow more articles through (default: 0.2 = 20%)
 */
const RELEVANCE_THRESHOLD = 0.2;

export interface StanceClassificationResult {
  articleId: string;
  questionId: string;
  month: Date;
  stance: Stance;
  confidence: number;
  reasoning: string;
}

export interface StanceClassifierConfig {
  minConfidence?: number; // Minimum confidence threshold (default: 0.5)
  skipExisting?: boolean; // Skip if analysis already exists (default: true)
}

/**
 * Classifies stance for a single article-question pair
 * @param article - Article to classify
 * @param question - Question to classify stance on
 * @param llmProvider - LLM provider for classification
 * @param month - Month period (defaults to current month period)
 * @param config - Classifier configuration
 * @returns Classification result
 */
export async function classifyStance(
  article: Article,
  question: Question,
  llmProvider: LLMProvider,
  month?: Date,
  config: StanceClassifierConfig = {}
): Promise<StanceClassificationResult> {
  const { skipExisting = true } = config;
  const monthPeriod = month || getCurrentMonthPeriod();
  
  // Check if analysis attempt already exists
  if (skipExisting) {
    const existing = await findArticleAnalysisAttemptByTriad(
      article.id,
      question.id,
      monthPeriod
    );
    
    if (existing) {
      return {
        articleId: article.id,
        questionId: question.id,
        month: monthPeriod,
        stance: existing.stance,
        confidence: existing.confidence,
        reasoning: existing.reasoning || '',
      };
    }
  }
  
  // Get topic name for classification
  const topicName = (question as any).topic?.name || 'Unknown';
  
  // Classify using LLM
  const classification = await llmProvider.classifyStance({
    article: {
      title: article.title,
      textContent: article.textContent,
      url: article.url,
    },
    question: {
      text: question.questionText,
      topic: topicName,
    },
    month: monthPeriod,
  });
  
  // Map LLM stance to Prisma Stance enum
  const stance: Stance = classification.stance;
  
  // Always store ArticleAnalysisAttempt (even for rejections/unclear)
  // This provides a complete audit trail of all classification attempts
  const analysisAttempt = await createOrUpdateArticleAnalysisAttempt({
    articleId: article.id,
    questionId: question.id,
    month: monthPeriod,
    stance,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
  });
  
  // Only create ArticleStance for successfully classified matches
  // (not for Unclear with low confidence - those are stored in ArticleAnalysisAttempt but not linked)
  if (!(stance === 'Unclear' && classification.confidence < RELEVANCE_THRESHOLD)) {
    // Check if stance already exists (avoid duplicates)
    const existingStance = await findArticleStanceByArticleAndQuestion(
      article.id,
      question.id
    );
    
    if (!existingStance) {
      await createArticleStance({
        articleId: article.id,
        questionId: question.id,
        articleAnalysisAttemptId: analysisAttempt.id,
      });
    }
  }
  
  return {
    articleId: article.id,
    questionId: question.id,
    month: monthPeriod,
    stance,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
  };
}

/**
 * Classifies stances for multiple article-question pairs
 * @param items - Array of article-question pairs to classify
 * @param llmProvider - LLM provider for classification
 * @param month - Month period (defaults to current month period)
 * @param config - Classifier configuration
 * @returns Array of classification results
 */
export async function classifyStances(
  items: Array<{ article: Article; question: Question }>,
  llmProvider: LLMProvider,
  month?: Date,
  config: StanceClassifierConfig = {}
): Promise<StanceClassificationResult[]> {
  const results: StanceClassificationResult[] = [];
  
  // Use batch processing if available
  const batchItems = items.map((item) => {
    const topicName = (item.question as any).topic?.name || 'Unknown';
    const monthPeriod = month || getCurrentMonthPeriod();
    
    return {
      article: {
        title: item.article.title,
        textContent: item.article.textContent,
        url: item.article.url,
      },
      question: {
        text: item.question.questionText,
        topic: topicName,
      },
      month: monthPeriod,
    };
  });
  
  // Batch classify using LLM provider
  const classifications = await llmProvider.batchClassifyStances({
    items: batchItems,
    options: {
      maxBatchSize: 10,
    },
  });
  
  // Store results in database
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const classification = classifications[i];
    const monthPeriod = month || getCurrentMonthPeriod();
    
    const stance: Stance = classification.stance;
    
    // Always store ArticleAnalysisAttempt (even for rejections/unclear)
    // This provides a complete audit trail of all classification attempts
    const analysisAttempt = await createOrUpdateArticleAnalysisAttempt({
      articleId: item.article.id,
      questionId: item.question.id,
      month: monthPeriod,
      stance,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    });
    
    // Only create ArticleStance for successfully classified matches
    // (not for Unclear with low confidence - those are stored in ArticleAnalysisAttempt but not linked)
    if (!(stance === 'Unclear' && classification.confidence < RELEVANCE_THRESHOLD)) {
      // Check if stance already exists (avoid duplicates)
      const existingStance = await findArticleStanceByArticleAndQuestion(
        item.article.id,
        item.question.id
      );
      
      if (!existingStance) {
        await createArticleStance({
          articleId: item.article.id,
          questionId: item.question.id,
          articleAnalysisAttemptId: analysisAttempt.id,
        });
      }
    }
    
    results.push({
      articleId: item.article.id,
      questionId: item.question.id,
      month: monthPeriod,
      stance,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    });
  }
  
  return results;
}

/**
 * Classifies stance for all matching questions for an article
 * @param article - Article to classify
 * @param questions - Array of questions to match and classify
 * @param llmProvider - LLM provider for classification
 * @param questionMatcher - Optional question matcher config
 * @param month - Month period (defaults to current month period)
 * @param config - Classifier configuration
 * @returns Array of classification results
 */
export async function classifyArticleStances(
  article: Article,
  questions: Question[],
  llmProvider: LLMProvider,
  questionMatcher?: { minConfidence?: number },
  month?: Date,
  config: StanceClassifierConfig = {}
): Promise<StanceClassificationResult[]> {
  // Import question matcher dynamically to avoid circular dependencies
  const { filterMatchingQuestions } = await import('./questionMatcher.js');
  
  // Filter to only matching questions
  const matchingQuestions = await filterMatchingQuestions(
    article,
    questions,
    questionMatcher || { minConfidence: 0.3 }
  );
  
  if (matchingQuestions.length === 0) {
    return [];
  }
  
  // Classify for all matching questions
  const items = matchingQuestions.map((question) => ({ article, question }));
  return classifyStances(items, llmProvider, month, config);
}

