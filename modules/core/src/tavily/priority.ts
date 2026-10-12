import { LEDGER_ZERO, parseDecimalToMicros } from '../llm/usageLedger';
import { domainFromUrl, normalizeTavilyUrl } from './normalize';

export const PRIORITY_SCORE_WEIGHTS = {
  topicTrend: 40,
  exactArticleMatch: 30,
  recency: 15,
  backlogAge: 15,
} as const;

export const PRIORITY_POOL_RATIO = 0.7;
export const SCORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const PRIORITY_UNIT_COST_USD = '0.050000';

export type WorkKind = 'crawl' | 'article';
export type AllocationPool = 'priority' | 'age';

export interface MatchCandidate {
  id: string;
  url: string;
  title?: string | null;
  domain?: string | null;
}

export interface TopicCandidate {
  id: string;
  name: string;
  aliases?: string[];
  approved: boolean;
}

export interface SignalMatchInput {
  id: string;
  url: string;
  title: string;
  domain: string;
}

export interface SignalMatch {
  signalId: string;
  matchedTopicId: string | null;
  matchedArticleId: string | null;
  matchedCrawlRequestId: string | null;
  reason: 'exact_url' | 'title_domain' | 'topic_alias' | 'ambiguous' | 'unmatched';
}

export interface WorkItem {
  id: string;
  kind: WorkKind;
  createdAt: Date;
  publishedAt: Date | null;
  topicTrend: boolean;
  exactMatch: boolean;
}

export interface AllocatedItem extends WorkItem {
  score: number;
  pool: AllocationPool;
}

export interface EffectiveCap {
  configured: number;
  budgetDerived: number;
  effective: number;
  skippedDueToBudget: number;
}

export function normalizeMatchTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function titleTokens(value: string): string[] {
  return normalizeMatchTitle(value).split(' ').filter((token) => token.length >= 3);
}

function uniqueMatch(ids: string[]): string | 'ambiguous' | null {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) {
    return null;
  }
  if (unique.length > 1) {
    return 'ambiguous';
  }
  return unique[0];
}

function urlEquals(candidateUrl: string, signalUrl: string): boolean {
  return normalizeTavilyUrl(candidateUrl) === signalUrl;
}

function titleDomainEquals(candidate: MatchCandidate, signal: SignalMatchInput): boolean {
  const title = candidate.title ? normalizeMatchTitle(candidate.title) : '';
  const signalTitle = normalizeMatchTitle(signal.title);
  if (!title || !signalTitle || title !== signalTitle) {
    return false;
  }
  const domain = (candidate.domain ?? domainFromUrl(candidate.url) ?? '').replace(/^www\./, '');
  return domain === signal.domain;
}

function matchCandidates(
  signal: SignalMatchInput,
  candidates: MatchCandidate[],
): { id: string | null; reason: 'exact_url' | 'title_domain' | 'ambiguous' | null } {
  const exact = uniqueMatch(
    candidates.filter((candidate) => urlEquals(candidate.url, signal.url)).map((candidate) => candidate.id),
  );
  if (exact === 'ambiguous') {
    return { id: null, reason: 'ambiguous' };
  }
  if (exact) {
    return { id: exact, reason: 'exact_url' };
  }
  const titled = uniqueMatch(
    candidates.filter((candidate) => titleDomainEquals(candidate, signal)).map((candidate) => candidate.id),
  );
  if (titled === 'ambiguous') {
    return { id: null, reason: 'ambiguous' };
  }
  if (titled) {
    return { id: titled, reason: 'title_domain' };
  }
  return { id: null, reason: null };
}

function matchTopic(signal: SignalMatchInput, topics: TopicCandidate[]): string | 'ambiguous' | null {
  const haystack = ` ${normalizeMatchTitle(signal.title)} `;
  const hits = topics.filter((topic) => {
    if (!topic.approved) {
      return false;
    }
    const aliases = [topic.name, ...(topic.aliases ?? [])];
    return aliases.some((alias) => {
      const tokens = titleTokens(alias);
      return tokens.length > 0 && tokens.every((token) => haystack.includes(` ${token} `));
    });
  });
  return uniqueMatch(hits.map((topic) => topic.id));
}

export function matchSignal(
  signal: SignalMatchInput,
  articles: MatchCandidate[],
  crawls: MatchCandidate[],
  topics: TopicCandidate[],
): SignalMatch {
  const article = matchCandidates(signal, articles);
  const crawl = matchCandidates(signal, crawls);
  const topic = matchTopic(signal, topics);

  if (article.reason === 'ambiguous' || crawl.reason === 'ambiguous' || topic === 'ambiguous') {
    return {
      signalId: signal.id,
      matchedTopicId: null,
      matchedArticleId: null,
      matchedCrawlRequestId: null,
      reason: 'ambiguous',
    };
  }

  const matchedTopicId = topic;
  const matchedArticleId = article.id;
  const matchedCrawlRequestId = crawl.id;
  if (!matchedTopicId && !matchedArticleId && !matchedCrawlRequestId) {
    return {
      signalId: signal.id,
      matchedTopicId: null,
      matchedArticleId: null,
      matchedCrawlRequestId: null,
      reason: 'unmatched',
    };
  }

  const reason = article.reason ?? crawl.reason ?? 'topic_alias';
  return {
    signalId: signal.id,
    matchedTopicId,
    matchedArticleId,
    matchedCrawlRequestId,
    reason,
  };
}

