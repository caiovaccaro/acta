export const DEFAULT_CLAIM_RESERVE_MS = 45 * 60 * 1000;

export function remainingDeadlineMs(deadlineAt: Date, now: Date = new Date()): number {
  return deadlineAt.getTime() - now.getTime();
}

export function shouldStopClaiming(
  deadlineAt: Date,
  now: Date = new Date(),
  reserveMs: number = DEFAULT_CLAIM_RESERVE_MS,
): boolean {
  if (!Number.isInteger(reserveMs) || reserveMs < 0) {
    throw new Error('Deadline reserve must be a non-negative integer');
  }
  return remainingDeadlineMs(deadlineAt, now) <= reserveMs;
}
