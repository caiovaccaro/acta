# Question Validation Framework Design

**Feature**: Article Analysis & Verdict Pipeline  
**Date**: 2025-01-27  
**Status**: Design Complete

## Overview

This document defines the flexible, composable question validation framework that allows the system to validate questions against a configurable set of checks. The framework supports adding, removing, or modifying validation checks without changing core validation logic.

## Design Principles

1. **Composable**: Individual checks can be added/removed independently
2. **Configurable**: Framework behavior controlled via configuration
3. **Extensible**: Easy to add custom checks
4. **Testable**: Each check is independently testable
5. **Type Safe**: Full TypeScript support

## Architecture

```
modules/core/src/validation/
├── framework.ts              # Core validation framework
├── config.ts                # Framework configuration
├── types.ts                  # Shared types
└── checks/
    ├── index.ts              # Check registry
    ├── publicClarity.ts      # Check 1: Public Clarity
    ├── alignmentWithDebate.ts # Check 2: Alignment with Real Debate
    ├── simplicityWithoutBias.ts # Check 3: Simplicity Without Bias
    ├── anchoringInNews.ts    # Check 4: Anchoring in Current News
    ├── explicitObjective.ts  # Check 5: Explicit Objective
    ├── clearBinaryNature.ts  # Check 6: Clear Binary Nature
    ├── answerableWithEvidence.ts # Check 7: Answerable with Evidence
    └── custom.ts             # Template for custom checks
```

## Core Framework

### Framework Interface

```typescript
// modules/core/src/validation/framework.ts

export interface ValidationFramework {
  /**
   * Validate a question against all configured checks
   */
  validate(question: string, context?: ValidationContext): Promise<ValidationResult>;

  /**
   * Get list of active checks
   */
  getActiveChecks(): ValidationCheck[];

  /**
   * Add a custom check
   */
  addCheck(check: ValidationCheck): void;

  /**
   * Remove a check by name
   */
  removeCheck(checkName: string): void;

  /**
   * Enable/disable a check
   */
  setCheckEnabled(checkName: string, enabled: boolean): void;
}
```

### Type Definitions

```typescript
// modules/core/src/validation/types.ts

export interface ValidationContext {
  topic?: string;
  articles?: Article[];
  questionHistory?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  checks: CheckResult[];
  overallScore: number; // 0-1, weighted average
  passedChecks: number;
  failedChecks: number;
  suggestions?: string[];
}

export interface CheckResult {
  checkName: string;
  passed: boolean;
  score: number; // 0-1
  notes?: string;
  suggestions?: string[];
}

export interface ValidationCheck {
  name: string;
  description: string;
  weight: number; // 0-1, for weighted scoring
  enabled: boolean;
  validate: (question: string, context?: ValidationContext) => Promise<CheckResult>;
}
```

## Default Checks

### Check 1: Public Clarity

```typescript
// modules/core/src/validation/checks/publicClarity.ts

import { ValidationCheck, CheckResult, ValidationContext } from '../types.js';

export const publicClarityCheck: ValidationCheck = {
  name: 'publicClarity',
  description: 'Question is understandable by any user without additional explanation',
  weight: 0.15,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    // Check for jargon, technical terms, acronyms
    const hasJargon = /[A-Z]{3,}/.test(question); // Acronyms
    const hasTechnicalTerms = /\b(?:API|GDPR|GDP|CPI|etc\.)\b/i.test(question);
    const isTooLong = question.length > 150;
    const hasComplexStructure = (question.match(/\?/g) || []).length > 1;

    const issues: string[] = [];
    if (hasJargon) issues.push('Contains acronyms that may not be clear');
    if (hasTechnicalTerms) issues.push('Contains technical terms');
    if (isTooLong) issues.push('Question is too long');
    if (hasComplexStructure) issues.push('Question has complex structure');

    const passed = issues.length === 0;
    const score = passed ? 1.0 : Math.max(0, 1.0 - (issues.length * 0.25));

    return {
      checkName: 'publicClarity',
      passed,
      score,
      notes: issues.length > 0 ? issues.join('; ') : undefined,
      suggestions: issues.length > 0 ? [
        'Simplify language',
        'Remove acronyms or explain them',
        'Break into shorter sentences',
      ] : undefined,
    };
  },
};
```

### Check 2: Alignment with Real Debate

