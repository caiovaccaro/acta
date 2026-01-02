import { prisma } from '@acta/db';
import type { TransparencyDTO, OutletTransparencyDTO, MethodologyDTO } from '@acta/shared';

/**
 * Get transparency data (outlets and methodology)
 */
export async function getTransparencyData(): Promise<TransparencyDTO> {
  const outlets = await prisma.outlet.findMany({
    include: {
      articles: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Get contribution counts for each outlet
  const outletContributions = new Map<string, number>();

  // This is a simplified version - in production, you'd want to aggregate
  // article stances across all questions to get total contributions
  // For now, we'll use article count as a proxy
  for (const outlet of outlets) {
    outletContributions.set(outlet.id, outlet.articles?.length || 0);
  }

  const outletDTOs: OutletTransparencyDTO[] = outlets.map((outlet) => ({
    id: outlet.id,
    name: outlet.name,
    credibilityScore: outlet.credibilityScore,
    credibilityBreakdown: {
      externalTrust: outlet.credibilityScore * 0.7, // Simplified - 70% external trust
      transparency: outlet.credibilityScore * 0.3, // Simplified - 30% transparency
    },
    articleCount: outlet.articles?.length || 0,
    contributionCount: outletContributions.get(outlet.id) || 0,
  }));

  const methodology: MethodologyDTO = {
    verdictCalculation:
      'Verdicts are calculated by aggregating article stances weighted by outlet credibility scores. Support share and variance are computed to determine the verdict label and confidence level.',
    credibilityScoring:
      'Credibility scores are based on external trust metrics (70%) and transparency indicators (30%). Scores range from 0 to 1.',
    stanceClassification:
      'Article stances are classified using LLM-based analysis, assigning one of five labels: Yes, Leaning Yes, Unclear, Leaning No, or No.',
    updateFrequency:
      'Verdicts are recalculated monthly based on articles from the previous month. The analysis pipeline runs regularly to process new articles.',
  };

  return {
    outlets: outletDTOs,
    methodology,
  };
}

