export type PublishingAttemptStatusRow = {
  provider: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PublishingOutboxStatusRow = {
  status: string;
  created_at: string;
  updated_at: string;
  lease_owner: string | null;
  lease_expires_at: string | null;
};

export type PublishingStatusSummary = {
  counts: {
    total_attempts: number;
    total_jobs: number;
    attempt_by_status: Record<string, number>;
    outbox_by_status: Record<string, number>;
    provider_by_attempts: Record<string, number>;
  };
  queue_health: {
    leased_jobs: number;
    provider_succeeded_not_finalized: number;
    pending_or_retryable_jobs: number;
    dead_lettered_jobs: number;
    oldest_pending_age_seconds: number | null;
    oldest_leased_age_seconds: number | null;
  };
};

function parseStatus(raw: unknown): string {
  return String(raw ?? "");
}

function ageSeconds(iso: string, nowMs: number): number {
  const value = nowMs - new Date(iso).getTime();
  return Number.isFinite(value) ? Math.max(0, Math.floor(value / 1000)) : 0;
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/**
 * Build the provider-neutral queue report used by the private status route.
 * Keeping this aggregation pure lets Supabase and Zerops-backed deployments
 * produce the same operational evidence without sharing table assumptions.
 */
export function summarizePublishingStatus(
  attempts: readonly PublishingAttemptStatusRow[],
  jobs: readonly PublishingOutboxStatusRow[],
  nowMs = Date.now(),
): PublishingStatusSummary {
  const attemptByStatus: Record<string, number> = {};
  const providerByAttempts: Record<string, number> = {};

  for (const attempt of attempts) {
    increment(attemptByStatus, parseStatus(attempt.status));
    increment(providerByAttempts, attempt.provider || "unknown");
  }

  const outboxByStatus: Record<string, number> = {};
  for (const job of jobs) {
    increment(outboxByStatus, parseStatus(job.status));
  }

  const leased = jobs.filter((job) => job.status === "leased");
  const providerSucceededNotFinalized = attempts.filter(
    (attempt) => attempt.status === "provider_succeeded",
  );
  const pendingOrRetryable = jobs.filter(
    (job) => job.status === "pending" || job.status === "retryable_failure",
  );

  return {
    counts: {
      total_attempts: attempts.length,
      total_jobs: jobs.length,
      attempt_by_status: attemptByStatus,
      outbox_by_status: outboxByStatus,
      provider_by_attempts: providerByAttempts,
    },
    queue_health: {
      leased_jobs: leased.length,
      provider_succeeded_not_finalized: providerSucceededNotFinalized.length,
      pending_or_retryable_jobs: pendingOrRetryable.length,
      dead_lettered_jobs: jobs.filter((job) => job.status === "dead_letter").length,
      // "Oldest" is the largest age, not the smallest. This matters when a
      // stuck job is hidden behind newer pending work.
      oldest_pending_age_seconds: pendingOrRetryable.length
        ? Math.max(
            ...pendingOrRetryable.map((job) => ageSeconds(job.created_at, nowMs)),
          )
        : null,
      oldest_leased_age_seconds: leased.length
        ? Math.max(...leased.map((job) => ageSeconds(job.created_at, nowMs)))
        : null,
    },
  };
}
