import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';
import {
    disconnectDatabase,
    prisma,
} from '@acta/db';
import { executeCrawler } from '../jobs/crawlerRun.js';

describe('bounded crawler slice E2E', () => {
    let server;
    let baseUrl;
    const outletName = `Fixture Outlet ${Date.now()}`;

    before(async () => {
        server = createServer((request, response) => {
            if (request.url === '/feed.xml') {
                response.writeHead(200, { 'content-type': 'application/rss+xml' });
                response.end(`<?xml version="1.0" encoding="UTF-8"?>
                    <rss version="2.0"><channel><title>Fixture</title>
                    ${Array.from({ length: 5 }, (_, index) => `
                        <item>
                            <title>Fixture article ${index}</title>
                            <link>${baseUrl}/article-${index}</link>
                            <description>Fixture description ${index}</description>
                        </item>`).join('')}
                    </channel></rss>`);
                return;
            }

            if (request.url?.startsWith('/article-')) {
                const index = request.url.split('-').at(-1);
                response.writeHead(200, { 'content-type': 'text/html' });
                response.end(`<!doctype html>
                    <html><head><title>Fixture article ${index}</title></head>
                    <body><main><article>
                        <h1>Fixture article ${index}</h1>
                        <p>This fixture article has enough static text for Cheerio
                        extraction and deliberately requires no browser runtime.</p>
                        <p>Additional paragraph content keeps the fixture realistic
                        while all network traffic remains on the local test server.</p>
                    </article></main></body></html>`);
                return;
            }

            response.writeHead(404);
            response.end('not found');
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
    });

    after(async () => {
        const outlet = await prisma.outlet.findUnique({
            where: { name: outletName },
        });
        if (outlet) {
            await prisma.article.deleteMany({ where: { outletId: outlet.id } });
            await prisma.crawlRequest.deleteMany({ where: { outletId: outlet.id } });
            await prisma.outlet.delete({ where: { id: outlet.id } });
        }
        await disconnectDatabase();
        await new Promise((resolve, reject) =>
            server.close((error) => error ? reject(error) : resolve()),
        );
    });

    it('rejects invalid outlets before writes and honors zero work', async () => {
        const before = await prisma.crawlRequest.count();
        await assert.rejects(
            executeCrawler(
                ['--outlets', 'Not configured', '--max-articles=2'],
                {},
                [{
                    name: outletName,
                    ideology: 'Center',
                    rssFeeds: [{ url: `${baseUrl}/feed.xml` }],
                }],
            ),
            /Unknown outlet/,
        );
        assert.equal(await prisma.crawlRequest.count(), before);

        const zeroResult = await executeCrawler(
            ['--outlets', outletName, '--max-articles=0'],
            {},
            [{
                name: outletName,
                ideology: 'Center',
                rssFeeds: [{ url: `${baseUrl}/feed.xml` }],
            }],
        );
        assert.deepEqual(zeroResult, {
            selectedOutlets: [outletName],
            maxArticles: 0,
            discovered: 0,
            claimed: 0,
            completed: 0,
            failed: 0,
            remaining: 0,
        });
        assert.equal(await prisma.crawlRequest.count(), before);
    });

    it('caps persisted extractions and leaves excess work retryable', async () => {
        const result = await executeCrawler(
            ['--outlets', outletName, '--max-articles=2'],
            {},
            [{
                name: outletName,
                ideology: 'Center',
                rssFeeds: [{ name: 'Fixture', url: `${baseUrl}/feed.xml` }],
                rateLimit: { maxRPS: 2, jitterMs: 0 },
            }],
        );

        const outlet = await prisma.outlet.findUniqueOrThrow({
            where: { name: outletName },
        });
        const [articles, pending] = await Promise.all([
            prisma.article.count({ where: { outletId: outlet.id } }),
            prisma.crawlRequest.count({
                where: { outletId: outlet.id, status: 'pending' },
            }),
        ]);

        assert.deepEqual(result, {
            selectedOutlets: [outletName],
            maxArticles: 2,
            discovered: 5,
            claimed: 2,
            completed: 2,
            failed: 0,
            remaining: 3,
        });
        assert.equal(articles, 2);
        assert.equal(pending, 3);
    });
});
