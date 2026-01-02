export interface QuestionSummaryDTO {
  id: string;
  questionText: string;
  isActive: boolean;
  /**
   * Optional short context blurb (2–3 sentences) describing the question.
   */
  contextBlurb?: string | null;
  verdict?: VerdictSummaryDTO | null;
  /**
   * Optional journalist count (number of journalists/articles contributing).
   */
  journalistCount?: number;
  /**
   * Optional publication count (number of unique publications).
   */
  publicationCount?: number;
}

export interface VerdictSummaryDTO {
  id: string;
  verdictLabel: VerdictLabel;
  confidence: number;
  month: string;
}

export type VerdictLabel = 
  | 'YesItSeemsSo' 
  | 'ProbablyYes' 
  | 'Unclear' 
  | 'ProbablyNot' 
  | 'NoItDoesntSeemSo';

export interface VerdictDTO {
  id: string;
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  month: string; // ISO date string (YYYY-MM-01 format)
  verdictLabel: VerdictLabel;
  confidence: number; // 0-100
  supportShare: number; // 0-1
  variance: number; // 0-1
  reasoning: string | null;
  articleCount: number;
  outletCount: number;
  calculatedAt: string;
}

export interface VerdictCardDTO extends VerdictDTO {
  evidenceBullets: EvidenceBulletDTO[];
  scopeNote: ScopeNoteDTO;
  safetyNote?: string | null;
}

export interface EvidenceBulletDTO {
  id: string;
  text: string;
  articleId: string | null;
  type: EvidenceType;
}

export type EvidenceType = 'Why' | 'Dissent' | 'Unknown';

export interface ScopeNoteDTO {
  articleCount: number;
  outletCount: number;
  dateRange: {
    start: string; // ISO date
    end: string; // ISO date
  };
}
