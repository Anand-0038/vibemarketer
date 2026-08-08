import assert from "node:assert/strict";
import {
  DEFAULT_NATS_DURABLE_CONSUMER,
  DEFAULT_NATS_STREAM,
  DEFAULT_NATS_SUBJECT,
  parsePublishWakeup,
  readWorkerConfig,
} from "./index.js";

const config = readWorkerConfig({
  NATS_URL: "nats://zerops:secret@nats:4222",
  NATS_USER: "zerops",
  NATS_PASSWORD: "secret",
  INTERNAL_WORKER_SECRET: "internal-secret",
});

assert.equal(config.natsUser, "zerops");
assert.equal(config.natsPassword, "secret");
assert.equal(config.streamName, DEFAULT_NATS_STREAM);
assert.equal(config.subject, DEFAULT_NATS_SUBJECT);
assert.equal(config.durableConsumer, DEFAULT_NATS_DURABLE_CONSUMER);
assert.equal(config.webInternalUrl, "http://web:3000");

const wakeup = parsePublishWakeup(
  new TextEncoder().encode(
    JSON.stringify({
      type: "publish_wakeup",
      attemptId: "attempt-1",
      jobId: "job-1",
      ownerId: "owner-1",
      requestedAt: "2026-08-08T00:00:00.000Z",
      ignored: "not part of the contract",
    }),
  ),
);
assert.deepEqual(wakeup, {
  type: "publish_wakeup",
  attemptId: "attempt-1",
  jobId: "job-1",
  ownerId: "owner-1",
  requestedAt: "2026-08-08T00:00:00.000Z",
});
assert.equal(parsePublishWakeup(new TextEncoder().encode("not-json")), null);
assert.throws(
  () => readWorkerConfig({ INTERNAL_WORKER_SECRET: "secret" }),
  /NATS_URL is required/,
);

console.log("worker: ok");
