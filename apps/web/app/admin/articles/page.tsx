'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

async function fetchArticles(offset: number, outletId?: string | null, topicId?: string | null) {
  const params = new URLSearchParams({ limit: '50', offset: offset.toString() });
  if (outletId) params.append('outletId', outletId);
  if (topicId) params.append('topicId', topicId);
  const res = await fetch(`/admin/api/articles?${params}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

async function fetchOutlets() {
  const res = await fetch('/admin/api/outlets');
  if (!res.ok) throw new Error('Failed to fetch outlets');
  return res.json();
}

async function fetchTopics() {
  const res = await fetch('/admin/api/topics');
  if (!res.ok) throw new Error('Failed to fetch topics');
  return res.json();
}

export default function AdminArticles() {
  const [offset, setOffset] = useState(0);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-articles', offset, selectedOutletId || null, selectedTopicId || null],
    queryFn: () => fetchArticles(offset, selectedOutletId || null, selectedTopicId || null),
  });

  const { data: outlets } = useQuery({
    queryKey: ['admin-outlets'],
    queryFn: fetchOutlets,
  });

  const { data: topics } = useQuery({
    queryKey: ['admin-topics'],
    queryFn: fetchTopics,
  });

  return (
    <div>
      <h1 className="text-3xl font-black text-text-main mb-2">Articles Management</h1>
      <p className="text-text-muted mb-6">View and manage articles in the database</p>

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-text-main mb-2">
            Filter by Outlet
          </label>
          <select
            value={selectedOutletId}
            onChange={(e) => { setSelectedOutletId(e.target.value); setOffset(0); }}
            className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
          >
            <option value="">All Outlets</option>
            {outlets?.map((outlet: any) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold text-text-main mb-2">
            Filter by Topic
          </label>
          <select
            value={selectedTopicId}
            onChange={(e) => { setSelectedTopicId(e.target.value); setOffset(0); }}
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
      </div>

      {isLoading ? (
        <div className="text-text-muted">Loading articles...</div>
      ) : data && data.articles && data.articles.length > 0 ? (
        <>
          <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden mb-4">
            <table className="w-full">
              <thead className="bg-background-lighter">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Outlet</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Topics</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Extracted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {data.articles.map((article: any) => (
                  <tr key={article.id} className="hover:bg-background-lighter/50">
                    <td className="px-6 py-4">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-text-main hover:text-primary-blue line-clamp-2"
                      >
                        {article.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{article.outlet.name}</td>
                    <td className="px-6 py-4 text-text-muted">
                      {article.topicArticles.length > 0 
                        ? article.topicArticles.map((ta: any) => ta.topic.name).join(', ')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {new Date(article.extractedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-text-muted">
              Showing {offset + 1}-{Math.min(offset + 50, data.total)} of {data.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - 50))}
                disabled={offset === 0}
                className="px-4 py-2 border border-border-light rounded-lg hover:bg-background-lighter disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + 50)}
                disabled={offset + 50 >= data.total}
                className="px-4 py-2 border border-border-light rounded-lg hover:bg-background-lighter disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-text-muted">No articles found</div>
      )}
    </div>
  );
}
