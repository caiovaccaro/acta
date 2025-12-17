import type { Topic, Question } from '@prisma/client';
import type { LLMProvider } from '../llm/provider.js';
import type { DiscoveredQuestion, QuestionDiscoveryResult } from '../llm/types.js';

export interface QuestionDiscoveryConfig {
  maxQuestionsPerTopic?: number;
  confidenceThreshold?: number;
}

export async function discoverQuestionsForTopic(
  topic: Topic,
  articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>,
  existingQuestions: Question[],
  llmProvider: LLMProvider,
  config: QuestionDiscoveryConfig = {}
): Promise<DiscoveredQuestion[]> {
  const { maxQuestionsPerTopic = 10, confidenceThreshold = 0.7 } = config;

  if (articles.length === 0) return [];

  const result: QuestionDiscoveryResult = await llmProvider.discoverQuestionsFromArticles({
    topic: { id: topic.id, name: topic.name, description: topic.description ?? undefined },
    articles,
  });

  const filtered = (result.questions || []).filter(
    (q) => (q.questionText?.trim()?.length ?? 0) > 0 && (q.confidence ?? 0) >= confidenceThreshold
  );

  const deduped = deduplicateQuestions(filtered, existingQuestions);
  return deduped.slice(0, maxQuestionsPerTopic);
}

export function deduplicateQuestions(
  discovered: DiscoveredQuestion[],
  existing: Question[]
): DiscoveredQuestion[] {
  const existingTexts = new Set(
    existing.map((q) => q.questionText.toLowerCase().trim())
  );

  const seen = new Set<string>();
  const results: DiscoveredQuestion[] = [];

  for (const question of discovered) {
    const text = question.questionText.toLowerCase().trim();
    if (existingTexts.has(text)) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    results.push(question);
  }

  return results;
}

