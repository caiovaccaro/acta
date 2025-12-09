/**
 * Validation Framework Types
 * Type definitions for the question validation framework
 */

export interface ValidationCheck {
  name: string;
  passed: boolean;
  confidence: number; // 0-1
  notes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  checks: ValidationCheck[];
  overallConfidence: number; // 0-1
  suggestions?: string[];
}

export interface ValidationFrameworkConfig {
  requireAllChecks?: boolean; // If true, all checks must pass for isValid=true
  minConfidence?: number; // Minimum overall confidence (0-1)
}

