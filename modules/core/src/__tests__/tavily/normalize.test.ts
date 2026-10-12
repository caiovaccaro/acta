import { describe, expect, it } from '@jest/globals';
import { remainingSearchBudget, TAVILY_QUERY_GROUPS } from '../../tavily/queryGroups';
import { normalizeTavilyResults } from '../../tavily/normalize';

describe('Tavily result normalization', () => {
  it('keeps valid URLs, domains, scores, and request counts deterministic and capped', () => {
    expect(TAVILY_QUERY_GROUPS).toHaveLength(5);
    const signals = normalizeTavilyResults('climate and energy news last 24 hours', [
      { title: 'One', url: 'https://WWW.Example.com/a/', score: 1.4 },
      { title: 'Dup', url: 'https://example.com/a', score: 0.9 },
      { title: 'Same domain', url: 'https://example.com/b', score: 0.8 },
      { title: 'Bad', url: 'not-a-url', score: 0.7 },
      { title: 'Skip', url: 12, score: 0.6 },
      { title: 'Two', url: 'https://news.example.org/story?utm_source=x#frag', score: 0.55 },
    ]);
    expect(signals).toEqual([
      {
        query: 'climate and energy news last 24 hours',
        title: 'One',
        url: 'https://www.example.com/a',
        domain: 'example.com',
        publishedAt: null,
        score: 1,
      },
      {
        query: 'climate and energy news last 24 hours',
        title: 'Two',
        url: 'https://news.example.org/story?utm_source=x',
        domain: 'news.example.org',
        publishedAt: null,
        score: 0.55,
      },
    ]);
    expect(remainingSearchBudget({ usedToday: 5, usedThisMonth: 10 }).remaining).toBe(0);
    expect(remainingSearchBudget({ usedToday: 1, usedThisMonth: 155 }).remaining).toBe(0);
    expect(remainingSearchBudget({ usedToday: 1, usedThisMonth: 10 }).remaining).toBe(4);
  });
});
