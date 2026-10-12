'use client';

import { useQuery } from '@tanstack/react-query';

interface OperationalHealth {
  authorized: boolean;
  overall: string;
  run: { status: string; lastStatus?: string };
  freshness: { status: string; lastFinishedAt?: string };
  queues: { status: string; pending?: number; inProgress?: number; failed?: number };
  moderation: { status: string; topicsPending?: number; questionsPending?: number };
  budget: { status: string; remainingUsd?: string; ceilingUsd?: string };
}

async function fetchOperationalHealth(): Promise<OperationalHealth> {
  const res = await fetch('/admin/api/health');
  if (res.status === 401) {
    return {
      authorized: false,
      overall: 'unauthorized',
      run: { status: 'unknown' },
      freshness: { status: 'unknown' },
      queues: { status: 'unknown' },
      moderation: { status: 'unknown' },
      budget: { status: 'unknown' },
    };
  }
  if (!res.ok) {
    throw new Error('Failed to fetch operational health');
  }
  return res.json();
}

function statusClass(status: string): string {
  if (status === 'ok') {
    return 'bg-green-100 text-green-800';
  }
  if (status === 'paused') {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (status === 'stale' || status === 'failed') {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
}

export default function OperationalHealthPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-operational-health'],
    queryFn: fetchOperationalHealth,
  });

  if (isLoading) {
    return <div className="text-text-muted">Loading operational health...</div>;
  }

  if (!data || !data.authorized) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-border-light p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-main">Operational health</h2>
        <span
          data-testid="operational-overall"
          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusClass(data.overall)}`}
        >
          {data.overall}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthRow
          label="Pipeline run"
          status={data.run.status}
          detail={data.run.lastStatus ?? 'no run'}
        />
        <HealthRow
          label="Freshness"
          status={data.freshness.status}
          detail={data.freshness.lastFinishedAt ?? 'unknown'}
        />
        <HealthRow
          label="Queues"
          status={data.queues.status}
          detail={`pending ${data.queues.pending ?? '—'} · in progress ${data.queues.inProgress ?? '—'} · failed ${data.queues.failed ?? '—'}`}
        />
        <HealthRow
          label="Moderation"
          status={data.moderation.status}
          detail={`topics ${data.moderation.topicsPending ?? '—'} · questions ${data.moderation.questionsPending ?? '—'}`}
        />
        <HealthRow
          label="Budget"
          status={data.budget.status}
          detail={`${data.budget.remainingUsd ?? 'unknown'} of ${data.budget.ceilingUsd ?? 'unknown'} USD remaining`}
        />
      </div>
    </div>
  );
}

function HealthRow(props: { label: string; status: string; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-text-muted">{props.label}</p>
        <p className="text-sm text-text-main mt-1">{props.detail}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusClass(props.status)}`}>
        {props.status}
      </span>
    </div>
  );
}
