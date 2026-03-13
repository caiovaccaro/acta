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

export interface CountryOutletSummaryDTO {
  outletName: string;
  stance: Stance;
  articleCount: number;
}

export interface CountryOpinionDTO {
  countryCode: string;
  dominantStance: Stance;
  articleCount: number;
  outletCount: number;
  /**
   * How concentrated the dominant stance is for this country (0-1).
   * 1.0 means all stances agree; lower values mean more mixed opinions.
   */
  dominanceRatio: number;
  /**
   * Per-outlet summaries for this country (used for tooltips on the world map).
   */
  outlets: CountryOutletSummaryDTO[];
}






