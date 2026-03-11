'use client';

import Link from 'next/link';
import { useQuestions } from '../lib/hooks/useQuestions';
import { useTopics } from '../lib/hooks/useTopics';
import QuestionCard from './components/QuestionCard';
import FeaturedTopicsCarousel from './components/FeaturedTopicsCarousel';
import { HERO_LOGO_URLS } from '../lib/utils/outletLogos';

export default function Home() {
  const { data: consensusQuestions, isLoading: consensusLoading, error: consensusError } =
    useQuestions({ bucket: 'consensus' });
  const { data: underDebateQuestions, isLoading: underDebateLoading, error: underDebateError } =
    useQuestions({ bucket: 'under-debate' });
  const {
    data: featuredTopics,
    isLoading: topicsLoading,
    error: topicsError,
  } = useTopics(false, true);

  const publicationLogos = [
    HERO_LOGO_URLS.Guardian, HERO_LOGO_URLS.AlJazeera, HERO_LOGO_URLS.BBC,
    HERO_LOGO_URLS.Politico, HERO_LOGO_URLS.DeutscheWelle, HERO_LOGO_URLS.FoxNews,
    HERO_LOGO_URLS.NationalReview, HERO_LOGO_URLS.TheDispatch
  ];

  return (
    <main className="flex flex-col items-center w-full">
      <div className="w-full max-w-6xl px-4 md:px-10">
        
        {/* Hero Section */}
        <section className="py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col items-start gap-8">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl lg:text-6xl leading-[1.1]">
                Difficult questions. <br />
                <span className="text-verdict-yes">Clear debates.</span><br />
                How you can act.
              </h1>
            </div>
            <div className="flex flex-col items-start gap-6">
              <p className="text-lg text-text-muted leading-relaxed">
                Understand the debate, based on the perspectives from credible publications across the political spectrum.
              </p>
              <div className="flex items-center -space-x-3">
                {publicationLogos.map((url, i) => (
                  <img
                    key={i}
                    alt="Publication logo"
                    className="size-12 rounded-full border-[3px] border-background-light object-cover bg-white"
                    src={url}
                  />
                ))}
                {/* <div className="flex size-12 items-center justify-center rounded-full border-[3px] border-background-light bg-gray-400 text-xs font-bold text-white">
                  +12
                </div> */}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Topics Carousel */}
        <section className="pb-16 sm:pb-20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-left sm:text-3xl mb-2">
              Featured Topics
            </h2>
            <p className="text-text-muted">
              Start with a broad topic, then explore specific questions.
            </p>
          </div>
          {topicsLoading && (
            <div className="text-center py-8">
              <p className="text-text-muted">Loading featured topics...</p>
            </div>
          )}
          {topicsError && (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading featured topics. Please try again later.</p>
            </div>
          )}
          {featuredTopics && featuredTopics.length > 0 && (
            <FeaturedTopicsCarousel topics={featuredTopics} />
          )}
          {featuredTopics && featuredTopics.length === 0 && (
            <div className="text-center py-8">
              <p className="text-text-muted">No featured topics yet.</p>
            </div>
          )}
        </section>

        {/* Consensus Reached Section */}
        {consensusQuestions && consensusQuestions.length > 0 && (
          <section className="py-8 sm:py-12">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-left sm:text-3xl mb-2">
                  Consensus reached
                </h2>
                <p className="text-text-muted">
                  Questions where our verdict leans clearly yes or no.
                </p>
              </div>
            </div>
            {consensusLoading && (
              <div className="text-center py-8">
                <p className="text-text-muted">Loading questions...</p>
              </div>
            )}
            {consensusError && (
              <div className="text-center py-8">
                <p className="text-red-600">Error loading questions. Please try again later.</p>
              </div>
            )}
            {!consensusLoading && !consensusError && (
              <>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {consensusQuestions.slice(0, 9).map((question) => (
                    <QuestionCard key={question.id} question={question} />
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/questions/consensus"
                    className="text-sm font-semibold text-primary-blue hover:underline"
                  >
                    See all questions that reached consensus
                  </Link>
                </div>
              </>
            )}
          </section>
        )}

        {/* Under Debate Section (formerly Featured Debates) */}
        <section className="py-8 sm:py-12">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-left sm:text-3xl mb-2">
                Under debate
              </h2>
              <p className="text-text-muted">
                Questions where the evidence is mixed and the answer is still unclear.
              </p>
            </div>
          </div>
          {underDebateLoading && (
            <div className="text-center py-12">
              <p className="text-text-muted">Loading questions...</p>
            </div>
          )}
          {underDebateError && (
            <div className="text-center py-12">
              <p className="text-red-600">Error loading questions. Please try again later.</p>
            </div>
          )}
          {underDebateQuestions && underDebateQuestions.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {underDebateQuestions.slice(0, 9).map((question) => (
                  <QuestionCard key={question.id} question={question} />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/questions/under-debate"
                  className="text-sm font-semibold text-primary-blue hover:underline"
                >
                  See all questions under debate
                </Link>
              </div>
            </>
          )}
          {underDebateQuestions && underDebateQuestions.length === 0 && !underDebateLoading && !underDebateError && (
            <div className="text-center py-12">
              <p className="text-text-muted">No questions under debate yet.</p>
            </div>
          )}
        </section>
        
      </div>
    </main>
  );
}
