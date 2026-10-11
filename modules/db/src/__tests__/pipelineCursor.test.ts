import { describe, expect, it } from '@jest/globals';
import {
  decodeStageCursor,
  encodeStageCursor,
  selectStageWindow,
  StageCursorError,
} from '../pipeline/cursor';
import { shouldStopClaiming } from '../pipeline/deadline';
import { resolveStageUnitLimit, StageUnitLimitError } from '../pipeline/limits';
import { runBoundedStageUnits } from '../pipeline/stageUnit';

const sameTime = '2026-10-10T12:00:00.000Z';

const records = [
  { id: 'a', createdAt: sameTime },
  { id: 'c', createdAt: sameTime },
  { id: 'b', createdAt: sameTime },
  { id: 'd', createdAt: '2026-10-10T12:00:01.000Z' },
];

describe('stage cursor codec and windows', () => {
  it('keeps equal timestamps stable by id and does not skip later rows after a delete', () => {
    const first = selectStageWindow(records, null, 2);
    expect(first.map((row) => row.id)).toEqual(['a', 'b']);

    const afterDelete = selectStageWindow(
      records.filter((row) => row.id !== 'a'),
      encodeStageCursor(sameTime, 'a'),
      2,
    );
    expect(afterDelete.map((row) => row.id)).toEqual(['b', 'c']);
  });

  it('returns an empty window at the end and rejects invalid cursors', () => {
    expect(selectStageWindow(records, encodeStageCursor(records[3].createdAt, 'd'), 2)).toEqual([]);
    expect(() => decodeStageCursor({ createdAt: 'nope', id: 'x' })).toThrow(StageCursorError);
  });
});

describe('bounded stage units', () => {
  it('does not advance the cursor when a unit fails', async () => {
    const processed: string[] = [];
    const result = await runBoundedStageUnits({
      records,
      unitLimit: 3,
      processUnit: (record) => {
        if (record.id === 'b') throw new Error('unit failed');
        processed.push(record.id);
      },
    });

    expect(processed).toEqual(['a']);
    expect(result.cursor).toEqual(encodeStageCursor(sameTime, 'a'));
    expect(result.failedId).toBe('b');
  });

  it('stops claiming at the deadline without skipping uncommitted items', async () => {
    const result = await runBoundedStageUnits({
      records,
      unitLimit: 10,
      deadlineAt: new Date('2026-10-10T12:00:00.000Z'),
      now: new Date('2026-10-10T11:20:00.000Z'),
      reserveMs: 45 * 60 * 1000,
      processUnit: async () => undefined,
    });

    expect(result.stoppedForDeadline).toBe(true);
    expect(result.processedIds).toEqual([]);
    expect(result.cursor).toBeNull();
    expect(shouldStopClaiming(
      new Date('2026-10-10T12:00:00.000Z'),
      new Date('2026-10-10T11:14:00.000Z'),
    )).toBe(false);
  });

  it('requires an explicit unit cap', () => {
    expect(() => resolveStageUnitLimit(undefined, { NODE_ENV: 'production' }))
      .toThrow(StageUnitLimitError);
    expect(() => resolveStageUnitLimit(0, { NODE_ENV: 'test' }))
      .toThrow(StageUnitLimitError);
    expect(resolveStageUnitLimit(5)).toBe(5);
  });
});
