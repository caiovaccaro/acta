/**
 * LLM Provider Types
 * Shared type definitions for LLM provider interface
 */

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

export type Stance = 
  | 'YesItSeemsSo' 
  | 'ProbablyYes' 
  | 'Unclear' 
  | 'ProbablyNot' 
  | 'NoItDoesntSeemSo';

export interface ValidateBarQuestionParams {
  question: string;
  topic: string;
}

export interface BarQuestionValidation {
  barReadinessScore: number; // 0-100 score indicating how suitable the question is for bar conversation
  confidence: number; // 0-1 confidence in the score
  reasoning: string; // Explanation of the score
  issues?: string[]; // Specific issues (too technical, too specific, etc.)
  suggestions?: string[]; // How to improve the score
  reformulatedQuestion?: string; // Reformulated version with higher bar readiness
  reformulationScore?: number; // Bar readiness score of the reformulation (0-100)
}

export interface DiscoveredTopic {
  name: string;
  description: string;
  confidence: number; // 0-1
  articleIds: string[];
}

export interface TopicDiscoveryResult {
  topics: DiscoveredTopic[];
}

export interface DiscoveredQuestion {
  questionText: string;
  confidence: number; // 0-1
  articleIds: string[];
}

export interface QuestionDiscoveryResult {
  questions: DiscoveredQuestion[];
}

