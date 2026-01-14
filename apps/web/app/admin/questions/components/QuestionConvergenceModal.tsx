'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Question {
  id: string;
  questionText: string;
  topic?: {
    name: string;
  };
  topicId: string;
  _count?: {
    articleStances: number;
    verdicts: number;
  };
  isActive: boolean;
  validationStatus: string;
}

interface QuestionConvergenceModalProps {
  questions: Question[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConvergenceResult {
  targetQuestion: Question;
  migratedArticleAnalysisAttempts: number;
  migratedArticleStances: number;
  migratedVerdicts: number;
  migratedTimelineEvents: number;
  createdRedirects: number;
  deletedQuestions: number;
}

export default function QuestionConvergenceModal({
  questions,
  isOpen,
  onClose,
  onSuccess,
}: QuestionConvergenceModalProps) {
  const [targetQuestionId, setTargetQuestionId] = useState<string>('');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newContextBlurb, setNewContextBlurb] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ConvergenceResult | null>(null);

  // Initialize target question (default to first question or question with most stances)
  useEffect(() => {
    if (questions.length > 0 && !targetQuestionId) {
      const questionWithMostStances = questions.reduce((prev, current) => {
        const prevCount = prev._count?.articleStances || 0;
        const currentCount = current._count?.articleStances || 0;
        return currentCount > prevCount ? current : prev;
      });
      setTargetQuestionId(questionWithMostStances.id);
      setNewQuestionText(questionWithMostStances.questionText);
    }
  }, [questions, targetQuestionId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setNewQuestionText('');
      setNewContextBlurb('');
    }
  }, [isOpen]);

  const targetQuestion = questions.find(q => q.id === targetQuestionId);
  const sourceQuestions = questions.filter(q => q.id !== targetQuestionId);

  const totalStances = sourceQuestions.reduce(
    (sum, q) => sum + (q._count?.articleStances || 0),
    0
  );
  const totalVerdicts = sourceQuestions.reduce(
    (sum, q) => sum + (q._count?.verdicts || 0),
    0
  );

  const handleSubmit = async () => {
    if (!targetQuestionId) {
      setError('Please select a target question');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/admin/api/questions/converge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetQuestionId,
          sourceQuestionIds: sourceQuestions.map(q => q.id),
          newQuestionText: newQuestionText.trim() || undefined,
          newContextBlurb: newContextBlurb.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to converge questions');
      }

      const result: ConvergenceResult = await response.json();
      setSuccess(result);

      // Call onSuccess after a brief delay to show success message
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <h2 className="text-2xl font-black text-text-main">Converge Questions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-lighter rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="size-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {success ? (
            // Success State
            <div className="text-center py-8">
              <CheckCircle2 className="size-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-text-main mb-2">
                Questions Converged Successfully!
              </h3>
              <div className="text-text-muted space-y-1">
                <p>{success.migratedArticleStances} article stances migrated</p>
                <p>{success.migratedVerdicts} verdicts migrated</p>
                <p>{success.migratedTimelineEvents} timeline events migrated</p>
                <p>{success.createdRedirects} redirects created</p>
                <p>{success.deletedQuestions} questions deleted</p>
              </div>
            </div>
          ) : (
            <>
              {/* Selected Questions Summary */}
              <div>
                <h3 className="text-lg font-semibold text-text-main mb-3">
                  Selected Questions ({questions.length})
                </h3>
                <div className="space-y-2">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className={`p-3 rounded-lg border ${
                        question.id === targetQuestionId
                          ? 'border-primary-blue bg-primary-blue/5'
                          : 'border-border-light bg-background-lighter'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="radio"
                            id={`question-${question.id}`}
                            name="targetQuestion"
                            value={question.id}
                            checked={targetQuestionId === question.id}
                            onChange={(e) => {
                              setTargetQuestionId(e.target.value);
                              const selectedQuestion = questions.find(q => q.id === e.target.value);
                              if (selectedQuestion) {
                                setNewQuestionText(selectedQuestion.questionText);
                              }
                            }}
                            className="size-4 text-primary-blue mt-1"
                            disabled={isSubmitting}
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`question-${question.id}`}
                              className="font-medium text-text-main cursor-pointer block"
                            >
                              {question.questionText}
                            </label>
                            <div className="text-xs text-text-muted mt-1">
                              {question.topic?.name || 'Unknown Topic'}
                              {question.id === targetQuestionId && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-primary-blue text-white rounded">
                                  Target
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-text-muted whitespace-nowrap">
                          {question._count?.articleStances || 0} stances,{' '}
                          {question._count?.verdicts || 0} verdicts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Question Customization */}
              {targetQuestion && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-main">
                    Target Question Customization
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Question Text (optional)
                    </label>
                    <textarea
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder={targetQuestion.questionText}
                      rows={3}
                      className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                      disabled={isSubmitting}
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      Leave empty to keep current text
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Context Blurb (optional)
                    </label>
                    <textarea
                      value={newContextBlurb}
                      onChange={(e) => setNewContextBlurb(e.target.value)}
                      placeholder="Enter new context blurb..."
                      rows={3}
                      className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Migration Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-5" />
                  Migration Preview
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>
                    <strong>{totalStances}</strong> article stances will be migrated to{' '}
                    <strong>{targetQuestion?.questionText.substring(0, 50)}...</strong>
                  </p>
                  <p>
                    <strong>{totalVerdicts}</strong> verdicts will be migrated (duplicates will be
                    handled automatically)
                  </p>
                  <p className="font-semibold text-red-700">
                    {sourceQuestions.length} source question(s) will be deleted
                  </p>
                  <p className="text-xs text-blue-700">
                    URL redirects will be created for old question URLs
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border-light rounded-lg hover:bg-background-lighter transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !targetQuestionId}
              className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Converging...' : 'Converge Questions'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

