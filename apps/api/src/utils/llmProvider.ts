/**
 * LLM Provider Utility
 * Creates and caches LLM provider instance for API services
 */

import { createLLMProvider, createLLMConfigFromEnv, type LLMProvider } from '@acta/core';

let cachedProvider: LLMProvider | null = null;

/**
 * Get or create LLM provider instance
 * Caches the instance for reuse across requests
 */
export function getLLMProvider(): LLMProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  try {
    const config = createLLMConfigFromEnv();
    cachedProvider = createLLMProvider(config);
    return cachedProvider;
  } catch (error) {
    // If LLM is not configured, return a no-op provider that throws errors
    // This allows the API to start even if LLM is not configured
    // Services should handle this gracefully
    throw new Error(
      `LLM provider not configured: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear cached provider (useful for testing)
 */
export function clearLLMProviderCache(): void {
  cachedProvider = null;
}

