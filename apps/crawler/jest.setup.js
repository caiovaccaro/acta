/**
 * Jest setup file for crawler tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public';

