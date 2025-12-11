/**
 * Topic Matcher
 * Implements proactive topic matching using keyword-based matching
 * 
 * Only articles that match pre-defined topics are assigned and processed
 */

import type { Topic, Article } from '@acta/db';
import {
  findTopicArticlesByArticleId,
  createOrUpdateTopicArticle,
} from '@acta/db';

export interface TopicMatchResult {
  topic: Topic;
  confidence: number; // 0-1
  matchedKeywords: string[];
}

export interface TopicMatcherConfig {
  minConfidence?: number; // Minimum confidence to assign (default: 0.5 - increased for better precision)
  caseSensitive?: boolean; // Whether keyword matching is case-sensitive (default: false)
}

/**
 * Extracts keywords from topic name and description
 * @param topic - Topic to extract keywords from
 * @returns Array of keywords
 */
function extractTopicKeywords(topic: Topic): string[] {
  const keywords: string[] = [];
  
  // Add topic name as keyword
  if (topic.name) {
    keywords.push(topic.name.toLowerCase());
  }
  
  // Extract words from description
  if (topic.description) {
    const words = topic.description
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3) // Filter out short words
      .filter((word) => !/^(the|and|or|but|for|with|from|that|this|are|was|were|been|have|has|had)$/.test(word)); // Filter common words
    
    keywords.push(...words);
  }
  
  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Calculates match confidence based on keyword matches
 * Improved to require multiple matches and prioritize topic name
 * @param articleText - Article text to search in
 * @param keywords - Keywords to search for
 * @param caseSensitive - Whether matching is case-sensitive
 * @returns Confidence score (0-1) and matched keywords
 */
function calculateMatchConfidence(
  articleText: string,
  keywords: string[],
  caseSensitive: boolean = false
): { confidence: number; matchedKeywords: string[] } {
  const searchText = caseSensitive ? articleText : articleText.toLowerCase();
  const matchedKeywords: string[] = [];
  
  // Topic name is the first keyword (most important)
  const topicName = keywords[0] || '';
  const otherKeywords = keywords.slice(1);
  
  // Check for topic name match (required for high confidence)
  const topicNameMatch = topicName && searchText.includes(caseSensitive ? topicName : topicName.toLowerCase());
  
  if (!topicNameMatch && otherKeywords.length > 0) {
    // If topic name doesn't match, require at least 2 other keywords
    let matchedOther = 0;
    for (const keyword of otherKeywords) {
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      if (searchText.includes(searchKeyword)) {
        matchedKeywords.push(keyword);
        matchedOther++;
      }
    }
    
    // Require at least 2 keyword matches if topic name doesn't match
    if (matchedOther < 2) {
      return { confidence: 0, matchedKeywords: [] };
    }
  } else if (topicNameMatch) {
    matchedKeywords.push(topicName);
    
    // Check for additional keyword matches
    for (const keyword of otherKeywords) {
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      if (searchText.includes(searchKeyword)) {
        matchedKeywords.push(keyword);
      }
    }
  }
  
  // Calculate confidence with higher requirements
  const topicNameBonus = topicNameMatch ? 0.4 : 0;
  const keywordMatchRatio = otherKeywords.length > 0 
    ? matchedKeywords.filter(k => k !== topicName).length / otherKeywords.length 
    : 0;
  
  // Require topic name match OR at least 30% of other keywords
  const minKeywordRatio = topicNameMatch ? 0 : 0.3;
  if (keywordMatchRatio < minKeywordRatio) {
    return { confidence: 0, matchedKeywords: [] };
  }
  
  const confidence = Math.min(1.0, topicNameBonus + keywordMatchRatio * 0.6);
  
  return { confidence, matchedKeywords };
}

/**
 * Matches an article against a single topic
 * @param article - Article to match
 * @param topic - Topic to match against
 * @param config - Matcher configuration
 * @returns Match result or null if below threshold
 */
export async function matchArticleToTopic(
  article: Article,
  topic: Topic,
  config: TopicMatcherConfig = {}
): Promise<TopicMatchResult | null> {
  const { minConfidence = 0.5, caseSensitive = false } = config;
  
  const keywords = extractTopicKeywords(topic);
  if (keywords.length === 0) {
    return null;
  }
  
  // Search in article title and content
  const searchText = `${article.title} ${article.textContent}`;
  const { confidence, matchedKeywords } = calculateMatchConfidence(
    searchText,
    keywords,
    caseSensitive
  );
  
  if (confidence < minConfidence) {
    return null;
  }
  
  return {
    topic,
    confidence,
    matchedKeywords,
  };
}

/**
 * Matches an article against multiple topics
 * @param article - Article to match
 * @param topics - Array of topics to match against
 * @param config - Matcher configuration
 * @returns Array of match results (only matches above threshold)
 */
export async function matchArticleToTopics(
  article: Article,
  topics: Topic[],
  config: TopicMatcherConfig = {}
): Promise<TopicMatchResult[]> {
  const matches: TopicMatchResult[] = [];
  
  for (const topic of topics) {
    const match = await matchArticleToTopic(article, topic, config);
    if (match) {
      matches.push(match);
    }
  }
  
  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches;
}

/**
 * Assigns an article to topics based on matching
 * Creates TopicArticle relationships for all matches above threshold
 * @param article - Article to assign
 * @param topics - Array of topics to match against
 * @param config - Matcher configuration
 * @returns Array of created/updated TopicArticle relationships
 */
export async function assignArticleToTopics(
  article: Article,
  topics: Topic[],
  config: TopicMatcherConfig = {}
): Promise<TopicMatchResult[]> {
  const matches = await matchArticleToTopics(article, topics, config);
  
  // Create TopicArticle relationships for all matches
  for (const match of matches) {
    await createOrUpdateTopicArticle({
      topicId: match.topic.id,
      articleId: article.id,
      confidence: match.confidence,
    });
  }
  
  return matches;
}

/**
 * Processes multiple articles and assigns them to topics
 * @param articles - Array of articles to process
 * @param topics - Array of topics to match against
 * @param config - Matcher configuration
 * @returns Statistics about the matching process, including matched articles list and article-topic map
 */
export async function processArticlesForTopics(
  articles: Article[],
  topics: Topic[],
  config: TopicMatcherConfig = {}
): Promise<{
  totalArticles: number;
  matchedArticles: number;
  totalAssignments: number;
  matchesByTopic: Record<string, number>;
  matchedArticlesList: Article[]; // List of articles that matched at least one topic
  articleTopicMap: Map<string, string[]>; // Map of articleId -> topicIds[]
}> {
  const matchesByTopic: Record<string, number> = {};
  let matchedArticles = 0;
  let totalAssignments = 0;
  const matchedArticlesList: Article[] = [];
  const articleTopicMap = new Map<string, string[]>();
  
  for (const article of articles) {
    const matches = await assignArticleToTopics(article, topics, config);
    
    if (matches.length > 0) {
      matchedArticles++;
      totalAssignments += matches.length;
      matchedArticlesList.push(article);
      
      const topicIds = matches.map(m => m.topic.id);
      articleTopicMap.set(article.id, topicIds);
      
      for (const match of matches) {
        matchesByTopic[match.topic.name] = (matchesByTopic[match.topic.name] || 0) + 1;
      }
    }
  }
  
  return {
    totalArticles: articles.length,
    matchedArticles,
    totalAssignments,
    matchesByTopic,
    matchedArticlesList,
    articleTopicMap,
  };
}

