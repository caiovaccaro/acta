/**
 * Question Matcher
 * Implements proactive question matching for articles
 * 
 * Only articles that match pre-defined questions are analyzed for stance
 */

import type { Question, Article } from '@acta/db';

export interface QuestionMatchResult {
  question: Question;
  confidence: number; // 0-1
  matchedTerms: string[];
}

export interface QuestionMatcherConfig {
  minConfidence?: number; // Minimum confidence to match (default: 0.5 - increased for better precision)
  caseSensitive?: boolean; // Whether matching is case-sensitive (default: false)
}

/**
 * Extracts key terms from question text
 * @param question - Question to extract terms from
 * @returns Array of key terms
 */
function extractQuestionTerms(question: Question): string[] {
  const terms: string[] = [];
  const questionText = question.questionText.toLowerCase();
  
  // Extract important words (nouns, verbs, key concepts)
  const words = questionText
    .split(/\s+/)
    .map((word) => word.replace(/[^\w]/g, '')) // Remove punctuation
    .filter((word) => word.length > 3) // Filter out short words
    .filter((word) => !/^(what|when|where|who|why|how|is|are|was|were|been|have|has|had|the|and|or|but|for|with|from|that|this|does|do|did|can|could|should|would|will)$/.test(word)); // Filter common words
  
  terms.push(...words);
  
  // Also include the full question text as a phrase to match
  terms.push(questionText);
  
  return Array.from(new Set(terms)); // Remove duplicates
}

/**
 * Calculates match confidence based on term matches
 * Improved to require phrase matches and multiple term matches
 * @param articleText - Article text to search in
 * @param terms - Terms to search for
 * @param caseSensitive - Whether matching is case-sensitive
 * @returns Confidence score (0-1) and matched terms
 */
function calculateQuestionMatchConfidence(
  articleText: string,
  terms: string[],
  caseSensitive: boolean = false
): { confidence: number; matchedTerms: string[] } {
  const searchText = caseSensitive ? articleText : articleText.toLowerCase();
  const matchedTerms: string[] = [];
  
  // Separate full question phrase from individual terms
  const fullQuestionPhrase = terms.find((term) => term.length > 20) || '';
  const individualTerms = terms.filter((term) => term.length <= 20);
  
  // Check for full question phrase match (highest priority)
  let hasPhraseMatch = false;
  if (fullQuestionPhrase) {
    const searchPhrase = caseSensitive ? fullQuestionPhrase : fullQuestionPhrase.toLowerCase();
    if (searchText.includes(searchPhrase)) {
      matchedTerms.push(fullQuestionPhrase);
      hasPhraseMatch = true;
    }
  }
  
  // Check for individual term matches
  const matchedIndividualTerms: string[] = [];
  for (const term of individualTerms) {
    const searchTerm = caseSensitive ? term : term.toLowerCase();
    if (searchText.includes(searchTerm)) {
      matchedIndividualTerms.push(term);
    }
  }
  matchedTerms.push(...matchedIndividualTerms);
  
  // Require either phrase match OR at least 40% of individual terms
  if (!hasPhraseMatch && individualTerms.length > 0) {
    const termMatchRatio = matchedIndividualTerms.length / individualTerms.length;
    if (termMatchRatio < 0.4) {
      return { confidence: 0, matchedTerms: [] };
    }
  }
  
  // Calculate confidence with higher requirements
  const phraseMatchBonus = hasPhraseMatch ? 0.5 : 0;
  const termMatchRatio = individualTerms.length > 0 
    ? matchedIndividualTerms.length / individualTerms.length 
    : 0;
  
  const confidence = Math.min(1.0, phraseMatchBonus + termMatchRatio * 0.5);
  
  return { confidence, matchedTerms };
}

/**
 * Matches an article against a single question
 * @param article - Article to match
 * @param question - Question to match against
 * @param config - Matcher configuration
 * @returns Match result or null if below threshold
 */
export async function matchArticleToQuestion(
  article: Article,
  question: Question,
  config: QuestionMatcherConfig = {}
): Promise<QuestionMatchResult | null> {
  const { minConfidence = 0.5, caseSensitive = false } = config;
  
  // Only match against active questions
  if (!question.isActive) {
    return null;
  }
  
  const terms = extractQuestionTerms(question);
  if (terms.length === 0) {
    return null;
  }
  
  // Search in article title and content
  const searchText = `${article.title} ${article.textContent}`;
  const { confidence, matchedTerms } = calculateQuestionMatchConfidence(
    searchText,
    terms,
    caseSensitive
  );
  
  if (confidence < minConfidence) {
    return null;
  }
  
  return {
    question,
    confidence,
    matchedTerms,
  };
}

/**
 * Matches an article against multiple questions
 * @param article - Article to match
 * @param questions - Array of questions to match against
 * @param config - Matcher configuration
 * @returns Array of match results (only matches above threshold)
 */
export async function matchArticleToQuestions(
  article: Article,
  questions: Question[],
  config: QuestionMatcherConfig = {}
): Promise<QuestionMatchResult[]> {
  const matches: QuestionMatchResult[] = [];
  
  for (const question of questions) {
    const match = await matchArticleToQuestion(article, question, config);
    if (match) {
      matches.push(match);
    }
  }
  
  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches;
}

/**
 * Filters questions to only those that match the article
 * @param article - Article to match against
 * @param questions - Array of questions to filter
 * @param config - Matcher configuration
 * @returns Array of matching questions
 */
export async function filterMatchingQuestions(
  article: Article,
  questions: Question[],
  config: QuestionMatcherConfig = {}
): Promise<Question[]> {
  const matches = await matchArticleToQuestions(article, questions, config);
  return matches.map((match) => match.question);
}

