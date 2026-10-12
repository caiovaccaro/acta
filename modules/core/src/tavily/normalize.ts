import { TAVILY_MAX_RESULTS_PER_SEARCH } from './queryGroups';

export interface RawTavilyResult {
  title?: unknown;
  url?: unknown;
  score?: unknown;
  published_date?: unknown;
  content?: unknown;
}

export interface NormalizedTrendSignal {
  query: string;
  title: string;
  url: string;
  domain: string;
  publishedAt: Date | null;
  score: number;
}

const FORBIDDEN_RAW_KEYS = ['api_key', 'apiKey', 'key'];

export function normalizeTavilyUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    parsed.hash = '';
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
}

export function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function clampScore(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, numeric));
}

export function normalizeTavilyResults(
  query: string,
  results: unknown,
): NormalizedTrendSignal[] {
  if (!Array.isArray(results)) {
    return [];
  }
  const seenUrls = new Set<string>();
  const seenDomains = new Set<string>();
  const normalized: NormalizedTrendSignal[] = [];
  for (const item of results) {
    if (normalized.length >= TAVILY_MAX_RESULTS_PER_SEARCH) {
      break;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const raw = item as RawTavilyResult;
    if (typeof raw.url !== 'string' || typeof raw.title !== 'string') {
      continue;
    }
    const url = normalizeTavilyUrl(raw.url);
    const domain = url ? domainFromUrl(url) : null;
    if (!url || !domain || seenUrls.has(url) || seenDomains.has(domain)) {
      continue;
    }
    seenUrls.add(url);
    seenDomains.add(domain);
    normalized.push({
      query,
      title: raw.title.slice(0, 500),
      url,
      domain,
      publishedAt: parsePublishedAt(raw.published_date),
      score: clampScore(raw.score),
    });
  }
  return normalized;
}

export function assertNoSecretPayload(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  for (const key of FORBIDDEN_RAW_KEYS) {
    if (serialized.includes(key)) {
      throw new Error('Tavily payload must not retain API keys');
    }
  }
}

function parsePublishedAt(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
