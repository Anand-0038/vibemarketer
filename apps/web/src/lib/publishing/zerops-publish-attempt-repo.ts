import { randomUUID } from "node:crypto";
import { MarketingStoreError } from "@/lib/marketing-store";
import {
  withZeropsTransaction,
  zeropsQuery,
} from "@/lib/zerops-postgres";
import type { PublishAttemptLikeRepository } from "./publish-attempt-service";
import {
  PUBLISH_ATTEMPT_STATUSES,
  PUBLISH_OUTBOX_STATUSES,
  assertPublishAttemptTransition,
  assertPublishOutboxTransition,
  type PublishAttempt,
  type PublishAttemptStatus,
  type PublishOutboxJob,
  type PublishOutboxJobType,
  type PublishOutboxStatus,
} from "./publish-attempts";

type DbAttemptRow = {
  id: string;
  owner_id: string;
  post_id: string;
  content_revision_key: string;
  provider: string;
  provider_account_id: string;
  idempotency_key: string;
  request_hash: string;
  status: string;
  provider_post_id?: string | null;
  provider_url?: string | null;
  provider_response?: Record<string, unknown> | string | null;
  attempt_count?: number;
  last_error_code?: string | null;
  last_error_message?: string | null;
  outcome_unknown?: boolean;
  next_retry_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type DbOutboxRow = {
  id: string;
  owner_id: string;
  attempt_id: string;
  job_type: string;
  status: string;
  available_at: string;
  lease_owner?: string | null;
  lease_expires_at?: string | null;
  attempt_count?: number;
  last_error_code?: string | null;
  last_error_message?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
};

function unavailable(operation: string, error: unknown): MarketingStoreError {
  return new MarketingStoreError(
    `Zerops publishing ${operation} failed: ${
      error instanceof Error ? error.message : "database error"
    }`,
    "UNAVAILABLE",
    503,
  );
}

function requireOwner(ownerId: string): string {
  if (!ownerId?.trim()) {
    throw new MarketingStoreError("ownerId is required", "UNAUTHORIZED", 401);
  }
  return ownerId.trim();
}

function assertStatus<T extends string>(
  value: string,
  allowed: readonly string[],
  label: string,
): T {
  if (!allowed.includes(value)) {
    throw new MarketingStoreError(
      `Unexpected ${label} ${value}`,
      "INVALID_TRANSITION",
      409,
    );
  }
  return value as T;
}

function parseProviderResponse(
  value: DbAttemptRow["provider_response"],
): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? value : null;
}

function parseAttempt(row: DbAttemptRow): PublishAttempt {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    post_id: String(row.post_id),
    content_revision_key: String(row.content_revision_key),
    provider: assertStatus<PublishAttempt["provider"]>(
      String(row.provider),
      ["x", "linkedin", "reddit", "other"],
      "provider",
    ),
    provider_account_id: String(row.provider_account_id),
    idempotency_key: String(row.idempotency_key),
    request_hash: String(row.request_hash),
    status: assertStatus<PublishAttemptStatus>(
      String(row.status),
      PUBLISH_ATTEMPT_STATUSES,
      "attempt status",
    ),
    provider_post_id: row.provider_post_id ?? null,
    provider_url: row.provider_url ?? null,
    provider_response: parseProviderResponse(row.provider_response),
    attempt_count: Number.isFinite(Number(row.attempt_count))
      ? Math.max(0, Math.floor(Number(row.attempt_count)))
      : 0,
    last_error_code: row.last_error_code ?? null,
    last_error_message: row.last_error_message ?? null,
    outcome_unknown: Boolean(row.outcome_unknown),
    next_retry_at: row.next_retry_at ?? null,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function parseOutbox(row: DbOutboxRow): PublishOutboxJob {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    attempt_id: String(row.attempt_id),
    job_type: assertStatus<PublishOutboxJobType>(
      String(row.job_type),
      ["publish", "confirm_publish"],
      "job type",
    ),
    status: assertStatus<PublishOutboxStatus>(
      String(row.status),
      PUBLISH_OUTBOX_STATUSES,
      "outbox status",
    ),
    available_at: String(row.available_at),
    lease_owner: row.lease_owner ?? null,
    lease_expires_at: row.lease_expires_at ?? null,
    attempt_count: Number.isFinite(Number(row.attempt_count))
      ? Math.max(0, Math.floor(Number(row.attempt_count)))
      : 0,
    last_error_code: row.last_error_code ?? null,
    last_error_message: row.last_error_message ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    completed_at: row.completed_at ?? null,
  };
}

