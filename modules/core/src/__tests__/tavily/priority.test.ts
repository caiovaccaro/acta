import { describe, expect, it } from '@jest/globals';
import {
  allocateWork,
  effectiveStageCap,
  matchSignals,
  PRIORITY_SCORE_WEIGHTS,
  scoreWorkItem,
  type WorkItem,
} from '../../tavily/priority';

const now = new Date('2026-10-12T12:00:00.000Z');

function work(partial: Partial<WorkItem> & Pick<WorkItem, 'id'>): WorkItem {
  return {
    kind: 'crawl',
    createdAt: now,
    publishedAt: now,
    topicTrend: false,
    exactMatch: false,
    ...partial,
  };
}

describe('Tavily work matching, scoring, and allocation', () => {
  it('matches exact URL, title/domain, and topic alias while leaving ambiguous, duplicate, and unmatched signals unlinked', () => {
    const matches = matchSignals(
      [
        {
          id: 's-url',
          url: 'https://news.example.com/exact',
          title: 'Exact story',
          domain: 'news.example.com',
        },
        {
          id: 's-title',
          url: 'https://climate.example.com/other-path',
          title: 'Glacier Melt Accelerates',
          domain: 'climate.example.com',
        },
        {
          id: 's-topic',
          url: 'https://unmatched.example.com/ai',
          title: 'AI regulation talks stall in Brussels',
          domain: 'unmatched.example.com',
        },
        {
          id: 's-amb-article',
          url: 'https://dup.example.com/a',
          title: 'Shared Headline',
          domain: 'dup.example.com',
        },
        {
          id: 's-amb-topic',
          url: 'https://mix.example.com/x',
          title: 'Climate policy and energy markets',
          domain: 'mix.example.com',
        },
        {
          id: 's-dup',
          url: 'https://news.example.com/exact',
          title: 'Duplicate URL signal',
          domain: 'news.example.com',
        },
        {
          id: 's-none',
          url: 'https://none.example.com/z',
          title: 'Unrelated gardening tips',
          domain: 'none.example.com',
        },
      ],
      [
        { id: 'art-exact', url: 'https://news.example.com/exact', title: 'Exact story' },
        {
          id: 'art-title',
          url: 'https://climate.example.com/glacier',
          title: 'Glacier Melt Accelerates',
          domain: 'climate.example.com',
        },
        { id: 'art-dup-1', url: 'https://dup.example.com/one', title: 'Shared Headline', domain: 'dup.example.com' },
        { id: 'art-dup-2', url: 'https://dup.example.com/two', title: 'Shared Headline', domain: 'dup.example.com' },
      ],
      [{ id: 'crawl-exact', url: 'https://news.example.com/exact', title: 'Exact story' }],
      [
        { id: 'topic-ai', name: 'AI regulation', approved: true },
        { id: 'topic-climate', name: 'Climate policy', approved: true },
        { id: 'topic-energy', name: 'Energy markets', approved: true },
        { id: 'topic-pending', name: 'AI regulation', approved: false },
      ],
    );

    expect(matches.find((row) => row.signalId === 's-url')).toMatchObject({
      matchedArticleId: 'art-exact',
      matchedCrawlRequestId: 'crawl-exact',
      reason: 'exact_url',
    });
    expect(matches.find((row) => row.signalId === 's-title')).toMatchObject({
      matchedArticleId: 'art-title',
      matchedCrawlRequestId: null,
      reason: 'title_domain',
    });
    expect(matches.find((row) => row.signalId === 's-topic')).toMatchObject({
      matchedTopicId: 'topic-ai',
      matchedArticleId: null,
      reason: 'topic_alias',
    });
    expect(matches.find((row) => row.signalId === 's-amb-article')).toMatchObject({
      matchedArticleId: null,
      matchedTopicId: null,
      reason: 'ambiguous',
    });
    expect(matches.find((row) => row.signalId === 's-amb-topic')).toMatchObject({
      matchedTopicId: null,
      reason: 'ambiguous',
    });
    expect(matches.find((row) => row.signalId === 's-dup')).toMatchObject({
      matchedArticleId: null,
      reason: 'ambiguous',
    });
    expect(matches.find((row) => row.signalId === 's-none')).toMatchObject({
      matchedArticleId: null,
      matchedTopicId: null,
      matchedCrawlRequestId: null,
      reason: 'unmatched',
    });
  });

  it('scores topic trend, exact match, recency, and backlog age with the ticket weights', () => {
    const trendingExact = work({
      id: 'hot',
      topicTrend: true,
      exactMatch: true,
      createdAt: now,
      publishedAt: now,
    });
    const oldUnmatched = work({
      id: 'old',
      createdAt: new Date('2026-09-12T12:00:00.000Z'),
      publishedAt: new Date('2026-09-12T12:00:00.000Z'),
    });
    expect(scoreWorkItem(trendingExact, now)).toBe(
      PRIORITY_SCORE_WEIGHTS.topicTrend
      + PRIORITY_SCORE_WEIGHTS.exactArticleMatch
      + PRIORITY_SCORE_WEIGHTS.recency,
    );
    expect(scoreWorkItem(oldUnmatched, now)).toBe(PRIORITY_SCORE_WEIGHTS.backlogAge);
  });

  it('allocates a deterministic 70/30 split and flows unused capacity without duplicate claims', () => {
    const items: WorkItem[] = [
      work({ id: 't1', topicTrend: true, exactMatch: true, createdAt: new Date('2026-10-11T00:00:00.000Z') }),
      work({ id: 't2', topicTrend: true, exactMatch: true, createdAt: new Date('2026-10-11T01:00:00.000Z') }),
      work({ id: 't3', topicTrend: true, createdAt: new Date('2026-10-11T02:00:00.000Z') }),
      work({ id: 't4', topicTrend: true, createdAt: new Date('2026-10-11T03:00:00.000Z') }),
      work({ id: 't5', exactMatch: true, createdAt: new Date('2026-10-11T04:00:00.000Z') }),
      work({ id: 't6', exactMatch: true, createdAt: new Date('2026-10-11T05:00:00.000Z') }),
      work({ id: 't7', topicTrend: true, createdAt: new Date('2026-10-11T06:00:00.000Z'), publishedAt: now }),
      work({ id: 'old-a', createdAt: new Date('2026-08-01T00:00:00.000Z') }),
      work({ id: 'old-b', createdAt: new Date('2026-08-02T00:00:00.000Z') }),
      work({ id: 'old-c', createdAt: new Date('2026-08-03T00:00:00.000Z') }),
    ];
    const allocated = allocateWork(items, 10, now);
    expect(allocated).toHaveLength(10);
    expect(new Set(allocated.map((row) => row.id)).size).toBe(10);
    expect(allocated.filter((row) => row.pool === 'priority')).toHaveLength(7);
    expect(allocated.filter((row) => row.pool === 'age')).toHaveLength(3);
    expect(allocated.filter((row) => row.pool === 'age').map((row) => row.id)).toEqual([
      'old-a',
      'old-b',
      'old-c',
    ]);

    const overflow = allocateWork(items.filter((item) => item.id.startsWith('old-')), 10, now);
    expect(overflow.map((row) => row.id).sort()).toEqual(['old-a', 'old-b', 'old-c']);
    expect(new Set(overflow.map((row) => row.id)).size).toBe(3);
  });

  it('never lets the effective cap exceed the budget-derived affordable-unit estimate', () => {
    expect(effectiveStageCap(10, '0.120000')).toEqual({
      configured: 10,
      budgetDerived: 2,
      effective: 2,
      skippedDueToBudget: 8,
    });
    expect(effectiveStageCap(3, '5.000000')).toEqual({
      configured: 3,
      budgetDerived: 100,
      effective: 3,
      skippedDueToBudget: 0,
    });
    expect(effectiveStageCap(10, '0.040000')).toEqual({
      configured: 10,
      budgetDerived: 0,
      effective: 0,
      skippedDueToBudget: 10,
    });
  });
});
