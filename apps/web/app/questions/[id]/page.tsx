'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, Quote as QuoteIcon } from 'lucide-react';
import { useQuestion } from '../../../lib/hooks/useQuestion';
import { useVerdict } from '../../../lib/hooks/useVerdict';
import { useDebateCard } from '../../../lib/hooks/useDebateCard';
import { useConsensusThermometer } from '../../../lib/hooks/useConsensusThermometer';
import { getOutletLogoUrl } from '../../../lib/utils/outletLogos';
import NextCause from '../../components/NextCause';
import VerdictSlider from '../../components/VerdictSlider';

export default function QuestionDetail() {
  const params = useParams();
  const questionId = params?.id as string;
  
  const { data: question, isLoading: questionLoading } = useQuestion(questionId);
  const { data: verdict } = useVerdict(questionId || '', undefined);
  const { data: debateCard } = useDebateCard(questionId || '', undefined);
  const { data: consensus } = useConsensusThermometer(questionId || '', undefined);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [questionId]);

  const formatPublicationDate = (date?: string | null) => {
    if (!date) return 'Unknown date';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const buildSourceLabel = (outletName?: string | null, publishedDate?: string | null) =>
    `${outletName || 'Unknown outlet'} — ${formatPublicationDate(publishedDate)}`;

  const formatLastUpdated = (iso?: string) => {
    if (!iso) return null;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const uniqueByOutlet = <T extends { outletName?: string | null }>(items: T[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.outletName || 'unknown';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  if (questionLoading) {
    return (
      <main className="flex w-full flex-1 justify-center py-10 md:py-16 bg-background-lighter">
        <div className="w-full max-w-3xl px-4">
          <p className="text-text-muted">Loading question...</p>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="flex w-full flex-1 justify-center py-10 md:py-16 bg-background-lighter">
        <div className="w-full max-w-3xl px-4">
          <p className="text-text-muted">Question not found.</p>
        </div>
      </main>
    );
  }

  const verdictLabel = verdict?.verdictLabel;
  const consensusPercentage =
    typeof verdict?.confidence === 'number' ? Math.round(verdict.confidence) : 0;

  // Get unique outlets
  const outlets = consensus?.outletStances?.map(os => ({
    name: os.outletName,
    logoUrl: getOutletLogoUrl(os.outletName)
  })) || [];
  const uniqueOutlets = Array.from(new Map(outlets.map(o => [o.name, o])).values());
  const quotesFor = debateCard?.quotesFor ? uniqueByOutlet(debateCard.quotesFor) : [];
  const quotesAgainst = debateCard?.quotesAgainst ? uniqueByOutlet(debateCard.quotesAgainst) : [];
  const pointsForDebate = debateCard?.pointsForDebate ? uniqueByOutlet(debateCard.pointsForDebate) : [];

  return (
    <main className="flex w-full flex-1 justify-center py-10 md:py-16 bg-background-lighter">
      <div className="w-full max-w-4xl px-4 md:px-6 lg:px-0">
        <div className="flex flex-col gap-8">
          
          {/* Header Section */}
          <div>
            {/* Topic as Eyebrow - Links to topic page */}
            <Link 
              href={`/topics/${question.topicId}`}
              className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 hover:text-primary-blue transition-colors inline-block"
            >
              {question.topicName}
            </Link>
            
            {/* Question Title */}
            <div className="mb-6">
              <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl text-text-main">
                {question.questionText}
              </h1>
            </div>

            {/* Slider and Action Button Row */}
            {verdictLabel && (
              <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="w-full md:w-[72%]">
                  <VerdictSlider verdictLabel={verdictLabel} size="lg" />
                </div>
                <Link
                  href={`/questions/${questionId}/act`}
                  className="mt-2 flex-shrink-0 whitespace-nowrap rounded-xl bg-primary px-8 py-4 text-center font-bold text-white shadow-lg transition-opacity hover:opacity-90"
                >
                  How to act
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-5">
              <p className="text-lg text-text-muted leading-relaxed">
                <span className="font-bold text-text-main">{consensusPercentage}% consensus</span> based on the perspective of <span className="font-bold text-text-main">{verdict?.articleCount || 0}</span> journalists from <span className="font-bold text-text-main">{verdict?.outletCount || 0}</span> publications.
              </p>
              {formatLastUpdated(verdict?.calculatedAt) && (
                <p className="text-sm text-text-muted">
                  Last updated{' '}
                  <span className="font-semibold text-text-main">
                    {formatLastUpdated(verdict?.calculatedAt)}
                  </span>
                  .
                </p>
              )}

              <div className="flex items-center -space-x-3 pl-1">
                {uniqueOutlets.slice(0, 6).map((outlet, i) => (
                  <img
                    key={i}
                    alt={outlet.name}
                    className="size-11 rounded-full border-2 border-background-lighter bg-white object-cover shadow-sm"
                    src={outlet.logoUrl}
                  />
                ))}
                {uniqueOutlets.length > 6 && (
                  <div className="flex size-11 items-center justify-center rounded-full border-2 border-background-lighter bg-gray-200 text-xs font-medium text-text-muted">
                    +{uniqueOutlets.length - 6}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Understand Box - Bullet Points */}
          {debateCard?.overviewBullets && debateCard.overviewBullets.length > 0 ? (
            <div className="rounded-xl border border-border-light bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-text-main">Understand</h2>
              <ul className="space-y-3 text-text-muted leading-relaxed text-base">
                {debateCard.overviewBullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary-blue mt-1">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            debateCard?.overview && (
              <div className="rounded-xl border border-border-light bg-white p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-text-main">Understand</h2>
                <div className="text-text-muted leading-relaxed text-base whitespace-pre-line">
                  {debateCard.overview}
                </div>
              </div>
            )
          )}

          {/* Quotes Section (majority-aligned) */}
          {quotesFor.length > 0 && (
            <div className="border-t border-border-light pt-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-blue/10 text-primary-blue">
                  <QuoteIcon className="size-5" strokeWidth={3} />
                </div>
                <h3 className="text-lg font-bold text-text-main">Quotes</h3>
              </div>
              <div className="space-y-6">
                {quotesFor.map((quote, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <blockquote className="text-base text-text-muted italic leading-relaxed border-l-2 border-primary-blue/30 pl-3">
                      &ldquo;{quote.text}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-2 pl-3">
                      <img 
                        src={getOutletLogoUrl(quote.outletName)} 
                        alt={quote.outletName} 
                        className="size-5 rounded-full bg-white object-cover ring-1 ring-border-light" 
                      />
                      {quote.articleUrl ? (
                        <Link 
                          href={quote.articleUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-text-main hover:text-primary-blue transition-colors"
                        >
                          {buildSourceLabel(quote.outletName, quote.publishedDate)}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-text-main">
                          {buildSourceLabel(quote.outletName, quote.publishedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Points for Debate Section */}
          {pointsForDebate.length ? (
            <div className="border-t border-border-light pt-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-verdict-split/20 text-verdict-split">
                  <HelpCircle className="size-5" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-text-main">Some points for debate</h3>
              </div>
              <div className="space-y-6">
                {pointsForDebate
                  .filter((point) => point.text && point.text.trim().length > 0) // Only show non-empty quotes
                  .map((point, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <blockquote className="text-base text-text-muted italic leading-relaxed border-l-2 border-verdict-split/30 pl-3">
                        &ldquo;{point.text}&rdquo;
                      </blockquote>
                      {point.outletName && (
                        <div className="flex items-center gap-2 pl-3">
                          <img 
                            src={getOutletLogoUrl(point.outletName)} 
                            alt={point.outletName} 
                            className="size-5 rounded-full bg-white object-cover ring-1 ring-border-light" 
                          />
                          {point.articleUrl ? (
                            <Link 
                              href={point.articleUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-text-main hover:text-primary-blue transition-colors"
                            >
                              {buildSourceLabel(point.outletName, point.publishedDate)}
                            </Link>
                          ) : (
                            <span className="text-xs font-bold text-text-main">
                              {buildSourceLabel(point.outletName, point.publishedDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            debateCard?.unknowns && debateCard.unknowns.length > 0 && (
              <div className="border-t border-border-light pt-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-verdict-split/20 text-verdict-split">
                    <HelpCircle className="size-5" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-bold text-text-main">Some points for debate</h3>
                </div>
                <div className="space-y-6">
                  {debateCard.unknowns.map((unknown, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <p className="text-base text-text-muted leading-relaxed">
                        {unknown.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Featured Perspective */}
          {debateCard?.featuredPerspective && debateCard.featuredPerspective.articleUrl && (
            <div className="border-t border-border-light pt-8">
              <div className="rounded-xl border border-border-light bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-text-main mb-6">Featured Perspective</h3>
                <Link 
                  href={debateCard.featuredPerspective.articleUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <blockquote className="text-xl font-medium text-text-main italic leading-relaxed mb-6 relative hover:text-primary-blue transition-colors cursor-pointer">
                    <span className="absolute -left-4 top-0 text-4xl text-primary-blue/20 leading-none">&ldquo;</span>
                    <span className="relative z-10">{debateCard.featuredPerspective.text}</span>
                  </blockquote>
                </Link>
                <div className="border-t border-background-lighter pt-6 flex items-center gap-3">
                  <img
                    src={getOutletLogoUrl(debateCard.featuredPerspective.outletName)}
                    alt={debateCard.featuredPerspective.outletName}
                    className="size-12 rounded-xl bg-white object-cover ring-1 ring-border-light"
                  />
                  <Link 
                    href={debateCard.featuredPerspective.articleUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-text-main hover:text-primary-blue transition-colors"
                  >
                    {debateCard.featuredPerspective.outletName}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {(debateCard?.timelineEvents?.length || debateCard?.timeline?.length) && (
            <div className="border-t border-border-light pt-8">
              <div className="rounded-xl border border-border-light bg-white p-10 shadow-sm">
                <h3 className="text-xl font-black text-text-main mb-12">Key Context Timeline</h3>
                <div className="relative">
                  {/* Continuous vertical line */}
                  <div className="absolute left-[8px] top-0 bottom-0 w-[1px] bg-border-light"></div>
                  
                  {/* Timeline events */}
                  <div className="space-y-12">
                    {(debateCard.timelineEvents ?? debateCard.timeline ?? []).map((event, index) => {
                      // Alternating colors: primary-blue, verdict-split, or based on index
                      const bulletColor = index % 2 === 0 ? 'bg-primary-blue' : 'bg-verdict-split';
                      
                      return (
                        <div key={event.id} className="relative pl-10">
                          {/* Small colored bullet */}
                          <div className={`absolute left-[3px] top-[6px] size-3 rounded-full ${bulletColor}`}></div>
                          
                          {/* Event content */}
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                              {new Date(event.date).toLocaleDateString()}
                            </p>
                            <h4 className="text-xl font-black text-text-main">{event.title}</h4>
                            <p className="text-lg text-text-muted leading-relaxed">{event.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Journalist Alignment By Publication */}
          {consensus?.outletStances && consensus.outletStances.length > 0 && (
            <div className="border-t border-border-light pt-8">
              <div className="rounded-xl border border-border-light bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-main">Journalist Alignment</h3>
                  <span className="text-sm font-medium text-text-muted">By Publication</span>
                </div>
                
                <div className="space-y-6">
                  {consensus.outletStances.map((os, idx) => {
                    const alignment = Math.round(os.weightedContribution * 100);
                    return (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img 
                              src={getOutletLogoUrl(os.outletName)} 
                              alt={os.outletName} 
                              className="size-8 rounded-full bg-white object-cover" 
                            />
                            <span className="text-sm font-bold text-text-main">{os.outletName}</span>
                          </div>
                          <span className="text-sm font-bold text-text-main">{alignment}% alignment</span>
                        </div>
                        
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className="h-full rounded-full bg-primary" 
                            style={{ width: `${alignment}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Next Cause */}
          <NextCause currentQuestionId={questionId} currentTopicId={question.topicId} />

        </div>
      </div>
    </main>
  );
}

