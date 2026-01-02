'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

async function fetchOutlet(id: string) {
  const res = await fetch(`/admin/api/outlets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch outlet');
  return res.json();
}

async function updateOutlet(id: string, data: any) {
  const res = await fetch(`/admin/api/outlets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update outlet');
  return res.json();
}

export default function EditOutlet() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data: outlet, isLoading } = useQuery({
    queryKey: ['outlet', id],
    queryFn: () => fetchOutlet(id),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [ideology, setIdeology] = useState('Center');
  const [credibilityScore, setCredibilityScore] = useState(0.5);
  const [rssFeeds, setRssFeeds] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (outlet) {
      setName(outlet.name || '');
      setIdeology(outlet.ideology || 'Center');
      setCredibilityScore(outlet.credibilityScore || 0.5);
      setRssFeeds(Array.isArray(outlet.rssFeeds) ? outlet.rssFeeds.join('\n') : '');
    }
  }, [outlet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const feedsArray = rssFeeds.split('\n').filter(feed => feed.trim());
      await updateOutlet(id, {
        name,
        ideology,
        credibilityScore,
        rssFeeds: feedsArray,
      });
      router.push('/admin/outlets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update outlet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-text-muted">Loading outlet...</div>;
  }

  if (!outlet) {
    return <div className="text-text-muted">Outlet not found</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-black text-text-main mb-2">Edit Outlet</h1>
      <p className="text-text-muted mb-6">Update outlet information</p>

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
              Ideology
            </label>
            <select
              value={ideology}
              onChange={(e) => setIdeology(e.target.value)}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="Left">Left</option>
              <option value="Center">Center</option>
              <option value="Right">Right</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Credibility Score (0-1)
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={credibilityScore}
              onChange={(e) => setCredibilityScore(parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              RSS Feeds (one per line)
            </label>
            <textarea
              value={rssFeeds}
              onChange={(e) => setRssFeeds(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Outlet'}
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

