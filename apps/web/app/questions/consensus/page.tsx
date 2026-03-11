'use client';

import QuestionCard from '../../components/QuestionCard';
import { useQuestions } from '../../../lib/hooks/useQuestions';

export default function ConsensusQuestionsPage() {
  const { data: questions, isLoading, error } = useQuestions({ bucket: 'consensus' });

  return (
    <main className="flex w-full flex-1 justify-center py-10 md:py-16 bg-background-lighter">
      <div className="w-full max-w-6xl px-4 md:px-10">
        <section className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
            Questions that reached consensus
          </h1>
          <p className="text-text-muted max-w-2xl">
            These questions have verdicts that lean clearly yes or no, based on evidence from multiple publications.
          </p>
        </section>

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
        {questions && questions.length > 0 && !isLoading && !error && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        )}
        {questions && questions.length === 0 && !isLoading && !error && (
          <div className="text-center py-12">
            <p className="text-text-muted">No questions have reached consensus yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}

