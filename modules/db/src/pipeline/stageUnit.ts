import {
  decodeStageCursor,
  encodeStageCursor,
  selectStageWindow,
  type StageCursor,
} from './cursor';
import { shouldStopClaiming } from './deadline';
import { resolveStageUnitLimit } from './limits';

export interface StageRecord {
  createdAt: Date | string;
  id: string;
}

export interface StageUnitResult {
  cursor: StageCursor | null;
  processedIds: string[];
  failedId: string | null;
  exhausted: boolean;
  stoppedForDeadline: boolean;
}

export async function runBoundedStageUnits<T extends StageRecord>(input: {
  records: readonly T[];
  cursor?: unknown;
  unitLimit: number;
  deadlineAt?: Date;
  now?: Date;
  reserveMs?: number;
  processUnit: (record: T) => Promise<void> | void;
}): Promise<StageUnitResult> {
  const limit = resolveStageUnitLimit(input.unitLimit);
  const cursor = decodeStageCursor(input.cursor ?? null);
  if (input.deadlineAt && shouldStopClaiming(input.deadlineAt, input.now, input.reserveMs)) {
    return {
      cursor,
      processedIds: [],
      failedId: null,
      exhausted: false,
      stoppedForDeadline: true,
    };
  }

  const window = selectStageWindow(input.records, cursor, limit);
  const processedIds: string[] = [];
  let current = cursor;

  for (const record of window) {
    if (input.deadlineAt && shouldStopClaiming(input.deadlineAt, input.now, input.reserveMs)) {
      return {
        cursor: current,
        processedIds,
        failedId: null,
        exhausted: false,
        stoppedForDeadline: true,
      };
    }
    try {
      await input.processUnit(record);
    } catch {
      return {
        cursor: current,
        processedIds,
        failedId: record.id,
        exhausted: false,
        stoppedForDeadline: false,
      };
    }
    current = encodeStageCursor(record.createdAt, record.id);
    processedIds.push(record.id);
  }

  return {
    cursor: current,
    processedIds,
    failedId: null,
    exhausted: window.length < limit,
    stoppedForDeadline: false,
  };
}
