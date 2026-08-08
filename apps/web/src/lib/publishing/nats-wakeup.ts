import { connect, StringCodec, type NatsConnection } from "nats";

export const PUBLISH_WAKEUP_SUBJECT = "marketing.publish.requested";

type PublishWakeupInput = {
  attemptId: string;
  jobId: string;
  ownerId: string;
};

type PublishWakeupResult =
  | { queued: true }
  | { queued: false; reason: string };

let connectionPromise: Promise<NatsConnection> | null = null;
const codec = StringCodec();

async function getConnection(url: string): Promise<NatsConnection> {
  if (!connectionPromise) {
    connectionPromise = connect({
      servers: url,
      maxReconnectAttempts: 2,
      reconnectTimeWait: 500,
      timeout: 1_500,
    }).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
}

/**
 * Publish a small wake-up after the durable Supabase outbox is committed.
 * The outbox is authoritative; this message only reduces worker latency and
 * may be lost during a broker restart because the worker also polls safely.
 */
export async function publishPublishWakeup(
  input: PublishWakeupInput,
): Promise<PublishWakeupResult> {
  const natsUrl = process.env.NATS_URL?.trim();
  if (!natsUrl) return { queued: false, reason: "NATS_URL not configured" };

  try {
    const connection = await getConnection(natsUrl);
    connection.publish(
      PUBLISH_WAKEUP_SUBJECT,
      codec.encode(
        JSON.stringify({
          type: "publish_wakeup",
          attemptId: input.attemptId,
          jobId: input.jobId,
          ownerId: input.ownerId,
          requestedAt: new Date().toISOString(),
        }),
      ),
    );
    await connection.flush();
    return { queued: true };
  } catch (error) {
    return {
      queued: false,
      reason: error instanceof Error ? error.message : "NATS publish failed",
    };
  }
}
