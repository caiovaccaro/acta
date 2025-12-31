export interface DebateCardDTO {
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  /**
   * Legacy plain-text overview. Kept for backward compatibility.
   */
  overview: string;
  /**
   * Comprehensive but not exhaustive bullet list giving an overview of the
   * question at hand, considering points from different articles.
   */
  overviewBullets: string[];
  /**
   * Quotes that align with the majority verdict stance (legacy, use quotesFor).
   */
  quotes?: QuoteDTO[];
  /**
   * Quotes from articles aligned with the majority stance.
   */
  quotesFor: QuoteDTO[];
  /**
   * Quotes from articles opposing the majority stance.
   */
  quotesAgainst: QuoteDTO[];
  /**
   * Supporting arguments grouped by stance. Kept for internal/debug use.
   */
  argumentsFor: ArgumentDTO[];
  argumentsAgainst: ArgumentDTO[];
  /**
   * Points that highlight open questions, dissent, or what remains unclear (legacy, use pointsForDebate).
   */
  unknowns?: UnknownDTO[];
  /**
   * Points for debate - summary sentences on points contrary to the majority.
   */
  pointsForDebate: PointForDebateDTO[];
  /**
   * Source citations used in the debate card.
   */
  sources: SourceCitationDTO[];
  /**
   * Optional featured perspective for the card.
   */
  featuredPerspective?: FeaturedPerspectiveDTO | null;
  /**
   * Optional timeline events for this question/topic (legacy, use timelineEvents).
   */
  timeline?: TimelineEventDTO[];
  /**
   * Timeline events for the context timeline.
   */
  timelineEvents: TimelineEventDTO[];
}

export interface ArgumentDTO {
  id: string;
  text: string;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  outletName: string;
}

export interface QuoteDTO {
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

export interface PointForDebateDTO {
  id: string;
  text: string;
  articleId: string | null;
  articleTitle: string | null;
  articleUrl: string | null;
  outletName: string | null;
}

export interface SourceCitationDTO {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  outletName: string;
  publishedDate: string | null;
}

export interface FeaturedPerspectiveDTO {
  id: string;
  text: string;
  outletName: string;
  articleId: string;
  articleTitle: string;
  articleUrl?: string;
}

export interface TimelineEventDTO {
  id: string;
  date: string;
  title: string;
  description: string;
  verdictLabel?: string;
}
