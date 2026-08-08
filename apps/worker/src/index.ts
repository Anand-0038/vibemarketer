import { randomUUID } from "node:crypto";
import {
  AckPolicy,
  DeliverPolicy,
  RetentionPolicy,
  StorageType,
  connect,
  type JsMsg,
  type NatsConnection,
} from "nats";

export const DEFAULT_NATS_STREAM = "VIBEMARKETER_MARKETING";
export const DEFAULT_NATS_SUBJECT = "marketing.publish.requested";
export const DEFAULT_NATS_DURABLE_CONSUMER = "vibemarketer-publish-worker";
export const DEFAULT_WEB_INTERNAL_URL = "http://web:3000";
export const DEFAULT_FALLBACK_INTERVAL_MS = 30_000;

export type PublishWakeup = {
  type: "publish_wakeup";
  attemptId: string;
  jobId: string;
  ownerId: string;
  requestedAt: string;
};

export type WorkerConfig = {
  natsUrl: string;
  webInternalUrl: string;
  internalWorkerSecret: string;
  streamName: string;
  subject: string;
  durableConsumer: string;
  workerId: string;
  fallbackIntervalMs: number;
  requestTimeoutMs: number;
};

type DrainResponse = {
  processed?: number;
  claimed?: number;
  skipped?: number;
  errors?: number;
};

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function requiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required for the publishing worker`);
  return value;
}

export function readWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): WorkerConfig {
  return {
    natsUrl: requiredEnv(env, "NATS_URL"),
    webInternalUrl:
      env.WEB_INTERNAL_URL?.trim() || DEFAULT_WEB_INTERNAL_URL,
    internalWorkerSecret: requiredEnv(env, "INTERNAL_WORKER_SECRET"),
    streamName: env.NATS_STREAM?.trim() || DEFAULT_NATS_STREAM,
    subject: env.NATS_SUBJECT?.trim() || DEFAULT_NATS_SUBJECT,
    durableConsumer:
      env.NATS_DURABLE_CONSUMER?.trim() || DEFAULT_NATS_DURABLE_CONSUMER,
    workerId: env.WORKER_ID?.trim() || `zerops-worker-${randomUUID()}`,
    fallbackIntervalMs: positiveInteger(
      env.WORKER_FALLBACK_INTERVAL_MS,
      DEFAULT_FALLBACK_INTERVAL_MS,
    ),
    requestTimeoutMs: positiveInteger(env.WORKER_REQUEST_TIMEOUT_MS, 15_000),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function parsePublishWakeup(raw: Uint8Array): PublishWakeup | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (!isRecord(value)) return null;
    if (
      value.type !== "publish_wakeup" ||
      typeof value.attemptId !== "string" ||
      typeof value.jobId !== "string" ||
      typeof value.ownerId !== "string" ||
      typeof value.requestedAt !== "string"
    ) {
      return null;
    }
    if (
      !value.attemptId.trim() ||
      !value.jobId.trim() ||
      !value.ownerId.trim() ||
      !value.requestedAt.trim()
    ) {
      return null;
    }
    return {
      type: "publish_wakeup",
      attemptId: value.attemptId,
      jobId: value.jobId,
      ownerId: value.ownerId,
      requestedAt: value.requestedAt,
    };
  } catch {
    return null;
  }
}

function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  console.info(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown worker error";
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function ensureJetStreamResources(
  connection: NatsConnection,
  config: WorkerConfig,
): Promise<void> {
  const manager = await connection.jetstreamManager();
  let stream;
  try {
    stream = await manager.streams.info(config.streamName);
  } catch {
    stream = await manager.streams.add({
      name: config.streamName,
      subjects: [config.subject],
      storage: StorageType.File,
      retention: RetentionPolicy.Workqueue,
    });
  }

  if (!stream.config.subjects?.includes(config.subject)) {
    throw new Error(
      `NATS stream ${config.streamName} does not accept ${config.subject}`,
    );
  }

  try {
    await manager.consumers.info(config.streamName, config.durableConsumer);
  } catch {
    await manager.consumers.add(config.streamName, {
      durable_name: config.durableConsumer,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      filter_subject: config.subject,
    });
  }
}

async function requestDrain(
  config: WorkerConfig,
  trigger: "nats" | "fallback",
): Promise<DrainResponse> {
  const endpoint = new URL(
    "/api/internal/publishing/drain",
    config.webInternalUrl,
  );
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.requestTimeoutMs,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": config.internalWorkerSecret,
        "x-internal-worker": config.workerId,
      },
      body: JSON.stringify({
        batchSize: 5,
        leaseMs: 30_000,
        leaseOwner: config.workerId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`publishing drain returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    return isRecord(payload)
      ? {
          processed:
            typeof payload.processed === "number" ? payload.processed : undefined,
          claimed:
            typeof payload.claimed === "number" ? payload.claimed : undefined,
          skipped:
            typeof payload.skipped === "number" ? payload.skipped : undefined,
          errors:
            typeof payload.errors === "number" ? payload.errors : undefined,
        }
      : {};
  } finally {
    clearTimeout(timeout);
    logEvent("publishing_drain_finished", { trigger });
  }
}

