export const TAVILY_DAILY_SEARCH_CAP = 5;
export const TAVILY_MONTHLY_SEARCH_CAP = 155;
export const TAVILY_MAX_RESULTS_PER_SEARCH = 8;

export const TAVILY_QUERY_GROUPS = [
  {
    id: 'global_politics_security',
    query: 'global politics and security news last 24 hours',
  },
  {
    id: 'climate_energy',
    query: 'climate and energy news last 24 hours',
  },
  {
    id: 'technology_ai',
    query: 'technology and AI news last 24 hours',
  },
  {
    id: 'economics_trade',
    query: 'economics and trade news last 24 hours',
  },
  {
    id: 'public_health_social_policy',
    query: 'public health and social policy news last 24 hours',
  },
] as const;

export type TavilyQueryGroupId = (typeof TAVILY_QUERY_GROUPS)[number]['id'];

export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function utcMonthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

export function remainingSearchBudget(input: {
  usedToday: number;
  usedThisMonth: number;
}): { remainingToday: number; remainingThisMonth: number; remaining: number } {
  const remainingToday = Math.max(0, TAVILY_DAILY_SEARCH_CAP - input.usedToday);
  const remainingThisMonth = Math.max(0, TAVILY_MONTHLY_SEARCH_CAP - input.usedThisMonth);
  return {
    remainingToday,
    remainingThisMonth,
    remaining: Math.min(remainingToday, remainingThisMonth),
  };
}
