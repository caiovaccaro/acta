/**
 * LLM Types for Debate Card Generation
 * Types for generating overview bullets, quotes, featured perspective, and timeline
 */

export interface GenerateOverviewBulletsParams {
  question: {
    id: string;
    text: string;
    topicName: string;
  };
  verdict: {
    label: string; // VerdictLabel
    confidence: number;
  };
  stances: Array<{
    articleTitle: string;
    outletName: string;
    stance: string;
    reasoning: string;
  }>;
}

export interface OverviewBulletsResult {
  bullets: string[]; // Array of bullet point strings
}

export interface ExtractQuotesParams {
  article: {
    id: string;
    title: string;
    textContent: string;
    url: string;
  };
  question: {
    text: string;
    topicName: string;
  };
  stance: string; // Stance label
  maxQuotes?: number; // Default: 2
}

export interface ExtractQuotesResult {
  quotes: Array<{
    text: string; // Actual quote text from article
    confidence: number; // 0-1, how well the quote supports the stance
  }>;
}

export interface GenerateFeaturedPerspectiveParams {
  question: {
    text: string;
    topicName: string;
  };
  verdict: {
    label: string;
  };
  articles: Array<{
    id: string;
    title: string;
    textContent: string;
    outletName: string;
    stance: string;
    reasoning: string;
    confidence: number;
  }>;
}

export interface FeaturedPerspectiveResult {
  quote: {
    text: string;
    articleId: string;
    articleTitle: string;
    outletName: string;
  };
}

export interface GenerateTimelineEventsParams {
  question: {
    text: string;
    topicName: string;
  };
  articles: Array<{
    id: string;
    title: string;
    textContent: string;
    publishedDate: string | null;
    outletName: string;
  }>;
}

export interface TimelineEvent {
  date: string; // ISO date string
  title: string;
  description: string;
}

export interface GenerateTimelineEventsResult {
  events: TimelineEvent[];
}

export interface GenerateQuestionContextBlurbParams {
  question: {
    text: string;
    topicName: string;
  };
  articles: Array<{
    id: string;
    title: string;
    textContent: string;
  }>;
}

export interface QuestionContextBlurbResult {
  blurb: string; // 2-3 sentence context blurb
}

