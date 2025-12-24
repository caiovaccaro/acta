import type { QuestionSummaryDTO } from './verdicts.dto.js';

export interface OutletInfo {
  id: string;
  name: string;
}

export interface QuestionCardDTO {
  id: string;
  questionText: string;
  isActive: boolean;
  topicId: string;
  topicName: string;
  verdict?: QuestionSummaryDTO['verdict'] | null;
  outlets: OutletInfo[]; // Unique outlets/publications that have articles for this question
}

