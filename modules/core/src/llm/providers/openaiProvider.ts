/**
 * OpenAI Provider
 * Implementation of LLMProvider interface using OpenAI API
 */

import OpenAI from 'openai';
import type {
  LLMProvider,
  ClassifyStanceParams,
  StanceClassification,
  ValidateQuestionParams,
  QuestionValidation,
  BatchClassifyStancesParams,
  QuestionReformulation,
  ReformulateQuestionParams,
  Stance,
} from '../provider.js';
import {
  LLMProviderError,
  LLMRateLimitError,
  LLMInvalidKeyError,
  LLMTimeoutError,
  LLMNetworkError,
} from '../errors.js';
import { withRetry } from '../utils/retry.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private maxRetries: number;
  private timeout: number;

  constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });
    this.model = config.model || 'gpt-4-turbo-preview';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
  }

  getName(): string {
    return 'openai';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async classifyStance(
    params: ClassifyStanceParams
  ): Promise<StanceClassification> {
    const prompt = this.buildStanceClassificationPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });

          return this.parseStanceResponse(response);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  async batchClassifyStances(
    params: BatchClassifyStancesParams
  ): Promise<StanceClassification[]> {
    const { items, options } = params;
    const maxBatchSize = options?.maxBatchSize || 10;
    const results: StanceClassification[] = [];

    // Process in batches
    for (let i = 0; i < items.length; i += maxBatchSize) {
      const batch = items.slice(i, i + maxBatchSize);
      const batchResults = await Promise.all(
        batch.map((item) => this.classifyStance(item))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async validateQuestion(
    params: ValidateQuestionParams
  ): Promise<QuestionValidation> {
    const prompt = this.buildQuestionValidationPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          });

          return this.parseValidationResponse(response);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  async reformulateQuestion(
    params: ReformulateQuestionParams
  ): Promise<QuestionReformulation[]> {
    const prompt = this.buildReformulationPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            response_format: { type: 'json_object' },
          });

          return this.parseReformulationResponse(response);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  private buildStanceClassificationPrompt(
    params: ClassifyStanceParams
  ): string {
    const { article, question, month } = params;
    const monthStr = month.toISOString().slice(0, 7); // YYYY-MM

    return `You are analyzing a news article to determine its stance on a specific question.

Topic: ${question.topic}
Question: ${question.text}
Article Title: ${article.title}
Article URL: ${article.url}
Article Content: ${article.textContent.substring(0, 5000)}...
Analysis Period: ${monthStr}

IMPORTANT: First determine if this article is actually relevant to the question. If the article does not address, discuss, or relate to the question in any meaningful way, return "Unclear" with low confidence (< 0.3) and explain why it's not relevant.

If the article IS relevant, then classify the article's stance on the question. Consider:
- What position does the article take on this question?
- How confident is the article's position?
- What evidence or arguments does the article present?

Return a JSON object with:
{
  "stance": "YesItSeemsSo" | "ProbablyYes" | "Unclear" | "ProbablyNot" | "NoItDoesntSeemSo",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this stance was chosen. If the article is not relevant, explain why."
}`;
  }

  private buildQuestionValidationPrompt(
    params: ValidateQuestionParams
  ): string {
    const { question, topic, context } = params;

    return `You are validating a question against a formulation framework.

Topic: ${topic}
Question: ${question}
${context ? `Context: ${context}` : ''}

Evaluate the question against these 7 criteria:
1. Public Clarity: Is the question clear and understandable to the general public?
2. Alignment with Real Debate: Does the question reflect an actual ongoing debate?
3. Simplicity Without Bias: Is the question simple and free from loaded language?
4. Anchoring in Current News: Is the question relevant to current events?
5. Explicit Objective: Does the question have a clear, explicit objective?
6. Clear Binary Nature: Can the question be answered with one of these stances: "Yes, it seems so", "Probably yes", "Unclear", "Probably not", or "No, it doesn't seem so"? The question MUST be answerable with these specific stance options.
7. Answerable with Evidence: Can the question be answered using evidence from articles?

Return a JSON object with:
{
  "isValid": true/false,
  "checks": [
    {
      "name": "Public Clarity",
      "passed": true/false,
      "confidence": 0.0-1.0,
      "notes": "Optional notes"
    },
    ... (one for each of the 7 checks)
  ],
  "overallConfidence": 0.0-1.0,
  "suggestions": ["Optional improvement suggestions"]
}`;
  }

  private buildReformulationPrompt(
    params: ReformulateQuestionParams
  ): string {
    const { originalQuestion, failedChecks, topic } = params;

    return `You are reformulating a question to address validation failures.

Topic: ${topic}
Original Question: ${originalQuestion}
Failed Checks: ${failedChecks.join(', ')}

IMPORTANT: The question MUST be answerable with one of these specific stances:
- "Yes, it seems so"
- "Probably yes"
- "Unclear"
- "Probably not"
- "No, it doesn't seem so"

Generate 2 reformulated versions of the question that address the failed checks. Each reformulation should:
- Maintain the core intent of the original question
- Address the specific validation failures
- Follow the formulation framework
- Be answerable with the stance options above

Return a JSON object with:
{
  "reformulations": [
    {
      "text": "Reformulated question text",
      "improvements": ["What was improved"],
      "confidence": 0.0-1.0
    },
    ...
  ]
}`;
  }

  private parseStanceResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): StanceClassification {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError('Empty response from OpenAI', undefined, false);
    }

    try {
      const parsed = JSON.parse(content);
      return {
        stance: parsed.stance as Stance,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || '',
        metadata: {
          model: response.model,
          usage: response.usage,
        },
      };
    } catch (error) {
      throw new LLMProviderError(
        'Failed to parse stance response',
        error,
        false
      );
    }
  }

  private parseValidationResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): QuestionValidation {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError('Empty response from OpenAI', undefined, false);
    }

    try {
      const parsed = JSON.parse(content);
      return {
        isValid: parsed.isValid === true,
        checks: parsed.checks || [],
        overallConfidence: parsed.overallConfidence || 0.5,
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      throw new LLMProviderError(
        'Failed to parse validation response',
        error,
        false
      );
    }
  }

  private parseReformulationResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): QuestionReformulation[] {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError('Empty response from OpenAI', undefined, false);
    }

    try {
      const parsed = JSON.parse(content);
      return parsed.reformulations || [];
    } catch (error) {
      throw new LLMProviderError(
        'Failed to parse reformulation response',
        error,
        false
      );
    }
  }

  private handleError(error: unknown): LLMProviderError {
    if (error instanceof LLMProviderError) {
      return error;
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        const err = new LLMRateLimitError(
          'OpenAI rate limit exceeded',
          error
        );
        if (retryAfter) {
          (err as any).retryAfter = parseInt(retryAfter, 10);
        }
        return err;
      }

      if (error.status === 401) {
        return new LLMInvalidKeyError('Invalid OpenAI API key', error);
      }

      if (error.status === 408 || error.status === 504) {
        return new LLMTimeoutError('OpenAI request timeout', error);
      }
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return new LLMTimeoutError('Request timeout', error);
      }
      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        return new LLMNetworkError('Network error', error);
      }
    }

    return new LLMProviderError(
      'Unknown error in OpenAI provider',
      error,
      true
    );
  }
}

