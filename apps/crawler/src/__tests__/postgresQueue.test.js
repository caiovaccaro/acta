import { describe, expect, it } from '@jest/globals';
import { claimedCrawlRequestsToCrawlerRequests } from '../utils/postgresQueue.js';

describe('claimed crawl request conversion', () => {
    it('preserves claim identity and selected outlet metadata', () => {
        const requests = claimedCrawlRequestsToCrawlerRequests([
            {
                id: 'request-1',
                url: 'https://example.test/article',
                outletId: 'outlet-1',
                outletName: 'Fixture Outlet',
            },
        ], [
            {
                name: 'Fixture Outlet',
                rateLimit: { maxRPS: 1 },
            },
        ]);

        expect(requests).toEqual([
            expect.objectContaining({
                url: 'https://example.test/article',
                label: 'article',
                userData: expect.objectContaining({
                    crawlRequestId: 'request-1',
                    outletId: 'outlet-1',
                    source: 'Fixture Outlet',
                    outletConfig: expect.objectContaining({
                        name: 'Fixture Outlet',
                    }),
                }),
            }),
        ]);
    });
});
