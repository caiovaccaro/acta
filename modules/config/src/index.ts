/**
 * @acta/config - Configuration Module
 * 
 * Centralized environment variable validation and configuration
 */

import { z } from 'zod';

// Environment schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional
  PORT: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
});

// Validate and parse environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

// Export validated config
export const config = validateEnv();

// Database configuration
export const dbConfig = {
  url: config.DATABASE_URL,
  // Connection pool settings (can be extended)
  pool: {
    min: 2,
    max: 10,
  },
};

// Export types
export type Config = typeof config;

