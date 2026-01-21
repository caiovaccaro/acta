/**
 * Converge Similar Questions Script
 *
 * Groups highly similar questions within the same topic and converges them to
 * reduce "Unclear" verdicts due to insufficient articles.
 *
 * Usage:
 *   npm run db:converge:similar-questions
 *   npm run db:converge:similar-questions -- --execute
 *   npm run db:converge:similar-questions -- --month=2025-12
 *   npm run db:converge:similar-questions -- --topic-id=<topic-id>
 *   npm run db:converge:similar-questions -- --min-fuzzy=0.92 --min-token-overlap=0.75
 *   npm run db:converge:similar-questions -- --llm-confirm --llm-min-confidence=0.7
 *   npm run db:converge:similar-questions -- --llm-cluster --llm-cluster-batch=30 --llm-cluster-overlap=10
 *   npm run db:converge:similar-questions -- --exclude-question-id=<id> --exclude-text="china"
 *   npm run db:converge:similar-questions -- --exclude-source-id=<id>
 *   npm run db:converge:similar-questions -- --exclude-source-text="cybersecurity"
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  convergeQuestions,
} from '../index';
import {
  formatMonthPeriod,
  getCurrentMonthPeriod,
  parseMonthPeriod,
} from '@acta/core';
import { createLLMConfigFromEnv } from '@acta/core/llm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../../.env') });

type QuestionInfo = {
  id: string;
  topicId: string;
  topicName: string;
  questionText: string;
  stanceCount: number;
  normalized: string;
  tokens: string[];
};

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
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'do',
  'does',
  'did',
  'can',
  'could',
  'should',
  'would',
  'will',
  'has',
  'have',
  'had',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'as',
  'by',
  'at',
  'about',
]);

function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word))
    .join(' ')
    .trim();
}

function tokenOverlapScore(aTokens: string[], bTokens: string[]): number {
  const setA = new Set(aTokens.filter(Boolean));
  const setB = new Set(bTokens.filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((t) => setB.has(t)));
  const union = new Set([...setA, ...setB]);
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

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;

    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: {
    month?: string;
    topicId?: string;
    execute: boolean;
    minTokenOverlap: number;
    minFuzzy: number;
    minArticles: number;
    includeAll: boolean;
    onlyActive: boolean;
    llmConfirm: boolean;
    llmMinConfidence: number;
    llmAlways: boolean;
    llmMaxPairs: number;
    llmCluster: boolean;
    llmClusterBatch: number;
    llmClusterOverlap: number;
    llmClusterMinConfidence: number;
    excludeQuestionIds: Set<string>;
    excludeText: string[];
    excludeSourceIds: Set<string>;
    excludeSourceText: string[];
  } = {
    execute: false,
    minTokenOverlap: 0.7,
    minFuzzy: 0.9,
    minArticles: 4,
    includeAll: false,
    onlyActive: true,
    llmConfirm: false,
    llmMinConfidence: 0.6,
    llmAlways: false,
    llmMaxPairs: 200,
    llmCluster: false,
    llmClusterBatch: 30,
    llmClusterOverlap: 10,
    llmClusterMinConfidence: 0.7,
    excludeQuestionIds: new Set(),
    excludeText: [],
    excludeSourceIds: new Set(),
    excludeSourceText: [],
  };

  for (const arg of args) {
    if (arg.startsWith('--month=')) parsed.month = arg.split('=')[1];
    else if (arg.startsWith('--topic-id=')) parsed.topicId = arg.split('=')[1];
    else if (arg === '--execute') parsed.execute = true;
    else if (arg.startsWith('--min-token-overlap=')) {
      parsed.minTokenOverlap = Number(arg.split('=')[1]);
    } else if (arg.startsWith('--min-fuzzy=')) {
      parsed.minFuzzy = Number(arg.split('=')[1]);
    } else if (arg.startsWith('--min-articles=')) {
      parsed.minArticles = Number(arg.split('=')[1]);
    } else if (arg === '--include-all') {
      parsed.includeAll = true;
    } else if (arg === '--include-inactive') {
      parsed.onlyActive = false;
    } else if (arg === '--llm-confirm') {
      parsed.llmConfirm = true;
    } else if (arg.startsWith('--llm-min-confidence=')) {
      parsed.llmMinConfidence = Number(arg.split('=')[1]);
    } else if (arg === '--llm-always') {
      parsed.llmAlways = true;
    } else if (arg.startsWith('--llm-max=')) {
      parsed.llmMaxPairs = Number(arg.split('=')[1]);
    } else if (arg === '--llm-cluster') {
      parsed.llmCluster = true;
    } else if (arg.startsWith('--llm-cluster-batch=')) {
      parsed.llmClusterBatch = Number(arg.split('=')[1]);
    } else if (arg.startsWith('--llm-cluster-overlap=')) {
      parsed.llmClusterOverlap = Number(arg.split('=')[1]);
    } else if (arg.startsWith('--llm-cluster-min-confidence=')) {
      parsed.llmClusterMinConfidence = Number(arg.split('=')[1]);
    } else if (arg.startsWith('--exclude-question-id=')) {
      parsed.excludeQuestionIds.add(arg.split('=')[1]);
    } else if (arg.startsWith('--exclude-text=')) {
      parsed.excludeText.push(arg.split('=')[1].toLowerCase());
    } else if (arg.startsWith('--exclude-source-id=')) {
      parsed.excludeSourceIds.add(arg.split('=')[1]);
    } else if (arg.startsWith('--exclude-source-text=')) {
      parsed.excludeSourceText.push(arg.split('=')[1].toLowerCase());
    }
  }

  return parsed;
}

async function confirmMergeWithLLM(params: {
  topicName: string;
  targetText: string;
  sourceText: string;
  model: string;
  apiKey: string;
}): Promise<{ equivalent: boolean; confidence: number; notes: string }> {
  const prompt = `You are validating whether two questions are semantically equivalent and should be merged.

Topic: ${params.topicName}
Question A: ${params.targetText}
Question B: ${params.sourceText}

Return JSON:
{
  "equivalent": true/false,
  "confidence": 0.0-1.0,
  "notes": "short reasoning"
}

Guidance:
- Only say true if the questions are essentially asking the same thing.
- If one is narrower, more specific, or asks a different angle, answer false.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM request failed (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM response missing content');
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`LLM response was not valid JSON: ${content}`);
  }

  return {
    equivalent: Boolean(parsed.equivalent),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))),
    notes: String(parsed.notes || ''),
  };
}

async function clusterQuestionsWithLLM(params: {
  topicName: string;
  questions: Array<{ id: string; text: string }>;
  model: string;
  apiKey: string;
}): Promise<Array<{ ids: string[]; confidence: number; notes: string }>> {
  const list = params.questions
    .map((q, i) => `${i + 1}. [${q.id}] ${q.text}`)
    .join('\n');

  const prompt = `You are clustering questions that are semantically equivalent and should be merged.

Topic: ${params.topicName}
Questions:
${list}

Return JSON with an array "clusters". Each cluster must include ONLY questions that are essentially the same.
Do NOT merge if one question is narrower, more specific, or asks a different angle.

Return JSON:
{
  "clusters": [
    { "ids": ["id1","id2"], "confidence": 0.0-1.0, "notes": "short reason" }
  ]
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM request failed (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM response missing content');
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`LLM response was not valid JSON: ${content}`);
  }

  const clusters = Array.isArray(parsed.clusters) ? parsed.clusters : [];
  return clusters
    .filter((c: any) => Array.isArray(c.ids) && c.ids.length >= 2)
    .map((c: any) => ({
      ids: c.ids.map((id: any) => String(id)),
      confidence: Math.max(0, Math.min(1, Number(c.confidence || 0))),
      notes: String(c.notes || ''),
    }));
}

async function main() {
  const args = parseArgs();
  const monthPeriod = args.month
    ? parseMonthPeriod(args.month)
    : getCurrentMonthPeriod();

  console.log('🧠 Converging similar questions');
  console.log(`📅 Month period: ${formatMonthPeriod(monthPeriod)}`);
  console.log(`🧪 Mode: ${args.execute ? 'execute' : 'dry-run'}`);
  console.log(
    `🔧 Thresholds: tokenOverlap>=${args.minTokenOverlap}, fuzzy>=${args.minFuzzy}`
  );
  console.log(
    `🔧 Filters: minArticles=${args.minArticles}, includeAll=${args.includeAll}, onlyActive=${args.onlyActive}`
  );
  if (args.excludeQuestionIds.size > 0 || args.excludeText.length > 0) {
    console.log(
      `🛑 Exclusions: ids=${args.excludeQuestionIds.size}, text=${args.excludeText.length}`
    );
  }
  if (args.excludeSourceIds.size > 0) {
    console.log(`🛑 Source exclusions: ids=${args.excludeSourceIds.size}`);
  }
  if (args.excludeSourceText.length > 0) {
    console.log(`🛑 Source exclusions: text=${args.excludeSourceText.length}`);
  }
  if (args.llmConfirm) {
    console.log(
      `🤖 LLM confirm: minConfidence=${args.llmMinConfidence}, always=${args.llmAlways}, maxPairs=${args.llmMaxPairs}`
    );
  }
  if (args.llmCluster) {
    console.log(
      `🧩 LLM cluster: batch=${args.llmClusterBatch}, overlap=${args.llmClusterOverlap}, minConfidence=${args.llmClusterMinConfidence}`
    );
  }
  if (args.topicId) {
    console.log(`🎯 Topic filter: ${args.topicId}`);
  }
  console.log('');

  try {
    await connectDatabase();
    const llmConfig = args.llmConfirm || args.llmCluster
      ? createLLMConfigFromEnv()
      : null;
    const llmModel = llmConfig?.openai?.model || 'gpt-4-turbo-preview';
    const llmApiKey = llmConfig?.openai?.apiKey || '';

    const questions = await prisma.question.findMany({
      where: {
        ...(args.topicId ? { topicId: args.topicId } : {}),
        ...(args.onlyActive ? { isActive: true } : {}),
      },
      include: {
        topic: true,
        _count: {
          select: {
            articleStances: {
              where: {
                articleAnalysisAttempt: {
                  month: monthPeriod,
                },
              },
            },
          },
        },
      },
    });

    const filteredQuestions = questions.filter((q) => {
      if (args.excludeQuestionIds.has(q.id)) return false;
      if (args.excludeText.length === 0) return true;
      const text = (q.questionText || '').toLowerCase();
      return !args.excludeText.some((needle) => text.includes(needle));
    });

    if (filteredQuestions.length === 0) {
      console.log('ℹ️  No questions found for the given filters.');
      return;
    }

    const questionInfos: QuestionInfo[] = filteredQuestions.map((q) => {
      const normalized = normalizeQuestionText(q.questionText || '');
      const tokens = normalized.split(/\s+/).filter(Boolean);
      return {
        id: q.id,
        topicId: q.topicId,
        topicName: q.topic?.name || 'Unknown',
        questionText: q.questionText,
        stanceCount: q._count.articleStances,
        normalized,
        tokens,
      };
    });

    const questionsByTopic = new Map<string, QuestionInfo[]>();
    for (const q of questionInfos) {
      if (!questionsByTopic.has(q.topicId)) {
        questionsByTopic.set(q.topicId, []);
      }
      questionsByTopic.get(q.topicId)!.push(q);
    }

    let clustersPlanned = 0;
    let mergesPlanned = 0;
    let clustersExecuted = 0;
    let mergesExecuted = 0;
    let llmPairsChecked = 0;
    let llmClustersChecked = 0;

    for (const [topicId, topicQuestions] of questionsByTopic.entries()) {
      if (topicQuestions.length < 2) continue;

      const uf = new UnionFind(topicQuestions.length);
      for (let i = 0; i < topicQuestions.length; i++) {
        for (let j = i + 1; j < topicQuestions.length; j++) {
          const a = topicQuestions[i];
          const b = topicQuestions[j];
          const tokenScore = tokenOverlapScore(a.tokens, b.tokens);
          const fuzzyScore = jaroWinkler(a.normalized, b.normalized);

          if (
            tokenScore >= args.minTokenOverlap ||
            fuzzyScore >= args.minFuzzy
          ) {
            uf.union(i, j);
          }
        }
      }

      if (args.llmCluster) {
        if (!llmApiKey) {
          throw new Error('OPENAI_API_KEY is required for --llm-cluster');
        }

        const sorted = [...topicQuestions].sort((a, b) =>
          a.normalized.localeCompare(b.normalized)
        );
        const batchSize = Math.max(5, args.llmClusterBatch);
        const overlap = Math.max(0, Math.min(batchSize - 1, args.llmClusterOverlap));

        for (let start = 0; start < sorted.length; start += batchSize - overlap) {
          const batch = sorted.slice(start, start + batchSize);
          if (batch.length < 2) continue;

          const clusters = await clusterQuestionsWithLLM({
            topicName: batch[0].topicName,
            questions: batch.map((q) => ({ id: q.id, text: q.questionText })),
            model: llmModel,
            apiKey: llmApiKey,
          });
          llmClustersChecked++;

          for (const cluster of clusters) {
            if (cluster.confidence < args.llmClusterMinConfidence) continue;
            const indices = cluster.ids
              .map((id) => topicQuestions.findIndex((q) => q.id === id))
              .filter((index) => index >= 0);
            if (indices.length < 2) continue;
            const first = indices[0];
            for (let i = 1; i < indices.length; i++) {
              uf.union(first, indices[i]);
            }
          }
        }
      }

      const clusters = new Map<number, QuestionInfo[]>();
      for (let i = 0; i < topicQuestions.length; i++) {
        const root = uf.find(i);
        if (!clusters.has(root)) clusters.set(root, []);
        clusters.get(root)!.push(topicQuestions[i]);
      }

      for (const cluster of clusters.values()) {
        if (cluster.length < 2) continue;

        const totalStances = cluster.reduce(
          (sum, q) => sum + q.stanceCount,
          0
        );
        const hasLowCount = cluster.some(
          (q) => q.stanceCount < args.minArticles
        );

        if (!args.includeAll) {
          if (!hasLowCount) continue;
          if (totalStances < args.minArticles) continue;
        }

        const target = cluster.reduce((best, current) => {
          if (current.stanceCount > best.stanceCount) return current;
          if (current.stanceCount === best.stanceCount) {
            return current.questionText.length >= best.questionText.length
              ? current
              : best;
          }
          return best;
        });

        let sources = cluster.filter((q) => q.id !== target.id);
        if (args.excludeSourceIds.size > 0) {
          sources = sources.filter((q) => !args.excludeSourceIds.has(q.id));
        }
        if (args.excludeSourceText.length > 0) {
          sources = sources.filter((q) => {
            const text = (q.questionText || '').toLowerCase();
            return !args.excludeSourceText.some((needle) => text.includes(needle));
          });
        }
        if (sources.length === 0) continue;

        if (args.llmConfirm) {
          const verifiedSources: QuestionInfo[] = [];
          for (const source of sources) {
            if (llmPairsChecked >= args.llmMaxPairs) {
              console.log('   ⚠️  LLM maxPairs reached, skipping further checks.');
              break;
            }

            const tokenScore = tokenOverlapScore(target.tokens, source.tokens);
            const fuzzyScore = jaroWinkler(target.normalized, source.normalized);
            const shouldCheck = args.llmAlways
              ? true
              : tokenScore < 0.95 && fuzzyScore < 0.97;

            if (!shouldCheck) {
              verifiedSources.push(source);
              continue;
            }

            const llmResult = await confirmMergeWithLLM({
              topicName: target.topicName,
              targetText: target.questionText,
              sourceText: source.questionText,
              model: llmModel,
              apiKey: llmApiKey,
            });
            llmPairsChecked++;

            if (llmResult.equivalent && llmResult.confidence >= args.llmMinConfidence) {
              verifiedSources.push(source);
            } else {
              console.log(
                `   ❌ LLM rejected merge: "${source.questionText}" ` +
                  `(conf ${(llmResult.confidence * 100).toFixed(0)}%)`
              );
            }
          }

          sources = verifiedSources;
          if (sources.length === 0) continue;
        }

        clustersPlanned++;
        mergesPlanned += sources.length;

        console.log(
          `\n🧩 Topic: ${target.topicName} (${topicId})`
        );
        console.log(
          `   Target: "${target.questionText}" [${target.id}] (${target.stanceCount} stances)`
        );
        for (const source of sources) {
          console.log(
            `   Source: "${source.questionText}" [${source.id}] (${source.stanceCount} stances)`
          );
        }

        if (args.execute) {
          const result = await convergeQuestions({
            targetQuestionId: target.id,
            sourceQuestionIds: sources.map((s) => s.id),
          });
          clustersExecuted++;
          mergesExecuted += sources.length;
          console.log(
            `   ✅ Converged: ${result.deletedQuestions} question(s) removed, ` +
              `${result.migratedArticleStances} stances migrated`
          );
        }
      }
    }

    console.log('\n📊 Summary');
    console.log(`   Planned clusters: ${clustersPlanned}`);
    console.log(`   Planned merges: ${mergesPlanned}`);
    if (args.llmCluster) {
      console.log(`   LLM cluster batches: ${llmClustersChecked}`);
    }
    if (args.execute) {
      console.log(`   Executed clusters: ${clustersExecuted}`);
      console.log(`   Executed merges: ${mergesExecuted}`);
    } else {
      console.log('   Dry run only. Re-run with --execute to apply.');
    }
  } catch (error) {
    console.error('❌ Error converging similar questions:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();

