import type { QuestionSummaryDTO } from './verdicts.dto.js';

export interface TopicDTO {
  id: string;
  name: string;
  description: string | null;
  safetyNoteRequired: boolean;
  questionCount: number;
  activeQuestionCount: number;
  createdAt: string;
  firstQuestion?: QuestionSummaryDTO | null; // First active question for card display
}

export interface TopicDetailDTO extends TopicDTO {
  questions: QuestionSummaryDTO[];
}

// Alias for backward compatibility
export type TopicSummaryDTO = TopicDTO;

