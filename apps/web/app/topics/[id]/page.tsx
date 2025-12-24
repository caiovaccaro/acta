'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTopic } from '../../../lib/hooks/useTopics';
import QuestionCard from '../../components/QuestionCard';
import FeaturedQuestionCard from '../../components/FeaturedQuestionCard';
import type { TopicDTO, QuestionSummaryDTO, QuestionCardDTO } from '@acta/shared';

export default function TopicDetail() {
  const params = useParams();
  const topicId = params?.id as string;
  
  const { data: topic, isLoading: topicLoading } = useTopic(topicId);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [topicId]);

  if (topicLoading) {
    return (
      <main className="flex w-full flex-1 justify-center py-10 md:py-16 bg-background-lighter">
        <div className="w-full max-w-6xl px-4 md:px-10">
          <p className="text-text-muted">Loading topic...</p>
        </div>
      </main>
    );
  }

  if (!topic || !topic.questions || topic.questions.length === 0) {
    return (
      <main className="flex w-full flex-1 justify-center py-10 md:py-16 bg-background-lighter">
        <div className="w-full max-w-6xl px-4 md:px-10">
          <p className="text-text-muted">Topic not found or has no questions.</p>
        </div>
      </main>
    );
  }

  // Get main question (firstQuestion from topic) and other questions
  const mainQuestionSummary = topic.firstQuestion;
  
  // Use questionCards if available (includes outlets), otherwise fall back to questions
  const topicWithCards = topic as any;
  const allQuestionCards: QuestionCardDTO[] = topicWithCards.questionCards || [];
  
  // If we have questionCards, use them; otherwise convert questions to QuestionCardDTO
  const questionCardsToUse = allQuestionCards.length > 0 
    ? allQuestionCards
    : topic.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        isActive: q.isActive,
        topicId: topic.id,
        topicName: topic.name,
        verdict: q.verdict,
        outlets: [], // Will be empty if not provided
      }));
  
  // Find main question in the question cards list
  const mainQuestionCard = mainQuestionSummary 
    ? questionCardsToUse.find(q => q.id === mainQuestionSummary.id)
    : null;
  
  // Other questions (excluding main question)
  const otherQuestionCards = mainQuestionCard
    ? questionCardsToUse.filter(q => q.id !== mainQuestionCard.id)
    : questionCardsToUse.slice(1); // If no main question identified, skip first one

  return (
    <main className="flex flex-col items-center w-full min-h-screen bg-background-lighter">
      <div className="w-full max-w-6xl px-4 md:px-10 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-bold text-text-muted hover:text-primary-blue mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2 size-4" /> Back to all topics
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-text-main mb-6 leading-[1.1]">
            {topic.name}
          </h1>
          <p className="text-xl text-text-muted max-w-3xl leading-relaxed">
            {topic.description || 'Explore questions and debates on this topic.'}
          </p>
        </header>

        {/* Main Question Section */}
        {mainQuestionSummary && (
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-border-light"></div>
              <h2 className="text-sm font-black uppercase tracking-widest text-text-muted whitespace-nowrap">Main Debate</h2>
              <div className="h-px flex-1 bg-border-light"></div>
            </div>
            <div className="w-full">
              {/* Use FeaturedQuestionCard for main question - different from home page TopicCard */}
              <FeaturedQuestionCard 
                topic={topic as TopicDTO} 
                questionId={mainQuestionSummary.id}
              />
            </div>
          </section>
        )}

        {/* Other Questions Section */}
        {otherQuestionCards.length > 0 && (
          <section className="pb-24">
            <h2 className="text-sm font-black uppercase tracking-widest text-text-muted mb-8 text-center">
              More Questions in this Topic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherQuestionCards.map((questionCard) => (
                <QuestionCard key={questionCard.id} question={questionCard} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
