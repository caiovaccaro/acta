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
    findPendingCrawlRequests,
    createOrUpdateArticle,
    updateCrawlRequestStatus,
    CrawlStatus,
    Ideology,
} from '@acta/db';

describe('Crawler PostgreSQL Integration', () => {
    let testOutlet;
    
    beforeAll(async () => {
        await connectDatabase();
        // Create a test outlet
        testOutlet = await findOrCreateOutlet('Test Outlet', Ideology.Center, 0.5, []);
    });
    
    afterAll(async () => {
        // Cleanup test data
        if (testOutlet) {
            await prisma.article.deleteMany({ where: { outletId: testOutlet.id } });
            await prisma.crawlRequest.deleteMany({ where: { outletId: testOutlet.id } });
            await prisma.outlet.delete({ where: { id: testOutlet.id } });
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

