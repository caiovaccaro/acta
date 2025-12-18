import type { QuestionSummaryDTO } from './verdicts.dto.js';

export interface TopicDTO {
  id: string;
  name: string;
  description: string | null;
  safetyNoteRequired: boolean;
  questionCount: number;
  activeQuestionCount: number;
  createdAt: string;
}

export interface TopicDetailDTO extends TopicDTO {
  questions: QuestionSummaryDTO[];
}

