/**
 * OpenAI Provider
 * Implementation of LLMProvider interface using OpenAI API
 */

import OpenAI from 'openai';
import type {
  LLMProvider,
  ClassifyStanceParams,
  StanceClassification,
  ValidateQuestionParams,
  QuestionValidation,
  BatchClassifyStancesParams,
  QuestionReformulation,
  ReformulateQuestionParams,
  ValidateBarQuestionParams,
  BarQuestionValidation,
  Stance,
  VerdictSummaryParams,
  VerdictSummaryResult,
  TopicDiscoveryResult,
  QuestionDiscoveryResult,
} from '../provider';
import {
  LLMProviderError,
  LLMRateLimitError,
  LLMInvalidKeyError,
  LLMTimeoutError,
  LLMNetworkError,
} from '../errors';
import { withRetry } from '../utils/retry';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private maxRetries: number;
  private timeout: number;

  constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });
    this.model = config.model || 'gpt-4-turbo-preview';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
  }

  async validateBarQuestion(
    params: ValidateBarQuestionParams
  ): Promise<BarQuestionValidation> {
    const prompt = this.buildBarQuestionValidationPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert at evaluating whether questions are simple and conversational enough to be asked in a casual bar conversation by average people.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          return this.parseBarQuestionValidationResponse(response);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  async summarizeVerdict(
    params: VerdictSummaryParams
  ): Promise<VerdictSummaryResult> {
    const prompt = this.buildVerdictSummaryPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are an impartial analyst who explains consensus findings from a set of news articles. Your job is to summarize why a verdict was reached, not to argue for a side.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new LLMProviderError(
              'Empty response from OpenAI when summarizing verdict',
              undefined,
              false
            );
          }

          const parsed = JSON.parse(content);
          return {
            summary: parsed.summary || '',
          };
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  async generateQuestionContextBlurb(params: {
    question: { text: string; topicName?: string };
    articles: Array<{ id: string; title: string; textContent: string }>;
  }): Promise<{ blurb: string }> {
    const prompt = this.buildContextBlurbPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are a neutral journalist writing context blurbs for debate questions. Write 2-3 sentences that explain what the question is about in a clear, neutral way.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new LLMProviderError(
              'Empty response from OpenAI when generating context blurb',
              undefined,
              false
            );
          }

          const parsed = JSON.parse(content);
          return {
            blurb: parsed.blurb || '',
          };
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  private buildContextBlurbPrompt(params: {
    question: { text: string; topicName?: string };
    articles: Array<{ id: string; title: string; textContent: string }>;
  }): string {
    const topicContext = params.question.topicName
      ? `Topic: ${params.question.topicName}\n`
      : '';
    const articleSnippets = params.articles
      .slice(0, 10)
      .map((a) => {
        const snippet = a.textContent.substring(0, 500);
        return `- ${a.title}\n  ${snippet}...`;
      })
      .join('\n\n');

    return `${topicContext}Question: ${params.question.text}

Articles discussing this question:
${articleSnippets}

Generate a 2-3 sentence context blurb that explains what this question is about in a clear, neutral way. Focus on what the debate is about, not taking sides.

Return JSON:
{
  "blurb": "Your 2-3 sentence context blurb here"
}`;
  }

  async generateTimelineEvents(params: {
    question: { text: string; topicName?: string };
    articles: Array<{
      id: string;
      title: string;
      textContent: string;
      publishedDate: string | null;
      outletName: string;
    }>;
  }): Promise<{ events: Array<{ date: string; title: string; description: string }> }> {
    const prompt = this.buildTimelineEventsPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are a journalist creating a chronological timeline of key events. Extract the most important events from the articles, focusing on factual developments, not opinions. Order events chronologically.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new LLMProviderError(
              'Empty response from OpenAI when generating timeline events',
              undefined,
              false
            );
          }

          const parsed = JSON.parse(content);
          const events = Array.isArray(parsed.events) ? parsed.events : [];
          return {
            events: events.map((e: any) => ({
              date: e.date || new Date().toISOString(),
              title: e.title || '',
              description: e.description || '',
            })),
          };
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  private buildTimelineEventsPrompt(params: {
    question: { text: string; topicName?: string };
    articles: Array<{
      id: string;
      title: string;
      textContent: string;
      publishedDate: string | null;
      outletName: string;
    }>;
  }): string {
    const topicContext = params.question.topicName
      ? `Topic: ${params.question.topicName}\n`
      : '';
    
    // Sort articles by published date
    const sortedArticles = [...params.articles]
      .filter((a) => a.publishedDate)
      .sort((a, b) => {
        const dateA = new Date(a.publishedDate!).getTime();
        const dateB = new Date(b.publishedDate!).getTime();
        return dateA - dateB;
      })
      .slice(0, 20);

    const articleList = sortedArticles
      .map((a) => {
        const date = a.publishedDate ? new Date(a.publishedDate).toLocaleDateString() : 'Unknown date';
        const snippet = a.textContent.substring(0, 400);
        return `[${date}] ${a.title} (${a.outletName})\n${snippet}...`;
      })
      .join('\n\n');

    return `${topicContext}Question: ${params.question.text}

Articles (chronologically ordered):
${articleList}

Extract the key events from these articles and create a chronological timeline. Focus on:
- Factual developments and milestones
- Important dates and occurrences
- Significant changes or decisions
- Major turning points

Return JSON with a chronological list of events:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "title": "Brief event title",
      "description": "1-2 sentence description of what happened"
    }
  ]
}

Generate 5-10 key events, ordered chronologically.`;
  }

  async generateOverviewBullets(params: {
    question: { id: string; text: string; topicName?: string };
    verdict: { label: string; confidence: number };
    stances: Array<{
      articleTitle: string;
      outletName: string;
      stance: string;
      reasoning: string;
    }>;
  }): Promise<{ bullets: string[] }> {
    const prompt = this.buildOverviewBulletsPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are a journalist creating a bullet-point overview of a debate. Write clear, neutral bullet points that help readers understand the key aspects of the debate.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new LLMProviderError(
              'Empty response from OpenAI when generating overview bullets',
              undefined,
              false
            );
          }

          const parsed = JSON.parse(content);
          const bullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];
          return { bullets: bullets.filter((b: any) => b && typeof b === 'string' && b.trim().length > 0) };
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  private buildOverviewBulletsPrompt(params: {
    question: { id: string; text: string; topicName?: string };
    verdict: { label: string; confidence: number };
    stances: Array<{
      articleTitle: string;
      outletName: string;
      stance: string;
      reasoning: string;
    }>;
  }): string {
    const topicContext = params.question.topicName
      ? `Topic: ${params.question.topicName}\n`
      : '';
    
    const stanceSummary = params.stances
      .slice(0, 10)
      .map((s) => `- ${s.articleTitle} (${s.outletName}): ${s.stance}\n  ${s.reasoning.substring(0, 200)}...`)
      .join('\n\n');

    return `${topicContext}Question: ${params.question.text}

Verdict: ${params.verdict.label} (${params.verdict.confidence}% confidence)

Article stances and reasoning:
${stanceSummary}

Generate 5-8 bullet points that help readers understand this debate. Each bullet should:
- Be a complete sentence
- Explain a key aspect of the debate
- Be neutral and factual
- Cover different perspectives

Return JSON:
{
  "bullets": [
    "First bullet point...",
    "Second bullet point...",
    ...
  ]
}`;
  }

  async extractQuotes(params: {
    article: { id: string; title: string; textContent: string; url: string };
    question: { text: string; topicName?: string };
    stance: string;
    maxQuotes?: number;
  }): Promise<{ quotes: Array<{ text: string }> }> {
    const prompt = this.buildExtractQuotesPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are extracting direct quotes from articles that support a specific stance on a question. Extract verbatim quotes that are relevant and impactful.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new LLMProviderError(
              'Empty response from OpenAI when extracting quotes',
              undefined,
              false
            );
          }

          const parsed = JSON.parse(content);
          const quotes = Array.isArray(parsed.quotes) ? parsed.quotes : [];
          return {
            quotes: quotes
              .filter((q: any) => q && q.text && typeof q.text === 'string' && q.text.trim().length > 0)
              .slice(0, params.maxQuotes || 5)
              .map((q: any) => ({ text: q.text.trim() })),
          };
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  private buildExtractQuotesPrompt(params: {
    article: { id: string; title: string; textContent: string; url: string };
    question: { text: string; topicName?: string };
    stance: string;
    maxQuotes?: number;
  }): string {
    const topicContext = params.question.topicName
      ? `Topic: ${params.question.topicName}\n`
      : '';
    
    const maxQuotes = params.maxQuotes || 1;
    const articleSnippet = params.article.textContent.substring(0, 3000);

    return `${topicContext}Question: ${params.question.text}
Stance: ${params.stance}

Article: ${params.article.title}
${articleSnippet}...

Extract ${maxQuotes} direct quote(s) from this article that support the ${params.stance} stance on the question. Quotes should be:
- Verbatim from the article (use exact wording)
- Relevant to the question
- Impactful and representative of the article's position
- Complete sentences or meaningful phrases

Return JSON:
{
  "quotes": [
    {
      "text": "Exact quote from the article..."
    }
  ]
}`;
  }

  async generateFeaturedPerspective(params: {
    question: { text: string; topicName?: string };
    verdict: { label: string };
    articles: Array<{
      id: string;
      title: string;
      textContent: string;
      outletName: string;
      stance: string;
      reasoning: string;
      confidence: number;
    }>;
  }): Promise<{
    quote: {
      text: string;
      articleId: string;
      articleTitle: string;
      outletName: string;
    };
  }> {
    const prompt = this.buildFeaturedPerspectivePrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are selecting a featured perspective quote from articles. Choose a longer, impactful quote that best represents the majority stance on this question.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new LLMProviderError(
              'Empty response from OpenAI when generating featured perspective',
              undefined,
              false
            );
          }

          const parsed = JSON.parse(content);
          if (!parsed.quote || !parsed.quote.text || !parsed.quote.articleId) {
            throw new LLMProviderError(
              'Invalid response format from OpenAI for featured perspective',
              undefined,
              false
            );
          }

          return {
            quote: {
              text: parsed.quote.text.trim(),
              articleId: parsed.quote.articleId,
              articleTitle: parsed.quote.articleTitle || '',
              outletName: parsed.quote.outletName || '',
            },
          };
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  private buildFeaturedPerspectivePrompt(params: {
    question: { text: string; topicName?: string };
    verdict: { label: string };
    articles: Array<{
      id: string;
      title: string;
      textContent: string;
      outletName: string;
      stance: string;
      reasoning: string;
      confidence: number;
    }>;
  }): string {
    const topicContext = params.question.topicName
      ? `Topic: ${params.question.topicName}\n`
      : '';
    
    const articlesList = params.articles
      .map((a) => {
        const snippet = a.textContent.substring(0, 800);
        return `Article ID: ${a.id}
Title: ${a.title}
Outlet: ${a.outletName}
Stance: ${a.stance}
Reasoning: ${a.reasoning}
Content: ${snippet}...`;
      })
      .join('\n\n---\n\n');

    return `${topicContext}Question: ${params.question.text}
Verdict: ${params.verdict.label}

Articles supporting the verdict:
${articlesList}

Select the best quote from one of these articles to feature. The quote should:
- Be a longer, more substantial quote (2-4 sentences)
- Best represent the ${params.verdict.label} perspective
- Be impactful and well-written
- Come from the article with the strongest reasoning

IMPORTANT: You MUST use the exact "Article ID" value shown above for the articleId field. Do NOT use an index number or make up an ID.

Return JSON:
{
  "quote": {
    "text": "The selected quote from the article...",
    "articleId": "exact-article-id-from-above",
    "articleTitle": "Exact article title from above",
    "outletName": "Exact outlet name from above"
  }
}`;
  }

  getName(): string {
    return 'openai';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async classifyStance(
    params: ClassifyStanceParams
  ): Promise<StanceClassification> {
    const prompt = this.buildStanceClassificationPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });

          return this.parseStanceResponse(response);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  async batchClassifyStances(
    params: BatchClassifyStancesParams
  ): Promise<StanceClassification[]> {
    const { items, options } = params;
    const maxBatchSize = options?.maxBatchSize || 10;
    const results: StanceClassification[] = [];

    // Process in batches
    for (let i = 0; i < items.length; i += maxBatchSize) {
      const batch = items.slice(i, i + maxBatchSize);
      const batchResults = await Promise.all(
        batch.map((item) => this.classifyStance(item))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async validateQuestion(
    params: ValidateQuestionParams
  ): Promise<QuestionValidation> {
    const prompt = this.buildQuestionValidationPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          });

          return this.parseValidationResponse(response);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  async reformulateQuestion(
    params: ReformulateQuestionParams
  ): Promise<QuestionReformulation[]> {
    const prompt = this.buildReformulationPrompt(params);

    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            response_format: { type: 'json_object' },
          });

          return this.parseReformulationResponse(response);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  private buildStanceClassificationPrompt(
    params: ClassifyStanceParams
  ): string {
    const { article, question, month } = params;
    const monthStr = month.toISOString().slice(0, 7); // YYYY-MM

    return `You are analyzing a news article to determine its stance on a specific question.

Topic: ${question.topic}
Question: ${question.text}
Article Title: ${article.title}
Article URL: ${article.url}
Article Content: ${article.textContent.substring(0, 5000)}...
Analysis Period: ${monthStr}

IMPORTANT: First determine if this article is actually relevant to the question. If the article does not address, discuss, or relate to the question in any meaningful way, return "Unclear" with low confidence (< 0.2) and explain why it's not relevant.

If the article IS relevant, then classify the article's stance on the question. Consider:
- What position does the article take on this question?
- How confident is the article's position?
- What evidence or arguments does the article present?

Return a JSON object with:
{
  "stance": "YesItSeemsSo" | "ProbablyYes" | "Unclear" | "ProbablyNot" | "NoItDoesntSeemSo",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this stance was chosen. If the article is not relevant, explain why."
}`;
  }

  private buildQuestionValidationPrompt(
    params: ValidateQuestionParams
  ): string {
    const { question, topic, context } = params;

    return `You are validating a question against a formulation framework.

Topic: ${topic}
Question: ${question}
${context ? `Context: ${context}` : ''}

Evaluate the question against these 7 criteria:
1. Public Clarity: Is the question clear and understandable to the general public?
2. Alignment with Real Debate: Does the question reflect an actual ongoing debate?
3. Simplicity Without Bias: Is the question simple and free from loaded language?
4. Anchoring in Current News: Is the question relevant to current events?
5. Explicit Objective: Does the question have a clear, explicit objective?
6. Clear Binary Nature: Can the question be answered with one of these stances: "Yes, it seems so", "Probably yes", "Unclear", "Probably not", or "No, it doesn't seem so"? The question MUST be answerable with these specific stance options.
7. Answerable with Evidence: Can the question be answered using evidence from articles?

Return a JSON object with:
{
  "isValid": true/false,
  "checks": [
    {
      "name": "Public Clarity",
      "passed": true/false,
      "confidence": 0.0-1.0,
      "notes": "Optional notes"
    },
    ... (one for each of the 7 checks)
  ],
  "overallConfidence": 0.0-1.0,
  "suggestions": ["Optional improvement suggestions"]
}`;
  }

  private buildReformulationPrompt(
    params: ReformulateQuestionParams
  ): string {
    const { originalQuestion, failedChecks, topic } = params;

    return `You are reformulating a question to address validation failures.

Topic: ${topic}
Original Question: ${originalQuestion}
Failed Checks: ${failedChecks.join(', ')}

IMPORTANT: The question MUST be answerable with one of these specific stances:
- "Yes, it seems so"
- "Probably yes"
- "Unclear"
- "Probably not"
- "No, it doesn't seem so"

Generate 2 reformulated versions of the question that address the failed checks. Each reformulation should:
- Maintain the core intent of the original question
- Address the specific validation failures
- Follow the formulation framework
- Be answerable with the stance options above

Return a JSON object with:
{
  "reformulations": [
    {
      "text": "Reformulated question text",
      "improvements": ["What was improved"],
      "confidence": 0.0-1.0
    },
    ...
  ]
}`;
  }

  private buildBarQuestionValidationPrompt(
    params: ValidateBarQuestionParams
  ): string {
    const { question, topic } = params;

    return `Score this question on "bar readiness" (0-100) - how suitable it is to be asked in a casual bar conversation by average people.

Topic: ${topic}
Question: ${question}

CRITICAL FRAMEWORK RULES (MUST BE MAINTAINED):
1. NO FIRST-PERSON QUESTIONS - Questions must be in third person (not "Should I..." or "Do we...")
2. Clear Binary Nature - Must be answerable with: "Yes, it seems so", "Probably yes", "Unclear", "Probably not", or "No, it doesn't seem so"
3. Explicit Objective - Must have a clear, measurable goal
4. Public Clarity - Must be understandable to general public
5. Simplicity Without Bias - Must be neutral, avoiding loaded language
6. Never directed to a person - Questions should be about topics, not addressing individuals

BAR READINESS SCORING CRITERIA (0-100):
- 90-100: Golden questions - Perfect balance of simplicity, completeness, and directness
  Examples:
  - "Is Israel committing war crimes in Gaza?"
  - "Should AI be more regulated now?"
  - "Is universal basic income an effective way to reduce inequality?"
  - "Is police repression the most effective way to reduce drug-related violence?"
  - "Should social media platforms moderate content to limit misinformation and hate speech?"

- 70-89: Good questions - Simple, complete, direct, but could be slightly improved
- 50-69: Acceptable questions - Understandable but could be simpler or more direct
- 30-49: Needs improvement - Too technical, too wordy, or too complex
- 0-29: Poor questions - Too technical, too specific, uses jargon, or violates framework rules

KEY FACTORS FOR HIGH SCORES:
- Simple in number of words (concise but complete)
- Complete - fully expresses the question without ambiguity
- Direct - gets to the point without unnecessary complexity
- Not too technical - avoids jargon and specialized terminology
- Never directed to a person - third person only
- Maintains question structure when applicable (e.g., "Is X the most effective way to achieve Y?")

REFORMULATION GUIDELINES (if score < 90):
- Simplify technical terms: "government regulation" → "regulating", "harm reduction" → "safe use"
- Simplify complex phrases: "abstinence-based approaches" → "banning drugs", "civilian casualties" → "peace"
- Maintain comparison structure when present: "Is X more effective than Y?" → "Is X better than Y?"
- Maintain "Is X the most effective way to achieve Y?" structure when applicable
- Keep the question formal enough to be answerable with the stance options
- Do NOT make it too casual or lose the question structure
- Aim for the golden question style: simple words, complete, direct, not too technical

Examples of GOOD reformulations (aiming for 90-100 score):
- "Is government regulation the most effective way to ensure AI safety?" → "Should AI be more regulated now?" (Score: 85 → 95)
- "Is harm reduction more effective than abstinence-based approaches for drug policy?" → "Is safe use of drugs better than banning them for reducing harm?" (Score: 60 → 80)
- "Is a ceasefire the most effective way to reduce civilian casualties in Gaza?" → "Is a ceasefire the best way to bring peace to Gaza?" (Score: 70 → 85)

IMPORTANT: Provide a reformulated version if the score is below 90 (aiming for golden question status). The reformulation should:
- Aim for 90-100 bar readiness score
- Be simple in number of words but complete
- Be direct and not too technical
- Never be directed to a person
- Maintain ALL framework rules
- Maintain the original question structure when applicable

Return a JSON object with:
{
  "barReadinessScore": 0-100,
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of the score and what makes it suitable or not for bar conversation",
  "issues": ["List of specific issues if score < 90, e.g., 'too technical', 'too wordy', 'uses jargon'"],
  "suggestions": ["Optional suggestions for improving the score"],
  "reformulatedQuestion": "Reformulated version with higher bar readiness. REQUIRED if score < 90 (must provide a reformulation aiming for 90-100 score). If score >= 90, return the same question text. Must maintain framework rules and question structure.",
  "reformulationScore": 0-100
}`;
  }

  private parseStanceResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): StanceClassification {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError('Empty response from OpenAI', undefined, false);
    }

    try {
      const parsed = JSON.parse(content);
      return {
        stance: parsed.stance as Stance,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || '',
        metadata: {
          model: response.model,
          usage: response.usage,
        },
      };
    } catch (error) {
      throw new LLMProviderError(
        'Failed to parse stance response',
        error,
        false
      );
    }
  }

  private parseValidationResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): QuestionValidation {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError('Empty response from OpenAI', undefined, false);
    }

    try {
      const parsed = JSON.parse(content);
      return {
        isValid: parsed.isValid === true,
        checks: parsed.checks || [],
        overallConfidence: parsed.overallConfidence || 0.5,
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      throw new LLMProviderError(
        'Failed to parse validation response',
        error,
        false
      );
    }
  }

  private parseReformulationResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): QuestionReformulation[] {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError('Empty response from OpenAI', undefined, false);
    }

    try {
      const parsed = JSON.parse(content);
      return parsed.reformulations || [];
    } catch (error) {
      throw new LLMProviderError(
        'Failed to parse reformulation response',
        error,
        false
      );
    }
  }

  /**
   * Build prompt for verdict summarization.
   * Takes question, verdict metrics, and contributing article stances and asks
   * the model to produce a short, neutral explanation of why the verdict was reached.
   */
  private buildVerdictSummaryPrompt(
    params: VerdictSummaryParams
  ): string {
    const { question, verdict, stances } = params;

    const articleCount = verdict.articleCount ?? stances.length;
    const hasArticles = stances.length > 0;

    const stanceLines = hasArticles
      ? stances
          .map((s, idx) => {
            return `${idx + 1}. Outlet: ${s.outletName} (credibility: ${
              s.outletCredibility
            })\n` +
              `   Article: ${s.articleTitle} (${s.articleUrl})\n` +
              `   Stance: ${s.stance} (confidence: ${(
                s.confidence * 100
              ).toFixed(1)}%)\n` +
              `   Reasoning: ${s.reasoning}`;
          })
          .join('\n\n')
      : 'No articles available.';

    return `You are given a question, a consensus verdict, and a set of article-level stances with their reasoning.

Question: "${question.text}"
Topic: ${question.topicName ?? 'N/A'}

Verdict:
- Label: ${verdict.label}
- Support share (S): ${(verdict.supportShare * 100).toFixed(1)}%
- Variance (disagreement): ${(verdict.variance * 100).toFixed(1)}%
- Confidence: ${verdict.confidence.toFixed(1)}%
- Article count: ${articleCount}

Contributing article stances:

${stanceLines}

${!hasArticles ? `\n⚠️ IMPORTANT: There are NO articles available for this verdict. The verdict metrics (support share, variance, confidence) are default values due to insufficient evidence. Do NOT invent or reference articles that don't exist. Instead, explain that the verdict is "Unclear" because there is insufficient evidence (no articles have been analyzed yet).` : ''}

TASK:
- Write a short, neutral explanation (3–6 sentences) of WHY this verdict was reached.
${hasArticles ? '- Emphasize the main patterns in the evidence: how many and which outlets support each side, how strong their arguments are, and where there is remaining uncertainty or disagreement.\n- Do NOT restate the entire articles; focus on the big picture.' : '- Explain that the verdict is unclear due to insufficient evidence (no articles analyzed).\n- Do NOT invent or reference articles that don\'t exist.'}
- Do NOT take a personal stance; just describe what the evidence from the articles suggests (or lack thereof).

Return a JSON object with:
{
  "summary": "short explanation of why the verdict is what it is"
}`;
  }

  private parseBarQuestionValidationResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): BarQuestionValidation {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError('Empty response from OpenAI', undefined, false);
    }

    try {
      const parsed = JSON.parse(content);
      return {
        barReadinessScore: Math.max(0, Math.min(100, parsed.barReadinessScore || 0)),
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        reformulatedQuestion: parsed.reformulatedQuestion || undefined,
        reformulationScore: parsed.reformulationScore ? Math.max(0, Math.min(100, parsed.reformulationScore)) : undefined,
      };
    } catch (error) {
      throw new LLMProviderError(
        'Failed to parse bar question validation response',
        error,
        false
      );
    }
  }

  async discoverTopicsFromArticles(
    articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>
  ): Promise<TopicDiscoveryResult> {
    const prompt = this.buildTopicDiscoveryPrompt(articles);

    const response = await withRetry(
      () =>
        this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
      { maxRetries: this.maxRetries }
    );

    const content = response.choices[0]?.message?.content ?? '{}';
    return this.parseTopicDiscoveryResponse(content);
  }

  async discoverQuestionsFromArticles(
    params: {
      topic: { id: string; name: string; description?: string | null };
      articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>;
    }
  ): Promise<QuestionDiscoveryResult> {
    const prompt = this.buildQuestionDiscoveryPrompt(params.topic, params.articles);

    const response = await withRetry(
      () =>
        this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
      { maxRetries: this.maxRetries }
    );

    const content = response.choices[0]?.message?.content ?? '{}';
    return this.parseQuestionDiscoveryResponse(content);
  }

  private buildTopicDiscoveryPrompt(
    articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>
  ): string {
    const articleLines = articles
      .map((a) => {
        const snippet = this.truncateText(a.excerpt || a.textContent || '', 400);
        return `- [${a.id}] ${a.title}\n  Snippet: ${snippet}`;
      })
      .join('\n');

    return `You are an editor discovering topics from a set of articles.

Articles:
${articleLines}

Task:
- Identify the main topics/themes discussed across these articles.
- Return a JSON object:
{
  "topics": [
    {
      "name": "topic name",
      "description": "brief description",
      "confidence": 0.0-1.0,
      "articleIds": ["id1", "id2"]
    }
  ]
}
- Keep 3-10 topics. Prefer concise names. Confidence reflects how strong the cluster is.`;
  }

  private parseTopicDiscoveryResponse(content: string): TopicDiscoveryResult {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.topics)) {
        return {
          topics: parsed.topics.map((t: any) => ({
            name: String(t.name ?? '').trim(),
            description: String(t.description ?? '').trim(),
            confidence: Math.max(0, Math.min(1, Number(t.confidence ?? 0))),
            articleIds: Array.isArray(t.articleIds)
              ? t.articleIds.map((id: any) => String(id))
              : [],
          })),
        };
      }
    } catch (e) {
      // ignore parse errors
    }
    return { topics: [] };
  }

  private buildQuestionDiscoveryPrompt(
    topic: { id: string; name: string; description?: string | null },
    articles: Array<{ id: string; title: string; textContent: string; excerpt?: string | null }>
  ): string {
    const articleLines = articles
      .map((a) => {
        const snippet = this.truncateText(a.excerpt || a.textContent || '', 400);
        return `- [${a.id}] ${a.title}\n  Snippet: ${snippet}`;
      })
      .join('\n');

    return `You are extracting questions being debated for the topic "${topic.name}" (${topic.description ?? 'no description'}).

Articles:
${articleLines}

Task:
- Identify the main binary/evidence-based questions being debated in these articles about the topic.
- Return a JSON object:
{
  "questions": [
    {
      "questionText": "Is X the best way to Y?",
      "confidence": 0.0-1.0,
      "articleIds": ["id1", "id2"]
    }
  ]
}
- Questions must be clear, binary (yes/no or effective/ineffective), public-facing, and evidence-based.
- Keep up to 10 high-quality questions.`;
  }

  private parseQuestionDiscoveryResponse(content: string): QuestionDiscoveryResult {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.questions)) {
        return {
          questions: parsed.questions.map((q: any) => ({
            questionText: String(q.questionText ?? '').trim(),
            confidence: Math.max(0, Math.min(1, Number(q.confidence ?? 0))),
            articleIds: Array.isArray(q.articleIds)
              ? q.articleIds.map((id: any) => String(id))
              : [],
          })),
        };
      }
    } catch (e) {
      // ignore parse errors
    }
    return { questions: [] };
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  }

  private handleError(error: unknown): LLMProviderError {
    if (error instanceof LLMProviderError) {
      return error;
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        const err = new LLMRateLimitError(
          'OpenAI rate limit exceeded',
          error
        );
        if (retryAfter) {
          (err as any).retryAfter = parseInt(retryAfter, 10);
        }
        return err;
      }

      if (error.status === 401) {
        return new LLMInvalidKeyError('Invalid OpenAI API key', error);
      }

      if (error.status === 408 || error.status === 504) {
        return new LLMTimeoutError('OpenAI request timeout', error);
      }
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return new LLMTimeoutError('Request timeout', error);
      }
      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        return new LLMNetworkError('Network error', error);
      }
    }

    return new LLMProviderError(
      'Unknown error in OpenAI provider',
      error,
      true
    );
  }
}

