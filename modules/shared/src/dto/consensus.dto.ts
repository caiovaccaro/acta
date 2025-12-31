export type Stance = 
  | 'YesItSeemsSo' 
  | 'ProbablyYes' 
  | 'Unclear' 
  | 'ProbablyNot' 
  | 'NoItDoesntSeemSo';

export interface ConsensusThermometerDTO {
  questionId: string;
  questionText: string;
  month: string;
  outletStances: OutletStanceDTO[]; // Grouped by publication/outlet
  stanceSummary: {
    stance: Stance;
    outletCount: number; // Number of outlets with this stance
    weightedSupport: number; // Weighted by outlet credibility (0-1)
  }[];
}

export interface OutletStanceDTO {
  outletId: string;
  outletName: string;
  credibilityScore: number;
  stance: Stance;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  reasoning: string | null;
  weightedContribution: number; // This outlet's contribution to the verdict (weighted by credibility)
}




