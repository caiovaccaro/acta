'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import QuestionConvergenceModal from './components/QuestionConvergenceModal';

type TimeRange =
  | 'this_week'
  | 'last_2_weeks'
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'all';
type ActiveFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 50;

async function fetchQuestions(params: {
  topicId?: string | null;
  offset: number;
  timeRange: TimeRange;
  activeFilter: ActiveFilter;
  search: string;
}) {
  const searchParams = new URLSearchParams({
    limit: PAGE_SIZE.toString(),
    offset: params.offset.toString(),
    timeRange: params.timeRange,
    activeFilter: params.activeFilter,
  });
  if (params.topicId) searchParams.set('topicId', params.topicId);
  if (params.search.trim()) searchParams.set('search', params.search.trim());

  const res = await fetch(`/admin/api/questions?${searchParams.toString()}`);
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

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (props: {
    attributes: Record<string, any>;
    listeners: Record<string, any>;
    isDragging: boolean;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-background-lighter/50 ${isDragging ? 'bg-background-lighter/80 shadow-sm' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children({ attributes, listeners, isDragging, setNodeRef, style })}
    </tr>
  );
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

function formatVerdictLabel(label?: string | null): string {
  if (!label) return '-';
  switch (label) {
    case 'YesItSeemsSo':
      return 'Yes';
    case 'ProbablyYes':
      return 'Probably yes';
    case 'Unclear':
      return 'Unclear';
    case 'ProbablyNot':
      return 'Probably not';
    case 'NoItDoesntSeemSo':
      return 'No';
    default:
      return label;
  }
}

function AdminQuestionsContent() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId');
  const [selectedTopicId, setSelectedTopicId] = useState(topicId || '');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConvergenceModalOpen, setIsConvergenceModalOpen] = useState(false);
  const [orderedQuestions, setOrderedQuestions] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'admin-questions',
      selectedTopicId || null,
      timeRange,
      activeFilter,
      debouncedSearch,
      offset,
    ],
    queryFn: () =>
      fetchQuestions({
        topicId: selectedTopicId || null,
        offset,
        timeRange,
        activeFilter,
        search: debouncedSearch,
      }),
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
    if (data?.questions) {
      setOrderedQuestions(data.questions);
    }
  }, [data?.questions]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [offset, selectedTopicId, timeRange, activeFilter, debouncedSearch]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch]);

  const questions = data?.questions || [];
  const total = data?.total || 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = orderedQuestions.length ? orderedQuestions : questions || [];
    const oldIndex = current.findIndex((q: any) => q.id === active.id);
    const newIndex = current.findIndex((q: any) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(current, oldIndex, newIndex);
    setOrderedQuestions(next);
    orderMutation.mutate(next.map((q: any) => q.id));
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Filter by Topic
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => {
                setSelectedTopicId(e.target.value);
                setOffset(0);
              }}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="">All Topics</option>
              {topics?.map((topic: any) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value as TimeRange);
                setOffset(0);
              }}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="this_week">This week</option>
              <option value="last_2_weeks">Last 2 weeks</option>
              <option value="current_month">Current month</option>
              <option value="last_month">Last month</option>
              <option value="last_3_months">Last 3 months</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Status
            </label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as ActiveFilter);
                setOffset(0);
              }}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Search Question Title
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Fuzzy search by question title..."
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            />
          </div>
        </div>
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
      ) : questions.length > 0 ? (
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-x-auto">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={(orderedQuestions.length ? orderedQuestions : questions).map((q: any) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <table className="w-full min-w-[1500px] table-fixed">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-16" />
                  <col className="w-[45%]" />
                  <col className="w-[20%]" />
                  <col className="w-32" />
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-32" />
                </colgroup>
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap w-16">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Question</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Featured</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Latest Verdict</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Stances</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Verdicts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">BAR Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {(orderedQuestions.length ? orderedQuestions : questions).map((question: any) => {
                const barScore = getBarScore(question.validationResults);
                return (
                  <SortableRow key={question.id} id={question.id}>
                    {({ attributes, listeners, isDragging }) => (
                      <>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(question.id)}
                        onChange={(e) => handleSelect(question.id, e.target.checked)}
                        className="rounded border-border-light"
                      />
                    </td>
                    <td className="px-3 py-4 w-16">
                      <span
                        className={`cursor-grab text-text-muted hover:text-primary-blue ${isDragging ? 'cursor-grabbing' : ''}`}
                        aria-hidden="true"
                      >
                        <GripVertical className="size-5" />
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/questions/${question.id}/edit`} className="font-medium text-text-main hover:text-primary-blue">
                        {question.questionText}
                      </Link>
                    </td>
                    <td className="px-6 py-4 break-words">
                      <Link href={`/admin/topics/${question.topicId}`} className="text-text-muted hover:text-primary-blue">
                        {question.topic.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!question.isFeatured}
                        onClick={() =>
                          featuredMutation.mutate({
                            id: question.id,
                            isFeatured: !question.isFeatured,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          question.isFeatured ? 'bg-primary-blue' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            question.isFeatured ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
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
                    <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                      {formatVerdictLabel(question.verdicts?.[0]?.verdictLabel)}
                    </td>
                    <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                      {new Date(question.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-text-muted whitespace-nowrap">{question._count.articleStances}</td>
                    <td className="px-6 py-4 text-text-muted whitespace-nowrap">{question._count.verdicts}</td>
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
                      </>
                    )}
                  </SortableRow>
                );
              })}
            </tbody>
              </table>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="text-text-muted">No questions found</div>
      )}

      {questions.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-text-muted">
            Showing {pageStart}-{pageEnd} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-4 py-2 border border-border-light rounded-lg hover:bg-background-lighter disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-4 py-2 border border-border-light rounded-lg hover:bg-background-lighter disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Convergence Modal */}
      {isConvergenceModalOpen && (
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
