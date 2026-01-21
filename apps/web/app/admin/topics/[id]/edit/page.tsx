'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

async function fetchTopic(id: string) {
  const res = await fetch(`/admin/api/topics/${id}`);
  if (!res.ok) throw new Error('Failed to fetch topic');
  return res.json();
}

async function updateTopic(id: string, data: any) {
  const res = await fetch(`/admin/api/topics/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update topic');
  return res.json();
}

export default function EditTopic() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data: topic, isLoading } = useQuery({
    queryKey: ['topic', id],
    queryFn: () => fetchTopic(id),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [safetyNoteRequired, setSafetyNoteRequired] = useState(false);
  const [moderationStatus, setModerationStatus] = useState('approved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (topic) {
      setName(topic.name || '');
      setDescription(topic.description || '');
      setSafetyNoteRequired(topic.safetyNoteRequired || false);
      setModerationStatus(topic.moderationStatus || 'approved');
    }
  }, [topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await updateTopic(id, {
        name,
        description,
        safetyNoteRequired,
        moderationStatus,
      });
      router.push('/admin/topics');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-text-muted">Loading topic...</div>;
  }

  if (!topic) {
    return <div className="text-text-muted">Topic not found</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-black text-text-main mb-2">Edit Topic</h1>
      <p className="text-text-muted mb-6">Update topic information</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border-light p-6 shadow-sm max-w-2xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={safetyNoteRequired}
                onChange={(e) => setSafetyNoteRequired(e.target.checked)}
                className="rounded border-border-light"
              />
              <span className="text-sm font-semibold text-text-main">Safety Note Required</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Moderation Status
            </label>
            <select
              value={moderationStatus}
              onChange={(e) => setModerationStatus(e.target.value)}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Topic'}
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



