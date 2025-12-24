'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTopics } from '../../lib/hooks/useTopics';
import { useQuestions } from '../../lib/hooks/useQuestions';

interface NextCauseProps {
  currentTopicId?: string;
  currentQuestionId?: string;
}

export default function NextCause({ currentTopicId, currentQuestionId }: NextCauseProps) {
  const { data: topics } = useTopics(false);
  const { data: questions } = useQuestions();

  // If we're on a question page, try to find next question in same topic first
  let nextQuestion: { id: string; questionText: string } | undefined;
  let nextTopic: { id: string; name: string; firstQuestion?: { questionText: string } | null } | undefined;

  if (currentQuestionId && questions && questions.length > 0) {
    // Find current question to get its topic
    const currentQuestion = questions.find((q) => q.id === currentQuestionId);
    const questionTopicId = currentQuestion?.topicId;

    if (questionTopicId) {
      // Find all questions in the same topic
      const topicQuestions = questions.filter((q) => q.topicId === questionTopicId);
      const currentIdx = topicQuestions.findIndex((q) => q.id === currentQuestionId);
      
      if (currentIdx >= 0 && currentIdx < topicQuestions.length - 1) {
        // Next question in same topic
        const nextQ = topicQuestions[currentIdx + 1];
        if (nextQ) {
          nextQuestion = { id: nextQ.id, questionText: nextQ.questionText };
        }
      } else {
        // No more questions in this topic, find next topic
        if (topics && topics.length > 0) {
          const topicIdx = topics.findIndex((t) => t.id === questionTopicId);
          const nextTopicIdx = topicIdx >= 0 ? (topicIdx + 1) % topics.length : 0;
          const nextT = topics[nextTopicIdx];
          if (nextT) {
            nextTopic = { 
              id: nextT.id, 
              name: nextT.name,
              firstQuestion: nextT.firstQuestion 
            };
          }
        }
      }
    } else {
      // Fallback: find next question overall
      const idx = questions.findIndex((q) => q.id === currentQuestionId);
      const nextIdx = idx >= 0 ? (idx + 1) % questions.length : 0;
      const nextQ = questions[nextIdx];
      if (nextQ) {
        nextQuestion = { id: nextQ.id, questionText: nextQ.questionText };
      }
    }
  } else if (currentTopicId && topics && topics.length > 0) {
    // On topic page, find next topic
    const idx = topics.findIndex((t) => t.id === currentTopicId);
    const nextIdx = idx >= 0 ? (idx + 1) % topics.length : 0;
    const nextT = topics[nextIdx];
    if (nextT) {
      nextTopic = { 
        id: nextT.id, 
        name: nextT.name,
        firstQuestion: nextT.firstQuestion 
      };
    }
  }

  // Determine link and title
  const link = nextQuestion 
    ? `/questions/${nextQuestion.id}`
    : nextTopic 
    ? `/topics/${nextTopic.id}`
    : null;

  const title = nextQuestion
    ? nextQuestion.questionText
    : nextTopic?.firstQuestion?.questionText || nextTopic?.name || null;

  if (!link || !title) return null;

  return (
    <section className="bg-white rounded-2xl border border-border-light p-10 md:p-14 shadow-sm mt-16 text-center">
      <p className="text-sm uppercase tracking-wider text-text-muted mb-3">
        Next Cause
      </p>
      <h3 className="text-2xl font-black text-text-main group-hover:text-primary-blue transition-colors mb-5">
        {title}
      </h3>
      <div className="flex justify-center">
        <Link
          href={link}
          className="text-primary-blue font-bold text-sm inline-flex items-center gap-2 group"
        >
          Read Next
          <ArrowRight className="size-4 md:size-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}


