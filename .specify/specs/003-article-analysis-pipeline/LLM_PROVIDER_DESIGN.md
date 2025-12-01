# LLM Provider Abstraction Design

**Feature**: Article Analysis & Verdict Pipeline  
**Date**: 2025-01-27  
**Status**: Design Complete

## Overview

This document defines the flexible, composable LLM provider abstraction that allows the system to switch between different LLM providers (OpenAI, Anthropic, open-source, etc.) without changing core analysis logic.

## Design Principles

1. **Provider Agnostic**: Core logic doesn't depend on specific provider
2. **Composable**: Easy to add new providers
3. **Type Safe**: Full TypeScript support
4. **Configurable**: Provider selection via configuration
5. **Testable**: Easy to mock for testing

## Architecture

```
modules/core/src/llm/
├── provider.ts              # Abstract interface
├── types.ts                 # Shared types
├── config.ts                # Configuration
├── providers/
│   ├── openaiProvider.ts    # OpenAI implementation
│   ├── anthropicProvider.ts # Anthropic implementation (future)
│   └── localProvider.ts     # Local model implementation (future)
└── batchProcessor.ts        # Batch processing utilities
```

## Interface Definition

### Core Provider Interface

```typescript
// modules/core/src/llm/provider.ts

export interface LLMProvider {
  /**
   * Classify stance for an article-question pair
   */
  classifyStance(params: ClassifyStanceParams): Promise<StanceClassification>;

  /**
   * Validate a question against the framework
   */
  validateQuestion(params: ValidateQuestionParams): Promise<QuestionValidation>;

  /**
   * Batch classify multiple stances (for cost optimization)
   */
  batchClassifyStances(params: BatchClassifyStancesParams): Promise<StanceClassification[]>;

  /**
   * Generate reformulated question versions
   */
  reformulateQuestion(params: ReformulateQuestionParams): Promise<QuestionReformulation[]>;

  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}
```

### Type Definitions

```typescript
// modules/core/src/llm/types.ts

export interface ClassifyStanceParams {
  article: {
    title: string;
    textContent: string;
    url: string;
  };
  question: {
    text: string;
    topic: string;
  };
  month: Date; // Month period for tracking
}

export interface StanceClassification {
  stance: Stance;
  confidence: number; // 0-1
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface ValidateQuestionParams {
  question: string;
  topic: string;
  context?: string; // Optional article context
}

export interface QuestionValidation {
  isValid: boolean;
  checks: ValidationCheck[];
  overallConfidence: number; // 0-1
  suggestions?: string[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  confidence: number; // 0-1
  notes?: string;
}

export interface BatchClassifyStancesParams {
  items: ClassifyStanceParams[];
  options?: {
    maxBatchSize?: number;
    timeout?: number;
  };
}

export interface ReformulateQuestionParams {
  originalQuestion: string;
  failedChecks: string[]; // Names of failed validation checks
  topic: string;
}

export interface QuestionReformulation {
  text: string;
  improvements: string[]; // What was improved
  confidence: number; // 0-1
}

export type Stance = 'YesItSeemsSo' | 'ProbablyYes' | 'Unclear' | 'ProbablyNot' | 'NoItDoesntSeemSo';
```

## Provider Implementations

### OpenAI Provider

```typescript
// modules/core/src/llm/providers/openaiProvider.ts

import { LLMProvider, ClassifyStanceParams, StanceClassification } from '../provider.js';
import { OpenAI } from 'openai';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-4-turbo-preview';
  }

  async classifyStance(params: ClassifyStanceParams): Promise<StanceClassification> {
    const prompt = this.buildStanceClassificationPrompt(params);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      return this.parseStanceResponse(response);
    } catch (error) {
      throw new LLMProviderError('OpenAI classification failed', error);
    }
  }

  async batchClassifyStances(
    params: BatchClassifyStancesParams
  ): Promise<StanceClassification[]> {
    // Use OpenAI batch API for cost optimization
    // Implementation details...
  }

  // ... other methods

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
}
```

### Configuration

