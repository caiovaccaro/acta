'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
import TopicConvergenceModal from './components/TopicConvergenceModal';

async function fetchTopics() {
  const res = await fetch('/admin/api/topics');
  if (!res.ok) throw new Error('Failed to fetch topics');
  return res.json();
}

async function batchUpdateTopics(ids: string[], action: 'approve' | 'reject') {
  const res = await fetch('/admin/api/topics/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  });
  if (!res.ok) throw new Error('Failed to batch update topics');
  return res.json();
}

async function updateFeaturedTopic(id: string, isFeatured: boolean) {
  const res = await fetch('/admin/api/topics/featured', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, isFeatured }),
  });
  if (!res.ok) throw new Error('Failed to update featured topic');
  return res.json();
}

async function updateTopicOrder(ids: string[]) {
  const res = await fetch('/admin/api/topics/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to update topic order');
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
    >
      {children({ attributes, listeners, isDragging, setNodeRef, style })}
    </tr>
  );
}

export default function AdminTopics() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConvergenceModalOpen, setIsConvergenceModalOpen] = useState(false);
  const [orderedTopics, setOrderedTopics] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const { data: topics, isLoading } = useQuery({
    queryKey: ['admin-topics'],
    queryFn: fetchTopics,
  });

  const batchMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' }) =>
      batchUpdateTopics(ids, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
      setSelectedIds(new Set());
    },
  });

  const featuredMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      updateFeaturedTopic(id, isFeatured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
    },
  });

  const orderMutation = useMutation({
    mutationFn: (ids: string[]) => updateTopicOrder(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
    },
  });

  useEffect(() => {
    if (topics) {
      setOrderedTopics(topics);
    }
  }, [topics]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(topics?.map((t: any) => t.id) || []));
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

    const current = orderedTopics.length ? orderedTopics : topics || [];
    const oldIndex = current.findIndex((t: any) => t.id === active.id);
    const newIndex = current.findIndex((t: any) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(current, oldIndex, newIndex);
    setOrderedTopics(next);

    const featuredIds = next.filter((t: any) => t.isFeatured).map((t: any) => t.id);
    if (featuredIds.length > 0) {
      orderMutation.mutate(featuredIds);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-text-main mb-2">Topics Management</h1>
          <p className="text-text-muted">Manage topics and their questions</p>
        </div>
        <Link
          href="/admin/topics/new"
          className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 transition-colors"
        >
          + New Topic
        </Link>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-blue-800 font-semibold">
            {selectedIds.size} topic(s) selected
          </span>
          <div className="flex gap-2">
            {selectedIds.size >= 2 && (
              <button
                onClick={() => setIsConvergenceModalOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Converge {selectedIds.size} Topics
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
        <div className="text-text-muted">Loading topics...</div>
      ) : topics && topics.length > 0 ? (
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={(orderedTopics.length ? orderedTopics : topics).map((t: any) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <table className="w-full">
                <thead className="bg-background-lighter">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === topics.length && topics.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-border-light"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-16">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Featured</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Questions</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Articles</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {(orderedTopics.length ? orderedTopics : topics).map((topic: any) => (
                    <SortableRow key={topic.id} id={topic.id}>
                      {({ attributes, listeners, isDragging }) => (
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(topic.id)}
                              onChange={(e) => handleSelect(topic.id, e.target.checked)}
                              className="rounded border-border-light"
                            />
                          </td>
                          <td className="px-3 py-4 w-16">
                            {topic.isFeatured ? (
                              <button
                                type="button"
                                className={`cursor-grab text-text-muted hover:text-primary-blue ${isDragging ? 'cursor-grabbing' : ''}`}
                                aria-label={`Reorder ${topic.name}`}
                                {...attributes}
                                {...listeners}
                              >
                                <GripVertical className="size-5" />
                              </button>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/admin/topics/${topic.id}/edit`} className="font-medium text-text-main hover:text-primary-blue">
                              {topic.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={!!topic.isFeatured}
                              onClick={() =>
                                featuredMutation.mutate({
                                  id: topic.id,
                                  isFeatured: !topic.isFeatured,
                                })
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                topic.isFeatured ? 'bg-primary-blue' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                  topic.isFeatured ? 'translate-x-5' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              topic.moderationStatus === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : topic.moderationStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {topic.moderationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/admin/questions?topicId=${topic.id}`}
                              className="text-primary-blue hover:underline"
                            >
                              {topic._count.questions}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/admin/articles?topicId=${topic.id}`}
                              className="text-primary-blue hover:underline"
                            >
                              {topic._count.topicArticles}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-text-muted">
                            {new Date(topic.createdAt).toLocaleDateString()}
                          </td>
                        </>
                      )}
                    </SortableRow>
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="text-text-muted">No topics found</div>
      )}

      {/* Convergence Modal */}
      {isConvergenceModalOpen && topics && (
        <TopicConvergenceModal
          topics={topics.filter((t: any) => selectedIds.has(t.id))}
          isOpen={isConvergenceModalOpen}
          onClose={() => {
            setIsConvergenceModalOpen(false);
            setSelectedIds(new Set());
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
          }}
        />
      )}
    </div>
  );
}
