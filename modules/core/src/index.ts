/**
 * @acta/core - Core Module
 * 
 * Exports core domain logic and utilities
 */

export * from './llm/index';
export * from './tavily/normalize';
export * from './tavily/client';
export * from './notifications/types';
export * from './notifications/templates';
export * from './notifications/resend';
export * from './analysis/index';
export * from './utils/monthPeriod';
// Validation exports (excluding ValidationCheck to avoid conflict with LLM types)
export * from './validation/framework';
export * from './validation/config';
export * from './validation/barQuestionValidator';
export type { ValidationCheck as ValidationFrameworkCheck } from './validation/types';

