import {
  findQuestionById,
  findArticleStancesByQuestionId,
  findVerdictByQuestionAndMonth,
  findEvidenceBulletsByVerdictId,
  createEvidenceBullets,
  deleteEvidenceBulletsByVerdictId,
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

/**
 * Get debate card data for a question
 * Checks for stored LLM-generated data first, only generates if missing
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
      console.warn(`[getDebateCard] Verdict not found - questionId: ${questionId}, month: ${monthDate.toISOString()}`);
      // No verdict means no data yet
      return null;
    }

    console.log(`[getDebateCard] Found verdict: ${verdict.id} for questionId: ${questionId}`);
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

  // Check for stored overview bullets
  let overviewBullets: string[] = [];
  if (verdict.overviewBullets && Array.isArray(verdict.overviewBullets)) {
    overviewBullets = verdict.overviewBullets as string[];
  } else if (monthStances.length > 0) {
    // Generate and store overview bullets
    try {
      const llmProvider = getLLMProvider();
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
          label: verdict.verdictLabel as string,
          confidence: verdict.confidence,
        },
        stances: stancesForLLM,
      });
      overviewBullets = result.bullets;

      // Store in verdict
      await updateVerdict(verdict.id, {
        overviewBullets: result.bullets,
      });
    } catch (error) {
      console.warn('LLM not available for overview bullets, using fallback:', error);
      // Fallback to heuristic
      const topArgumentsFor = monthStances
        .filter((s) => {
          const attempt = (s as any).articleAnalysisAttempt;
          return attempt?.stance === 'YesItSeemsSo' || attempt?.stance === 'ProbablyYes';
        })
        .slice(0, 1);
      const topArgumentsAgainst = monthStances
        .filter((s) => {
          const attempt = (s as any).articleAnalysisAttempt;
          return attempt?.stance === 'NoItDoesntSeemSo' || attempt?.stance === 'ProbablyNot';
        })
        .slice(0, 1);

      if (topArgumentsFor.length > 0 && (topArgumentsFor[0] as any).articleAnalysisAttempt?.reasoning) {
        overviewBullets.push(`Supporters point to: ${(topArgumentsFor[0] as any).articleAnalysisAttempt.reasoning}`);
      }
      if (topArgumentsAgainst.length > 0 && (topArgumentsAgainst[0] as any).articleAnalysisAttempt?.reasoning) {
        overviewBullets.push(`Opponents argue: ${(topArgumentsAgainst[0] as any).articleAnalysisAttempt.reasoning}`);
      }
      if (overviewBullets.length === 0) {
        overviewBullets.push('Evidence is still being gathered; perspectives remain limited.');
      }
    }
  }

  // Check for stored quotes in EvidenceBullet (Why = majority, Dissent = opposing)
  let quotesFor: QuoteDTO[] = [];
  let quotesAgainst: QuoteDTO[] = [];
  const evidenceBullets = await findEvidenceBulletsByVerdictId(verdict.id);
  const storedQuotesFor = evidenceBullets.filter((eb) => eb.type === 'Why');
  const storedQuotesAgainst = evidenceBullets.filter((eb) => eb.type === 'Dissent');

  if (storedQuotesFor.length > 0 || storedQuotesAgainst.length > 0) {
    // Use stored quotes
    quotesFor = storedQuotesFor.map((eb) => ({
      id: eb.id,
      text: eb.text,
      articleId: eb.articleId || '',
      articleTitle: (eb as any).article?.title || '',
      articleUrl: (eb as any).article?.url || '',
      outletName: (eb as any).article?.outlet?.name || '',
    }));
    quotesAgainst = storedQuotesAgainst.map((eb) => ({
      id: eb.id,
      text: eb.text,
      articleId: eb.articleId || '',
      articleTitle: (eb as any).article?.title || '',
      articleUrl: (eb as any).article?.url || '',
      outletName: (eb as any).article?.outlet?.name || '',
    }));
  } else if (monthStances.length > 0) {
    // Generate quotes and store them
    const isYesVerdict = verdict.verdictLabel === 'YesItSeemsSo' || verdict.verdictLabel === 'ProbablyYes';
    const isNoVerdict = verdict.verdictLabel === 'NoItDoesntSeemSo' || verdict.verdictLabel === 'ProbablyNot';

    const quotesToStore: Array<{
      verdictId: string;
      text: string;
      articleId: string | null;
      type: 'Why' | 'Dissent';
      order: number;
    }> = [];

    try {
      const llmProvider = getLLMProvider();
      let quoteOrder = 0;

      // Extract quotes from majority-aligned articles
      const alignedStances = monthStances.filter((stance) => {
        const attempt = (stance as any).articleAnalysisAttempt;
        if (!attempt) return false;
        if (isYesVerdict) {
          return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
        }
        if (isNoVerdict) {
          return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
        }
        return true;
      });

      for (const stance of alignedStances.slice(0, 10)) {
        const attempt = (stance as any).articleAnalysisAttempt;
        const article = (stance as any).article;
        const outlet = article?.outlet;

        if (!attempt || !article || !outlet) continue;

        try {
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
            maxQuotes: 1, // One quote per article
          });

          if (quoteResult.quotes.length > 0) {
            const quote = quoteResult.quotes[0];
            quotesToStore.push({
              verdictId: verdict.id,
              text: quote.text,
              articleId: article.id,
              type: 'Why',
              order: quoteOrder++,
            });
            quotesFor.push({
              id: `temp-${article.id}`,
              text: quote.text,
              articleId: article.id,
              articleTitle: article.title,
              articleUrl: article.url,
              outletName: outlet.name,
            });
          }
        } catch (error) {
          // Skip this article if quote extraction fails
          console.warn(`Failed to extract quote from article ${article.id}:`, error);
        }
      }

      // Extract quotes from opposing articles
      const opposingStances = monthStances.filter((stance) => {
        const attempt = (stance as any).articleAnalysisAttempt;
        if (!attempt) return false;
        if (isYesVerdict) {
          return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
        }
        if (isNoVerdict) {
          return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
        }
        return false;
      });

      for (const stance of opposingStances.slice(0, 5)) {
        const attempt = (stance as any).articleAnalysisAttempt;
        const article = (stance as any).article;
        const outlet = article?.outlet;

        if (!attempt || !article || !outlet) continue;

        try {
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

          if (quoteResult.quotes.length > 0) {
            const quote = quoteResult.quotes[0];
            quotesToStore.push({
              verdictId: verdict.id,
              text: quote.text,
              articleId: article.id,
              type: 'Dissent',
              order: quoteOrder++,
            });
            quotesAgainst.push({
              id: `temp-${article.id}`,
              text: quote.text,
              articleId: article.id,
              articleTitle: article.title,
              articleUrl: article.url,
              outletName: outlet.name,
            });
          }
        } catch (error) {
          console.warn(`Failed to extract quote from article ${article.id}:`, error);
        }
      }

      // Store all quotes
      if (quotesToStore.length > 0) {
        await createEvidenceBullets(quotesToStore);
        // Update quote IDs with actual stored IDs
        const storedEvidence = await findEvidenceBulletsByVerdictId(verdict.id);
        quotesFor = storedEvidence
          .filter((eb) => eb.type === 'Why')
          .map((eb) => ({
            id: eb.id,
            text: eb.text,
            articleId: eb.articleId || '',
            articleTitle: (eb as any).article?.title || '',
            articleUrl: (eb as any).article?.url || '',
            outletName: (eb as any).article?.outlet?.name || '',
          }));
        quotesAgainst = storedEvidence
          .filter((eb) => eb.type === 'Dissent')
          .map((eb) => ({
            id: eb.id,
            text: eb.text,
            articleId: eb.articleId || '',
            articleTitle: (eb as any).article?.title || '',
            articleUrl: (eb as any).article?.url || '',
            outletName: (eb as any).article?.outlet?.name || '',
          }));
      }
    } catch (error) {
      console.warn('LLM not available for quote extraction, using reasoning fallback:', error);
      // Fallback: use reasoning as quotes
      const alignedStances = monthStances.filter((stance) => {
        const attempt = (stance as any).articleAnalysisAttempt;
        if (!attempt || !attempt.reasoning) return false;
        const isYes = verdict.verdictLabel === 'YesItSeemsSo' || verdict.verdictLabel === 'ProbablyYes';
        const isNo = verdict.verdictLabel === 'NoItDoesntSeemSo' || verdict.verdictLabel === 'ProbablyNot';
        if (isYes) {
          return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
        }
        if (isNo) {
          return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
        }
        return false;
      });

      for (const stance of alignedStances.slice(0, 5)) {
        const attempt = (stance as any).articleAnalysisAttempt;
        const article = (stance as any).article;
        const outlet = article?.outlet;
        if (attempt?.reasoning && article && outlet) {
          quotesFor.push({
            id: `${article.id}-${attempt.id}`,
            text: attempt.reasoning,
            articleId: article.id,
            articleTitle: article.title,
            articleUrl: article.url,
            outletName: outlet.name,
          });
        }
      }
    }
  }

  // Limit quotes
  const topQuotesFor = quotesFor.slice(0, 5);
  const topQuotesAgainst = quotesAgainst.slice(0, 3);

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
  } else if (monthStances.length > 0 && topQuotesFor.length > 0) {
    // Generate and store featured perspective
    try {
      const llmProvider = getLLMProvider();
      const alignedStances = monthStances.filter((stance) => {
        const attempt = (stance as any).articleAnalysisAttempt;
        if (!attempt) return false;
        const isYes = verdict.verdictLabel === 'YesItSeemsSo' || verdict.verdictLabel === 'ProbablyYes';
        const isNo = verdict.verdictLabel === 'NoItDoesntSeemSo' || verdict.verdictLabel === 'ProbablyNot';
        if (isYes) {
          return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
        }
        if (isNo) {
          return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
        }
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
            confidence: attempt?.confidence || 0.5,
          };
        });

        const result = await llmProvider.generateFeaturedPerspective({
          question: {
            text: question.questionText,
            topicName,
          },
          verdict: {
            label: verdict.verdictLabel as string,
          },
          articles: articlesForLLM,
        });

        // Find the article to get the URL - ensure we always have it
        const featuredArticle = alignedStances.find((s) => {
          const article = (s as any).article;
          return article?.id === result.quote.articleId && article?.url; // Only use articles with URLs
        });
        const article = featuredArticle ? (featuredArticle as any).article : null;

        // If no article with URL found, try to find it in sources
        let articleUrl = article?.url;
        if (!articleUrl) {
          const source = sources.find((s) => s.articleId === result.quote.articleId);
          articleUrl = source?.articleUrl;
        }

        // Only create featured perspective if we have an article URL
        if (articleUrl) {
          featuredPerspective = {
            id: `featured-${result.quote.articleId}`,
            text: result.quote.text,
            outletName: result.quote.outletName,
            articleId: result.quote.articleId,
            articleTitle: result.quote.articleTitle,
            articleUrl: articleUrl,
          };

          // Store in verdict
          await updateVerdict(verdict.id, {
            featuredPerspective: {
              text: result.quote.text,
              articleId: result.quote.articleId,
              articleTitle: result.quote.articleTitle,
              outletName: result.quote.outletName,
              articleUrl: articleUrl,
            },
          });
        }
      }
    } catch (error) {
      console.warn('LLM not available for featured perspective, using fallback:', error);
      // Only use fallback if quote has articleUrl
      const fqWithUrl = topQuotesFor.find((q) => q.articleUrl);
      if (fqWithUrl) {
        featuredPerspective = {
          id: fqWithUrl.id,
          text: fqWithUrl.text,
          outletName: fqWithUrl.outletName,
          articleId: fqWithUrl.articleId,
          articleTitle: fqWithUrl.articleTitle,
          articleUrl: fqWithUrl.articleUrl!,
        };
      }
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
      .filter((eb) => eb.articleId && (eb as any).article?.url) // Only include quotes with article links
      .map((eb) => ({
        id: eb.id,
        text: eb.text,
        articleId: eb.articleId!,
        articleTitle: (eb as any).article?.title || null,
        articleUrl: (eb as any).article?.url || null, // Always required
        outletName: (eb as any).article?.outlet?.name || null,
      }));
  }
  
  // If no stored quotes or not enough, generate new quotes from opposing articles
  if (pointsForDebate.length === 0) {
    // Generate points for debate from opposing arguments
    const opposingStances = monthStances.filter((stance) => {
      const attempt = (stance as any).articleAnalysisAttempt;
      if (!attempt) return false;
      const isYes = verdict.verdictLabel === 'YesItSeemsSo' || verdict.verdictLabel === 'ProbablyYes';
      const isNo = verdict.verdictLabel === 'NoItDoesntSeemSo' || verdict.verdictLabel === 'ProbablyNot';
      if (isYes) {
        return attempt.stance === 'NoItDoesntSeemSo' || attempt.stance === 'ProbablyNot';
      }
      if (isNo) {
        return attempt.stance === 'YesItSeemsSo' || attempt.stance === 'ProbablyYes';
      }
      return false;
    });

    // Generate points for debate using extractQuotes from opposing articles
    const llmProvider = getLLMProvider();
    for (const stance of opposingStances.slice(0, 5)) {
      const attempt = (stance as any).articleAnalysisAttempt;
      const article = (stance as any).article;
      const outlet = article?.outlet;

      if (!attempt || !article || !outlet) continue;

      try {
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

        if (quoteResult.quotes.length > 0) {
          const quote = quoteResult.quotes[0];
          // Only add if we have a valid quote and article URL
          if (quote.text && quote.text.trim().length > 0 && article.url) {
            pointsForDebate.push({
              id: `debate-${article.id}`,
              text: quote.text,
              articleId: article.id,
              articleTitle: article.title,
              articleUrl: article.url, // Always include article URL
              outletName: outlet.name,
            });
          }
        }
      } catch (error) {
        // Skip this article if quote extraction fails
        console.warn(`Failed to extract quote for debate point from article ${article.id}:`, error);
      }
    }

    // Store points for debate
    if (pointsForDebate.length > 0) {
      const pointsToStore = pointsForDebate.map((p, idx) => ({
        verdictId: verdict.id,
        text: p.text,
        articleId: p.articleId,
        type: 'Unknown' as const,
        order: idx,
      }));
      await createEvidenceBullets(pointsToStore);
    }
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

  const unknowns: UnknownDTO[] = pointsForDebate.map((p) => ({
    id: p.id,
    text: p.text,
    articleId: p.articleId,
  }));

  // Get timeline events
  const timelineEvents = await getTimelineEvents(undefined, questionId);
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
    pointsForDebate,
    sources: sources.slice(0, 20), // Limit to 20 sources
    featuredPerspective,
    timeline, // Legacy field
    timelineEvents: timeline,
  };
}
