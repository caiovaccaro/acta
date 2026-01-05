/**
 * LLM Configuration
 * Configuration system for LLM provider selection and setup
 */

import type { LLMProvider } from './provider';
import { OpenAIProvider, type OpenAIProviderConfig } from './providers/openaiProvider';

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

/**
 * Creates an LLM provider based on configuration
 * @param config - LLM configuration
 * @returns LLM provider instance
 */
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.openai?.apiKey) {
        throw new Error('OpenAI API key is required when using OpenAI provider');
      }
      return new OpenAIProvider(config.openai as OpenAIProviderConfig);

    case 'anthropic':
      // TODO: Implement Anthropic provider in future phase
      throw new Error('Anthropic provider not yet implemented');

    case 'local':
      // TODO: Implement local provider in future phase
      throw new Error('Local provider not yet implemented');

    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

/**
 * Creates LLM configuration from environment variables
 * @returns LLM configuration
 */
export function createLLMConfigFromEnv(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'local';

  const config: LLMConfig = {
    provider,
  };

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    config.openai = {
      apiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      maxRetries: process.env.OPENAI_MAX_RETRIES
        ? parseInt(process.env.OPENAI_MAX_RETRIES, 10)
        : 3,
      timeout: process.env.OPENAI_TIMEOUT
        ? parseInt(process.env.OPENAI_TIMEOUT, 10)
        : 30000,
    };
  }

  return config;
}

