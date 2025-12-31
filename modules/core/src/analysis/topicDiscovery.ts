import type { Topic } from '@prisma/client';
import type { LLMProvider, TopicDiscoveryResult } from '../llm/provider.js';
import type { DiscoveredTopic } from '../llm/types.js';

export interface TopicDiscoveryConfig {
  maxTopics?: number;
  confidenceThreshold?: number;
}

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

  const deduped = deduplicateTopics(filtered, existingTopics);
  return deduped.slice(0, maxTopics);
}

export function deduplicateTopics(
  discovered: DiscoveredTopic[],
  existing: Topic[]
): DiscoveredTopic[] {
  const existingNames = new Set(
    existing.map((t) => t.name.toLowerCase().trim())
  );

  const seen = new Set<string>();
  const results: DiscoveredTopic[] = [];

  for (const topic of discovered) {
    const name = topic.name.toLowerCase().trim();
    if (existingNames.has(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    results.push(topic);
  }

  return results;
}




