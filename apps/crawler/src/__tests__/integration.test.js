/**
 * Integration Tests for Crawler PostgreSQL Integration
 * Tests the complete flow: RSS → Queue → Processing → Storage
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
    connectDatabase,
    disconnectDatabase,
    prisma,
    findOrCreateOutlet,
    createOrUpdateCrawlRequest,
    claimPendingCrawlRequests,
    findPendingCrawlRequests,
    createOrUpdateArticle,
    updateCrawlRequestStatus,
    CrawlStatus,
    Ideology,
} from '@acta/db';

describe('Crawler PostgreSQL Integration', () => {
    let testOutlet;
    let testOutletTwo;
    
    beforeAll(async () => {
        await connectDatabase();
        // Create a test outlet
        testOutlet = await findOrCreateOutlet('Test Outlet', Ideology.Center, 0.5, []);
        testOutletTwo = await findOrCreateOutlet('Test Outlet Two', Ideology.Center, 0.5, []);
    });
    
    afterAll(async () => {
        // Cleanup test data
        if (testOutlet) {
            await prisma.article.deleteMany({ where: { outletId: testOutlet.id } });
            await prisma.crawlRequest.deleteMany({ where: { outletId: testOutlet.id } });
            await prisma.outlet.delete({ where: { id: testOutlet.id } });
        }
        if (testOutletTwo) {
            await prisma.article.deleteMany({ where: { outletId: testOutletTwo.id } });
            await prisma.crawlRequest.deleteMany({ where: { outletId: testOutletTwo.id } });
            await prisma.outlet.delete({ where: { id: testOutletTwo.id } });
        }
        await disconnectDatabase();
    });
    
    describe('Queue Population (RSS → PostgreSQL)', () => {
        it('should create crawl requests from RSS URLs', async () => {
            const testUrl = 'https://example.com/test-article-1';
            
            const crawlRequest = await createOrUpdateCrawlRequest({
                url: testUrl,
                outletId: testOutlet.id,
                status: CrawlStatus.pending,
            });
            
            expect(crawlRequest).toBeDefined();
            expect(crawlRequest.url).toBe(testUrl);
            expect(crawlRequest.status).toBe(CrawlStatus.pending);
            expect(crawlRequest.outletId).toBe(testOutlet.id);
        });
        
        it('should normalize URLs and prevent duplicates', async () => {
            const url1 = 'https://example.com/article?utm_source=test';
            const url2 = 'https://example.com/article?fbclid=123';
            
            const req1 = await createOrUpdateCrawlRequest({
                url: url1,
                outletId: testOutlet.id,
            });
            
            const req2 = await createOrUpdateCrawlRequest({
                url: url2,
                outletId: testOutlet.id,
            });
            
            // Should be the same request (normalized URLs match)
            expect(req1.id).toBe(req2.id);
        });
        
        it('should find pending crawl requests', async () => {
            const pending = await findPendingCrawlRequests(10);
            expect(Array.isArray(pending)).toBe(true);
        });
    });
    
    describe('Processing Flow (pending → in_progress → done)', () => {
        it('should update crawl request status correctly', async () => {
            const testUrl = 'https://example.com/test-article-2';
            
            const crawlRequest = await createOrUpdateCrawlRequest({
                url: testUrl,
                outletId: testOutlet.id,
                status: CrawlStatus.pending,
            });
            
            // Update to in_progress
            const inProgress = await updateCrawlRequestStatus(
                crawlRequest.id,
                CrawlStatus.in_progress
            );
            expect(inProgress.status).toBe(CrawlStatus.in_progress);
            expect(inProgress.attempts).toBe(1);
            
            // Update to done
            const done = await updateCrawlRequestStatus(
                crawlRequest.id,
                CrawlStatus.done
            );
            expect(done.status).toBe(CrawlStatus.done);
        });
    });

    describe('Atomic capped claiming', () => {
        it('claims only selected outlets and never more than the cap', async () => {
            const prefix = `https://claim-${Date.now()}.example`;
            for (let index = 0; index < 4; index += 1) {
                await createOrUpdateCrawlRequest({
                    url: `${prefix}/selected-${index}`,
                    outletId: testOutlet.id,
                });
                await createOrUpdateCrawlRequest({
                    url: `${prefix}/other-${index}`,
                    outletId: testOutletTwo.id,
                });
            }

            const claimed = await claimPendingCrawlRequests([testOutlet.id], 3);
            expect(claimed).toHaveLength(3);
            expect(claimed.every(({ outletId }) => outletId === testOutlet.id)).toBe(true);
            expect(claimed.every(({ status }) => status === CrawlStatus.in_progress)).toBe(true);

            const otherInProgress = await prisma.crawlRequest.count({
                where: {
                    outletId: testOutletTwo.id,
                    status: CrawlStatus.in_progress,
                },
            });
            expect(otherInProgress).toBe(0);
        });

        it('treats zero as a no-write boundary', async () => {
            const before = await prisma.crawlRequest.count({
                where: {
                    outletId: testOutlet.id,
                    status: CrawlStatus.in_progress,
                },
            });
            expect(await claimPendingCrawlRequests([testOutlet.id], 0)).toEqual([]);
            expect(await prisma.crawlRequest.count({
                where: {
                    outletId: testOutlet.id,
                    status: CrawlStatus.in_progress,
                },
            })).toBe(before);
        });

        it('claims oldest eligible requests first', async () => {
            const outlet = await findOrCreateOutlet(
                `Oldest Claim Outlet ${Date.now()}`,
                Ideology.Center,
                0.5,
                [],
            );
            try {
                const oldRequest = await createOrUpdateCrawlRequest({
                    url: `https://oldest-${Date.now()}.example/old`,
                    outletId: outlet.id,
                });
                await createOrUpdateCrawlRequest({
                    url: `https://oldest-${Date.now()}.example/new`,
                    outletId: outlet.id,
                });
                await prisma.crawlRequest.update({
                    where: { id: oldRequest.id },
                    data: { createdAt: new Date('2020-01-01T00:00:00.000Z') },
                });

                const claimed = await claimPendingCrawlRequests([outlet.id], 1);
                expect(claimed.map(({ id }) => id)).toEqual([oldRequest.id]);
            } finally {
                await prisma.crawlRequest.deleteMany({
                    where: { outletId: outlet.id },
                });
                await prisma.outlet.delete({ where: { id: outlet.id } });
            }
        });

        it('gives concurrent claimers non-overlapping bounded work', async () => {
            const prefix = `https://concurrent-${Date.now()}.example`;
            for (let index = 0; index < 6; index += 1) {
                await createOrUpdateCrawlRequest({
                    url: `${prefix}/${index}`,
                    outletId: testOutletTwo.id,
                });
            }

            const [first, second] = await Promise.all([
                claimPendingCrawlRequests([testOutletTwo.id], 2),
                claimPendingCrawlRequests([testOutletTwo.id], 2),
            ]);
            expect(first).toHaveLength(2);
            expect(second).toHaveLength(2);
            const allIds = [...first, ...second].map(({ id }) => id);
            expect(new Set(allIds).size).toBe(allIds.length);
        });

        it('preserves one attempt per failed extraction for retry', async () => {
            const outlet = await findOrCreateOutlet(
                `Retry Claim Outlet ${Date.now()}`,
                Ideology.Center,
                0.5,
                [],
            );
            try {
                const request = await createOrUpdateCrawlRequest({
                    url: `https://retry-${Date.now()}.example/article`,
                    outletId: outlet.id,
                });
                const [firstClaim] = await claimPendingCrawlRequests([outlet.id], 1);
                expect(firstClaim.attempts).toBe(1);

                const failed = await updateCrawlRequestStatus(
                    request.id,
                    CrawlStatus.failed,
                    'fixture failure',
                );
                expect(failed.attempts).toBe(1);

                const retried = await createOrUpdateCrawlRequest({
                    url: request.url,
                    outletId: outlet.id,
                });
                expect(retried.status).toBe(CrawlStatus.pending);
                expect(retried.attempts).toBe(1);

                const [secondClaim] = await claimPendingCrawlRequests([outlet.id], 1);
                expect(secondClaim.attempts).toBe(2);
            } finally {
                await prisma.crawlRequest.deleteMany({
                    where: { outletId: outlet.id },
                });
                await prisma.outlet.delete({ where: { id: outlet.id } });
            }
        });
    });
    
    describe('Article Storage', () => {
        it('should create articles in PostgreSQL', async () => {
            const testUrl = 'https://example.com/test-article-3';
            
            const crawlRequest = await createOrUpdateCrawlRequest({
                url: testUrl,
                outletId: testOutlet.id,
                status: CrawlStatus.pending,
            });
            
            const article = await createOrUpdateArticle({
                url: testUrl,
                crawlRequestId: crawlRequest.id,
                outletId: testOutlet.id,
                title: 'Test Article',
                textContent: 'This is test content',
                excerpt: 'Test excerpt',
            });
            
            expect(article).toBeDefined();
            expect(article.title).toBe('Test Article');
            expect(article.textContent).toBe('This is test content');
            expect(article.crawlRequestId).toBe(crawlRequest.id);
        });
    });
    
    describe('Idempotence', () => {
        it('should not create duplicate articles on re-run', async () => {
            const testUrl = 'https://example.com/test-article-4';
            
            // Create crawl request
            const req1 = await createOrUpdateCrawlRequest({
                url: testUrl,
                outletId: testOutlet.id,
            });
            
            // Try to create again
            const req2 = await createOrUpdateCrawlRequest({
                url: testUrl,
                outletId: testOutlet.id,
            });
            
            // Should return the same request
            expect(req1.id).toBe(req2.id);
        });
    });
});

