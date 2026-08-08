import assert from "node:assert/strict";
import { summarizePublishingStatus } from "./status-summary";

const now = Date.parse("2026-08-08T12:00:00.000Z");

const summary = summarizePublishingStatus(
  [
    {
      provider: "linkedin",
      status: "pending",
      created_at: "2026-08-08T11:59:30.000Z",
      updated_at: "2026-08-08T11:59:50.000Z",
    },
    {
      provider: "linkedin",
      status: "provider_succeeded",
      created_at: "2026-08-08T11:59:00.000Z",
      updated_at: "2026-08-08T11:59:40.000Z",
    },
  ],
  [
    {
      status: "pending",
      created_at: "2026-08-08T11:58:00.000Z",
      updated_at: "2026-08-08T11:59:50.000Z",
      lease_owner: null,
      lease_expires_at: null,
    },
    {
      status: "leased",
      created_at: "2026-08-08T11:59:30.000Z",
      updated_at: "2026-08-08T11:59:45.000Z",
      lease_owner: "worker-1",
      lease_expires_at: "2026-08-08T12:00:30.000Z",
    },
    {
      status: "dead_letter",
      created_at: "2026-08-08T11:57:00.000Z",
      updated_at: "2026-08-08T11:57:30.000Z",
      lease_owner: null,
      lease_expires_at: null,
    },
  ],
  now,
);

assert.deepEqual(summary.counts, {
  total_attempts: 2,
  total_jobs: 3,
  attempt_by_status: { pending: 1, provider_succeeded: 1 },
  outbox_by_status: { pending: 1, leased: 1, dead_letter: 1 },
  provider_by_attempts: { linkedin: 2 },
});
assert.deepEqual(summary.queue_health, {
  leased_jobs: 1,
  provider_succeeded_not_finalized: 1,
  pending_or_retryable_jobs: 1,
  dead_lettered_jobs: 1,
  oldest_pending_age_seconds: 120,
  oldest_leased_age_seconds: 30,
});

assert.deepEqual(summarizePublishingStatus([], [], now), {
  counts: {
    total_attempts: 0,
    total_jobs: 0,
    attempt_by_status: {},
    outbox_by_status: {},
    provider_by_attempts: {},
  },
  queue_health: {
    leased_jobs: 0,
    provider_succeeded_not_finalized: 0,
    pending_or_retryable_jobs: 0,
    dead_lettered_jobs: 0,
    oldest_pending_age_seconds: null,
    oldest_leased_age_seconds: null,
  },
});

console.log("status-summary.test: ok");
