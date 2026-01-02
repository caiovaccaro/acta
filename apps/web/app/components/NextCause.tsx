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

  // Always find the next question, never link to topic pages
  let nextQuestion: { id: string; questionText: string } | undefined;

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
        // No more questions in this topic, find first question of next topic
        if (topics && topics.length > 0) {
          const topicIdx = topics.findIndex((t) => t.id === questionTopicId);
          // Try next topics until we find one with a question
          for (let i = 1; i <= topics.length; i++) {
            const nextTopicIdx = (topicIdx + i) % topics.length;
            const nextT = topics[nextTopicIdx];
            if (nextT?.firstQuestion) {
              nextQuestion = { 
                id: nextT.firstQuestion.id, 
                questionText: nextT.firstQuestion.questionText 
              };
              break;
            }
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
    // On topic page, find first question of next topic (or current topic if it has questions)
    const currentTopic = topics.find((t) => t.id === currentTopicId);
    if (currentTopic?.firstQuestion) {
      // Current topic has a question, use that
      nextQuestion = { 
        id: currentTopic.firstQuestion.id, 
        questionText: currentTopic.firstQuestion.questionText 
      };
    } else {
      // Find next topic with a question
      const idx = topics.findIndex((t) => t.id === currentTopicId);
      for (let i = 1; i <= topics.length; i++) {
        const nextTopicIdx = (idx + i) % topics.length;
        const nextT = topics[nextTopicIdx];
        if (nextT?.firstQuestion) {
          nextQuestion = { 
            id: nextT.firstQuestion.id, 
            questionText: nextT.firstQuestion.questionText 
          };
          break;
        }
      }
    }
  }

  // Always link to a question, never to a topic
  const link = nextQuestion ? `/questions/${nextQuestion.id}` : null;
  const title = nextQuestion?.questionText || null;

  if (!link || !title) return null;

  return (
    <section className="bg-white rounded-2xl border border-border-light p-10 md:p-14 shadow-sm mt-16 text-center">
      <p className="text-sm uppercase tracking-wider text-text-muted mb-3">
        Next Debate
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