export function matchSignals(
  signals: SignalMatchInput[],
  articles: MatchCandidate[],
  crawls: MatchCandidate[],
  topics: TopicCandidate[],
): SignalMatch[] {
  const seenUrls = new Set<string>();
  return signals.map((signal) => {
    if (seenUrls.has(signal.url)) {
      return {
        signalId: signal.id,
        matchedTopicId: null,
        matchedArticleId: null,
        matchedCrawlRequestId: null,
        reason: 'ambiguous' as const,
      };
    }
    seenUrls.add(signal.url);
    return matchSignal(signal, articles, crawls, topics);
  });
}

function clampRatio(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function scaleWeight(ratio: number, weight: number): number {
  return Math.floor(clampRatio(ratio) * weight + 1e-9);
}

export function recencyScore(at: Date, now: Date): number {
  const ageMs = now.getTime() - at.getTime();
  return scaleWeight(1 - ageMs / SCORE_WINDOW_MS, PRIORITY_SCORE_WEIGHTS.recency);
}

export function backlogAgeScore(createdAt: Date, now: Date): number {
  const ageMs = now.getTime() - createdAt.getTime();
  return scaleWeight(ageMs / SCORE_WINDOW_MS, PRIORITY_SCORE_WEIGHTS.backlogAge);
}

export function scoreWorkItem(item: WorkItem, now: Date): number {
  let score = 0;
  if (item.topicTrend) {
    score += PRIORITY_SCORE_WEIGHTS.topicTrend;
  }
  if (item.exactMatch) {
    score += PRIORITY_SCORE_WEIGHTS.exactArticleMatch;
  }
  score += recencyScore(item.publishedAt ?? item.createdAt, now);
  score += backlogAgeScore(item.createdAt, now);
  return score;
}

export function allocateWork(items: WorkItem[], cap: number, now: Date): AllocatedItem[] {
  if (!Number.isInteger(cap) || cap <= 0 || items.length === 0) {
    return [];
  }

  const scored: AllocatedItem[] = items.map((item) => ({
    ...item,
    score: scoreWorkItem(item, now),
    pool: 'priority',
  }));
  const byScore = [...scored].sort((left, right) => (
    right.score - left.score || left.id.localeCompare(right.id)
  ));
  const byAge = [...scored].sort((left, right) => (
    left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id)
  ));

  const priorityCap = Math.floor(cap * PRIORITY_POOL_RATIO);
  const ageCap = cap - priorityCap;
  const selected: AllocatedItem[] = [];
  const used = new Set<string>();

  const take = (source: AllocatedItem[], pool: AllocationPool, limit: number) => {
    for (const item of source) {
      if (selected.filter((row) => row.pool === pool).length >= limit) {
        break;
      }
      if (used.has(item.id)) {
        continue;
      }
      selected.push({ ...item, pool });
      used.add(item.id);
    }
  };

  take(byScore, 'priority', priorityCap);
  take(byAge, 'age', ageCap);

  const priorityUnused = priorityCap - selected.filter((row) => row.pool === 'priority').length;
  const ageUnused = ageCap - selected.filter((row) => row.pool === 'age').length;
  if (priorityUnused > 0) {
    take(byAge, 'age', selected.filter((row) => row.pool === 'age').length + priorityUnused);
  }
  if (ageUnused > 0) {
    take(byScore, 'priority', selected.filter((row) => row.pool === 'priority').length + ageUnused);
  }
  let remaining = cap - selected.length;
  for (const item of byScore) {
    if (remaining <= 0) {
      break;
    }
    if (used.has(item.id)) {
      continue;
    }
    selected.push({ ...item, pool: 'priority' });
    used.add(item.id);
    remaining -= 1;
  }
  return selected;
}

export function budgetDerivedCap(
  remainingUsd: string,
  unitCostUsd: string = PRIORITY_UNIT_COST_USD,
): number {
  const remaining = parseDecimalToMicros(remainingUsd);
  const unit = parseDecimalToMicros(unitCostUsd);
  if (remaining <= LEDGER_ZERO || unit <= LEDGER_ZERO) {
    return 0;
  }
  const affordable = remaining / unit;
  const asNumber = Number(affordable);
  if (!Number.isSafeInteger(asNumber) || asNumber < 0) {
    return 0;
  }
  return asNumber;
}

export function effectiveStageCap(configured: number, remainingUsd: string): EffectiveCap {
  const budgetDerived = budgetDerivedCap(remainingUsd);
  const effective = Math.min(Math.max(0, configured), budgetDerived);
  return {
    configured,
    budgetDerived,
    effective,
    skippedDueToBudget: Math.max(0, configured - effective),
  };
}
