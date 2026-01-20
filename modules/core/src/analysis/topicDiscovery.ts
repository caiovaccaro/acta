import type { Topic } from '@prisma/client';
import type { LLMProvider, TopicDiscoveryResult } from '../llm/provider';
import type { DiscoveredTopic } from '../llm/types';

export interface TopicDiscoveryConfig {
  maxTopics?: number;
  confidenceThreshold?: number;
  tokenOverlapThreshold?: number;
  fuzzyThreshold?: number;
}

const TOPIC_ALIASES: Record<string, string[]> = {
  'israel gaza war': ['gaza war', 'israel gaza', 'gaza conflict', 'gaza'],
  'russia ukraine war': ['ukraine war', 'russia ukraine', 'ukraine conflict'],
  'us election': ['u.s. election', 'american election', 'presidential election'],
};

export async function discoverTopics(
  articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>,
  existingTopics: Topic[],
  llmProvider: LLMProvider,
  config: TopicDiscoveryConfig = {}
): Promise<DiscoveredTopic[]> {
  const { maxTopics = 10, confidenceThreshold = 0.6 } = config;

  if (articles.length === 0) return [];

  const result: TopicDiscoveryResult = await llmProvider.discoverTopicsFromArticles(articles);
  const filtered = (result.topics || []).filter(
    (t) => (t.name?.trim()?.length ?? 0) > 0 && (t.confidence ?? 0) >= confidenceThreshold
  );

  const deduped = deduplicateTopics(filtered, existingTopics, config);
  return deduped.slice(0, maxTopics);
}

export function deduplicateTopics(
  discovered: DiscoveredTopic[],
  existing: Topic[],
  config: TopicDiscoveryConfig = {}
): DiscoveredTopic[] {
  const { tokenOverlapThreshold = 0.7, fuzzyThreshold = 0.88 } = config;

  const dedupedByName = new Map<string, DiscoveredTopic>();
  for (const topic of discovered) {
    const normalized = normalizeTopicName(topic.name);
    const existingBest = dedupedByName.get(normalized);
    if (!existingBest || topic.confidence > existingBest.confidence) {
      dedupedByName.set(normalized, topic);
    }
  }

  const results: DiscoveredTopic[] = [];
  for (const topic of dedupedByName.values()) {
    const match = matchDiscoveredTopic(topic, existing, {
      tokenOverlapThreshold,
      fuzzyThreshold,
    });
    if (match) {
      results.push({
        ...topic,
        matchedTopicId: match.topic.id,
        matchConfidence: match.confidence,
        matchReason: match.reason,
      });
    } else {
      results.push({
        ...topic,
        matchReason: 'none',
      });
    }
  }

  return results;
}

function matchDiscoveredTopic(
  topic: DiscoveredTopic,
  existing: Topic[],
  config: { tokenOverlapThreshold: number; fuzzyThreshold: number }
): { topic: Topic; confidence: number; reason: 'exact' | 'alias' | 'token_overlap' | 'fuzzy' } | null {
  const normalized = normalizeTopicName(topic.name);
  if (!normalized) return null;

  let best: { topic: Topic; confidence: number; reason: 'exact' | 'alias' | 'token_overlap' | 'fuzzy' } | null = null;

  for (const candidate of existing) {
    const candidateNormalized = normalizeTopicName(candidate.name);
    if (!candidateNormalized) continue;

    if (candidateNormalized === normalized) {
      return { topic: candidate, confidence: 1, reason: 'exact' };
    }

    if (isAliasMatch(normalized, candidateNormalized)) {
      best = { topic: candidate, confidence: 0.95, reason: 'alias' };
      continue;
    }

    const overlap = tokenOverlapScore(normalized, candidateNormalized);
    if (overlap >= config.tokenOverlapThreshold) {
      if (!best || overlap > best.confidence) {
        best = { topic: candidate, confidence: overlap, reason: 'token_overlap' };
      }
      continue;
    }

    const similarity = jaroWinkler(normalized, candidateNormalized);
    if (similarity >= config.fuzzyThreshold) {
      if (!best || similarity > best.confidence) {
        best = { topic: candidate, confidence: similarity, reason: 'fuzzy' };
      }
    }
  }

  return best;
}

function normalizeTopicName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word))
    .join(' ')
    .trim();
}

const STOPWORDS = new Set([
  'the',
  'and',
  'or',
  'of',
  'for',
  'with',
  'from',
  'on',
  'in',
  'to',
  'a',
  'an',
]);

function isAliasMatch(normalized: string, candidate: string): boolean {
  const normalizedAliases = TOPIC_ALIASES[candidate] || [];
  if (normalizedAliases.map(normalizeTopicName).includes(normalized)) {
    return true;
  }
  const reverseAliases = TOPIC_ALIASES[normalized] || [];
  return reverseAliases.map(normalizeTopicName).includes(candidate);
}

function tokenOverlapScore(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
  const union = new Set([...tokensA, ...tokensB]);
  return intersection.size / union.size;
}

function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const maxDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const matchesA = new Array(a.length).fill(false);
  const matchesB = new Array(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDistance);
    const end = Math.min(i + maxDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (matchesB[j]) continue;
      if (a[i] !== b[j]) continue;
      matchesA[i] = true;
      matchesB[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!matchesA[i]) continue;
    while (!matchesB[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const m = matches;
  const jaro =
    (m / a.length + m / b.length + (m - transpositions / 2) / m) / 3;

  const prefixLength = Math.min(4, commonPrefixLength(a, b));
  const scalingFactor = 0.1;
  return jaro + prefixLength * scalingFactor * (1 - jaro);
}

function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(4, a.length, b.length);
  let count = 0;
  for (let i = 0; i < limit; i++) {
    if (a[i] === b[i]) count++;
    else break;
  }
  return count;
}



