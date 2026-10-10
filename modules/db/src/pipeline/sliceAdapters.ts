import type { Prisma } from '@prisma/client';
import { PIPELINE_STAGES, TAVILY_STAGES, type PipelineStageName } from './sliceStages';

export type StageOutcome = {
  kind:
    | 'completed'
    | 'paused_deadline'
    | 'paused_budget'
    | 'blocked_moderation'
    | 'failed_recoverable'
    | 'failed_terminal';
  cursor?: Prisma.InputJsonValue | null;
  metrics?: Prisma.InputJsonValue;
  backlogRemaining?: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export interface StageAdapterContext {
  runId: string;
  stage: PipelineStageName;
  cursor: unknown;
  deadlineAt: Date;
  limits: { maxNewArticles: number; maxAnalysisArticles: number };
  heartbeat: () => Promise<void>;
  checkpoint: (cursor: unknown, metrics?: Prisma.InputJsonValue) => Promise<void>;
}

export interface StageAdapter {
  stage: PipelineStageName;
  run: (context: StageAdapterContext) => Promise<StageOutcome>;
}

export type StageAdapterMap = Record<PipelineStageName, StageAdapter>;

function skippedTavily(): StageOutcome {
  return {
    kind: 'completed',
    metrics: { skipped: true, reason: 'tavily_out_of_scope' },
  };
}

export function createDefaultStageAdapters(): StageAdapterMap {
  const adapters = {} as StageAdapterMap;
  for (const stage of PIPELINE_STAGES) {
    adapters[stage] = {
      stage,
      async run() {
        if (stage === 'preflight') {
          return { kind: 'completed', metrics: { validated: true } };
        }
        if ((TAVILY_STAGES as readonly string[]).includes(stage)) {
          return skippedTavily();
        }
        if (stage === 'finalize') {
          return {
            kind: 'completed',
            metrics: { receipt: { sent: false, reason: 'email_out_of_scope' } },
          };
        }
        return { kind: 'completed', metrics: { processed: 0, eligible: false } };
      },
    };
  }
  return adapters;
}

export function createFixtureStageAdapters(options: {
  unitsByStage?: Partial<Record<PipelineStageName, string[]>>;
  failStage?: {
    stage: PipelineStageName;
    kind: 'failed_recoverable' | 'failed_terminal' | 'blocked_moderation';
    afterCommitted?: number;
  };
  interruptAfterStage?: PipelineStageName;
  unitCap?: number;
} = {}): StageAdapterMap {
  const adapters = createDefaultStageAdapters();
  const unitCap = options.unitCap ?? 1;

  for (const [stageName, units] of Object.entries(options.unitsByStage ?? {})) {
    const stage = stageName as PipelineStageName;
    adapters[stage] = {
      stage,
      async run(context) {
        const remaining = units.filter((id) => {
          const cursor = context.cursor as { id?: string } | null;
          return !cursor?.id || id > cursor.id;
        });
        const claimed = remaining.slice(0, unitCap);
        let lastId: string | undefined;
        for (const [index, id] of claimed.entries()) {
          lastId = id;
          await context.checkpoint({ createdAt: '2026-10-10T12:00:00.000Z', id }, {
            processed: index + 1,
          });
          await context.heartbeat();
          if (
            options.failStage?.stage === stage
            && (options.failStage.afterCommitted ?? 0) === index + 1
          ) {
            return {
              kind: options.failStage.kind,
              cursor: { createdAt: '2026-10-10T12:00:00.000Z', id },
              errorCode: options.failStage.kind.toUpperCase(),
              errorMessage: `fixture ${options.failStage.kind} after ${id}`,
            };
          }
        }

        if (options.interruptAfterStage === stage && claimed.length > 0) {
          const error = new Error('SLICE_INTERRUPTED');
          error.name = 'SliceInterruptedError';
          throw error;
        }

        return {
          kind: 'completed',
          cursor: lastId
            ? { createdAt: '2026-10-10T12:00:00.000Z', id: lastId }
            : (context.cursor as Prisma.InputJsonValue | null),
          metrics: { processed: claimed.length },
          backlogRemaining: remaining.length > claimed.length,
        };
      },
    };
  }

  return adapters;
}
