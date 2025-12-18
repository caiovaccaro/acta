export interface DebateCardDTO {
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  overview: string; // 6-10 line neutral summary
  argumentsFor: ArgumentDTO[];
  argumentsAgainst: ArgumentDTO[];
  unknowns: UnknownDTO[];
  sources: SourceCitationDTO[];
}

export interface ArgumentDTO {
  id: string;
  text: string;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  outletName: string;
}

export interface UnknownDTO {
  id: string;
  text: string;
  articleId: string | null;
}

export interface SourceCitationDTO {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  outletName: string;
  publishedDate: string | null;
}