```typescript
// modules/core/src/validation/checks/alignmentWithDebate.ts

export const alignmentWithDebateCheck: ValidationCheck = {
  name: 'alignmentWithDebate',
  description: 'Question mirrors the most recognized axis of public debate',
  weight: 0.15,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    // This check may require LLM to assess alignment with real debate
    // For now, check for common debate patterns
    
    const hasDebateKeywords = /\b(?:should|must|effective|best|worst|right|wrong)\b/i.test(question);
    const isPolarizing = /\b(?:always|never|all|none)\b/i.test(question);
    
    // If context has articles, check if question aligns with their themes
    let alignmentScore = 0.5;
    if (context?.articles && context.articles.length > 0) {
      // Simple keyword matching - could be enhanced with LLM
      const articleKeywords = extractKeywords(context.articles);
      const questionKeywords = extractKeywords([question]);
      alignmentScore = calculateOverlap(articleKeywords, questionKeywords);
    }

    const passed = hasDebateKeywords && alignmentScore > 0.3;
    const score = (hasDebateKeywords ? 0.5 : 0) + (alignmentScore * 0.5);

    return {
      checkName: 'alignmentWithDebate',
      passed,
      score,
      notes: passed ? undefined : 'Question may not align with real public debate',
      suggestions: !passed ? [
        'Reframe to match actual public discourse',
        'Use language that reflects common debate framing',
      ] : undefined,
    };
  },
};
```

### Check 3: Simplicity Without Bias

```typescript
// modules/core/src/validation/checks/simplicityWithoutBias.ts

export const simplicityWithoutBiasCheck: ValidationCheck = {
  name: 'simplicityWithoutBias',
  description: 'Question avoids moral judgment, focuses on effectiveness',
  weight: 0.15,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    const biasKeywords = /\b(?:evil|good|bad|wrong|right|immoral|unethical)\b/i;
    const hasBias = biasKeywords.test(question);
    
    const effectivenessPattern = /(?:effective|efficient|successful|achieve|prevent)/i;
    const focusesOnEffectiveness = effectivenessPattern.test(question);
    
    const isSimple = question.split(' ').length < 25;
    
    const passed = !hasBias && (focusesOnEffectiveness || isSimple);
    let score = 0.5;
    if (!hasBias) score += 0.3;
    if (focusesOnEffectiveness) score += 0.2;
    if (isSimple) score += 0.1;
    score = Math.min(1.0, score);

    return {
      checkName: 'simplicityWithoutBias',
      passed,
      score,
      notes: hasBias ? 'Contains moral judgment language' : undefined,
      suggestions: hasBias ? [
        'Remove moral judgment language',
        'Reframe as effectiveness question: "Is X the most effective way to achieve Y?"',
      ] : undefined,
    };
  },
};
```

### Check 4: Anchoring in Current News

```typescript
// modules/core/src/validation/checks/anchoringInNews.ts

export const anchoringInNewsCheck: ValidationCheck = {
  name: 'anchoringInNews',
  description: 'Question relates to real events happening around the current moment',
  weight: 0.15,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    const timeKeywords = /\b(?:now|current|recent|today|this (?:week|month|year))\b/i;
    const hasTimeAnchor = timeKeywords.test(question);
    
    // Check if context has recent articles
    const hasRecentArticles = context?.articles?.some(article => {
      if (!article.publishedDate) return false;
      const daysSincePublished = (Date.now() - article.publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSincePublished < 90; // Within last 3 months
    });

    const passed = hasTimeAnchor || hasRecentArticles;
    const score = (hasTimeAnchor ? 0.6 : 0) + (hasRecentArticles ? 0.4 : 0);

    return {
      checkName: 'anchoringInNews',
      passed,
      score,
      notes: !passed ? 'Question may not be anchored in current events' : undefined,
      suggestions: !passed ? [
        'Add time context: "currently", "recently", "this year"',
        'Link to specific current events',
      ] : undefined,
    };
  },
};
```

### Check 5: Explicit Objective

