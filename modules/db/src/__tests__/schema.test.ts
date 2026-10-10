/**
 * @acta/db - Database Schema Tests
 * 
 * Unit tests for database models and structure
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma, connectDatabase, disconnectDatabase } from '../index';
import { performHealthCheck } from '../healthCheck';
import type { Outlet, CrawlRequest, Article, Ideology, CrawlStatus } from '@prisma/client';

describe('Database Schema Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Health Check', () => {
    it('should pass all health checks', async () => {
      const result = await performHealthCheck();
      expect(result.success).toBe(true);
      expect(result.checks.connectivity).toBe(true);
      expect(result.checks.schema.outlets).toBe(true);
      expect(result.checks.schema.crawlRequests).toBe(true);
      expect(result.checks.schema.articles).toBe(true);
      expect(result.checks.enums).toBe(true);
      expect(result.checks.indexes).toBe(true);
      expect(result.checks.constraints).toBe(true);
    });
  });

  describe('Outlet Model', () => {
    let testOutlet: Outlet;

    it('should create an outlet with all required fields', async () => {
      testOutlet = await prisma.outlet.create({
        data: {
          name: 'Test Outlet',
          ideology: 'Center',
          credibilityScore: 0.8,
          rssFeeds: ['https://example.com/rss'],
        },
      });

      expect(testOutlet).toBeDefined();
      expect(testOutlet.name).toBe('Test Outlet');
      expect(testOutlet.ideology).toBe('Center');
      expect(testOutlet.credibilityScore).toBe(0.8);
      expect(testOutlet.rssFeeds).toEqual(['https://example.com/rss']);
      expect(testOutlet.id).toBeDefined();
      expect(testOutlet.createdAt).toBeInstanceOf(Date);
      expect(testOutlet.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique name constraint', async () => {
      await expect(
        prisma.outlet.create({
          data: {
            name: 'Test Outlet', // Duplicate name
            ideology: 'Left',
            credibilityScore: 0.5,
            rssFeeds: [],
          },
        })
      ).rejects.toThrow();
    });

    it('should accept valid ideology values', async () => {
      const ideologies: Ideology[] = ['Left', 'Center', 'Right'];
      
      for (const ideology of ideologies) {
        const outlet = await prisma.outlet.create({
          data: {
            name: `Test ${ideology} Outlet`,
            ideology,
            credibilityScore: 0.5,
            rssFeeds: [],
          },
        });
        expect(outlet.ideology).toBe(ideology);
        await prisma.outlet.delete({ where: { id: outlet.id } });
      }
    });

    it('should default credibilityScore to 0.5', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Test Default Credibility',
          ideology: 'Center',
          rssFeeds: [],
        },
      });
      expect(outlet.credibilityScore).toBe(0.5);
      await prisma.outlet.delete({ where: { id: outlet.id } });
    });

    afterAll(async () => {
      if (testOutlet) {
        await prisma.outlet.delete({ where: { id: testOutlet.id } });
      }
    });
  });

  describe('CrawlRequest Model', () => {
    let testOutlet: Outlet;
    let testCrawlRequest: CrawlRequest;

    beforeAll(async () => {
      testOutlet = await prisma.outlet.create({
        data: {
          name: 'Test Outlet for CrawlRequest',
          ideology: 'Center',
          credibilityScore: 0.7,
          rssFeeds: [],
        },
      });
    });

    it('should create a crawl request with all required fields', async () => {
      testCrawlRequest = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/article',
          outletId: testOutlet.id,
          status: 'pending',
        },
      });

      expect(testCrawlRequest).toBeDefined();
      expect(testCrawlRequest.url).toBe('https://example.com/article');
      expect(testCrawlRequest.outletId).toBe(testOutlet.id);
      expect(testCrawlRequest.status).toBe('pending');
      expect(testCrawlRequest.attempts).toBe(0);
      expect(testCrawlRequest.id).toBeDefined();
    });

    it('should enforce unique URL constraint', async () => {
      await expect(
        prisma.crawlRequest.create({
          data: {
            url: 'https://example.com/article', // Duplicate URL
            outletId: testOutlet.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should default status to pending', async () => {
      const request = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/default-status',
          outletId: testOutlet.id,
        },
      });
      expect(request.status).toBe('pending');
      await prisma.crawlRequest.delete({ where: { id: request.id } });
    });

    it('should default attempts to 0', async () => {
      const request = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/default-attempts',
          outletId: testOutlet.id,
        },
      });
      expect(request.attempts).toBe(0);
      await prisma.crawlRequest.delete({ where: { id: request.id } });
    });

    it('should accept valid status values', async () => {
      const statuses: CrawlStatus[] = ['pending', 'in_progress', 'done', 'failed'];
      
      for (const status of statuses) {
        const request = await prisma.crawlRequest.create({
          data: {
            url: `https://example.com/${status}`,
            outletId: testOutlet.id,
            status,
          },
        });
        expect(request.status).toBe(status);
        await prisma.crawlRequest.delete({ where: { id: request.id } });
      }
    });

    it('should cascade delete when outlet is deleted', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Cascade Test Outlet',
          ideology: 'Left',
          credibilityScore: 0.5,
          rssFeeds: [],
        },
      });

      const request = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/cascade-test',
          outletId: outlet.id,
        },
      });

      await prisma.outlet.delete({ where: { id: outlet.id } });

      const deletedRequest = await prisma.crawlRequest.findUnique({
        where: { id: request.id },
      });
      expect(deletedRequest).toBeNull();
    });

    afterAll(async () => {
      if (testCrawlRequest) {
        await prisma.crawlRequest.delete({ where: { id: testCrawlRequest.id } }).catch(() => {});
      }
      if (testOutlet) {
        await prisma.outlet.delete({ where: { id: testOutlet.id } });
      }
    });
  });

  describe('Article Model', () => {
    let testOutlet: Outlet;
    let testCrawlRequest: CrawlRequest;
    let testArticle: Article;

    beforeAll(async () => {
      testOutlet = await prisma.outlet.create({
        data: {
          name: 'Test Outlet for Article',
          ideology: 'Center',
          credibilityScore: 0.7,
          rssFeeds: [],
        },
      });

      testCrawlRequest = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/article-source',
          outletId: testOutlet.id,
          status: 'done',
        },
      });
    });

    it('should create an article with all required fields', async () => {
      testArticle = await prisma.article.create({
        data: {
          url: 'https://example.com/article',
          outletId: testOutlet.id,
          title: 'Test Article',
          textContent: 'This is test article content.',
          crawlRequestId: testCrawlRequest.id,
        },
      });

      expect(testArticle).toBeDefined();
      expect(testArticle.url).toBe('https://example.com/article');
      expect(testArticle.outletId).toBe(testOutlet.id);
      expect(testArticle.title).toBe('Test Article');
      expect(testArticle.textContent).toBe('This is test article content.');
      expect(testArticle.crawlRequestId).toBe(testCrawlRequest.id);
      expect(testArticle.extractedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique URL constraint', async () => {
      await expect(
        prisma.article.create({
          data: {
            url: 'https://example.com/article', // Duplicate URL
            outletId: testOutlet.id,
            title: 'Another Article',
            textContent: 'Content',
          },
        })
      ).rejects.toThrow();
    });

    it('should allow optional excerpt and publishedDate', async () => {
      const article = await prisma.article.create({
        data: {
          url: 'https://example.com/optional-fields',
          outletId: testOutlet.id,
          title: 'Article with Optional Fields',
          textContent: 'Content',
          excerpt: 'This is an excerpt',
          publishedDate: new Date('2024-01-01'),
        },
      });

      expect(article.excerpt).toBe('This is an excerpt');
      expect(article.publishedDate).toBeInstanceOf(Date);
      await prisma.article.delete({ where: { id: article.id } });
    });

    it('should cascade delete when outlet is deleted', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Cascade Article Test Outlet',
          ideology: 'Right',
          credibilityScore: 0.5,
          rssFeeds: [],
        },
      });

      const article = await prisma.article.create({
        data: {
          url: 'https://example.com/cascade-article',
          outletId: outlet.id,
          title: 'Cascade Test',
          textContent: 'Content',
        },
      });

      await prisma.outlet.delete({ where: { id: outlet.id } });

      const deletedArticle = await prisma.article.findUnique({
        where: { id: article.id },
      });
      expect(deletedArticle).toBeNull();
    });

    it('should set crawlRequestId to null when crawl request is deleted', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'SetNull Test Outlet',
          ideology: 'Center',
          credibilityScore: 0.5,
          rssFeeds: [],
        },
      });

      const request = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/setnull-request',
          outletId: outlet.id,
        },
      });

      const article = await prisma.article.create({
        data: {
          url: 'https://example.com/setnull-article',
          outletId: outlet.id,
          title: 'SetNull Test',
          textContent: 'Content',
          crawlRequestId: request.id,
        },
      });

      await prisma.crawlRequest.delete({ where: { id: request.id } });

      const updatedArticle = await prisma.article.findUnique({
        where: { id: article.id },
      });
      expect(updatedArticle?.crawlRequestId).toBeNull();

      await prisma.article.delete({ where: { id: article.id } });
      await prisma.outlet.delete({ where: { id: outlet.id } });
    });

    afterAll(async () => {
      if (testArticle) {
        await prisma.article.delete({ where: { id: testArticle.id } });
      }
      if (testCrawlRequest) {
        await prisma.crawlRequest.delete({ where: { id: testCrawlRequest.id } });
      }
      if (testOutlet) {
        await prisma.outlet.delete({ where: { id: testOutlet.id } });
      }
    });
  });

  describe('Relationships', () => {
    it('should support outlet -> crawlRequests relationship', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Relationship Test Outlet',
          ideology: 'Center',
          credibilityScore: 0.5,
          rssFeeds: [],
        },
      });

      const request1 = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/rel1',
          outletId: outlet.id,
        },
      });

      const request2 = await prisma.crawlRequest.create({
        data: {
          url: 'https://example.com/rel2',
          outletId: outlet.id,
        },
      });

      const outletWithRequests = await prisma.outlet.findUnique({
        where: { id: outlet.id },
        include: { crawlRequests: true },
      });

      expect(outletWithRequests?.crawlRequests).toHaveLength(2);

      await prisma.crawlRequest.delete({ where: { id: request1.id } });
      await prisma.crawlRequest.delete({ where: { id: request2.id } });
      await prisma.outlet.delete({ where: { id: outlet.id } });
    });

    it('should support outlet -> articles relationship', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Article Relationship Test',
          ideology: 'Left',
          credibilityScore: 0.5,
          rssFeeds: [],
        },
      });

      const article1 = await prisma.article.create({
        data: {
          url: 'https://example.com/art1',
          outletId: outlet.id,
          title: 'Article 1',
          textContent: 'Content 1',
        },
      });

      const article2 = await prisma.article.create({
        data: {
          url: 'https://example.com/art2',
          outletId: outlet.id,
          title: 'Article 2',
          textContent: 'Content 2',
        },
      });

      const outletWithArticles = await prisma.outlet.findUnique({
        where: { id: outlet.id },
        include: { articles: true },
      });

      expect(outletWithArticles?.articles).toHaveLength(2);

      await prisma.article.delete({ where: { id: article1.id } });
      await prisma.article.delete({ where: { id: article2.id } });
      await prisma.outlet.delete({ where: { id: outlet.id } });
    });
  });

  describe('Pipeline coordination models', () => {
    it('should persist a guarded run, stage checkpoint, and singleton lease', async () => {
      const run = await prisma.pipelineRun.create({
        data: { trigger: 'manual' },
      });
      expect(run.status).toBe('queued');

      const stage = await prisma.pipelineStageRun.create({
        data: {
          pipelineRunId: run.id,
          stage: 'schema-regression',
          cursor: { createdAt: '2026-10-10T00:00:00.000Z', id: 'schema' },
        },
      });
      expect(stage.status).toBe('pending');

      const lease = await prisma.pipelineLease.create({
        data: {
          resource: `schema-regression-${run.id}`,
          ownerToken: 'schema-owner',
          pipelineRunId: run.id,
          generation: 1,
        },
      });
      expect(lease.generation).toBe(1);

      await prisma.pipelineLease.delete({ where: { resource: lease.resource } });
      await prisma.pipelineStageRun.delete({ where: { id: stage.id } });
      await prisma.pipelineRun.delete({ where: { id: run.id } });
    });
  });
});

