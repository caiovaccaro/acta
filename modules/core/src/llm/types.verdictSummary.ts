export interface VerdictSummaryParams {
  question: {
    id: string;
    text: string;
    topicName?: string | null;
  };
  verdict: {
    label: string; // VerdictLabel as string
    confidence: number; // 0-100
    supportShare: number; // 0-1
    variance: number; // 0-1
    articleCount?: number; // Number of articles used in calculation (optional for backward compatibility)
  };
  stances: Array<{
    articleTitle: string;
    articleUrl: string;
    outletName: string;
    outletCredibility: number;
    stance: string; // Stance as string
    confidence: number; // 0-1
    reasoning: string; // LLM reasoning per article
  }>;
}

export interface VerdictSummaryResult {
  summary: string; // Short explanation of why the verdict is what it is
}


