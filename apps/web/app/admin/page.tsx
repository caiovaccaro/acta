'use client';


import Link from 'next/link';
import { Database, FileText, TrendingUp, Activity, Newspaper, Globe, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

async function fetchStats() {
  const res = await fetch('/admin/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
  });

  const statCards = [
    { label: 'Total Topics', value: stats?.topics ?? 0, icon: Database, href: '/admin/topics' },
    { label: 'Total Questions', value: stats?.questions ?? 0, icon: FileText, href: '/admin/questions' },
    { label: 'Active Verdicts', value: stats?.verdicts ?? 0, icon: TrendingUp, href: '/admin/verdicts' },
    { label: 'Articles', value: stats?.articles ?? 0, icon: Newspaper, href: '/admin/articles' },
    { label: 'Outlets', value: stats?.outlets ?? 0, icon: Globe, href: '/admin/outlets' },
    { label: 'Crawl Requests', value: stats?.crawlRequests ?? 0, icon: Download, href: '/admin/crawl-requests' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-text-main">Admin Dashboard</h1>
        <p className="text-text-muted mt-2">Manage topics, questions, and system settings</p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="text-text-muted">Loading stats...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-xl border border-border-light p-6 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-muted mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-text-main group-hover:text-primary-blue transition-colors">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary-blue/10 text-primary-blue">
                    <Icon className="size-6" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
        <h2 className="text-xl font-bold text-text-main mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/topics/new"
            className="flex items-center justify-between p-4 border border-border-light rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-colors"
          >
            <span className="font-medium text-text-main">Create New Topic</span>
            <span className="text-primary-blue">→</span>
          </Link>
          <Link
            href="/admin/questions/new"
            className="flex items-center justify-between p-4 border border-border-light rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-colors"
          >
            <span className="font-medium text-text-main">Create New Question</span>
            <span className="text-primary-blue">→</span>
          </Link>
          <Link
            href="/admin/articles"
            className="flex items-center justify-between p-4 border border-border-light rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-colors"
          >
            <span className="font-medium text-text-main">View All Articles</span>
            <span className="text-primary-blue">→</span>
          </Link>
          <Link
            href="/admin/crawl-requests"
            className="flex items-center justify-between p-4 border border-border-light rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-colors"
          >
            <span className="font-medium text-text-main">Manage Crawl Requests</span>
            <span className="text-primary-blue">→</span>
          </Link>
          <Link
            href="/admin/topics"
            className="flex items-center justify-between p-4 border border-border-light rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-colors"
          >
            <span className="font-medium text-text-main">Manage Topics</span>
            <span className="text-primary-blue">→</span>
          </Link>
          <Link
            href="/admin/questions"
            className="flex items-center justify-between p-4 border border-border-light rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-colors"
          >
            <span className="font-medium text-text-main">Manage Questions</span>
            <span className="text-primary-blue">→</span>
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
        <h2 className="text-xl font-bold text-text-main mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Database</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">API</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              Running
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Crawler</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
              Idle
            </span>
          </div>
        </div>
      </div>

      {/* Crawl Requests Status */}
      {stats?.crawlRequestsByStatus && (
        <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text-main mb-4">Crawl Requests Status</h2>
          <div className="space-y-3">
            {Object.entries(stats.crawlRequestsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-text-muted capitalize">{status.replace('_', ' ')}</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  {count as number}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