async function queryRows<T>(
  operation: string,
  text: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  try {
    const result = await zeropsQuery<T>(text, values);
    return result.rows;
  } catch (error) {
    if (error instanceof MarketingStoreError) throw error;
    throw unavailable(operation, error);
  }
}

async function one<T>(
  operation: string,
  text: string,
  values: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await queryRows<T>(operation, text, values);
  return rows[0] ?? null;
}

export class ZeropsPublishAttemptRepository
  implements PublishAttemptLikeRepository
{
  async getPublishAttemptById(
    ownerId: string,
    attemptId: string,
  ): Promise<PublishAttempt | null> {
    const row = await one<DbAttemptRow>(
      "get attempt",
      `select * from public.vibemarketer_publish_attempts
        where owner_id = $1 and id = $2`,
      [requireOwner(ownerId), attemptId],
    );
    return row ? parseAttempt(row) : null;
  }

  async getPublishAttemptByIdempotencyKey(
    ownerId: string,
    idempotencyKey: string,
  ): Promise<PublishAttempt | null> {
    const row = await one<DbAttemptRow>(
      "get attempt by idempotency key",
      `select * from public.vibemarketer_publish_attempts
        where owner_id = $1 and idempotency_key = $2
        order by updated_at desc limit 1`,
      [requireOwner(ownerId), idempotencyKey],
    );
    return row ? parseAttempt(row) : null;
  }

  async getOutboxJobByAttempt(attemptId: string): Promise<PublishOutboxJob | null> {
    const row = await one<DbOutboxRow>(
      "get outbox job",
      `select * from public.vibemarketer_outbox_jobs
        where attempt_id = $1 order by created_at desc limit 1`,
      [attemptId],
    );
    return row ? parseOutbox(row) : null;
  }

  async createOutboxJobIfMissing(
    ownerId: string,
    attemptId: string,
    jobType: PublishOutboxJobType = "publish",
  ): Promise<PublishOutboxJob> {
    const owner = requireOwner(ownerId);
    try {
      const inserted = await queryRows<DbOutboxRow>(
        "create outbox job",
        `insert into public.vibemarketer_outbox_jobs
          (id, owner_id, attempt_id, job_type, status, available_at)
         values ($1, $2, $3, $4, 'pending', now())
         on conflict (attempt_id, job_type) do nothing
         returning *`,
        [randomUUID(), owner, attemptId, jobType],
      );
      if (inserted[0]) return parseOutbox(inserted[0]);
      const existing = await this.getOutboxJobByAttempt(attemptId);
      if (!existing) {
        throw new MarketingStoreError(
          "Failed to reuse existing outbox job",
          "UNAVAILABLE",
          503,
        );
      }
      return existing;
    } catch (error) {
      if (error instanceof MarketingStoreError) throw error;
      throw unavailable("create outbox job", error);
    }
  }

  async createOrReusePublishAttempt(opts: {
    ownerId: string;
    postId: string;
    contentRevisionKey: string;
    provider: string;
    providerAccountId: string;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<{ attempt: PublishAttempt; outboxJob: PublishOutboxJob }> {
    const owner = requireOwner(opts.ownerId);
    for (let retry = 0; retry < 2; retry++) {
      try {
        return await withZeropsTransaction(async (client) => {
          let attempt = (
            await client.query<DbAttemptRow>(
              `select * from public.vibemarketer_publish_attempts
                where owner_id = $1 and idempotency_key = $2
                for update`,
              [owner, opts.idempotencyKey],
            )
          ).rows[0];

          if (attempt) {
            const matches =
              attempt.post_id === opts.postId &&
              attempt.content_revision_key === opts.contentRevisionKey &&
              attempt.provider === opts.provider &&
              attempt.provider_account_id === opts.providerAccountId &&
              attempt.request_hash === opts.requestHash;
            if (!matches) {
              throw new MarketingStoreError(
                "Publish attempt idempotency conflict",
                "CONFLICT",
                409,
              );
            }
          } else {
            attempt = (
              await client.query<DbAttemptRow>(
                `insert into public.vibemarketer_publish_attempts
                  (id, owner_id, post_id, content_revision_key, provider,
                   provider_account_id, idempotency_key, request_hash)
                 values ($1, $2, $3, $4, $5, $6, $7, $8)
                 returning *`,
                [
                  randomUUID(),
                  owner,
                  opts.postId,
                  opts.contentRevisionKey,
                  opts.provider,
                  opts.providerAccountId,
                  opts.idempotencyKey,
                  opts.requestHash,
                ],
              )
            ).rows[0];
          }

          if (!attempt) {
            throw new MarketingStoreError(
              "Publish attempt was not created",
              "UNAVAILABLE",
              503,
            );
          }

          const job = (
            await client.query<DbOutboxRow>(
              `insert into public.vibemarketer_outbox_jobs
                (id, owner_id, attempt_id, job_type, status, available_at)
               values ($1, $2, $3, 'publish', 'pending', now())
               on conflict (attempt_id, job_type) do update set
                 status = case
                   when public.vibemarketer_outbox_jobs.status in
                     ('completed', 'dead_letter', 'leased', 'retryable_failure', 'cancelled')
                   then public.vibemarketer_outbox_jobs.status
                   else 'pending'
                 end,
                 available_at = case
                   when public.vibemarketer_outbox_jobs.status in
                     ('completed', 'dead_letter', 'leased', 'retryable_failure', 'cancelled')
                   then public.vibemarketer_outbox_jobs.available_at
                   else now()
                 end,
                 updated_at = now()
               returning *`,
              [randomUUID(), owner, attempt.id],
            )
          ).rows[0];

          if (!job) {
            throw new MarketingStoreError(
              "Publish outbox job was not created",
              "UNAVAILABLE",
              503,
            );
          }
          return { attempt: parseAttempt(attempt), outboxJob: parseOutbox(job) };
        });
      } catch (error) {
        if (
          retry === 0 &&
          (error as { code?: unknown } | null)?.code === "23505"
        ) {
          continue;
        }
        if (error instanceof MarketingStoreError) throw error;
        throw unavailable("create publish attempt", error);
      }
    }
    throw new MarketingStoreError(
      "Publish attempt idempotency retry exhausted",
      "CONFLICT",
      409,
    );
  }

  async claimNextOutboxJob(
    leaseOwner: string,
    leaseMs = 30_000,
  ): Promise<PublishOutboxJob | null> {
    if (!leaseOwner?.trim()) {
      throw new MarketingStoreError("leaseOwner is required", "UNAUTHORIZED", 401);
    }
    try {
      return await withZeropsTransaction(async (client) => {
        const candidate = (
          await client.query<DbOutboxRow>(
            `select * from public.vibemarketer_outbox_jobs
              where status in ('pending', 'retryable_failure')
                and available_at <= now()
                and (lease_expires_at is null or lease_expires_at <= now())
              order by available_at asc, created_at asc
              for update skip locked limit 1`,
          )
        ).rows[0];
        if (!candidate) return null;
        const updated = (
          await client.query<DbOutboxRow>(
            `update public.vibemarketer_outbox_jobs
                set status = 'leased', lease_owner = $1,
                    lease_expires_at = now() + ($2::integer * interval '1 millisecond'),
                    attempt_count = attempt_count + 1, updated_at = now()
              where id = $3
              returning *`,
            [leaseOwner.trim(), Math.max(5_000, Math.floor(leaseMs)), candidate.id],
          )
        ).rows[0];
        return updated ? parseOutbox(updated) : null;
      });
    } catch (error) {
      if (error instanceof MarketingStoreError) throw error;
      throw unavailable("claim outbox job", error);
    }
  }

  async renewOutboxLease(
    jobId: string,
    leaseOwner: string,
    leaseMs = 30_000,
  ): Promise<PublishOutboxJob> {
    const rows = await queryRows<DbOutboxRow>(
      "renew outbox lease",
      `update public.vibemarketer_outbox_jobs
          set lease_expires_at = now() + ($1::integer * interval '1 millisecond'), updated_at = now()
        where id = $2 and lease_owner = $3
        returning *`,
      [Math.max(5_000, Math.floor(leaseMs)), jobId, leaseOwner.trim()],
    );
    if (!rows[0]) {
      throw new MarketingStoreError(
        "Outbox job not found or lease ownership changed",
        "POST_NOT_FOUND",
        404,
      );
    }
    return parseOutbox(rows[0]);
  }

  private async updateAttemptStatus(
    attemptId: string,
    status: PublishAttemptStatus,
    patch: Record<string, unknown> = {},
  ): Promise<PublishAttempt> {
    const current = await one<Pick<DbAttemptRow, "status">>(
      "read attempt status",
      `select status from public.vibemarketer_publish_attempts where id = $1`,
      [attemptId],
    );
    if (!current) {
      throw new MarketingStoreError("Attempt not found", "POST_NOT_FOUND", 404);
    }
    const previous = assertStatus<PublishAttemptStatus>(
      String(current.status),
      PUBLISH_ATTEMPT_STATUSES,
      "attempt status",
    );
    assertPublishAttemptTransition(previous, status);
    const allowed = new Set([
      "provider_post_id",
      "provider_url",
      "provider_response",
      "attempt_count",
      "last_error_code",
      "last_error_message",
      "outcome_unknown",
      "next_retry_at",
      "started_at",
      "completed_at",
    ]);
    const entries = Object.entries(patch).filter(([key]) => allowed.has(key));
    const assignments = entries.map(([key], index) => `${key} = $${index + 3}`);
    const values = [attemptId, status, ...entries.map(([, value]) => value)];
    const rows = await queryRows<DbAttemptRow>(
      "update attempt",
      `update public.vibemarketer_publish_attempts
          set status = $2, updated_at = now()${assignments.length ? `, ${assignments.join(", ")}` : ""}
        where id = $1 and status = $${values.length + 1}
        returning *`,
      [...values, previous],
    );
    if (!rows[0]) {
      throw new MarketingStoreError(
        "Attempt not found or status changed during update",
        "INVALID_TRANSITION",
        409,
      );
    }
    return parseAttempt(rows[0]);
  }

  async markAttemptExecuting(attemptId: string): Promise<PublishAttempt> {
    const current = await one<Pick<DbAttemptRow, "attempt_count">>(
      "read attempt count",
      `select attempt_count from public.vibemarketer_publish_attempts where id = $1`,
      [attemptId],
    );
    if (!current) {
      throw new MarketingStoreError("Attempt not found", "POST_NOT_FOUND", 404);
    }
    return this.updateAttemptStatus(attemptId, "executing", {
      started_at: new Date().toISOString(),
      last_error_code: null,
      last_error_message: null,
      attempt_count: Math.max(0, Number(current.attempt_count ?? 0)) + 1,
    });
  }

  async markAttemptCancelled(attemptId: string): Promise<PublishAttempt> {
    return this.updateAttemptStatus(attemptId, "cancelled", {
      last_error_code: "CANCELLED",
      last_error_message: "Cancelled by operator.",
    });
  }

  async markAttemptPublished(
    attemptId: string,
    providerPostId: string,
    providerUrl: string | null,
  ): Promise<PublishAttempt> {
    return this.updateAttemptStatus(attemptId, "published", {
      provider_post_id: providerPostId,
      provider_url: providerUrl,
      completed_at: new Date().toISOString(),
      outcome_unknown: false,
      last_error_code: null,
      last_error_message: null,
    });
  }

  async completeOutboxJob(jobId: string): Promise<PublishOutboxJob> {
    return this.updateOutboxStatus(jobId, "completed", {
      lease_owner: null,
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    });
  }

  async markProviderSucceeded(
    attemptId: string,
    patch: {
      providerPostId: string;
      providerUrl?: string | null;
      providerResponse?: Record<string, unknown> | null;
    },
  ): Promise<PublishAttempt> {
    return this.updateAttemptStatus(attemptId, "provider_succeeded", {
      provider_post_id: patch.providerPostId,
      provider_url: patch.providerUrl ?? null,
      provider_response: patch.providerResponse ?? null,
      outcome_unknown: false,
    });
  }

  async markOutcomeUnknown(
    attemptId: string,
    opts: { errorCode?: string | null; message?: string | null },
  ): Promise<PublishAttempt> {
    return this.updateAttemptStatus(attemptId, "outcome_unknown", {
      last_error_code: opts.errorCode ?? "OUTCOME_UNKNOWN",
      last_error_message: opts.message ?? "Provider outcome unknown",
      outcome_unknown: true,
      next_retry_at: null,
    });
  }

  async markRetryableFailure(
    attemptId: string,
    opts: { errorCode?: string | null; message?: string | null; availableAt?: string | null },
  ): Promise<PublishAttempt> {
    return this.updateAttemptStatus(attemptId, "retryable_failure", {
      last_error_code: opts.errorCode ?? "RETRYABLE_FAILURE",
      last_error_message: opts.message ?? "Provider call failure",
      outcome_unknown: false,
      next_retry_at: opts.availableAt ?? null,
    });
  }

  async markPermanentFailure(
    attemptId: string,
    opts: { errorCode?: string | null; message?: string | null },
  ): Promise<PublishAttempt> {
    return this.updateAttemptStatus(attemptId, "permanent_failure", {
      last_error_code: opts.errorCode ?? "PERMANENT_FAILURE",
      last_error_message: opts.message ?? "Provider call failed",
      outcome_unknown: false,
    });
  }

  async deadLetterOutboxJob(
    jobId: string,
    opts?: { errorCode?: string | null; message?: string | null },
  ): Promise<PublishOutboxJob> {
    return this.updateOutboxStatus(jobId, "dead_letter", {
      lease_owner: null,
      lease_expires_at: null,
      last_error_code: opts?.errorCode ?? null,
      last_error_message: opts?.message ?? null,
    });
  }

  async rescheduleOutboxJob(
    jobId: string,
    options?: { availableAt?: string; errorCode?: string | null; message?: string | null },
  ): Promise<PublishOutboxJob> {
    return this.updateOutboxStatus(jobId, "retryable_failure", {
      available_at: options?.availableAt ?? new Date().toISOString(),
      lease_owner: null,
      lease_expires_at: null,
      last_error_code: options?.errorCode ?? null,
      last_error_message: options?.message ?? null,
    });
  }

  async cancelOutboxJob(jobId: string): Promise<PublishOutboxJob> {
    return this.updateOutboxStatus(jobId, "cancelled", {
      lease_owner: null,
      lease_expires_at: null,
    });
  }

  async releaseExpiredLeases(): Promise<number> {
    try {
      const result = await zeropsQuery(
        `update public.vibemarketer_outbox_jobs
            set status = 'pending', lease_owner = null, lease_expires_at = null, updated_at = now()
          where status = 'leased' and lease_expires_at is not null and lease_expires_at <= now()`,
      );
      return result.rowCount ?? 0;
    } catch (error) {
      if (error instanceof MarketingStoreError) throw error;
      throw unavailable("release expired leases", error);
    }
  }

  async listAttemptsForOwner(
    ownerId: string,
  ): Promise<Array<{ attempt: PublishAttempt; job: PublishOutboxJob | null }>> {
    const attempts = await queryRows<DbAttemptRow>(
      "list attempts",
      `select * from public.vibemarketer_publish_attempts
        where owner_id = $1 order by updated_at desc`,
      [requireOwner(ownerId)],
    );
    if (!attempts.length) return [];
    const jobs = await queryRows<DbOutboxRow>(
      "list outbox jobs",
      `select * from public.vibemarketer_outbox_jobs
        where attempt_id = any($1::text[]) order by created_at desc`,
      [attempts.map((attempt) => attempt.id)],
    );
    return attempts.map((raw) => {
      const attempt = parseAttempt(raw);
      const job = jobs.find((candidate) => candidate.attempt_id === attempt.id);
      return { attempt, job: job ? parseOutbox(job) : null };
    });
  }

  private async updateOutboxStatus(
    jobId: string,
    status: PublishOutboxStatus,
    patch: Record<string, unknown> = {},
  ): Promise<PublishOutboxJob> {
    const current = await one<Pick<DbOutboxRow, "status">>(
      "read outbox status",
      `select status from public.vibemarketer_outbox_jobs where id = $1`,
      [jobId],
    );
    if (!current) {
      throw new MarketingStoreError("Outbox job not found", "POST_NOT_FOUND", 404);
    }
    const previous = assertStatus<PublishOutboxStatus>(
      String(current.status),
      PUBLISH_OUTBOX_STATUSES,
      "outbox status",
    );
    assertPublishOutboxTransition(previous, status);

    const allowed = new Set([
      "available_at",
      "lease_owner",
      "lease_expires_at",
      "last_error_code",
      "last_error_message",
      "completed_at",
    ]);
    const entries = Object.entries(patch).filter(([key]) => allowed.has(key));
    const assignments = entries.map(([key], index) => `${key} = $${index + 3}`);
    const values = [jobId, status, ...entries.map(([, value]) => value)];
    const rows = await queryRows<DbOutboxRow>(
      "update outbox job",
      `update public.vibemarketer_outbox_jobs
          set status = $2, updated_at = now()${assignments.length ? `, ${assignments.join(", ")}` : ""}
        where id = $1 and status = $${values.length + 1}
        returning *`,
      [...values, previous],
    );
    if (!rows[0]) {
      throw new MarketingStoreError(
        "Outbox job not found or status changed during update",
        "INVALID_TRANSITION",
        409,
      );
    }
    return parseOutbox(rows[0]);
  }
}
