'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

async function fetchQuestions(topicId?: string | null) {
  const url = topicId ? `/admin/api/questions?topicId=${topicId}` : '/admin/api/questions';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}

async function fetchTopics() {
  const res = await fetch('/admin/api/topics');
  if (!res.ok) throw new Error('Failed to fetch topics');
  return res.json();
}

async function batchUpdateQuestions(ids: string[], action: 'approve' | 'reject') {
  const res = await fetch('/admin/api/questions/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  });
  if (!res.ok) throw new Error('Failed to batch update questions');
  return res.json();
}

function getBarScore(validationResults: any): number | null {
  if (!validationResults) return null;
  if (validationResults.barValidation?.barReadinessScore !== undefined) {
    return validationResults.barValidation.barReadinessScore;
  }
  if (validationResults.barReadinessScore !== undefined) {
    return validationResults.barReadinessScore;
  }
  return null;
}

export default function AdminQuestions() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId');
  const [selectedTopicId, setSelectedTopicId] = useState(topicId || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-questions', selectedTopicId || null],
    queryFn: () => fetchQuestions(selectedTopicId || null),
  });

  const { data: topics } = useQuery({
    queryKey: ['admin-topics'],
    queryFn: fetchTopics,
  });

  const batchMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' }) =>
      batchUpdateQuestions(ids, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setSelectedIds(new Set());
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(questions?.map((q: any) => q.id) || []));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchAction = (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    batchMutation.mutate({ ids: Array.from(selectedIds), action });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-text-main mb-2">Questions Management</h1>
          <p className="text-text-muted">Manage questions and their validation status</p>
        </div>
        <Link
          href="/admin/questions/new"
          className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 transition-colors"
        >
          + New Question
        </Link>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-text-main mb-2">
          Filter by Topic
        </label>
        <select
          value={selectedTopicId}
          onChange={(e) => setSelectedTopicId(e.target.value)}
          className="px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
        >
          <option value="">All Topics</option>
          {topics?.map((topic: any) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-blue-800 font-semibold">
            {selectedIds.size} question(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBatchAction('approve')}
              disabled={batchMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Approve Selected
            </button>
            <button
              onClick={() => handleBatchAction('reject')}
              disabled={batchMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Reject Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 border border-border-light rounded-lg hover:bg-background-lighter"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-text-muted">Loading questions...</div>
      ) : questions && questions.length > 0 ? (
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-background-lighter">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === questions.length && questions.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border-light"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">BAR Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Stances</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Verdicts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {questions.map((question: any) => {
                const barScore = getBarScore(question.validationResults);
                return (
                  <tr key={question.id} className="hover:bg-background-lighter/50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(question.id)}
                        onChange={(e) => handleSelect(question.id, e.target.checked)}
                        className="rounded border-border-light"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/questions/${question.id}/edit`} className="font-medium text-text-main hover:text-primary-blue line-clamp-2">
                        {question.questionText}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/topics/${question.topicId}`} className="text-text-muted hover:text-primary-blue">
                        {question.topic.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {barScore !== null ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          barScore >= 70 
                            ? 'bg-green-100 text-green-800' 
                            : barScore >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {barScore}/100
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        question.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {question.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{question._count.articleStances}</td>
                    <td className="px-6 py-4 text-text-muted">{question._count.verdicts}</td>
                    <td className="px-6 py-4 text-text-muted">
                      {new Date(question.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-text-muted">No questions found</div>
      )}
    </div>
  );
}
