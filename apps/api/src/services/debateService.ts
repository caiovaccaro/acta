import {
  findQuestionById,
  findArticleStancesByQuestionId,
  findVerdictByQuestionAndMonth,
  findLatestVerdictByQuestion,
  findEvidenceBulletsByVerdictId,
  createEvidenceBullets,
  updateVerdict,
} from '@acta/db';
import { getCurrentMonthPeriod, parseMonthPeriod } from '@acta/core';
import { getLLMProvider } from '../utils/llmProvider';
import { getTimelineEvents } from './timelineService';
import type {
  DebateCardDTO,
  ArgumentDTO,
  UnknownDTO,
  SourceCitationDTO,
  QuoteDTO,
  FeaturedPerspectiveDTO,
  TimelineEventDTO,
  PointForDebateDTO,
} from '@acta/shared';

function distributeQuotesByOutlet(quotes: QuoteDTO[], limit: number): QuoteDTO[] {
  if (quotes.length <= limit) return quotes;
  const seen = new Set<string>();
  const results: QuoteDTO[] = [];
  for (const quote of quotes) {
    const outletKey = quote.outletName || 'unknown';
    if (seen.has(outletKey)) continue;
    seen.add(outletKey);
    results.push(quote);
    if (results.length >= limit) break;
  }
  return results;
}

function isNonQuoteResponse(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    normalized.startsWith("i'm sorry") ||
    normalized.includes('provided text does not contain') ||
    normalized.includes('does not contain any direct quotes') ||
    normalized.includes('no direct quotes') ||
    normalized.includes('cannot find any direct quotes') ||
    normalized.includes('does not include any direct quotes')
  );
}

function distributePointsByOutlet(points: PointForDebateDTO[]): PointForDebateDTO[] {
  if (points.length <= 1) return points;
  const outletMap = new Map<string, PointForDebateDTO[]>();
  for (const point of points) {
    const outletKey = point.outletName || 'unknown';
    const bucket = outletMap.get(outletKey);
    if (bucket) {
      bucket.push(point);
    } else {
      outletMap.set(outletKey, [point]);
    }
  }

  if (outletMap.size <= 1) return points;

  const queues = Array.from(outletMap.values());
  const results: PointForDebateDTO[] = [];
  let index = 0;
  while (queues.some((q) => q.length > 0)) {
    const queue = queues[index % queues.length];
    if (queue.length > 0) {
      results.push(queue.shift()!);
    }
    index += 1;
  }

  return results;
}

const debateGenerationLocks = new Map<string, Promise<void>>();

async function withDebateGenerationLock(
  key: string,
  task: () => Promise<void>
): Promise<void> {
  const running = debateGenerationLocks.get(key);
  if (running) {
    await running;
    return;
  }

  const promise = (async () => {
    try {
      await task();
    } finally {
      debateGenerationLocks.delete(key);
    }
  })();

  debateGenerationLocks.set(key, promise);
  await promise;
}

/**
 * Get debate card data for a question
 * Read-only retrieval of pre-generated debate card data.
 * No on-demand LLM generation is performed in request path.
 */
