'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

async function fetchTopics() {
  const res = await fetch('/admin/api/topics');
  if (!res.ok) throw new Error('Failed to fetch topics');
  return res.json();
}

async function createQuestion(data: any) {
  const res = await fetch('/admin/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create question');
  return res.json();
}

export default function NewQuestion() {
  const router = useRouter();
  const [topicId, setTopicId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [contextBlurb, setContextBlurb] = useState('');
  const [validationStatus, setValidationStatus] = useState('pending');
  const [isActive, setIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: topics } = useQuery({
    queryKey: ['admin-topics'],
    queryFn: fetchTopics,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await createQuestion({
        topicId,
        questionText,
        contextBlurb,
        validationStatus,
        isActive,
      });
      router.push('/admin/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-black text-text-main mb-2">Create New Question</h1>
      <p className="text-text-muted mb-6">Add a new question to a topic</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border-light p-6 shadow-sm max-w-2xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Topic *
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="">Select a topic</option>
              {topics?.map((topic: any) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Optional 2-3 sentence context about this question"
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

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Question'}
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
    </div>
  );
}
