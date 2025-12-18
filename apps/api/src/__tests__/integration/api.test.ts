/**
 * Integration Tests for Acta REST API
 * 
 * These tests use real database data and make actual HTTP requests to the API.
 * Run with: npm run test:integration
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { buildServer } from '../../server.js';
import { connectDatabase, disconnectDatabase } from '@acta/db';
import type { FastifyInstance } from 'fastify';

// Load environment variables from root .env file
// When running from apps/api, go up 2 levels to project root
// process.cwd() is apps/api when running from there
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

describe('Acta REST API Integration Tests', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Connect to database
    await connectDatabase();
    
    // Build server
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
    await disconnectDatabase();
  });

  describe('Health Endpoints', () => {
    test('GET /api/health should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('database');
      expect(['ok', 'error']).toContain(body.status);
      expect(['connected', 'disconnected']).toContain(body.database);
      
      console.log('✅ Health check:', body);
    });

    test('GET /api/status should return system status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('lastCrawl');
      expect(body).toHaveProperty('lastAnalysis');
      expect(body).toHaveProperty('lastVerdictCalculation');
      
      console.log('✅ System status:', body);
    });
  });

  describe('Topics Endpoints', () => {
    test('GET /api/topics should return list of topics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      
      if (body.length > 0) {
        const topic = body[0];
        expect(topic).toHaveProperty('id');
        expect(topic).toHaveProperty('name');
        expect(topic).toHaveProperty('description');
        expect(topic).toHaveProperty('safetyNoteRequired');
        expect(topic).toHaveProperty('questionCount');
        expect(topic).toHaveProperty('activeQuestionCount');
        expect(topic).toHaveProperty('createdAt');
        
        console.log(`✅ Found ${body.length} topics`);
        console.log('   Sample topic:', {
          name: topic.name,
          questions: topic.questionCount,
          activeQuestions: topic.activeQuestionCount,
        });
      } else {
        console.log('⚠️  No topics found in database');
      }
    });

    test('GET /api/topics/:id should return topic details', async () => {
      // First, get list of topics
      const listResponse = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });
      
      const topics = JSON.parse(listResponse.body);
      if (topics.length === 0) {
        console.log('⚠️  Skipping topic details test - no topics found');
        return;
      }

      const topicId = topics[0].id;
      const response = await server.inject({
        method: 'GET',
        url: `/api/topics/${topicId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', topicId);
      expect(body).toHaveProperty('questions');
      expect(Array.isArray(body.questions)).toBe(true);
      
      console.log(`✅ Topic details for "${body.name}":`);
      console.log(`   Questions: ${body.questions.length}`);
      if (body.questions.length > 0) {
        console.log(`   Sample question: "${body.questions[0].questionText.substring(0, 60)}..."`);
      }
    });

    test('GET /api/topics/:id/verdict should return topic verdict if available', async () => {
      // First, get list of topics
      const listResponse = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });
      
      const topics = JSON.parse(listResponse.body);
      if (topics.length === 0) {
        console.log('⚠️  Skipping topic verdict test - no topics found');
        return;
      }

      const topicId = topics[0].id;
      const response = await server.inject({
        method: 'GET',
        url: `/api/topics/${topicId}/verdict`,
      });

      if (response.statusCode === 404) {
        console.log(`⚠️  No verdict found for topic "${topics[0].name}"`);
        return;
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('questionId');
      expect(body).toHaveProperty('questionText');
      expect(body).toHaveProperty('verdictLabel');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('reasoning');
      expect(body).toHaveProperty('articleCount');
      expect(body).toHaveProperty('outletCount');
      
      console.log(`✅ Verdict for topic "${topics[0].name}":`);
      console.log(`   Question: "${body.questionText}"`);
      console.log(`   Verdict: ${body.verdictLabel} (${body.confidence}% confidence)`);
      console.log(`   Articles: ${body.articleCount}, Outlets: ${body.outletCount}`);
    });
  });

  describe('Verdicts Endpoints', () => {
    let questionId: string | null = null;

    beforeAll(async () => {
      // Get a question ID from topics
      const topicsResponse = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });
      
      const topics = JSON.parse(topicsResponse.body);
      if (topics.length > 0) {
        const topicDetailsResponse = await server.inject({
          method: 'GET',
          url: `/api/topics/${topics[0].id}`,
        });
        
        const topicDetails = JSON.parse(topicDetailsResponse.body);
        if (topicDetails.questions && topicDetails.questions.length > 0) {
          questionId = topicDetails.questions[0].id;
        }
      }
    });

    test('GET /api/verdicts/:questionId should return verdict history', async () => {
      if (!questionId) {
        console.log('⚠️  Skipping verdict history test - no questions found');
        return;
      }

      const response = await server.inject({
        method: 'GET',
        url: `/api/verdicts/${questionId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      
      if (body.length > 0) {
        const verdict = body[0];
        expect(verdict).toHaveProperty('id');
        expect(verdict).toHaveProperty('verdictLabel');
        expect(verdict).toHaveProperty('confidence');
        expect(verdict).toHaveProperty('month');
        
        console.log(`✅ Found ${body.length} historical verdicts`);
        console.log(`   Latest: ${verdict.verdictLabel} (${verdict.confidence}% confidence) for ${verdict.month}`);
      } else {
        console.log('⚠️  No verdict history found');
      }
    });

    test('GET /api/verdicts/:questionId/current should return current verdict', async () => {
      if (!questionId) {
        console.log('⚠️  Skipping current verdict test - no questions found');
        return;
      }

      const response = await server.inject({
        method: 'GET',
        url: `/api/verdicts/${questionId}/current`,
      });

      if (response.statusCode === 404) {
        console.log('⚠️  No current verdict found');
        return;
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('verdictLabel');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('reasoning');
      expect(body).toHaveProperty('evidenceBullets');
      expect(body).toHaveProperty('scopeNote');
      
      console.log('✅ Current verdict:');
      console.log(`   Label: ${body.verdictLabel}`);
      console.log(`   Confidence: ${body.confidence}%`);
      console.log(`   Articles: ${body.scopeNote.articleCount}, Outlets: ${body.scopeNote.outletCount}`);
      console.log(`   Evidence bullets: ${body.evidenceBullets.length}`);
    });
  });

  describe('Consensus Thermometer Endpoint', () => {
    let questionId: string | null = null;

    beforeAll(async () => {
      // Get a question ID from topics
      const topicsResponse = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });
      
      const topics = JSON.parse(topicsResponse.body);
      if (topics.length > 0) {
        const topicDetailsResponse = await server.inject({
          method: 'GET',
          url: `/api/topics/${topics[0].id}`,
        });
        
        const topicDetails = JSON.parse(topicDetailsResponse.body);
        if (topicDetails.questions && topicDetails.questions.length > 0) {
          questionId = topicDetails.questions[0].id;
        }
      }
    });

    test('GET /api/consensus/:questionId/thermometer should return consensus data', async () => {
      if (!questionId) {
        console.log('⚠️  Skipping consensus thermometer test - no questions found');
        return;
      }

      const response = await server.inject({
        method: 'GET',
        url: `/api/consensus/${questionId}/thermometer`,
      });

      if (response.statusCode === 404) {
        console.log('⚠️  No consensus data found');
        return;
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('questionId');
      expect(body).toHaveProperty('questionText');
      expect(body).toHaveProperty('month');
      expect(body).toHaveProperty('outletStances');
      expect(body).toHaveProperty('stanceSummary');
      expect(Array.isArray(body.outletStances)).toBe(true);
      expect(Array.isArray(body.stanceSummary)).toBe(true);
      
      console.log('✅ Consensus thermometer data:');
      console.log(`   Question: "${body.questionText.substring(0, 60)}..."`);
      console.log(`   Outlets: ${body.outletStances.length}`);
      console.log(`   Stance summary:`);
      body.stanceSummary.forEach((summary: any) => {
        console.log(`     - ${summary.stance}: ${summary.outletCount} outlets (${(summary.weightedSupport * 100).toFixed(1)}% weighted)`);
      });
    });
  });

  describe('Debate Card Endpoint', () => {
    let questionId: string | null = null;

    beforeAll(async () => {
      // Get a question ID from topics
      const topicsResponse = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });
      
      const topics = JSON.parse(topicsResponse.body);
      if (topics.length > 0) {
        const topicDetailsResponse = await server.inject({
          method: 'GET',
          url: `/api/topics/${topics[0].id}`,
        });
        
        const topicDetails = JSON.parse(topicDetailsResponse.body);
        if (topicDetails.questions && topicDetails.questions.length > 0) {
          questionId = topicDetails.questions[0].id;
        }
      }
    });

    test('GET /api/debate/:questionId should return debate card data', async () => {
      if (!questionId) {
        console.log('⚠️  Skipping debate card test - no questions found');
        return;
      }

      const response = await server.inject({
        method: 'GET',
        url: `/api/debate/${questionId}`,
      });

      if (response.statusCode === 404) {
        console.log('⚠️  No debate card data found');
        return;
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('questionId');
      expect(body).toHaveProperty('questionText');
      expect(body).toHaveProperty('overview');
      expect(body).toHaveProperty('argumentsFor');
      expect(body).toHaveProperty('argumentsAgainst');
      expect(body).toHaveProperty('unknowns');
      expect(body).toHaveProperty('sources');
      expect(Array.isArray(body.argumentsFor)).toBe(true);
      expect(Array.isArray(body.argumentsAgainst)).toBe(true);
      expect(Array.isArray(body.sources)).toBe(true);
      
      console.log('✅ Debate card data:');
      console.log(`   Question: "${body.questionText.substring(0, 60)}..."`);
      console.log(`   Arguments for: ${body.argumentsFor.length}`);
      console.log(`   Arguments against: ${body.argumentsAgainst.length}`);
      console.log(`   Sources: ${body.sources.length}`);
    });
  });

  describe('Transparency Endpoints', () => {
    test('GET /api/transparency/outlets should return transparency data', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/transparency/outlets',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('outlets');
      expect(body).toHaveProperty('methodology');
      expect(Array.isArray(body.outlets)).toBe(true);
      
      console.log(`✅ Transparency data: ${body.outlets.length} outlets`);
      if (body.outlets.length > 0) {
        const outlet = body.outlets[0];
        console.log(`   Sample outlet: ${outlet.name} (credibility: ${outlet.credibilityScore})`);
        console.log(`   Articles: ${outlet.articleCount}, Contributions: ${outlet.contributionCount}`);
      }
    });

    test('GET /api/transparency/methodology should return methodology', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/transparency/methodology',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('verdictCalculation');
      expect(body).toHaveProperty('credibilityScoring');
      expect(body).toHaveProperty('stanceClassification');
      expect(body).toHaveProperty('updateFrequency');
      
      console.log('✅ Methodology:');
      console.log(`   ${body.verdictCalculation.substring(0, 80)}...`);
    });
  });

  describe('Feedback Endpoint', () => {
    let verdictId: string | null = null;

    beforeAll(async () => {
      // Get a verdict ID from topics
      const topicsResponse = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });
      
      const topics = JSON.parse(topicsResponse.body);
      if (topics.length > 0) {
        const verdictResponse = await server.inject({
          method: 'GET',
          url: `/api/topics/${topics[0].id}/verdict`,
        });
        
        if (verdictResponse.statusCode === 200) {
          const verdict = JSON.parse(verdictResponse.body);
          verdictId = verdict.id;
        }
      }
    });

    test('POST /api/feedback should accept feedback', async () => {
      if (!verdictId) {
        console.log('⚠️  Skipping feedback test - no verdict found');
        return;
      }

      const response = await server.inject({
        method: 'POST',
        url: '/api/feedback',
        payload: {
          verdictId,
          type: 'useful',
          notes: 'Test feedback from integration test',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('verdictId', verdictId);
      expect(body).toHaveProperty('type', 'useful');
      
      console.log('✅ Feedback submitted:', body);
    });
  });
});

