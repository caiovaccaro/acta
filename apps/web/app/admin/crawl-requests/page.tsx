'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

async function fetchCrawlRequests(status: string | null, offset: number) {
  const params = new URLSearchParams({ limit: '50', offset: offset.toString() });
  if (status) params.append('status', status);
  const res = await fetch(`/admin/api/crawl-requests?${params}`);
  if (!res.ok) throw new Error('Failed to fetch crawl requests');
  return res.json();
}

export default function AdminCrawlRequests() {
  const [status, setStatus] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-crawl-requests', status, offset],
    queryFn: () => fetchCrawlRequests(status, offset),
  });

  return (
    <div>
      <h1 className="text-3xl font-black text-text-main mb-2">Crawl Requests Management</h1>
      <p className="text-text-muted mb-6">View and manage crawl requests</p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => { setStatus(null); setOffset(0); }}
          className={`px-4 py-2 rounded-lg ${!status ? 'bg-primary-blue text-white' : 'bg-white border border-border-light'}`}
        >
          All
        </button>
        <button
          onClick={() => { setStatus('pending'); setOffset(0); }}
          className={`px-4 py-2 rounded-lg ${status === 'pending' ? 'bg-primary-blue text-white' : 'bg-white border border-border-light'}`}
        >
          Pending
        </button>
        <button
          onClick={() => { setStatus('in_progress'); setOffset(0); }}
          className={`px-4 py-2 rounded-lg ${status === 'in_progress' ? 'bg-primary-blue text-white' : 'bg-white border border-border-light'}`}
        >
          In Progress
        </button>
        <button
          onClick={() => { setStatus('done'); setOffset(0); }}
          className={`px-4 py-2 rounded-lg ${status === 'done' ? 'bg-primary-blue text-white' : 'bg-white border border-border-light'}`}
        >
          Done
        </button>
        <button
          onClick={() => { setStatus('failed'); setOffset(0); }}
          className={`px-4 py-2 rounded-lg ${status === 'failed' ? 'bg-primary-blue text-white' : 'bg-white border border-border-light'}`}
        >
          Failed
        </button>
      </div>

      {isLoading ? (
        <div className="text-text-muted">Loading crawl requests...</div>
      ) : data && data.crawlRequests && data.crawlRequests.length > 0 ? (
        <>
          <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden mb-4">
            <table className="w-full">
              <thead className="bg-background-lighter">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Outlet</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {data.crawlRequests.map((request: any) => (
                  <tr key={request.id} className="hover:bg-background-lighter/50">
                    <td className="px-6 py-4">
                      <a 
                        href={request.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-text-main hover:text-primary-blue line-clamp-1"
                      >
                        {request.url}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{request.outlet.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        request.status === 'done' 
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : request.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{request.attempts}</td>
                    <td className="px-6 py-4 text-text-muted">
                      {new Date(request.createdAt).toLocaleDateString()}
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
        <div className="text-text-muted">No crawl requests found</div>
      )}
    </div>
  );
}
