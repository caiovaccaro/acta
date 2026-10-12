import { parseDecimalToMicros } from '../llm/usageLedger';
import { PRIORITY_UNIT_COST_USD, normalizeMatchTitle, titleTokens } from '../tavily/priority';

export const MODERATION_POLICY_VERSION = 'acta-moderation-policy/v1';
export const MODERATION_POLICY_MODE = 'shadow';

export const DEFAULT_TOPIC_POLICY_THRESHOLDS = {
  minConfidence: 0.8,
  minArticles: 3,
  minOutlets: 2,
  minTavilyResults: 3,
  minTavilyDomains: 2,
} as const;

export const SAFETY_SENSITIVE_TOKENS = [
  'firearm',
  'assault rifle',
  'explosive device',
  'weaponize',
  'child sexual',
  'child pornography',
  'csam',
  'suicide',
  'self-harm',
  'kill myself',
  'violent extremism',
  'terrorist attack',
  'mass shooting',
] as const;

export type PolicyConditionId =
  | 'discovery_confidence'
  | 'supporting_articles'
  | 'supporting_outlets'
  | 'tavily_corroboration'
  | 'not_near_duplicate'
  | 'not_safety_sensitive'
  | 'name_description_valid'
  | 'budget_permits';

export interface PolicyConditionResult {
  id: PolicyConditionId;
  passed: boolean;
  threshold?: number | string | null;
  actual?: number | string | boolean | null;
  evidenceIds: string[];
  reason: string;
}

export interface TopicPolicyInput {
  id: string;
  name: string;
  description: string | null;
  confidence: number | null;
  articles: Array<{ id: string; outletId: string }>;
  tavily: Array<{ id: string; domain: string; title?: string }>;
  approvedTopicNames: string[];
  remainingUsd: string;
}

export interface TopicPolicyDecision {
  subjectType: 'topic';
  subjectId: string;
  policyVersion: string;
  mode: typeof MODERATION_POLICY_MODE;
  decision: 'propose_approve' | 'pending';
  mutateStatus: false;
  conditions: PolicyConditionResult[];
}

export interface TopicPolicyThresholds {
  minConfidence: number;
  minArticles: number;
  minOutlets: number;
  minTavilyResults: number;
  minTavilyDomains: number;
}

export function resolveTopicPolicyThresholds(
  env: NodeJS.ProcessEnv = process.env,
): TopicPolicyThresholds {
  return {
    minConfidence: readNumber(env.TOPIC_AUTO_APPROVE_MIN_CONFIDENCE, DEFAULT_TOPIC_POLICY_THRESHOLDS.minConfidence),
    minArticles: readInteger(env.TOPIC_AUTO_APPROVE_MIN_ARTICLES, DEFAULT_TOPIC_POLICY_THRESHOLDS.minArticles),
    minOutlets: readInteger(env.TOPIC_AUTO_APPROVE_MIN_OUTLETS, DEFAULT_TOPIC_POLICY_THRESHOLDS.minOutlets),
    minTavilyResults: readInteger(
      env.TOPIC_AUTO_APPROVE_MIN_TAVILY_RESULTS,
      DEFAULT_TOPIC_POLICY_THRESHOLDS.minTavilyResults,
    ),
    minTavilyDomains: readInteger(
      env.TOPIC_AUTO_APPROVE_MIN_TAVILY_DOMAINS,
      DEFAULT_TOPIC_POLICY_THRESHOLDS.minTavilyDomains,
    ),
  };
}

function readNumber(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function isSafetySensitiveText(value: string): boolean {
  const haystack = ` ${normalizeMatchTitle(value)} `;
  return SAFETY_SENSITIVE_TOKENS.some((token) => haystack.includes(` ${normalizeMatchTitle(token)} `));
}

export function isValidTopicName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= 120;
}

export function isValidTopicDescription(description: string | null): boolean {
  return typeof description === 'string' && description.trim().length >= 12;
}

export function isNearDuplicateName(name: string, approvedTopicNames: string[]): boolean {
  const normalized = normalizeMatchTitle(name);
  if (!normalized) {
    return false;
  }
  return approvedTopicNames.some((approved) => normalizeMatchTitle(approved) === normalized);
}

function corroboratingTavily(topicName: string, signals: TopicPolicyInput['tavily']) {
  const tokens = titleTokens(topicName);
  return signals.filter((signal) => {
    if (tokens.length === 0) {
      return false;
    }
    const haystack = ` ${normalizeMatchTitle(signal.title ?? '')} `;
    return tokens.every((token) => haystack.includes(` ${token} `));
  });
}

