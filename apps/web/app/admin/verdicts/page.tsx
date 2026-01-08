'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

async function fetchVerdicts() {
  const res = await fetch('/admin/api/verdicts');
  if (!res.ok) throw new Error('Failed to fetch verdicts');
  return res.json();
}

function getVerdictLabel(verdict: string) {
  const labels: Record<string, string> = {
    'YesItSeemsSo': 'Yes, it seems so',
    'ProbablyYes': 'Probably yes',
    'NoItDoesntSeemSo': "No, it doesn't seem so",
    'ProbablyNot': 'Probably not',
    'Unclear': 'Unclear',
  };
  return labels[verdict] || verdict;
}

export default function AdminVerdicts() {
  const { data: verdicts, isLoading } = useQuery({
    queryKey: ['admin-verdicts'],
    queryFn: fetchVerdicts,
  });

  return (
    <div>
      <h1 className="text-3xl font-black text-text-main mb-2">Verdicts Management</h1>
      <p className="text-text-muted mb-6">View and manage verdicts for all questions</p>

      {isLoading ? (
        <div className="text-text-muted">Loading verdicts...</div>
      ) : verdicts && verdicts.length > 0 ? (
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-background-lighter">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Verdict</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Articles</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Outlets</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {verdicts.map((verdict: any) => (
                <tr key={verdict.id} className="hover:bg-background-lighter/50">
                  <td className="px-6 py-4">
                    <Link href={`/admin/verdicts/${verdict.id}`} className="font-medium text-text-main hover:text-primary-blue line-clamp-2">
                      {verdict.question.questionText}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/topics/${verdict.question.topicId}`} className="text-text-muted hover:text-primary-blue">
                      {verdict.question.topic.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-text-main">
                      {getVerdictLabel(verdict.verdictLabel)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {Math.min(100, Math.max(0, verdict.confidence || 0)).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {verdict._count?.articles || 0}
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {verdict._count?.outlets || 0}
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {new Date(verdict.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-text-muted">No verdicts found</div>
      )}
    </div>
  );
}
