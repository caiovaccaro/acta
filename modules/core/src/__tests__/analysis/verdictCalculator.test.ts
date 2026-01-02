import { describe, it, expect } from '@jest/globals';
import { calculateVerdict } from '../../analysis/verdictCalculator';
import type { Stance, Ideology } from '@prisma/client';

describe('calculateVerdict', () => {
  it('calculates verdict from stances', () => {
    const stances = [
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.9,
        article: {
          outlet: {
            id: 'outlet-1',
            credibilityScore: 0.8,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.8,
        article: {
          outlet: {
            id: 'outlet-2',
            credibilityScore: 0.7,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'ProbablyYes' as Stance,
        confidence: 0.7,
        article: {
          outlet: {
            id: 'outlet-3',
            credibilityScore: 0.6,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'Unclear' as Stance,
        confidence: 0.5,
        article: {
          outlet: {
            id: 'outlet-4',
            credibilityScore: 0.5,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.85,
        article: {
          outlet: {
            id: 'outlet-5',
            credibilityScore: 0.75,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.9,
        article: {
          outlet: {
            id: 'outlet-6',
            credibilityScore: 0.8,
            ideology: 'Center' as Ideology,
          },
        },
      },
    ];

    const result = calculateVerdict(stances);

    expect(result.verdictLabel).toBe('YesItSeemsSo');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.supportShare).toBeGreaterThan(0);
    expect(result.articleCount).toBe(6);
  });

  it('handles empty stances array', () => {
    const result = calculateVerdict([]);

    expect(result.verdictLabel).toBe('Unclear');
    expect(result.confidence).toBe(20);
    expect(result.articleCount).toBe(0);
  });

  it('calculates correct support share', () => {
    const stances = [
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.9,
        article: {
          outlet: {
            id: 'outlet-1',
            credibilityScore: 0.8,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.8,
        article: {
          outlet: {
            id: 'outlet-2',
            credibilityScore: 0.7,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'NoItDoesntSeemSo' as Stance,
        confidence: 0.7,
        article: {
          outlet: {
            id: 'outlet-3',
            credibilityScore: 0.6,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.85,
        article: {
          outlet: {
            id: 'outlet-4',
            credibilityScore: 0.75,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.9,
        article: {
          outlet: {
            id: 'outlet-5',
            credibilityScore: 0.8,
            ideology: 'Center' as Ideology,
          },
        },
      },
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.88,
        article: {
          outlet: {
            id: 'outlet-6',
            credibilityScore: 0.78,
            ideology: 'Center' as Ideology,
          },
        },
      },
    ];

    const result = calculateVerdict(stances);

    expect(result.supportShare).toBeGreaterThan(0);
    expect(result.supportShare).toBeLessThanOrEqual(1);
  });

  it('returns Unclear for insufficient articles', () => {
    const stances = [
      {
        stance: 'YesItSeemsSo' as Stance,
        confidence: 0.9,
        article: {
          outlet: {
            id: 'outlet-1',
            credibilityScore: 0.8,
            ideology: 'Center' as Ideology,
          },
        },
      },
    ];

    const result = calculateVerdict(stances);

    expect(result.verdictLabel).toBe('Unclear');
    expect(result.confidence).toBe(20);
  });
});

