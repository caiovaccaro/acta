/**
 * LLM Provider Interface
 * Abstract interface for LLM providers (OpenAI, Anthropic, etc.)
 */

import type {
  ClassifyStanceParams,
  StanceClassification,
  ValidateQuestionParams,
  QuestionValidation,
  BatchClassifyStancesParams,
  QuestionReformulation,
  ReformulateQuestionParams,
  ValidateBarQuestionParams,
  BarQuestionValidation,
  TopicDiscoveryResult,
  QuestionDiscoveryResult,
} from './types.js';
import type {
  VerdictSummaryParams,
  VerdictSummaryResult,
} from './types.verdictSummary.js';
import type {
  GenerateOverviewBulletsParams,
  OverviewBulletsResult,
  ExtractQuotesParams,
  ExtractQuotesResult,
  GenerateFeaturedPerspectiveParams,
  FeaturedPerspectiveResult,
  GenerateTimelineEventsParams,
  GenerateTimelineEventsResult,
  GenerateQuestionContextBlurbParams,
  QuestionContextBlurbResult,
} from './types.debateGeneration.js';

// Re-export types for convenience
export type {
  ClassifyStanceParams,
  StanceClassification,
  ValidateQuestionParams,
  QuestionValidation,
  BatchClassifyStancesParams,
  QuestionReformulation,
  ReformulateQuestionParams,
  ValidateBarQuestionParams,
  BarQuestionValidation,
  Stance,
  TopicDiscoveryResult,
  QuestionDiscoveryResult,
} from './types.js';
export type { VerdictSummaryParams, VerdictSummaryResult } from './types.verdictSummary.js';
export type {
  GenerateOverviewBulletsParams,
  OverviewBulletsResult,
  ExtractQuotesParams,
  ExtractQuotesResult,
  GenerateFeaturedPerspectiveParams,
  FeaturedPerspectiveResult,
  GenerateTimelineEventsParams,
  GenerateTimelineEventsResult,
  GenerateQuestionContextBlurbParams,
  QuestionContextBlurbResult,
} from './types.debateGeneration.js';

/**
 * LLM Provider Interface
 * All LLM providers must implement this interface
 */
export interface LLMProvider {
  /**
   * Classify stance for an article-question pair
   * @param params - Classification parameters
   * @returns Stance classification with confidence and reasoning
   */
  classifyStance(params: ClassifyStanceParams): Promise<StanceClassification>;

  /**
   * Validate a question against the formulation framework
   * @param params - Validation parameters
   * @returns Validation results with check details
   */
  validateQuestion(params: ValidateQuestionParams): Promise<QuestionValidation>;

  /**
   * Batch classify multiple stances (for cost optimization)
   * @param params - Batch classification parameters
   * @returns Array of stance classifications
   */
  batchClassifyStances(
    params: BatchClassifyStancesParams
  ): Promise<StanceClassification[]>;

  /**
   * Generate reformulated question versions
   * @param params - Reformulation parameters
   * @returns Array of reformulated questions with improvements
   */
  reformulateQuestion(
    params: ReformulateQuestionParams
  ): Promise<QuestionReformulation[]>;

  /**
   * Validate if a question would be asked in a bar conversation
   * Checks if the question is simple, non-technical, and understandable by average person
   * @param params - Bar validation parameters
   * @returns Bar validation result
   */
  validateBarQuestion(
    params: ValidateBarQuestionParams
  ): Promise<BarQuestionValidation>;

  /**
   * Summarize a verdict given the question, verdict metrics, and contributing article stances.
   * Returns a short, neutral explanation of why the verdict is what it is.
   */
  summarizeVerdict(params: VerdictSummaryParams): Promise<VerdictSummaryResult>;

  /**
   * Discover topics from a set of articles (reactive discovery).
   */
  discoverTopicsFromArticles(
    articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>
  ): Promise<TopicDiscoveryResult>;

  /**
   * Discover questions from a set of articles for a given topic (reactive discovery).
   */
  discoverQuestionsFromArticles(
    params: {
      topic: { id: string; name: string; description?: string | null };
      articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>;
    }
  ): Promise<QuestionDiscoveryResult>;

  /**
   * Generate comprehensive overview bullets for a question/verdict.
   * Returns bullet points that give an overview considering different article perspectives.
   */
  generateOverviewBullets(
    params: GenerateOverviewBulletsParams
  ): Promise<OverviewBulletsResult>;

  /**
   * Extract actual quotes from an article that support a given stance.
   * Returns direct quotes from the article text, not summaries.
   */
  extractQuotes(params: ExtractQuotesParams): Promise<ExtractQuotesResult>;

  /**
   * Generate a featured perspective (highlighted quote) for a question.
   * Selects the most compelling quote from majority-aligned articles.
   */
  generateFeaturedPerspective(
    params: GenerateFeaturedPerspectiveParams
  ): Promise<FeaturedPerspectiveResult>;

  /**
   * Generate timeline events from articles for a question/topic.
   * Extracts key chronological events with dates, titles, and descriptions.
   */
  generateTimelineEvents(
    params: GenerateTimelineEventsParams
  ): Promise<GenerateTimelineEventsResult>;

  /**
   * Generate a 2-3 sentence context blurb for a question.
   * Explains what the question is about based on article content.
   */
  generateQuestionContextBlurb(
    params: GenerateQuestionContextBlurbParams
  ): Promise<QuestionContextBlurbResult>;

  /**
   * Get provider name
   * @returns Provider identifier string
   */
  getName(): string;

  /**
   * Check if provider is available
   * @returns True if provider is available, false otherwise
   */
  isAvailable(): Promise<boolean>;
}