```typescript
// modules/core/src/validation/checks/explicitObjective.ts

export const explicitObjectiveCheck: ValidationCheck = {
  name: 'explicitObjective',
  description: 'Question has a clearly defined, measurable metric',
  weight: 0.15,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    const measurableKeywords = /\b(?:reduce|increase|prevent|achieve|improve|decrease|lower|raise)\b/i;
    const hasMeasurableAction = measurableKeywords.test(question);
    
    const metricKeywords = /\b(?:deaths|violence|cost|efficiency|success|failure|rate|percentage)\b/i;
    const hasMetric = metricKeywords.test(question);
    
    const passed = hasMeasurableAction && hasMetric;
    const score = (hasMeasurableAction ? 0.5 : 0) + (hasMetric ? 0.5 : 0);

    return {
      checkName: 'explicitObjective',
      passed,
      score,
      notes: !passed ? 'Question lacks explicit, measurable objective' : undefined,
      suggestions: !passed ? [
        'Add measurable metric: "reduce deaths", "increase efficiency"',
        'Specify what success looks like',
      ] : undefined,
    };
  },
};
```

### Check 6: Clear Binary Nature

```typescript
// modules/core/src/validation/checks/clearBinaryNature.ts

export const clearBinaryNatureCheck: ValidationCheck = {
  name: 'clearBinaryNature',
  description: 'Both sides are plausible, natural Yes/No answer',
  weight: 0.15,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    const isYesNo = /^(?:is|are|should|can|will|does|do|has|have|did|was|were)\s/i.test(question);
    const hasMultipleOptions = /\b(?:or|either|choose|select|pick)\b/i.test(question);
    const isOpenEnded = /^(?:what|how|why|when|where|who)\s/i.test(question);
    
    const passed = isYesNo && !hasMultipleOptions && !isOpenEnded;
    let score = 0.5;
    if (isYesNo) score += 0.3;
    if (!hasMultipleOptions) score += 0.1;
    if (!isOpenEnded) score += 0.1;
    score = Math.min(1.0, score);

    return {
      checkName: 'clearBinaryNature',
      passed,
      score,
      notes: !passed ? 'Question may not have clear Yes/No answer' : undefined,
      suggestions: !passed ? [
        'Reframe as Yes/No question',
        'Remove multiple choice options',
        'Avoid open-ended questions',
      ] : undefined,
    };
  },
};
```

### Check 7: Answerable with Evidence

```typescript
// modules/core/src/validation/checks/answerableWithEvidence.ts

export const answerableWithEvidenceCheck: ValidationCheck = {
  name: 'answerableWithEvidence',
  description: 'Question can be verified with data, studies, policies',
  weight: 0.15,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    const evidenceKeywords = /\b(?:data|study|research|evidence|statistics|policy|law|regulation)\b/i;
    const hasEvidenceContext = evidenceKeywords.test(question);
    
    // Check if context has articles with data/evidence
    const hasEvidenceInArticles = context?.articles?.some(article => {
      const content = `${article.title} ${article.textContent}`;
      return evidenceKeywords.test(content);
    });

    const passed = hasEvidenceContext || hasEvidenceInArticles;
    const score = (hasEvidenceContext ? 0.6 : 0) + (hasEvidenceInArticles ? 0.4 : 0);

    return {
      checkName: 'answerableWithEvidence',
      passed,
      score,
      notes: !passed ? 'Question may not be answerable with evidence' : undefined,
      suggestions: !passed ? [
        'Reframe to reference data, studies, or policies',
        'Link to measurable outcomes',
      ] : undefined,
    };
  },
};
```

## Framework Implementation

