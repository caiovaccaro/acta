'use client';

import { useTopics } from '../lib/hooks/useTopics';
import QuestionCard from './components/QuestionCard';
import { HERO_LOGO_URLS } from '../lib/utils/outletLogos';
import type { QuestionCardDTO } from '@acta/shared';

export default function Home() {
  const { data: topics, isLoading, error } = useTopics(false);

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
                <span className="text-verdict-yes">Clear answers.</span><br />
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

        {/* Featured Debates / Topics Section */}
        <section className="py-16 sm:py-20">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-left sm:text-3xl mb-2">
                Featured Debates
              </h2>
              <p className="text-text-muted">
                Select a topic to explore deep-dives and specific questions.
              </p>
            </div>
          </div>
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-text-muted">Loading questions...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">Error loading questions. Please try again later.</p>
            </div>
          )}
          {topics && topics.length > 0 && (() => {
            // Map topics to QuestionCardDTO format - extract firstQuestion from each topic
            const questionCards: QuestionCardDTO[] = topics
              .filter((topic) => topic.firstQuestion) // Only topics with a main question
              .map((topic) => {
                const firstQuestion = topic.firstQuestion!;
                const topicWithOutlets = topic as any;
                const outlets = topicWithOutlets.firstQuestionOutlets || [];
                
                return {
                  id: firstQuestion.id,
                  questionText: firstQuestion.questionText,
                  isActive: firstQuestion.isActive,
                  topicId: topic.id,
                  topicName: topic.name,
                  verdict: firstQuestion.verdict,
                  outlets,
                  contextBlurb: firstQuestion.contextBlurb || null,
                  journalistCount: (firstQuestion as any).journalistCount,
                  publicationCount: (firstQuestion as any).publicationCount,
                } as QuestionCardDTO;
              });

            if (questionCards.length === 0) {
              return (
                <div className="text-center py-12">
                  <p className="text-text-muted">No questions available yet.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {questionCards.map((question) => (
                  <QuestionCard key={question.id} question={question} />
                ))}
              </div>
            );
          })()}
          {topics && topics.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-muted">No questions available yet.</p>
            </div>
          )}
        </section>
        
      </div>
    </main>
  );
}
