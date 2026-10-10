import {
  type PipelineLease,
  Prisma,
  type PrismaClient,
} from '@prisma/client';
import { prisma } from '../index';

const DEFAULT_MAX_RETRIES = 3;
const MIN_LEASE_MS = 100;
const MAX_LEASE_MS = 24 * 60 * 60 * 1000;

export class PipelineLeaseRepositoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PipelineLeaseRepositoryError';
    this.code = code;
  }
}

export interface LeaseIdentity {
  resource: string;
  ownerToken: string;
  pipelineRunId: string;
  generation: number;
}

export type AcquireLeaseResult =
  | { acquired: true; lease: PipelineLease; takeover: boolean }
  | { acquired: false; lease: PipelineLease };

function validateLeaseInput(resource: string, ownerToken: string, leaseMs: number): void {
  if (!resource || resource.length > 100 || !ownerToken || ownerToken.length > 100) {
    throw new PipelineLeaseRepositoryError(
      'INVALID_LEASE_IDENTITY',
      'Lease resource and owner token must be present and bounded',
    );
  }
  if (!Number.isInteger(leaseMs) || leaseMs < MIN_LEASE_MS || leaseMs > MAX_LEASE_MS) {
    throw new PipelineLeaseRepositoryError(
      'INVALID_LEASE_DURATION',
      'Lease duration is outside the supported range',
    );
  }
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2034' || error.code === 'P2002')
  );
}

async function databaseNow(
  tx: Prisma.TransactionClient,
): Promise<Date> {
  const [row] = await tx.$queryRaw<Array<{ now: Date }>>`
    SELECT CURRENT_TIMESTAMP AS "now"
  `;
  return row.now;
}

export async function acquirePipelineLease(
  input: {
    resource: string;
    ownerToken: string;
    pipelineRunId: string;
    leaseMs: number;
  },
  db: PrismaClient = prisma,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<AcquireLeaseResult> {
  validateLeaseInput(input.resource, input.ownerToken, input.leaseMs);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const now = await databaseNow(tx);
          const current = await tx.pipelineLease.upsert({
            where: { resource: input.resource },
            create: { resource: input.resource },
            update: {},
          });

          if (
            current.ownerToken
            && current.ownerToken !== input.ownerToken
            && current.expiresAt
            && current.expiresAt > now
          ) {
            return { acquired: false as const, lease: current };
          }

          const takeover = Boolean(
            current.ownerToken
            && current.ownerToken !== input.ownerToken
            && current.expiresAt
            && current.expiresAt <= now,
          );
          const sameOwner = current.ownerToken === input.ownerToken
            && current.pipelineRunId === input.pipelineRunId;
          const generation = sameOwner ? current.generation : current.generation + 1;
          const expiresAt = new Date(now.getTime() + input.leaseMs);

          const lease = await tx.pipelineLease.update({
            where: { resource: input.resource },
            data: {
              ownerToken: input.ownerToken,
              pipelineRunId: input.pipelineRunId,
              generation,
              acquiredAt: sameOwner ? current.acquiredAt : now,
              heartbeatAt: now,
              expiresAt,
            },
          });

          if (!sameOwner) {
            await tx.pipelineLeaseEvent.create({
              data: {
                resource: input.resource,
                type: takeover ? 'stale_takeover' : 'acquired',
                generation,
                ownerToken: input.ownerToken,
                pipelineRunId: input.pipelineRunId,
                displacedOwnerToken: takeover ? current.ownerToken : null,
                displacedPipelineRunId: takeover ? current.pipelineRunId : null,
                previousExpiresAt: takeover ? current.expiresAt : null,
              },
            });
          }

          return { acquired: true as const, lease, takeover };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isRetryableTransactionError(error) && attempt < maxRetries) {
        continue;
      }
      throw new PipelineLeaseRepositoryError(
        'LEASE_DATABASE_UNAVAILABLE',
        'Pipeline lease operation could not be completed',
      );
    }
  }

  throw new PipelineLeaseRepositoryError(
    'LEASE_DATABASE_UNAVAILABLE',
    'Pipeline lease operation could not be completed',
  );
}

export async function heartbeatPipelineLease(
  identity: LeaseIdentity,
  leaseMs: number,
  db: PrismaClient = prisma,
): Promise<boolean> {
  validateLeaseInput(identity.resource, identity.ownerToken, leaseMs);

  try {
    return await db.$transaction(async (tx) => {
      const now = await databaseNow(tx);
      const result = await tx.pipelineLease.updateMany({
        where: {
          resource: identity.resource,
          ownerToken: identity.ownerToken,
          pipelineRunId: identity.pipelineRunId,
          generation: identity.generation,
          expiresAt: { gt: now },
        },
        data: {
          heartbeatAt: now,
          expiresAt: new Date(now.getTime() + leaseMs),
        },
      });
      return result.count === 1;
    });
  } catch {
    throw new PipelineLeaseRepositoryError(
      'LEASE_DATABASE_UNAVAILABLE',
      'Pipeline lease operation could not be completed',
    );
  }
}

export async function releasePipelineLease(
  identity: LeaseIdentity,
  db: PrismaClient = prisma,
): Promise<boolean> {
  try {
    return await db.$transaction(
      async (tx) => {
        const current = await tx.pipelineLease.findUnique({
          where: { resource: identity.resource },
        });
        if (
          !current
          || current.ownerToken !== identity.ownerToken
          || current.pipelineRunId !== identity.pipelineRunId
          || current.generation !== identity.generation
        ) {
          return false;
        }

        const now = await databaseNow(tx);
        const result = await tx.pipelineLease.updateMany({
          where: {
            resource: identity.resource,
            ownerToken: identity.ownerToken,
            pipelineRunId: identity.pipelineRunId,
            generation: identity.generation,
          },
          data: {
            ownerToken: null,
            pipelineRunId: null,
            acquiredAt: null,
            heartbeatAt: null,
            expiresAt: null,
          },
        });
        if (result.count !== 1) {
          return false;
        }

        await tx.pipelineLeaseEvent.create({
          data: {
            resource: identity.resource,
            type: 'released',
            generation: identity.generation,
            ownerToken: identity.ownerToken,
            pipelineRunId: identity.pipelineRunId,
            previousExpiresAt: current.expiresAt,
            createdAt: now,
          },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isRetryableTransactionError(error)) {
      return false;
    }
    throw new PipelineLeaseRepositoryError(
      'LEASE_DATABASE_UNAVAILABLE',
      'Pipeline lease operation could not be completed',
    );
  }
}