```typescript
// modules/core/src/validation/framework.ts

import { ValidationCheck, ValidationResult, ValidationContext } from './types.js';
import { defaultChecks } from './checks/index.js';

export class ValidationFramework {
  private checks: Map<string, ValidationCheck> = new Map();
  private config: FrameworkConfig;

  constructor(config?: FrameworkConfig) {
    this.config = config || getDefaultConfig();
    this.initializeChecks();
  }

  private initializeChecks(): void {
    // Load default checks
    for (const check of defaultChecks) {
      this.checks.set(check.name, check);
    }

    // Load custom checks from config
    if (this.config.customChecks) {
      for (const check of this.config.customChecks) {
        this.checks.set(check.name, check);
      }
    }

    // Apply enabled/disabled settings
    if (this.config.disabledChecks) {
      for (const checkName of this.config.disabledChecks) {
        const check = this.checks.get(checkName);
        if (check) {
          check.enabled = false;
        }
      }
    }
  }

  async validate(question: string, context?: ValidationContext): Promise<ValidationResult> {
    const activeChecks = this.getActiveChecks();
    const checkResults: CheckResult[] = [];

    // Run all active checks in parallel
    const results = await Promise.all(
      activeChecks.map(check => check.validate(question, context))
    );

    // Calculate weighted score
    let totalWeight = 0;
    let weightedScore = 0;
    
    for (const result of results) {
      checkResults.push(result);
      const check = this.checks.get(result.checkName);
      if (check) {
        totalWeight += check.weight;
        weightedScore += result.score * check.weight;
      }
    }

    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const passedChecks = checkResults.filter(r => r.passed).length;
    const failedChecks = checkResults.length - passedChecks;
    const isValid = overallScore >= this.config.minScore && failedChecks === 0;

    // Generate suggestions from failed checks
    const suggestions = checkResults
      .filter(r => !r.passed && r.suggestions)
      .flatMap(r => r.suggestions || []);

    return {
      isValid,
      checks: checkResults,
      overallScore,
      passedChecks,
      failedChecks,
      suggestions: suggestions.length > 0 ? [...new Set(suggestions)] : undefined,
    };
  }

  getActiveChecks(): ValidationCheck[] {
    return Array.from(this.checks.values()).filter(check => check.enabled);
  }

  addCheck(check: ValidationCheck): void {
    this.checks.set(check.name, check);
  }

  removeCheck(checkName: string): void {
    this.checks.delete(checkName);
  }

  setCheckEnabled(checkName: string, enabled: boolean): void {
    const check = this.checks.get(checkName);
    if (check) {
      check.enabled = enabled;
    }
  }
}
```

## Configuration

```typescript
// modules/core/src/validation/config.ts

export interface FrameworkConfig {
  minScore?: number; // Minimum overall score to pass (default: 0.7)
  disabledChecks?: string[]; // Checks to disable
  customChecks?: ValidationCheck[]; // Custom checks to add
  checkWeights?: Record<string, number>; // Override check weights
}

export function getDefaultConfig(): FrameworkConfig {
  return {
    minScore: 0.7,
    disabledChecks: [],
    customChecks: [],
  };
}

// Load from environment or config file
export function loadConfig(): FrameworkConfig {
  return {
    minScore: parseFloat(process.env.VALIDATION_MIN_SCORE || '0.7'),
    disabledChecks: process.env.VALIDATION_DISABLED_CHECKS?.split(',') || [],
  };
}
```

## Usage Example

```typescript
import { ValidationFramework } from '@acta/core/validation';
import { loadConfig } from '@acta/core/validation/config';

const framework = new ValidationFramework(loadConfig());

const result = await framework.validate(
  'Is what\'s happening in Gaza a genocide?',
  {
    topic: 'Gaza',
    articles: [...],
  }
);

if (result.isValid) {
  console.log('Question is valid!');
} else {
  console.log('Question failed validation:');
  result.checks.forEach(check => {
    if (!check.passed) {
      console.log(`- ${check.checkName}: ${check.notes}`);
    }
  });
  console.log('Suggestions:', result.suggestions);
}
```

## Adding Custom Checks

```typescript
// Custom check example
import { ValidationCheck } from '@acta/core/validation/types';

const myCustomCheck: ValidationCheck = {
  name: 'myCustomCheck',
  description: 'My custom validation logic',
  weight: 0.1,
  enabled: true,
  
  async validate(question: string, context?: ValidationContext): Promise<CheckResult> {
    // Your validation logic here
    const passed = /* your logic */;
    
    return {
      checkName: 'myCustomCheck',
      passed,
      score: passed ? 1.0 : 0.0,
      notes: passed ? undefined : 'Custom check failed',
    };
  },
};

// Add to framework
framework.addCheck(myCustomCheck);
```

## Testing

```typescript
// modules/core/src/validation/__tests__/framework.test.ts

describe('ValidationFramework', () => {
  it('should validate question against all checks', async () => {
    const framework = new ValidationFramework();
    const result = await framework.validate('Is X effective?');
    
    expect(result.checks).toHaveLength(7);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  it('should allow disabling checks', () => {
    const framework = new ValidationFramework({
      disabledChecks: ['publicClarity'],
    });
    
    const checks = framework.getActiveChecks();
    expect(checks.find(c => c.name === 'publicClarity')).toBeUndefined();
  });
});
```

## Benefits

1. **Flexibility**: Easy to add/remove/modify checks
2. **Maintainability**: Each check is independent
3. **Testability**: Each check can be tested separately
4. **Configurability**: Framework behavior controlled via config
5. **Extensibility**: Custom checks can be added without modifying core