function condition(
  id: PolicyConditionId,
  passed: boolean,
  input: {
    threshold?: number | string | null;
    actual?: number | string | boolean | null;
    evidenceIds?: string[];
    reason: string;
  },
): PolicyConditionResult {
  return {
    id,
    passed,
    threshold: input.threshold ?? null,
    actual: input.actual ?? null,
    evidenceIds: input.evidenceIds ?? [],
    reason: input.reason,
  };
}

export function evaluateTopicPolicy(
  input: TopicPolicyInput,
  thresholds: TopicPolicyThresholds = DEFAULT_TOPIC_POLICY_THRESHOLDS,
): TopicPolicyDecision {
  const uniqueOutlets = Array.from(new Set(input.articles.map((article) => article.outletId)));
  const tavilyHits = corroboratingTavily(input.name, input.tavily);
  const tavilyDomains = Array.from(new Set(tavilyHits.map((signal) => signal.domain)));
  const remainingMicros = parseDecimalToMicros(input.remainingUsd);
  const unitMicros = parseDecimalToMicros(PRIORITY_UNIT_COST_USD);
  const safetyHit = isSafetySensitiveText(`${input.name} ${input.description ?? ''}`);

  const conditions: PolicyConditionResult[] = [
    input.confidence == null
      ? condition('discovery_confidence', false, {
        threshold: thresholds.minConfidence,
        actual: null,
        reason: 'missing_evidence',
      })
      : condition('discovery_confidence', input.confidence >= thresholds.minConfidence, {
        threshold: thresholds.minConfidence,
        actual: input.confidence,
        reason: input.confidence >= thresholds.minConfidence ? 'met' : 'below_threshold',
      }),
    condition('supporting_articles', input.articles.length >= thresholds.minArticles, {
      threshold: thresholds.minArticles,
      actual: input.articles.length,
      evidenceIds: input.articles.map((article) => article.id),
      reason: input.articles.length >= thresholds.minArticles ? 'met' : 'below_threshold',
    }),
    condition('supporting_outlets', uniqueOutlets.length >= thresholds.minOutlets, {
      threshold: thresholds.minOutlets,
      actual: uniqueOutlets.length,
      evidenceIds: uniqueOutlets,
      reason: uniqueOutlets.length >= thresholds.minOutlets ? 'met' : 'below_threshold',
    }),
    tavilyHits.length === 0
      ? condition('tavily_corroboration', false, {
        threshold: `${thresholds.minTavilyResults} results/${thresholds.minTavilyDomains} domains`,
        actual: null,
        reason: 'missing_evidence',
      })
      : condition(
        'tavily_corroboration',
        tavilyHits.length >= thresholds.minTavilyResults
          && tavilyDomains.length >= thresholds.minTavilyDomains,
        {
          threshold: `${thresholds.minTavilyResults} results/${thresholds.minTavilyDomains} domains`,
          actual: `${tavilyHits.length} results/${tavilyDomains.length} domains`,
          evidenceIds: tavilyHits.map((signal) => signal.id),
          reason: tavilyHits.length >= thresholds.minTavilyResults
              && tavilyDomains.length >= thresholds.minTavilyDomains
            ? 'met'
            : 'below_threshold',
        },
      ),
    condition('not_near_duplicate', !isNearDuplicateName(input.name, input.approvedTopicNames), {
      actual: isNearDuplicateName(input.name, input.approvedTopicNames),
      reason: isNearDuplicateName(input.name, input.approvedTopicNames)
        ? 'near_duplicate'
        : 'unique',
    }),
    condition('not_safety_sensitive', !safetyHit, {
      actual: safetyHit,
      reason: safetyHit ? 'safety_sensitive' : 'clear',
    }),
    condition(
      'name_description_valid',
      isValidTopicName(input.name) && isValidTopicDescription(input.description),
      {
        actual: isValidTopicName(input.name) && isValidTopicDescription(input.description),
        reason: isValidTopicName(input.name) && isValidTopicDescription(input.description)
          ? 'valid'
          : 'invalid',
      },
    ),
    condition('budget_permits', remainingMicros >= unitMicros, {
      threshold: PRIORITY_UNIT_COST_USD,
      actual: input.remainingUsd,
      reason: remainingMicros >= unitMicros ? 'met' : 'below_threshold',
    }),
  ];

  const decision = conditions.every((row) => row.passed) ? 'propose_approve' : 'pending';
  return {
    subjectType: 'topic',
    subjectId: input.id,
    policyVersion: MODERATION_POLICY_VERSION,
    mode: MODERATION_POLICY_MODE,
    decision,
    mutateStatus: false,
    conditions,
  };
}