export async function getDebateCard(
  questionId: string,
  month?: string
): Promise<DebateCardDTO | null> {
  let question, verdict, monthDate;
  
  try {
    console.log(`[getDebateCard] Fetching debate card - questionId: ${questionId}, month: ${month || 'current'}`);
    
    question = await findQuestionById(questionId);
    if (!question) {
      console.warn(`[getDebateCard] Question not found: ${questionId}`);
      return null;
    }

    monthDate = month
      ? parseMonthPeriod(month)
      : getCurrentMonthPeriod();

    console.log(`[getDebateCard] Looking for verdict - questionId: ${questionId}, month: ${monthDate.toISOString()}`);

    // Get verdict (contains stored overviewBullets and featuredPerspective)
    verdict = await findVerdictByQuestionAndMonth(questionId, monthDate);
    if (!verdict) {
      console.warn(`[getDebateCard] Verdict not found for month ${monthDate.toISOString()}, falling back to latest verdict`);
      // Fall back to the most recent verdict if current month doesn't have one
      verdict = await findLatestVerdictByQuestion(questionId);
      if (!verdict) {
        console.warn(`[getDebateCard] No verdicts found for questionId: ${questionId}`);
        // No verdict means no data yet
        return null;
      }
      console.log(`[getDebateCard] Using latest verdict: ${verdict.id} (month: ${verdict.month.toISOString()}) for questionId: ${questionId}`);
      // Update monthDate to match the verdict we found
      monthDate = verdict.month;
    } else {
      console.log(`[getDebateCard] Found verdict: ${verdict.id} for questionId: ${questionId}`);
    }
  } catch (error) {
    console.error(`[getDebateCard] Error fetching debate card:`, error);
    throw error;
  }

  const topic = (question as any).topic;
  const topicName = topic?.name || 'this topic';

  // Get all article stances for this question
  const stances = await findArticleStancesByQuestionId(questionId);

  // Filter stances by month
  const monthStances = stances.filter((stance) => {
    const attempt = (stance as any).articleAnalysisAttempt;
    if (!attempt) return false;
    const attemptMonth = new Date(attempt.month);
    return (
      attemptMonth.getFullYear() === monthDate.getFullYear() &&
      attemptMonth.getMonth() === monthDate.getMonth()
    );
  });

  // Build sources list
  const sources: SourceCitationDTO[] = [];
  for (const stance of monthStances) {
    const article = (stance as any).article;
    const outlet = article?.outlet;
    if (article && outlet) {
      sources.push({
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: article.url,
        outletName: outlet.name,
        publishedDate: article.publishedDate?.toISOString() || null,
      });
    }
  }

  // Lazy-generate only missing stored content, once per question+month request burst.
  const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  try {
    await withDebateGenerationLock(`${questionId}:${monthKey}`, async () => {
      let latestVerdict = await findVerdictByQuestionAndMonth(questionId, monthDate);
      if (!latestVerdict || monthStances.length === 0) return;

    const existingEvidence = await findEvidenceBulletsByVerdictId(latestVerdict.id);
    const hasOverview =
      Array.isArray(latestVerdict.overviewBullets) && latestVerdict.overviewBullets.length > 0;
    const hasFeatured =
      !!latestVerdict.featuredPerspective && typeof latestVerdict.featuredPerspective === 'object';
    const hasDebatePoints = existingEvidence.some((eb) => eb.type === 'Unknown');

    if (hasOverview && hasFeatured && hasDebatePoints) return;

    const llmProvider = getLLMProvider();

    if (!hasOverview) {
      const stancesForLLM = monthStances.slice(0, 10).map((stance) => {
        const attempt = (stance as any).articleAnalysisAttempt;
        const article = (stance as any).article;
        const outlet = article?.outlet;
        return {
          articleTitle: article?.title || '',
          outletName: outlet?.name || '',
          stance: attempt?.stance || 'Unclear',
          reasoning: attempt?.reasoning || '',
        };
      });

      const result = await llmProvider.generateOverviewBullets({
        question: {
          id: question.id,
          text: question.questionText,
          topicName,
        },
        verdict: {
          label: latestVerdict.verdictLabel as string,
          confidence: latestVerdict.confidence,
        },
        stances: stancesForLLM,
      });

      await updateVerdict(latestVerdict.id, {
        overviewBullets: result.bullets,
      });
      latestVerdict = (await findVerdictByQuestionAndMonth(questionId, monthDate)) || latestVerdict;
    }

    if (!hasFeatured) {
      const alignedStances = monthStances.filter((stance) => {
        const attempt = (stance as any).articleAnalysisAttempt;
        if (!attempt) return false;
        const isYes =
          latestVerdict.verdictLabel === 'YesItSeemsSo' ||
          latestVerdict.verdictLabel === 'ProbablyYes';
        const isNo =
          latestVerdict.verdictLabel === 'NoItDoesntSeemSo' ||
          latestVerdict.verdictLabel === 'ProbablyNot';
        if (isYes) return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
        if (isNo) return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
        return true;
      });

      if (alignedStances.length > 0) {
        const articlesForLLM = alignedStances.slice(0, 5).map((stance) => {
          const attempt = (stance as any).articleAnalysisAttempt;
          const article = (stance as any).article;
          const outlet = article?.outlet;
          return {
            id: article.id,
            title: article.title,
            textContent: article.textContent,
            outletName: outlet?.name || '',
            stance: attempt?.stance || 'Unclear',
            reasoning: attempt?.reasoning || '',
            confidence: attempt?.confidence ?? 0.5,
          };
        });

        const result = await llmProvider.generateFeaturedPerspective({
          question: {
            text: question.questionText,
            topicName,
          },
          verdict: {
            label: latestVerdict.verdictLabel as string,
          },
          articles: articlesForLLM,
        });

        const featuredStance = alignedStances.find((s) => {
          const article = (s as any).article;
          return article?.id === result.quote.articleId && article?.url;
        });
        const article = featuredStance ? (featuredStance as any).article : null;
        if (article?.url) {
          await updateVerdict(latestVerdict.id, {
            featuredPerspective: {
              text: result.quote.text,
              articleId: result.quote.articleId,
              articleTitle: result.quote.articleTitle,
              outletName: result.quote.outletName,
              articleUrl: article.url,
            },
          });
        }
      }
    }

      if (!hasDebatePoints) {
      const opposingStances = monthStances.filter((stance) => {
        const attempt = (stance as any).articleAnalysisAttempt;
        if (!attempt) return false;
        const isYes =
          latestVerdict.verdictLabel === 'YesItSeemsSo' ||
          latestVerdict.verdictLabel === 'ProbablyYes';
        const isNo =
          latestVerdict.verdictLabel === 'NoItDoesntSeemSo' ||
          latestVerdict.verdictLabel === 'ProbablyNot';
        if (isYes) return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
        if (isNo) return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
        return false;
      });

      const pointsToStore: Array<{
        verdictId: string;
        text: string;
        articleId: string | null;
        type: 'Unknown';
        order: number;
      }> = [];

      for (const stance of opposingStances.slice(0, 5)) {
        const attempt = (stance as any).articleAnalysisAttempt;
        const article = (stance as any).article;
        if (!attempt || !article?.url) continue;

        const quoteResult = await llmProvider.extractQuotes({
          article: {
            id: article.id,
            title: article.title,
            textContent: article.textContent,
            url: article.url,
          },
          question: {
            text: question.questionText,
            topicName,
          },
          stance: attempt.stance,
          maxQuotes: 1,
        });

        if (quoteResult.quotes.length === 0) continue;
        const quote = quoteResult.quotes[0];
        const trimmedText = quote.text?.trim() || '';
        if (trimmedText.length < 20 || isNonQuoteResponse(trimmedText)) continue;

        pointsToStore.push({
          verdictId: latestVerdict.id,
          text: quote.text,
          articleId: article.id,
          type: 'Unknown',
          order: pointsToStore.length,
        });
      }

      if (pointsToStore.length > 0) {
        await createEvidenceBullets(pointsToStore);
      }
      }
    });
  } catch (error) {
    console.warn(`[getDebateCard] Lazy generation failed for ${questionId} (${monthKey}):`, error);
  }

  // Re-read after possible lazy generation so response uses persisted values.
  verdict = (await findVerdictByQuestionAndMonth(questionId, monthDate)) || verdict;

  // Use stored overview bullets only (no on-demand generation in API).
  let overviewBullets: string[] = [];
  if (verdict.overviewBullets && Array.isArray(verdict.overviewBullets)) {
    overviewBullets = verdict.overviewBullets as string[];
  }

  // Check for stored quotes in EvidenceBullet (Why = majority, Dissent = opposing)
  let quotesFor: QuoteDTO[] = [];
  let quotesAgainst: QuoteDTO[] = [];
  const evidenceBullets = await findEvidenceBulletsByVerdictId(verdict.id);
  const storedQuotesFor = evidenceBullets.filter((eb) => eb.type === 'Why');
  const storedQuotesAgainst = evidenceBullets.filter((eb) => eb.type === 'Dissent');

  if (storedQuotesFor.length > 0 || storedQuotesAgainst.length > 0) {
    // Use stored quotes
    quotesFor = storedQuotesFor
      .filter((eb) => !isNonQuoteResponse(eb.text))
      .map((eb) => ({
      id: eb.id,
      text: eb.text,
      articleId: eb.articleId || '',
      articleTitle: (eb as any).article?.title || '',
      articleUrl: (eb as any).article?.url || '',
      outletName: (eb as any).article?.outlet?.name || '',
      publishedDate: (eb as any).article?.publishedDate?.toISOString() || null,
    }));
    quotesAgainst = storedQuotesAgainst
      .filter((eb) => !isNonQuoteResponse(eb.text))
      .map((eb) => ({
      id: eb.id,
      text: eb.text,
      articleId: eb.articleId || '',
      articleTitle: (eb as any).article?.title || '',
      articleUrl: (eb as any).article?.url || '',
      outletName: (eb as any).article?.outlet?.name || '',
      publishedDate: (eb as any).article?.publishedDate?.toISOString() || null,
    }));
  }

  // Limit quotes
  // Deduplicate quotes by text (normalized) before selecting top quotes
  const normalizeText = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
  
  const deduplicatedQuotesFor: QuoteDTO[] = [];
  const seenTextsFor = new Set<string>();
  
  for (const quote of quotesFor) {
    const normalized = normalizeText(quote.text);
    if (!seenTextsFor.has(normalized)) {
      seenTextsFor.add(normalized);
      deduplicatedQuotesFor.push(quote);
    }
  }
  
  const deduplicatedQuotesAgainst: QuoteDTO[] = [];
  const seenTextsAgainst = new Set<string>();
  
  for (const quote of quotesAgainst) {
    const normalized = normalizeText(quote.text);
    if (!seenTextsAgainst.has(normalized)) {
      seenTextsAgainst.add(normalized);
      deduplicatedQuotesAgainst.push(quote);
    }
  }
  
  const topQuotesFor = distributeQuotesByOutlet(deduplicatedQuotesFor, 5);
  const topQuotesAgainst = distributeQuotesByOutlet(deduplicatedQuotesAgainst, 3);

  // Check for stored featured perspective
  let featuredPerspective: FeaturedPerspectiveDTO | null = null;
  if (verdict.featuredPerspective && typeof verdict.featuredPerspective === 'object') {
    const stored = verdict.featuredPerspective as any;
    // Find article URL from sources or monthStances - ensure we always have it
    let articleUrl = stored.articleUrl;
    if (!articleUrl) {
      const source = sources.find((s) => s.articleId === stored.articleId);
      articleUrl = source?.articleUrl;
    }
    if (!articleUrl) {
      // Try to find it in monthStances
      const stanceWithArticle = monthStances.find((s) => {
        const article = (s as any).article;
        return article?.id === stored.articleId && article?.url;
      });
      if (stanceWithArticle) {
        articleUrl = (stanceWithArticle as any).article?.url;
      }
    }
    
    // Only return featured perspective if we have an article URL
    if (articleUrl) {
      featuredPerspective = {
        id: `featured-${stored.articleId}`,
        text: stored.text,
        outletName: stored.outletName,
        articleId: stored.articleId,
        articleTitle: stored.articleTitle,
        articleUrl: articleUrl,
      };
    }
  }

  // Get points for debate from stored EvidenceBullet (Unknown type) or generate from opposing arguments
  // Points for debate should ALWAYS be quotes from opposing articles, not summaries
  let pointsForDebate: PointForDebateDTO[] = [];
  const storedPointsForDebate = evidenceBullets.filter((eb) => eb.type === 'Unknown');

  if (storedPointsForDebate.length > 0) {
    // Only use stored points if they have articleId (meaning they're quotes, not summaries)
    // And only include those that have articleUrl (required for linking)
    pointsForDebate = storedPointsForDebate
      .filter((eb) => !isNonQuoteResponse(eb.text))
      .filter((eb) => eb.articleId && (eb as any).article?.url) // Only include quotes with article links
      .map((eb) => ({
        id: eb.id,
        text: eb.text,
        articleId: eb.articleId!,
        articleTitle: (eb as any).article?.title || null,
        articleUrl: (eb as any).article?.url || null, // Always required
        outletName: (eb as any).article?.outlet?.name || null,
        publishedDate: (eb as any).article?.publishedDate?.toISOString() || null,
      }));
  }
  
  // Build arguments (for legacy compatibility)
  const argumentsFor: ArgumentDTO[] = monthStances
    .filter((s) => {
      const attempt = (s as any).articleAnalysisAttempt;
      return attempt?.stance === 'YesItSeemsSo' || attempt?.stance === 'ProbablyYes';
    })
    .slice(0, 3)
    .map((s) => {
      const attempt = (s as any).articleAnalysisAttempt;
      const article = (s as any).article;
      const outlet = article?.outlet;
      return {
        id: `${article.id}-${attempt.id}`,
        text: attempt.reasoning || '',
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: article.url,
        outletName: outlet?.name || '',
      };
    });

  const argumentsAgainst: ArgumentDTO[] = monthStances
    .filter((s) => {
      const attempt = (s as any).articleAnalysisAttempt;
      return attempt?.stance === 'NoItDoesntSeemSo' || attempt?.stance === 'ProbablyNot';
    })
    .slice(0, 3)
    .map((s) => {
      const attempt = (s as any).articleAnalysisAttempt;
      const article = (s as any).article;
      const outlet = article?.outlet;
      return {
        id: `${article.id}-${attempt.id}`,
        text: attempt.reasoning || '',
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: article.url,
        outletName: outlet?.name || '',
      };
    });

  const balancedPointsForDebate = distributePointsByOutlet(pointsForDebate);
  const unknowns: UnknownDTO[] = balancedPointsForDebate.map((p) => ({
    id: p.id,
    text: p.text,
    articleId: p.articleId,
  }));

  // Get timeline events
  const timelineEvents = await getTimelineEvents(undefined, questionId, true);
  const timeline: TimelineEventDTO[] = timelineEvents.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    description: e.description,
    verdictLabel: e.verdictLabel,
  }));

  const overview = `This question addresses ${topicName}. The analysis considers multiple perspectives from credible news sources to provide a balanced view of the current state of the debate.`;

  return {
    questionId: question.id,
    questionText: question.questionText,
    topicId: question.topicId,
    topicName: topic?.name || 'Unknown',
    overview,
    overviewBullets,
    quotes: topQuotesFor, // Legacy field
    quotesFor: topQuotesFor,
    quotesAgainst: topQuotesAgainst,
    argumentsFor,
    argumentsAgainst,
    unknowns, // Legacy field
    pointsForDebate: balancedPointsForDebate,
    sources: sources.slice(0, 20), // Limit to 20 sources
    featuredPerspective,
    timeline, // Legacy field
    timelineEvents: timeline,
  };
}
