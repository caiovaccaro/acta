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

export type LLMTaskType =
  | 'default'
  | 'classification'
  | 'validation'
  | 'convergence'
  | 'generation';

function resolveOpenAIModel(taskType: LLMTaskType): string {
  const baseModel = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  const cheapModel = process.env.OPENAI_MODEL_CHEAP;
  const strongModel = process.env.OPENAI_MODEL_STRONG;

  const taskSpecificModel =
    (taskType === 'classification' && process.env.OPENAI_MODEL_CLASSIFICATION) ||
    (taskType === 'validation' && process.env.OPENAI_MODEL_VALIDATION) ||
    (taskType === 'convergence' && process.env.OPENAI_MODEL_CONVERGENCE) ||
    (taskType === 'generation' && process.env.OPENAI_MODEL_GENERATION) ||
    undefined;

  if (taskSpecificModel) {
    return taskSpecificModel;
  }

  if (
    (taskType === 'classification' || taskType === 'validation' || taskType === 'convergence') &&
    cheapModel
  ) {
    return cheapModel;
  }

  if (taskType === 'generation' && strongModel) {
    return strongModel;
  }

  return baseModel;
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
 * @param taskType - Optional task type for model routing
 * @returns LLM configuration
 */
export function createLLMConfigFromEnv(taskType: LLMTaskType = 'default'): LLMConfig {
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
      model: resolveOpenAIModel(taskType),
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

