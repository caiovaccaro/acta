import { describe, expect, it, jest } from '@jest/globals';
import { searchTavilyBasic } from '../../tavily/client';

describe('Tavily client degradation', () => {
  it('returns the specified degraded result for timeout, malformed, empty, and quota', async () => {
    const quota = await searchTavilyBasic({
      query: 'q',
      usedToday: 5,
      usedThisMonth: 10,
    }, { apiKey: 'tvly-test' });
    expect(quota).toMatchObject({ ok: false, degraded: true, reason: 'quota', signals: [] });

    const missing = await searchTavilyBasic({
      query: 'q',
      usedToday: 0,
      usedThisMonth: 0,
    }, { apiKey: '' });
    expect(missing).toMatchObject({ ok: false, reason: 'missing_key' });

    const malformedFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ results: 'nope' }),
    })) as unknown as typeof fetch;
    const malformed = await searchTavilyBasic({
      query: 'q',
      usedToday: 0,
      usedThisMonth: 0,
    }, { apiKey: 'tvly-test', fetchImpl: malformedFetch });
    expect(malformed).toMatchObject({ ok: false, reason: 'malformed' });

    const emptyFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    })) as unknown as typeof fetch;
    const empty = await searchTavilyBasic({
      query: 'q',
      usedToday: 0,
      usedThisMonth: 0,
    }, { apiKey: 'tvly-test', fetchImpl: emptyFetch });
    expect(empty).toMatchObject({ ok: false, reason: 'empty' });

    const timeoutFetch = jest.fn(async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;
    const timeout = await searchTavilyBasic({
      query: 'q',
      usedToday: 0,
      usedThisMonth: 0,
    }, { apiKey: 'tvly-test', fetchImpl: timeoutFetch });
    expect(timeout).toMatchObject({ ok: false, reason: 'timeout' });
  });
});
