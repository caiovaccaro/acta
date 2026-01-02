/**
 * @acta/core - Core Module
 * 
 * Exports core domain logic and utilities
 */

export * from './llm/index.js';
export * from './analysis/index.js';
export * from './utils/monthPeriod.js';
// Validation exports (excluding ValidationCheck to avoid conflict with LLM types)
export * from './validation/framework.js';
export * from './validation/config.js';
export * from './validation/barQuestionValidator.js';
export type { ValidationCheck as ValidationFrameworkCheck } from './validation/types.js';

