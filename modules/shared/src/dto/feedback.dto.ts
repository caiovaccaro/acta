export interface FeedbackCreateDTO {
  verdictId: string;
  type: 'useful' | 'biased' | 'inaccurate';
  notes?: string | null;
}

export interface FeedbackDTO extends FeedbackCreateDTO {
  id: string;
  createdAt: string;
}


