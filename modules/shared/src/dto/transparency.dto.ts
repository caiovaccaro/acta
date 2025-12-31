export interface TransparencyDTO {
  outlets: OutletTransparencyDTO[];
  methodology: MethodologyDTO;
}

export interface OutletTransparencyDTO {
  id: string;
  name: string;
  credibilityScore: number;
  credibilityBreakdown: {
    externalTrust: number; // 0-1
    transparency: number; // 0-1
  };
  articleCount: number;
  contributionCount: number; // Number of article stances
}

export interface MethodologyDTO {
  verdictCalculation: string;
  credibilityScoring: string;
  stanceClassification: string;
  updateFrequency: string;
}




