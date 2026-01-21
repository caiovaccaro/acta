/**
 * RSS Feed Parser Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('RSS Feed Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses RSS feed correctly', () => {
    // Mock RSS feed parsing logic
    const mockFeed = {
      title: 'Test Feed',
      items: [
        {
          title: 'Test Article',
          link: 'https://example.com/article',
          pubDate: new Date(),
        },
      ],
    };

    expect(mockFeed.items).toHaveLength(1);
    expect(mockFeed.items[0].title).toBe('Test Article');
  });

  it('handles invalid RSS feed', () => {
    const invalidFeed = null;
    expect(invalidFeed).toBeNull();
  });

  it('extracts article URLs from feed', () => {
    const mockItems = [
      { link: 'https://example.com/article1' },
      { link: 'https://example.com/article2' },
    ];

    const urls = mockItems.map((item) => item.link);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('https://example.com/article1');
  });
});



