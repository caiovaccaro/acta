export interface StageCursor {
  createdAt: string;
  id: string;
}

export class StageCursorError extends Error {
  readonly code = 'INVALID_STAGE_CURSOR';

  constructor(message: string) {
    super(message);
    this.name = 'StageCursorError';
  }
}

export function encodeStageCursor(createdAt: Date | string, id: string): StageCursor {
  if (!id || id.length > 200) {
    throw new StageCursorError('Cursor id must be present and bounded');
  }
  const iso = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  if (Number.isNaN(Date.parse(iso))) {
    throw new StageCursorError('Cursor createdAt must be a valid timestamp');
  }
  return { createdAt: new Date(iso).toISOString(), id };
}

export function decodeStageCursor(value: unknown): StageCursor | null {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new StageCursorError('Cursor must be an object');
  }
  const record = value as { createdAt?: unknown; id?: unknown };
  if (typeof record.createdAt !== 'string' || typeof record.id !== 'string') {
    throw new StageCursorError('Cursor must include createdAt and id strings');
  }
  return encodeStageCursor(record.createdAt, record.id);
}

export function compareStageCursors(left: StageCursor, right: StageCursor): number {
  if (left.createdAt < right.createdAt) return -1;
  if (left.createdAt > right.createdAt) return 1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function isAfterStageCursor(record: StageCursor, cursor: StageCursor | null): boolean {
  return cursor == null || compareStageCursors(record, cursor) > 0;
}

export function selectStageWindow<T extends { createdAt: Date | string; id: string }>(
  records: readonly T[],
  cursor: StageCursor | null,
  limit: number,
): T[] {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new StageCursorError('Stage unit limit must be a positive integer');
  }
  return [...records]
    .filter((record) => isAfterStageCursor(encodeStageCursor(record.createdAt, record.id), cursor))
    .sort((left, right) => compareStageCursors(
      encodeStageCursor(left.createdAt, left.id),
      encodeStageCursor(right.createdAt, right.id),
    ))
    .slice(0, limit);
}