async function processMessage(
  message: JsMsg,
  drain: (trigger: "nats" | "fallback") => Promise<DrainResponse>,
): Promise<void> {
  const wakeup = parsePublishWakeup(message.data);
  if (!wakeup) {
    logEvent("publishing_message_rejected", { reason: "invalid_payload" });
    message.term();
    return;
  }

  try {
    const result = await drain("nats");
    message.ack();
    logEvent("publishing_message_acknowledged", {
      attempt_id: wakeup.attemptId,
      job_id: wakeup.jobId,
      processed: result.processed ?? 0,
      errors: result.errors ?? 0,
    });
  } catch (error) {
    logEvent("publishing_message_retryable_failure", {
      attempt_id: wakeup.attemptId,
      job_id: wakeup.jobId,
      error: errorMessage(error),
    });
    // Leave the message unacknowledged so JetStream can redeliver it. The
    // database outbox remains authoritative for idempotency and recovery.
  }
}

export class PublishingWorker {
  private connection: NatsConnection | null = null;
  private stopRequested = false;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private drainInFlight: Promise<DrainResponse> | null = null;

  constructor(private readonly config: WorkerConfig) {}

  private drain(trigger: "nats" | "fallback"): Promise<DrainResponse> {
    if (!this.drainInFlight) {
      this.drainInFlight = requestDrain(this.config, trigger).finally(() => {
        this.drainInFlight = null;
      });
    }
    return this.drainInFlight;
  }

  private startFallbackPoller(): void {
    this.fallbackTimer = setInterval(() => {
      void this.drain("fallback").catch((error) => {
        logEvent("publishing_fallback_failure", {
          error: errorMessage(error),
        });
      });
    }, this.config.fallbackIntervalMs);
  }

  private async consume(connection: NatsConnection): Promise<void> {
    while (!this.stopRequested && !connection.isClosed()) {
      const messages = connection.jetstream().fetch(
        this.config.streamName,
        this.config.durableConsumer,
        {
        batch: 1,
        expires: 1_000,
        },
      );
      for await (const message of messages) {
        await processMessage(message, (trigger) => this.drain(trigger));
      }
    }
  }

  async run(): Promise<void> {
    this.startFallbackPoller();
    let reconnectDelay = 1_000;

    while (!this.stopRequested) {
      try {
        const connection = await connect({
          servers: this.config.natsUrl,
          maxReconnectAttempts: 3,
          reconnectTimeWait: 1_000,
        });
        this.connection = connection;
        await ensureJetStreamResources(connection, this.config);
        reconnectDelay = 1_000;
        logEvent("publishing_worker_connected", {
          worker_id: this.config.workerId,
          stream: this.config.streamName,
          subject: this.config.subject,
        });
        await this.consume(connection);
        await connection.close();
        this.connection = null;
      } catch (error) {
        logEvent("publishing_worker_connection_failure", {
          error: errorMessage(error),
          retry_in_ms: reconnectDelay,
        });
        await sleep(reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      }
    }
  }

  stop(): void {
    this.stopRequested = true;
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
    if (this.connection && !this.connection.isClosed()) {
      void this.connection.drain().catch(() => undefined);
    }
  }
}

async function main(): Promise<void> {
  const worker = new PublishingWorker(readWorkerConfig());
  const stop = () => worker.stop();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  await worker.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
