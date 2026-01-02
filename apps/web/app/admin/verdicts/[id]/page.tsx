'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';

async function fetchVerdict(id: string) {
  const res = await fetch(`/admin/api/verdicts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch verdict');
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

export default function VerdictDetail() {
  const params = useParams();
  const id = params?.id as string;

  const { data: verdict, isLoading } = useQuery({
    queryKey: ['verdict', id],
    queryFn: () => fetchVerdict(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-text-muted">Loading verdict...</div>;
  }

  if (!verdict) {
    return <div className="text-text-muted">Verdict not found</div>;
  }


  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/verdicts" className="text-primary-blue hover:underline mb-4 inline-block">
          ← Back to Verdicts
        </Link>
        <h1 className="text-3xl font-black text-text-main mb-2">Verdict Details</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text-main mb-4">Question</h2>
          <p className="text-text-muted mb-2">
            <Link href={`/questions/${verdict.questionId}`} className="text-primary-blue hover:underline">
              {verdict.question.questionText}
            </Link>
          </p>
          <p className="text-sm text-text-muted">
            Topic: <Link href={`/admin/topics/${verdict.question.topicId}/edit`} className="text-primary-blue hover:underline">
              {verdict.question.topic.name}
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text-main mb-4">Verdict</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-text-muted">Label:</span>
              <span className="ml-2 text-lg font-bold text-text-main">
                {getVerdictLabel(verdict.verdictLabel)}
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold text-text-muted">Confidence:</span>
              <span className="ml-2 text-text-main">
                {(verdict.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold text-text-muted">Month:</span>
              <span className="ml-2 text-text-main">
                {new Date(verdict.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>
        </div>

        {verdict.reasoning && (
          <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4">Reasoning</h2>
            <p className="text-text-muted whitespace-pre-wrap">{verdict.reasoning}</p>
          </div>
        )}

        {verdict.evidenceBullets && verdict.evidenceBullets.length > 0 && (
          <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4">Evidence Bullets</h2>
            <ul className="space-y-3">
              {verdict.evidenceBullets.map((bullet: any) => (
                <li key={bullet.id} className="flex items-start gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    bullet.type === 'Why' 
                      ? 'bg-green-100 text-green-800'
                      : bullet.type === 'Dissent'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {bullet.type}
                  </span>
                  <span className="text-text-muted flex-1">{bullet.text}</span>
                  {bullet.article && (
                    <a 
                      href={bullet.article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-blue hover:underline text-sm"
                    >
                      Source
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {verdict.supportShare !== undefined && (
          <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4">Verdict Metrics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-semibold text-text-muted mb-1">Support Share</div>
                <div className="text-lg font-bold text-text-main">
                  {(verdict.supportShare * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-muted mb-1">Variance</div>
                <div className="text-lg font-bold text-text-main">
                  {(verdict.variance * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-muted mb-1">Calculated At</div>
                <div className="text-sm text-text-muted">
                  {new Date(verdict.calculatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {verdict.overviewBullets && (
          <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4">Overview</h2>
            <div className="prose max-w-none">
              {Array.isArray(verdict.overviewBullets) ? (
                <ul className="list-disc list-inside space-y-2 text-text-muted">
                  {verdict.overviewBullets.map((bullet: string, i: number) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              ) : (
                <pre className="text-text-muted text-sm overflow-auto">
                  {JSON.stringify(verdict.overviewBullets, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

