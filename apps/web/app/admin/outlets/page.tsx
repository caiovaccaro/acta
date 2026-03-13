'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

async function fetchOutlets() {
  const res = await fetch('/admin/api/outlets');
  if (!res.ok) throw new Error('Failed to fetch outlets');
  return res.json();
}

export default function AdminOutlets() {
  const { data: outlets, isLoading } = useQuery({
    queryKey: ['admin-outlets'],
    queryFn: fetchOutlets,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-text-main mb-2">Outlets Management</h1>
          <p className="text-text-muted">View and manage news outlets</p>
        </div>
        <Link
          href="/admin/outlets/new"
          className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 transition-colors"
        >
          + New Outlet
        </Link>
      </div>

      {isLoading ? (
        <div className="text-text-muted">Loading outlets...</div>
      ) : outlets && outlets.length > 0 ? (
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-background-lighter">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Ideology</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Credibility</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Articles</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Crawl Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {outlets.map((outlet: any) => (
                <tr key={outlet.id} className="hover:bg-background-lighter/50">
                  <td className="px-6 py-4">
                    <Link href={`/admin/outlets/${outlet.id}/edit`} className="font-medium text-text-main hover:text-primary-blue">
                      {outlet.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      outlet.ideology === 'Left' 
                        ? 'bg-blue-100 text-blue-800'
                        : outlet.ideology === 'Right'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {outlet.ideology}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {(outlet.credibilityScore * 100).toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {outlet.countryCode || '—'}
                  </td>
                  <td className="px-6 py-4 text-text-muted">{outlet._count.articles}</td>
                  <td className="px-6 py-4 text-text-muted">{outlet._count.crawlRequests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-text-muted">No outlets found</div>
      )}
    </div>
  );
}
