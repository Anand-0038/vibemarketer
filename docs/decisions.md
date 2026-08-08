# Architecture decisions

## Preserve the existing product

VibeMarketer already has the product workflow, UI, agent engine, provider
connectors, and human approval boundary. The challenge work is the
infrastructure transformation around that workflow, not a replacement app.

## Keep Supabase Auth temporarily

Replacing authentication during a 48-hour solo challenge would add account,
session, callback, and migration risk without improving the main demo. The
authenticated Supabase user UUID is retained as the tenant key in Zerops
PostgreSQL. Marketing data has no cross-database foreign key to
`auth.users`.

## Use Zerops PostgreSQL as the marketing source of truth

Marketing state and publish-attempt/outbox state must survive a web restart
and be shared by the web and worker services. A JSONB state row preserves the
existing application contract while the publishing tables preserve unique
idempotency keys, status transitions, leases, and provider outcomes.

## Use NATS as transport, not truth

The database outbox is authoritative. NATS JetStream carries a small wake-up
message so the private worker can drain work promptly. If NATS or the worker
restarts, the outbox remains recoverable through lease expiry and polling.

## Keep the worker private

The worker has no public port. It reaches the web drain route through the
Zerops private network and authenticates with a service-level secret. The web
service remains the only public application surface.

## Preserve real provider confirmation

Approving a post only creates a durable attempt. A post becomes published
only after the existing provider connector returns a valid provider ID and
the result is persisted. Missing credentials and ambiguous provider outcomes
remain explicit failures; no fixtures or fabricated URLs are used.

## Do not add infrastructure without a product reason

Redis, Qdrant, object storage, Kubernetes, and an LLM-based scheduler are not
required by the current workflow. Adding them would increase failure surface
without improving the judge-verifiable path.

## Fail closed in production

Zerops production requires configured Supabase public Auth variables and
managed PostgreSQL. `AUTH_BYPASS`, open-demo switches, and local JSON storage
are not valid production fallbacks. `/api/ready` verifies the selected
PostgreSQL boundary before reporting readiness.
