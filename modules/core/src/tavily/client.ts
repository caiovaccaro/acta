import {
  remainingSearchBudget,
  TAVILY_MAX_RESULTS_PER_SEARCH,
  utcDayKey,
  utcMonthKey,
} from './queryGroups';
import { normalizeTavilyResults, type NormalizedTrendSignal } from './normalize';

export type TavilyDegradeReason =
  | 'timeout'
  | 'malformed'
  | 'empty'
  | 'quota'
  | 'network'
  | 'missing_key';

export interface TavilySearchResult {
  ok: boolean;
  query: string;
  signals: NormalizedTrendSignal[];
  degraded: boolean;
  reason?: TavilyDegradeReason;
}

export function tavilyLogStatus(result: TavilySearchResult): string {
  return result.reason ? result.reason : 'success';
}

export interface TavilyClientConfig {
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
}

const DEFAULT_ENDPOINT = 'https://api.tavily.com/search';

export async function searchTavilyBasic(
  input: {
    query: string;
    usedToday: number;
    usedThisMonth: number;
  },
  config: TavilyClientConfig,
): Promise<TavilySearchResult> {
  const budget = remainingSearchBudget({
    usedToday: input.usedToday,
    usedThisMonth: input.usedThisMonth,
  });
  if (budget.remaining <= 0) {
    return {
      ok: false,
      query: input.query,
      signals: [],
      degraded: true,
      reason: 'quota',
    };
  }
  if (!config.apiKey) {
    return {
      ok: false,
      query: input.query,
      signals: [],
      degraded: true,
      reason: 'missing_key',
    };
  }

  const fetchImpl = config.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8000);
  try {
    const response = await fetchImpl(config.endpoint ?? DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: config.apiKey,
        query: input.query,
        search_depth: 'basic',
        max_results: TAVILY_MAX_RESULTS_PER_SEARCH,
        include_answer: false,
        topic: 'news',
      }),
    });
    if (response.status === 402 || response.status === 429) {
      return degrade(input.query, 'quota');
    }
    if (!response.ok) {
      return degrade(input.query, 'network');
    }
    const payload = await response.json() as { results?: unknown };
    if (!payload || !Array.isArray(payload.results)) {
      return degrade(input.query, 'malformed');
    }
    const signals = normalizeTavilyResults(input.query, payload.results);
    if (signals.length === 0) {
      return degrade(input.query, 'empty');
    }
    return { ok: true, query: input.query, signals, degraded: false };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return degrade(input.query, aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timeout);
  }
}

export function searchLogDay(now: Date): string {
  return utcDayKey(now);
}

export function searchLogMonth(now: Date): string {
  return utcMonthKey(now);
}

function degrade(query: string, reason: TavilyDegradeReason): TavilySearchResult {
  return {
    ok: false,
    query,
    signals: [],
    degraded: true,
    reason,
  };
}
