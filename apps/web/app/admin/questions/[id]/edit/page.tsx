'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';

async function fetchQuestion(id: string) {
  const res = await fetch(`/admin/api/questions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch question');
  return res.json();
}

async function fetchTopics() {
  const res = await fetch('/admin/api/topics');
  if (!res.ok) throw new Error('Failed to fetch topics');
  return res.json();
}

async function updateQuestion(id: string, data: any) {
  const res = await fetch(`/admin/api/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update question');
  return res.json();
}

export default function EditQuestion() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => fetchQuestion(id),
    enabled: !!id,
  });

  const { data: topics } = useQuery({
    queryKey: ['admin-topics'],
    queryFn: fetchTopics,
  });

  const [questionText, setQuestionText] = useState('');
  const [contextBlurb, setContextBlurb] = useState('');
  const [validationStatus, setValidationStatus] = useState('pending');
  const [topicId, setTopicId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (question) {
      setQuestionText(question.questionText || '');
      setContextBlurb(question.contextBlurb || '');
      setValidationStatus(question.validationStatus || 'pending');
      setTopicId(question.topicId || '');
      setIsActive(question.isActive || false);
      setSuggestions(question.suggestions || []);
    }
  }, [question]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await updateQuestion(id, {
        questionText,
        contextBlurb,
        validationStatus,
        topicId,
        isActive,
        suggestions,
      });
      router.push('/admin/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2500);
  };

  const handleTopicChange = async (nextTopicId: string) => {
    setTopicId(nextTopicId);
    if (!nextTopicId || nextTopicId === topicId) return;
    setIsSubmitting(true);
    setError('');
    try {
      await updateQuestion(id, {
        questionText,
        contextBlurb,
        validationStatus,
        topicId: nextTopicId,
        isActive,
        suggestions,
      });
      showToast('Topic of the question updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await updateQuestion(id, {
        questionText,
        contextBlurb,
        validationStatus: 'validated',
        topicId,
        isActive: true,
        suggestions,
      });
      router.push('/admin/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await updateQuestion(id, {
        questionText,
        contextBlurb,
        validationStatus: 'rejected',
        topicId,
        isActive: false,
        suggestions,
      });
      router.push('/admin/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject question');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-text-muted">Loading question...</div>;
  }

  if (!question) {
    return <div className="text-text-muted">Question not found</div>;
  }

  const validationResults = question.validationResults as any;
  // Extract reformulated question from validationResults
  // It might be at validationResults.barValidation.reformulatedQuestion or validationResults.reformulatedQuestion
  const reformulatedQuestion = 
    validationResults?.barValidation?.reformulatedQuestion || 
    validationResults?.reformulatedQuestion || 
    null;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-main mb-2">Edit Question</h1>
          <p className="text-text-muted">Update question information and validation status</p>
        </div>
        {question.isActive && (
          <a
            href={`/questions/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-main shadow-sm hover:bg-background-lighter"
          >
            Open on public site
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="space-y-6">
        {toastMessage && (
          <div className="fixed right-6 top-6 z-50 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {toastMessage}
          </div>
        )}
        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">
                Question Text *
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">
                Context Blurb
              </label>
              <textarea
                value={contextBlurb}
                onChange={(e) => setContextBlurb(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">
                Validation Status
              </label>
              <select
                value={validationStatus}
                onChange={(e) => setValidationStatus(e.target.value)}
                className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="validated">Validated</option>
                <option value="rejected">Rejected</option>
                <option value="needs_reformulation">Needs Reformulation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">
                Topic
              </label>
              <select
                value={topicId}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              >
                {topics?.map((topic: any) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border-light"
                />
                <span className="text-sm font-semibold text-text-main">Active</span>
              </label>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border-light">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update Question'}
              </button>
              {reformulatedQuestion && (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Accept & Activate
                </button>
              )}
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-border-light rounded-lg hover:bg-background-lighter"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>

        {/* Reformulated Question Recommendation */}
        {reformulatedQuestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-2">Recommended Reformulation</h2>
            <p className="text-sm text-text-muted mb-4">
              A reformulated version of this question has been suggested to improve clarity and bar-readiness.
            </p>
            <div className="p-4 bg-white rounded-lg border border-blue-200 mb-4">
              <p className="text-lg font-medium text-text-main">{reformulatedQuestion}</p>
            </div>
            <button
              onClick={async () => {
                setIsSubmitting(true);
                setError('');
                try {
                  await updateQuestion(id, {
                    questionText: reformulatedQuestion,
                    originalQuestionText: questionText,
                    validationStatus: 'validated',
                    isActive: true,
                    suggestions,
                  });
                  router.push('/admin/questions');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to apply reformulation');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Apply Reformulation & Activate
            </button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4">Suggestions</h2>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary-blue mt-1">•</span>
                  <span className="text-text-muted">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

