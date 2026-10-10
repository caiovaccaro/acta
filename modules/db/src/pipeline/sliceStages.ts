export const PIPELINE_STAGES = [
  'preflight',
  'tavily_trends',
  'rss_refresh',
  'tavily_priority',
  'article_extraction',
  'topic_discovery',
  'tavily_corroboration',
  'topic_matching',
  'question_discovery',
  'question_validation',
  'stance_classification',
  'verdict_recalculation',
  'content_generation',
  'finalize',
] as const;

export type PipelineStageName = (typeof PIPELINE_STAGES)[number];

export const TAVILY_STAGES: readonly PipelineStageName[] = [
  'tavily_trends',
  'tavily_priority',
  'tavily_corroboration',
];

export function isPipelineStageName(value: string): value is PipelineStageName {
  return (PIPELINE_STAGES as readonly string[]).includes(value);
}

export function nextPipelineStage(
  stage: PipelineStageName,
): PipelineStageName | null {
  const index = PIPELINE_STAGES.indexOf(stage);
  return PIPELINE_STAGES[index + 1] ?? null;
}

export function stageUnitLimit(
  stage: PipelineStageName,
  limits: { maxNewArticles: number; maxAnalysisArticles: number },
): number {
  if (stage === 'article_extraction' || stage === 'rss_refresh') {
    return limits.maxNewArticles;
  }
  if (
    stage === 'stance_classification'
    || stage === 'verdict_recalculation'
    || stage === 'content_generation'
  ) {
    return limits.maxAnalysisArticles;
  }
  return Math.max(limits.maxNewArticles, limits.maxAnalysisArticles);
}
