'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect, type DragEvent } from 'react';
import QuestionConvergenceModal from './components/QuestionConvergenceModal';

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

async function updateFeaturedQuestion(id: string, isFeatured: boolean) {
  const res = await fetch('/admin/api/questions/featured', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, isFeatured }),
  });
  if (!res.ok) throw new Error('Failed to update featured question');
  return res.json();
}

async function updateQuestionOrder(ids: string[]) {
  const res = await fetch('/admin/api/questions/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to update question order');
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

function AdminQuestionsContent() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId');
  const [selectedTopicId, setSelectedTopicId] = useState(topicId || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConvergenceModalOpen, setIsConvergenceModalOpen] = useState(false);
  const [orderedQuestions, setOrderedQuestions] = useState<any[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
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

  const featuredMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      updateFeaturedQuestion(id, isFeatured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });

  const orderMutation = useMutation({
    mutationFn: (ids: string[]) => updateQuestionOrder(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });

  useEffect(() => {
    if (questions) {
      setOrderedQuestions(questions);
    }
  }, [questions]);

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

  const handleDragStart = (id: string) => (event: DragEvent<HTMLButtonElement>) => {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (event: DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string) => (event: DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    const sourceId = draggingId || event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const current = orderedQuestions.length ? orderedQuestions : questions || [];
    const sourceIndex = current.findIndex((q: any) => q.id === sourceId);
    const targetIndex = current.findIndex((q: any) => q.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const next = [...current];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedQuestions(next);
    orderMutation.mutate(next.map((q: any) => q.id));
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
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
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between sticky top-4 z-20 shadow-sm">
          <span className="text-blue-800 font-semibold">
            {selectedIds.size} question(s) selected
          </span>
          <div className="flex gap-2">
            {selectedIds.size >= 2 && (
              <button
                onClick={() => setIsConvergenceModalOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Converge {selectedIds.size} Questions
              </button>
            )}
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Featured</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">BAR Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Stances</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Verdicts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {(orderedQuestions.length ? orderedQuestions : questions).map((question: any) => {
                const barScore = getBarScore(question.validationResults);
                return (
                  <tr
                    key={question.id}
                    className="hover:bg-background-lighter/50"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(question.id)}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(question.id)}
                        onChange={(e) => handleSelect(question.id, e.target.checked)}
                        className="rounded border-border-light"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        className="cursor-move text-text-muted hover:text-primary-blue"
                        draggable
                        onDragStart={handleDragStart(question.id)}
                        onDragEnd={handleDragEnd}
                        aria-label="Drag to reorder"
                      >
                        ⋮⋮
                      </button>
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
                      <button
                        type="button"
                        onClick={() => featuredMutation.mutate({
                          id: question.id,
                          isFeatured: !question.isFeatured,
                        })}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          question.isFeatured
                            ? 'bg-primary-blue/10 text-primary-blue'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {question.isFeatured ? 'Featured' : 'Not Featured'}
                      </button>
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

      {/* Convergence Modal */}
      {isConvergenceModalOpen && questions && (
        <QuestionConvergenceModal
          questions={questions.filter((q: any) => selectedIds.has(q.id))}
          isOpen={isConvergenceModalOpen}
          onClose={() => {
            setIsConvergenceModalOpen(false);
            setSelectedIds(new Set());
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
          }}
        />
      )}
    </div>
  );
}

export default function AdminQuestions() {
  return (
    <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
      <AdminQuestionsContent />
    </Suspense>
  );
}