```typescript
// modules/core/src/llm/config.ts

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  openai?: {
    apiKey: string;
    model?: string;
    maxRetries?: number;
    timeout?: number;
  };
  anthropic?: {
    apiKey: string;
    model?: string;
  };
  local?: {
    endpoint: string;
    model?: string;
  };
}

export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.openai?.apiKey) {
        throw new Error('OpenAI API key required');
      }
      return new OpenAIProvider(config.openai);
    
    case 'anthropic':
      if (!config.anthropic?.apiKey) {
        throw new Error('Anthropic API key required');
      }
      return new AnthropicProvider(config.anthropic);
    
    case 'local':
      return new LocalProvider(config.local);
    
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

## Usage Example

```typescript
// In analysis code
import { createLLMProvider } from '@acta/core/llm';
import { config } from './config.js';

const llmProvider = createLLMProvider(config.llm);

// Classify stance
const classification = await llmProvider.classifyStance({
  article: {
    title: article.title,
    textContent: article.textContent,
    url: article.url,
  },
  question: {
    text: question.questionText,
    topic: question.topic.name,
  },
  month: currentMonth,
});

// Validate question
const validation = await llmProvider.validateQuestion({
  question: questionText,
  topic: topicName,
});
```

## Error Handling

```typescript
// modules/core/src/llm/errors.ts

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export class LLMRateLimitError extends LLMProviderError {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message, undefined, true);
    this.name = 'LLMRateLimitError';
  }
}

export class LLMTimeoutError extends LLMProviderError {
  constructor(message: string) {
    super(message, undefined, true);
    this.name = 'LLMTimeoutError';
  }
}
```

## Retry Logic

```typescript
// modules/core/src/llm/retry.ts

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      if (error instanceof LLMProviderError && !error.retryable) {
        throw error;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}
```

## Testing

### Mock Provider

```typescript
// modules/core/src/llm/providers/mockProvider.ts

export class MockLLMProvider implements LLMProvider {
  async classifyStance(params: ClassifyStanceParams): Promise<StanceClassification> {
    return {
      stance: 'Unclear',
      confidence: 0.8,
      reasoning: 'Mock classification',
    };
  }

  // ... other methods return mock data
}
```

### Unit Tests

```typescript
// modules/core/src/llm/__tests__/provider.test.ts

describe('LLMProvider', () => {
  it('should classify stance', async () => {
    const provider = new MockLLMProvider();
    const result = await provider.classifyStance({
      article: { title: 'Test', textContent: 'Content', url: 'http://test.com' },
      question: { text: 'Is X true?', topic: 'Test' },
      month: new Date(),
    });
    
    expect(result.stance).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });
});
```

## Future Providers

### Anthropic Provider

```typescript
// modules/core/src/llm/providers/anthropicProvider.ts

import { Anthropic } from '@anthropic-ai/sdk';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  
  // Similar structure to OpenAIProvider
  // Implements same interface
}
```

### Local Provider (Ollama, etc.)

```typescript
// modules/core/src/llm/providers/localProvider.ts

export class LocalProvider implements LLMProvider {
  private endpoint: string;
  
  // Uses local HTTP endpoint
  // Implements same interface
}
```

## Configuration Management

### Environment Variables

```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
```

### Configuration File

```typescript
// config/llm.ts
export const llmConfig: LLMConfig = {
  provider: process.env.LLM_PROVIDER || 'openai',
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    maxRetries: 3,
    timeout: 30000,
  },
};
```

## Migration Path

1. **Phase 1**: Implement OpenAI provider (current)
2. **Phase 2**: Add Anthropic provider (optional)
3. **Phase 3**: Add local provider support (optional)
4. **Phase 4**: Support provider switching at runtime (advanced)

## Benefits

1. **Flexibility**: Easy to switch providers
2. **Cost Optimization**: Can use cheaper providers for certain tasks
3. **Resilience**: Fallback to alternative providers if one fails
4. **Testing**: Easy to mock for unit tests
5. **Future-proof**: Ready for new providers as they emerge

