# VibeMarketer — Zerops Challenge plan

Status: Core URL-to-draft slice and judge demo assets live on Zerops;
provider-confirmed publish, social post, and official submission remain open
gates.

Audit date: 2026-08-08

Source audited: `Anand-0037/thevibemarketing`, cloned at commit
`3ad30a2d3dc9b70e3555c14d4aa4dd7cff09e44f` (`Fix Vercel Hobby cron schedule`).
The source `.git` directory was removed after cloning, as requested. The
challenge notes that were already in this workspace were preserved.
The submission repository is `Anand-0038/vibemarketer`.

## Decision

Keep VibeMarketer as the product. The hackathon work is the infrastructure
and reliability transformation around the existing workflow:

```text
product URL
  -> evidence-backed brand memory
  -> channel-native drafts
  -> human approval
  -> durable publish attempt
  -> provider-confirmed publication
  -> execution report
```

The repository already contains that product boundary. Rebuilding the UI or
replacing `packages/engine` would create risk without improving the story.
Zerops should become responsible for running the web service, the durable
application database, the job transport, and the asynchronous publishing
worker. Each component below has to earn its place by serving this workflow.

The migration is deliberately staged:

1. Deploy the existing Next.js application on Zerops while keeping Supabase
   Auth and persistence intact. This creates the first live, reversible
   checkpoint.
2. Move marketing persistence and the publishing-attempt repository to a
   Zerops PostgreSQL service while keeping Supabase only for Auth.
3. Add NATS JetStream as durable job transport and extract publishing into a
   private worker. Keep the database outbox as the source of truth for
   idempotency, lease recovery, and provider outcome handling.
4. Verify the complete URL-to-report flow and record the live demo evidence.

The current Zerops project is `0xanand` (`IzGL13uGTKeL0Cg8qBNvjw`) in the
`Anand-0038` organization. `web`, `db`, `nats`, and `worker` are provisioned.
The web checkpoint is live at
`https://web-2b24-3000.prg1.zerops.app`; `/`, `/login`, `/app`, static assets,
and `/api/ready` were verified externally. The worker is also provisioned and
live-checked against NATS and the private drain boundary. The remaining
deployment gate is a provider-confirmed publication with a real connected
social account.

## 1. What already works

These are code-level capabilities verified during the audit. They are not
claims that the external providers or a public deployment are currently
available.

### Product and UI

- `apps/web` is a Next.js 16 application with public marketing pages,
  authenticated application pages, API routes, content, SEO metadata, and
  an existing CMO/studio/queue/report experience.
- The locked product narrative in `AGENTS.md` is the right main-track demo:
  URL -> brand memory -> drafts -> HITL -> provider-confirmed publish ->
  report. VC Brain remains a secondary workflow.
- The application already exposes marketing routes for brand, memory,
  campaign, draft, posts, approval, publishing attempts, reconciliation, and
  reports.

### Engine and live-provider boundaries

- `packages/engine` contains the research, brand-memory, agent-lane, channel,
  connector, scoring, and trace logic used by the web routes.
- Brand ingestion requires live Firecrawl/model/Supermemory paths and fails
  visibly when required dependencies are missing.
- Campaign and draft generation require live OpenAI and retrieval-backed brand
  memory; the routes do not intentionally substitute templates for a failed
  provider.
- Composio is a real REST connector for OAuth links, connected-account
  discovery, and provider tool execution. Missing configuration is returned as
  an unavailable state.

### Persistence and human approval

- `apps/web/src/lib/marketing-store.ts` owns the marketing state contract:
  brand, facts, posts, loops, autonomy, campaign, usage, and publish log.
- On Zerops production, the store selects managed PostgreSQL and fails closed
  on missing database configuration or database errors. Other production hosts
  retain the Supabase compatibility path. Local JSON is an explicit local/test
  mode, not a production fallback.
- The store has versioned writes and compare-and-swap behavior for
  `marketing_state.version`.
- Approval transitions a draft into the queue. The store rejects invalid
  transitions and keeps published posts immutable.
- The approval path preserves HITL: it does not claim a provider publication
  merely because a user clicked Approve.

### Durable publishing state machine

- `supabase/migrations/20260723090000_marketing_publish_outbox.sql` defines
  `marketing_publish_attempts` and `marketing_outbox_jobs`, including unique
  idempotency keys, leases, retries, dead-letter state, and recovery helpers.
- `apps/web/src/lib/publishing/publish-attempt-repo.ts` uses the service-role
  database path for those records and RPCs.
- `apps/web/src/lib/publishing/publish-attempt-service.ts` validates the post
  revision, claims a job, executes a real provider call, classifies failures,
  records provider success, confirms the post in marketing state, and refuses
  to auto-republish an unknown provider outcome.
- The internal drain route already supports authenticated cron and internal
  worker callers. It currently runs the batch inside the Next.js process.

### Safety and verification already present

- Supabase migrations include RLS, tenant ownership, server-only table access,
  privilege lockdown for security-definer publishing RPCs, and auth-trigger
  privilege lockdown.
- `apps/web/src/lib/internal-worker-auth.ts` protects the internal publishing
  route without placing secrets in query strings.
- `apps/web/scripts/production-gate.mjs` and the colocated unit tests cover
  production assumptions, security headers, auth boundaries, store lifecycle,
  publishing transitions, and provider-confirmation invariants.
- Root checks are defined for engine tests, web content/pure-logic tests,
  lint, and the Next.js production build.

## 2. What is incomplete, unsupported, or unverified

### Web, database, and worker checkpoints are live

- Root `zerops.yaml` defines the web and private publishing-worker runtimes.
- The authenticated project inventory contains `web`, `db`, `nats`, and
  `worker`; `web`, `db`, `nats`, and `worker` are active.
- The verified public web URL is
  `https://web-2b24-3000.prg1.zerops.app`. From outside Zerops, `/` and
  `/login` return `200`, `/app` redirects to `/login`, static assets return
  `200`, and `/api/ready` returns `{ "ok": true }`.
- The web health check has exercised the direct Zerops PostgreSQL adapter and
  created/validated its application schema. The live URL-to-brand-to-campaign-
  to-draft smoke also persisted state through the Zerops PostgreSQL path.
- The project-local `.mcp.json` is tokenless setup metadata, not proof that
  ZCP can call the project.

### The worker boundary is implemented but not live-verified

- `apps/web/src/app/api/internal/publishing/drain/route.ts` remains the
  authenticated execution boundary and calls `executePublishOutboxBatch`.
- `apps/worker/src/index.ts` connects to NATS JetStream, consumes durable
  wake-up messages, and calls that route over the private web hostname.
- `apps/web/src/lib/publishing/nats-wakeup.ts` publishes a small wake-up only
  after the PostgreSQL outbox is durable; a bounded poll remains the recovery
  fallback when NATS is unavailable.
- The worker and NATS contract are locally typechecked and tested. The live
  worker reaches NATS with explicit credentials, and its fallback drain checks
  are succeeding after the shared-secret restart. A provider-confirmed
  attempt remains outstanding.

### Persistence migration and core live flow are verified

- The compatibility path still uses the Supabase Data API/service-role client
  outside Zerops.
- Zerops production now selects direct PostgreSQL adapters for marketing state
  and publish-attempt/outbox state, with schema creation on first use. The
  deployed brand, campaign, and draft smoke verified the marketing path against
  the provisioned `db` service.
- `apps/web/src/lib/postgres-dual.ts` is a VC Brain dual-write path; it is not
  a PostgreSQL adapter for the marketing store or publishing repository.
- `supabase/` contains both Auth assumptions and application schema/RPCs.
  Moving only an environment variable would not move persistence: the store
  and repository interfaces must be ported and tested.
- The standalone Zerops PostgreSQL database will not have Supabase's
  `auth.users` table. Marketing tables must therefore keep the Supabase user
  UUID as an application-owned tenant key without a cross-database foreign
  key. Auth remains at Supabase until a separate auth decision is made.

### Vercel-specific assumptions remain

- `apps/web/vercel.json` schedules the internal drain at `0 0 * * *`.
- The drain route's default lease owner is `vercel-cron`.
- `marketing-store.ts` checks `VERCEL` when selecting hosted production
  persistence behavior.
- Supabase auth safety detects Vercel, Render, and Netlify production hosts;
  Zerops needs an explicit production marker so a production container cannot
  accidentally run with an open auth bypass.
- The `.env.example` comment describes `CRON_SECRET` as a Vercel Cron secret.
  Zerops worker authentication should use service-to-service references and a
  private network instead.

### External integrations are credential- and account-dependent

The product cannot demonstrate live research, model generation, memory sync,
or provider publishing without the relevant credentials and connected
accounts. The following must be configured and tested at the actual deployment
boundary before they appear in demo copy:

- OpenAI for brand extraction, campaign planning, and drafts
- Firecrawl for optional richer crawling and Supermemory for optional retrieval
  enrichment; the deployed core path does not require either key
- Tavily and optional research providers for market evidence
- Composio plus an active X, LinkedIn, or Reddit connection for publication
- Supabase Auth keys while Auth remains external

Missing credentials must continue to produce an explicit unavailable state.

## 3. Current architecture

```text
Browser
  |
  v
Zerops web (Next.js + API routes)
  |-- Supabase Auth session
  |-- Zerops PostgreSQL
  |     |-- marketing state (brand/posts/campaign/loops/report state)
  |     `-- publishing attempts and outbox jobs
  |-- NATS JetStream wake-up subject
  |
  |-- @vibe/engine
  |     |-- Firecrawl / Tavily / OpenAI / Supermemory
  |     |-- Composio account links and provider execution
  |     `-- research, memory, agents, scoring and traces
  |
  `-- private /api/internal/publishing/drain compatibility path
          ^
          |
Zerops worker (Node/TypeScript)
  `-- NATS consumer -> private web drain -> provider confirmation
```

The database outbox remains authoritative for idempotency, leases, retries,
and provider outcomes. NATS only wakes the private worker, so a broker or
worker restart does not erase a publish attempt.

## 4. Vercel, Supabase, and provider dependencies

| Dependency | Current evidence | Migration treatment |
| --- | --- | --- |
| Vercel Cron | `apps/web/vercel.json`; drain `GET`; `CRON_SECRET` | Retain only as a recovery-compatible fallback; Zerops worker/NATS is the intended primary path. |
| Vercel runtime detection | `VERCEL` in `marketing-store.ts` | Add an explicit `ZEROPS` production marker and make production store selection independent of the hosting vendor. |
| Vercel auth safety | `VERCEL_ENV` in `supabase/config.ts` | Treat `ZEROPS=1`/`ZEROPS_ENV=production` as hosted production and fail closed when Auth is not configured. |
| Supabase Auth | `@supabase/ssr`, `supabase/server.ts`, `auth.ts`, auth callbacks/middleware | Keep for the hackathon unless a separate auth migration is proven safer. |
| Supabase marketing store | `marketing-store.ts`, `supabase-admin.ts`, `marketing_state` migration | Zerops runtime selects the PostgreSQL adapter; non-Zerops deployments retain the compatibility path. |
| Supabase publish repository | `publish-attempt-repo.ts`, publish outbox migrations/RPCs | Zerops runtime selects the PostgreSQL lease/idempotency adapter; preserve the existing service contract and tests. |
| Supabase VC Brain dual write | `postgres-dual.ts`, VC migrations | Leave unchanged for the secondary workflow until marketing persistence is stable. |
| OpenAI, optional Firecrawl/Supermemory | brand/campaign/draft routes and engine connectors | Keep server-only env secrets; the live core path labels direct HTTP plus Zerops PostgreSQL when optional enrichment is absent. |
| Composio | engine connector and `/api/composio/connect` | Keep real OAuth/provider confirmation; no fixture account or fabricated post ID. |
| Local JSON | `MARKETING_STORE_BACKEND=local`, `data/` paths | Keep only for local tests/offline development; never enable it in Zerops. |
| Demo/auth bypass switches | `AUTH_BYPASS`, `ALLOW_OPEN_APP`, `NEXT_PUBLIC_DEMO_DEFAULTS` | Set to disabled/absent in Zerops; add a startup/readiness check that rejects unsafe production combinations. |

## 5. Minimum Zerops-native architecture

### Phase 1 — live baseline

```text
Public web
  -> Zerops `web` Node.js service (existing Next.js app + API routes)
       |-> Supabase Auth (external, server-side/browser auth client)
       |-> Zerops `db` PostgreSQL (marketing state + publishing outbox)
       |-> Zerops `nats` JetStream wake-up transport
       `-> private Zerops `worker` service
```

This phase is intentionally not the final infrastructure story. It proves the
existing product can be built and reached on Zerops without changing business
behavior. It must include `/api/health` and `/api/ready`, production auth
guards, explicit secrets, and a reproducible root `zerops.yaml`.

### Phase 2 — application database

```text
Zerops `web` service
  -> Zerops `db` PostgreSQL service (private connection)
       |-> marketing_state JSONB row per Supabase owner UUID
       |-> marketing_publish_attempts
       `-> marketing_outbox_jobs

Supabase remains Auth-only.
```

The existing JSON-shaped marketing contract can be preserved first. This
reduces product risk while the storage boundary changes. The publishing
attempt tables should preserve their current status transitions, unique keys,
lease behavior, and outcome-unknown semantics. The new schema must not create
an FK to `auth.users`, because Auth is in a different database.

### Phase 3 — durable asynchronous worker

```text
web approval route
  -> PostgreSQL outbox/source of truth
  -> NATS JetStream subject `marketing.publish.requested`
  -> private `worker` Node.js service
  -> Composio / real provider
  -> PostgreSQL attempt + marketing state confirmation
  -> report/queue UI
```

NATS is transport, not the source of truth. A message must carry an attempt
ID, owner ID, post ID, content revision, and idempotency key. The worker must
be safe to redeliver: it reloads the database attempt, validates the content
hash, and lets the existing state machine decide whether to publish, confirm,
retry, dead-letter, or require manual reconciliation.

### Services required for the submission

| Service | Required now? | Product reason |
| --- | --- | --- |
| `web` Node.js | Yes | Existing UI, auth callback, API, queue/HITL/report surfaces. |
| `db` PostgreSQL | Provisioned; web readiness verified | Durable tenant-scoped marketing state and publishing execution records. |
| `nats` | Provisioned; worker connection verified | Durable delivery of asynchronous publish work and worker restart recovery. |
| `worker` Node.js | Active; NATS and private drain verified | Keeps asynchronous publishing dispatch out of the request-serving web path. |
| object storage | No for MVP | Add only if generated assets need durable evidence; current core path can operate without it. |
| Redis/Valkey/Qdrant | No | No current product requirement justifies them. |

## 6. Exact files to modify

### Baseline deployment files

- `zerops.yaml` — root service build/run definition for `web` and `worker`,
  including private database, NATS, and worker-secret references.
- `zerops-import.yaml`, `zerops-services-import.yaml`, and
  `zerops-worker-import.yaml` — non-secret infrastructure manifests for the
  provisioned Zerops services.
- `.deployignore` — prevent local state, secrets, caches, and test artifacts
  from entering the deployment bundle.
- `.env.example` — document `ZEROPS`, `DATABASE_URL`, NATS settings, and
  which secrets are injected only in the Zerops service environment.
- `apps/web/src/lib/supabase/config.ts` — recognize the Zerops production
  marker for auth safety.
- `apps/web/src/app/api/ready/route.ts` — make readiness distinguish process
  liveness from required external dependencies.

### Persistence phase

- `apps/web/src/lib/marketing-store.ts` — retain the existing contract and
  add an explicit PostgreSQL backend selection; do not weaken local/prod
  fail-closed behavior.
- `apps/web/src/lib/supabase-admin.ts` — remain Auth-only or be isolated from
  application persistence once the adapter is in place.
- `apps/web/src/lib/publishing/publish-attempt-repo.ts` — add a PostgreSQL
  implementation while preserving the repository interface.
- `apps/web/src/lib/zerops-postgres.ts` — pool/configuration, schema bootstrap,
  parameterized queries, owner scoping, and transaction helpers.
- `apps/web/src/lib/publishing/zerops-publish-attempt-repo.ts` — PostgreSQL
  attempts/outbox adapter without Supabase-specific foreign keys.
- Relevant tests beside `marketing-store`, publishing repository/service, and
  a live PostgreSQL integration check after the Zerops service is deployed.

### Queue/worker phase

- `apps/worker/` — NATS connection, JetStream durable consumer, bounded
  wake-up handling, shutdown handling, and structured logs.
- `apps/web/src/lib/publishing/publish-attempt-service.ts` — extract the
  provider-independent execution contract or move the shared execution core
  so web and worker do not duplicate state-machine logic.
- `apps/web/src/app/api/internal/publishing/drain/route.ts` — retain only as
  a guarded recovery/admin path; remove Vercel Cron as the primary dispatcher.
- New queue contract module and tests — versioned payload, idempotency key,
  ack/nack behavior, redelivery, and poison-message handling.
- `zerops.yaml` — already defines the `web` and `worker` setups; managed
  `db`/`nats` are provisioned through the import manifests.

### Demo and documentation

- `README.md` — describe the live Zerops architecture, actual links, setup,
  provider requirements, and limitations after they are verified.
- `docs/ZEROPS-HACK-PLAN.md` — keep this plan updated with evidence.
- `docs/decisions.md` — record why Supabase Auth remains, why PostgreSQL is
  the source of truth, why NATS is transport, and why no Redis/vector store
  was added.
- `docs/ai-usage.md` — disclose Codex, ZCP, and any other AI coding tools;
  document human product, security, architecture, test, and deployment work.
- `specs/marketing-loop.md` and focused tests — acceptance contract for URL,
  memory, draft, approval, provider confirmation, and report.

## 7. Minimal migration strategy

### Step 0 — establish a clean baseline

Run the existing engine/web checks before changing application behavior. Fix
only failures caused by the cloned tree or environment. Record the exact
commit, checks, and missing credentials. Do not treat a local build as live
deployment proof.

### Step 1 — deploy the existing web application

Add a phase-1 `zerops.yaml` for a Node.js 22 `web` service. The service must
run `pnpm install --frozen-lockfile`, build the existing `web` workspace, and
start Next on the declared HTTP port. Inject Supabase/provider secrets through
Zerops environment variables; never commit them or put them in YAML.

Use `/api/ready` as the health path only if it accurately reports the current
baseline dependencies. A green process with missing Auth/persistence must not
be described as a ready SaaS.

### Step 2 — port only marketing persistence

Do not migrate Auth and application data at the same time. Introduce a
PostgreSQL adapter behind an explicit `MARKETING_STORE_BACKEND=postgres` flag:

1. Create the Zerops schema with owner UUIDs as application tenant keys.
2. Port `marketing_state` first, preserving the JSON contract and CAS version.
3. Port publishing attempts/outbox second, preserving idempotency and lease
   semantics.
4. Run the same lifecycle/publishing tests against local PostgreSQL.
5. Use an explicit cutover/rollback flag; do not silently dual-write or fall
   back on errors.
6. Keep Supabase Auth and use its authenticated user UUID as the tenant key.

For an existing live workspace, add a reviewed one-time migration tool that
copies data from Supabase to Zerops PostgreSQL and verifies counts/hashes. Do
not run it against a production project until the diff is reviewed.

### Step 3 — add NATS without deleting recovery state

Approval creates the durable database attempt first. A queue publisher then
emits a versioned `marketing.publish.requested` message containing only the
IDs and hashes needed to reload authoritative state. If NATS is unavailable,
the API reports queue unavailability; it must not claim the job is being
processed.

The worker consumes with JetStream durable delivery, reloads the attempt and
post from PostgreSQL, and calls the existing provider-confirming execution
logic. A successful provider response is not enough: the worker must complete
the existing store confirmation before acknowledging the message. Unknown
provider outcomes stay manual-reconciliation states.

The DB outbox remains useful as recovery/reconciliation state. A small
dispatcher/recovery loop can republish pending attempts after worker/NATS
failure without making duplicate provider calls because the attempt key and
state machine remain authoritative.

### Step 4 — final demo hardening

Use one connected provider and one channel for the first live proof. Show:

```text
URL -> live research/memory -> channel drafts -> HITL approval
   -> PostgreSQL attempt -> NATS delivery -> private worker
   -> real provider response -> confirmed execution record -> report
```

If a provider is not connected, show the explicit unavailable/queued state;
do not invent a published result. Keep the demo within the product’s actual
capabilities.

## 8. Deployment risks and mitigations

| Risk | Mitigation / exit condition |
| --- | --- |
| Next.js monorepo deploy bundle is incorrect | First deploy the existing web service with a minimal health route; inspect build/runtime logs before optimizing `deployFiles`. |
| Node/pnpm version mismatch | Pin Node 22 in Zerops and use the lockfile’s package manager through Corepack; verify the exact build command locally. |
| Supabase Auth is missing on Zerops | Inject public Auth URL/key and server service role as secrets; production startup/readiness must fail closed. |
| Auth and DB live in different systems | Store only the Supabase user UUID as an app tenant key in Zerops PostgreSQL; no cross-database FK. |
| Data migration causes loss | Use explicit backend flag, reviewed copy/verify tool, and rollback to Supabase before cutover. |
| NATS redelivery causes duplicate posts | Reload DB attempt, validate content hash/idempotency, and acknowledge only after provider confirmation is persisted. |
| Provider call times out after posting | Preserve `outcome_unknown`; require reconciliation instead of auto-republishing. |
| Worker secrets are overexposed | Private network, service-level env isolation, only provider/db/NATS secrets in the worker. |
| Credits or build size are constrained | Start with one web container, one single PostgreSQL service, one worker, small bounded jobs; no Redis/Qdrant/object storage without need. |
| Demo depends on too many providers | Choose one real connected channel; show unavailable states for the rest. |
| Current Vercel cron remains active accidentally | Make the Zerops worker the documented primary path and keep the legacy route guarded/recovery-only before final submission. |

## 9. Demo-critical journey

The judge should understand the product before seeing the infrastructure.

1. Open VibeMarketer and submit a real product URL.
2. Show the returned evidence-backed brand memory and its provider/source
   status.
3. Generate a campaign or one X/LinkedIn/Reddit draft from the stored memory.
4. Open the HITL queue and edit/reject/approve one draft.
5. Show the publish attempt changing from pending to worker execution once a
   real provider account is connected.
6. Show the Zerops service view or logs: `web`, `db`, `nats`, and `worker`.
7. Show the real provider-confirmed post ID/URL, or clearly show the blocked
   unavailable state if the account is not connected.
8. Open the report/execution record and explain that a green queue state is
   not the same thing as a provider-confirmed publication.

The core URL-to-draft path is already verified on the live deployment. The
provider-confirmed portion remains intentionally unclaimed until Composio and
one connected social account return a real external identifier.

The final demo should use only links and states that were verified after the
last deployment. The public URL, repository, video, social post, and
submission form remain separate submission requirements.

## 10. Ordered implementation checklist

### P0 — required to submit/win

#### P0.1 — clean baseline and challenge documentation

- **Files:** `docs/ZEROPS-HACK-PLAN.md`, `docs/ai-usage.md`,
  `docs/decisions.md`, `specs/marketing-loop.md`, root `README.md`.
- **Expected result:** The existing product, honest provider boundaries,
  architecture, and Zerops acceptance path are explainable and reviewable.
- **Verification:** `pnpm test:unit`; inspect docs; confirm no secrets are
  tracked.
- **Demo value:** Judges can follow the product story and understand original
  human contribution.
- **Zerops value:** Shows infrastructure is supporting a real product flow,
  not a random service count.

#### P0.2 — live Next.js baseline on Zerops

- **Files:** `zerops.yaml`, `.deployignore`, `.env.example`,
  `apps/web/src/lib/supabase/config.ts`, `apps/web/src/app/api/ready/route.ts`.
- **Expected result:** Existing VibeMarketer builds, starts, and exposes a
  verified live URL on Zerops with production-safe Auth settings.
- **Verification:** local `corepack pnpm --filter web build`; Zerops build
  logs; `GET /api/ready`; authenticated app smoke.
- **Demo value:** A real existing SaaS is live before infrastructure work is
  shown.
- **Zerops value:** First reproducible build/deploy pipeline and runtime
  health check.

#### P0.3 — Zerops PostgreSQL as marketing source of truth

- **Files:** new PostgreSQL migrations/config, `marketing-store.ts`, new
  postgres adapter/pool modules, `publish-attempt-repo.ts`, env example,
  lifecycle/publishing tests.
- **Expected result:** Auth remains Supabase, while marketing state and durable
  publishing records persist in Zerops PostgreSQL with owner scoping and CAS.
- **Verification:** local PostgreSQL migration; store lifecycle tests;
  publishing repository/service tests; restart/re-read persistence check.
- **Demo value:** Refresh/restart does not lose the brand, drafts, queue, or
  report.
- **Zerops value:** A managed database is essential to the product, not a
  decorative dependency.

#### P0.4 — private worker with durable NATS delivery

- **Files:** worker package/app, queue contract, publish service extraction,
  drain route, `zerops.yaml`, queue/worker tests.
- **Expected result:** Approved work leaves the web request path, survives
  worker restart/redelivery, and reaches the real provider through a private
  worker.
- **Verification:** local NATS/PostgreSQL integration; publish one request;
  restart worker; verify one provider attempt and one confirmed execution.
- **Demo value:** Visible agent fleet and a compelling async execution story.
- **Zerops value:** Demonstrates private networking, managed NATS, multiple
  runtimes, and operational recovery.

#### P0.5 — one complete live URL-to-report flow

- **Files:** existing marketing routes/UI, focused acceptance spec/tests,
  README/demo docs, deployment env configuration.
- **Expected result:** URL → memory → draft → HITL approval → queued worker →
  real provider confirmation → report works on the deployed system.
- **Verification:** recorded browser run plus API/service logs and provider
  response; no fixture or fake success.
- **Demo value:** The entire story fits a short judge-verifiable demo.
- **Zerops value:** Proves the platform runs the product’s real critical path.

#### P0.6 — public source, stable deployment, and submission evidence

- **Files:** `README.md`, `docs/`, `zerops.yaml`, `submission.md` (fill only
  after evidence exists), demo/social assets.
- **Expected result:** Repository, live URL, video, social post, Zerops
  explanation, AI disclosure, and submission fields are complete and honest.
- **Verification:** incognito URL check, repository clone/build check, video
  permission check, official submission confirmation.
- **Demo value:** Removes eligibility failure unrelated to code quality.
- **Zerops value:** Gives judges a reproducible deployment and architecture
  they can inspect.

### P1 — strong differentiation

#### P1.1 — execution timeline and failure/recovery UI

- **Files:** queue/report UI and API response types; worker event persistence.
- **Expected result:** A judge can see queued, running, retryable, unknown,
  confirmed, and failed states with timestamps and actionable errors.
- **Verification:** deterministic state-transition tests and one recorded
  worker restart/recovery run.
- **Demo value:** Makes async infrastructure visible instead of theoretical.
- **Zerops value:** Demonstrates logs/health/recovery as part of the product.

#### P1.2 — evidence-backed campaign report

- **Files:** report route/UI, engine trace/evidence mapping, report tests.
- **Expected result:** Generated content links back to brand facts/evidence and
  provider execution records; no unsupported metrics are shown.
- **Verification:** report fixture is test-only; live report displays only
  persisted evidence and provider responses.
- **Demo value:** Differentiates VibeMarketer from a generic copy generator.
- **Zerops value:** Shows Postgres persistence and worker execution records
  producing a useful product artifact.

#### P1.3 — deployment/readiness observability

- **Files:** health/readiness checks, structured worker logs, docs/operations.
- **Expected result:** Service readiness distinguishes web process, database,
  NATS, provider configuration, and auth availability.
- **Verification:** fail each dependency in a safe local environment and verify
  the correct non-green result.
- **Demo value:** Supports the claim that the product is production-style.
- **Zerops value:** Makes Zerops health checks and private service status
  inspectable.

### P2 — optional

#### P2.1 — durable object storage for generated campaign assets

- **Files:** asset adapter, provider URL handling, `zerops.yaml`, tests.
- **Expected result:** Only if a real campaign flow needs generated images or
  downloadable artifacts, store them in Zerops object storage with signed or
  controlled access.
- **Verification:** upload/read/delete integration and access-control test.
- **Demo value:** Useful visual polish only if the product already needs it.
- **Zerops value:** Adds a justified storage service rather than service-count
  theater.

#### P2.2 — scheduled campaign jobs

- **Files:** worker scheduler/subject, schedule tables, UI, tests.
- **Expected result:** A user can schedule a draft without bypassing HITL or
  provider confirmation.
- **Verification:** time-controlled integration test and one live scheduled
  run.
- **Demo value:** Shows a natural SaaS continuation of the workflow.
- **Zerops value:** Uses worker scheduling/cron only after the base queue is
  reliable.

#### P2.3 — worker scaling proof

- **Files:** worker concurrency/config, operations docs, demo script.
- **Expected result:** Bounded worker concurrency or a second container can
  process independent jobs without violating tenant/idempotency rules.
- **Verification:** load a small batch and verify one execution record per
  attempt.
- **Demo value:** Strong infrastructure proof if stable.
- **Zerops value:** Demonstrates scaling based on a real workload.

#### P2.4 — GitHub/ZCP deployment evidence

- **Files:** deployment docs and project configuration only.
- **Expected result:** A commit triggers a Zerops build and the agent can
  inspect service status/logs and verify the resulting URL.
- **Verification:** one real commit/deploy/health readback after credentials
  and project access are available.
- **Demo value:** Connects the challenge’s ZCP story to the shipped product.
- **Zerops value:** Shows the control-plane feedback loop directly.

## Ranked top ten execution tasks

| Rank | Priority | Task | Hard exit condition |
| ---: | :---: | --- | --- |
| 1 | P0 | Baseline tests and documentation | Existing core checks are green or failures are recorded with cause. |
| 2 | P0 | Add and validate phase-1 `zerops.yaml` | `web` health/readiness is reachable on Zerops. |
| 3 | P0 | Add Zerops production/auth guard | Missing Auth or unsafe bypass cannot present as ready production. |
| 4 | P0 | Port marketing state to Zerops PostgreSQL | Brand/draft/queue/report survive restart with owner isolation. |
| 5 | P0 | Port publish-attempt/outbox repository | Existing idempotency/lease/outcome tests pass on the new DB. |
| 6 | P0 | Add NATS contract and private worker | One approved attempt reaches one real provider execution. |
| 7 | P0 | Verify full URL-to-report journey | Recorded live run has no fixture or fabricated result. |
| 8 | P1 | Make worker state visible in queue/report UI | Judge can see real execution and failure states. |
| 9 | P1 | Harden readiness, recovery, and evidence docs | Dependency failures and worker restarts are explicit and recoverable. |
| 10 | P2 | Add only one justified stretch feature | Core submission is already stable and feature freeze is respected. |

## Verification baseline

Run narrow checks before broad checks:

```bash
corepack pnpm test:engine
corepack pnpm --filter web test:content
corepack pnpm lint
corepack pnpm --filter @vibe/engine typecheck
corepack pnpm build
```

When dependencies are installed and a local server can boot, add:

```bash
corepack pnpm --filter web verify:production
```

These commands prove local code behavior only. A final submission also needs
live Zerops URL, service health/log evidence, authenticated product flow,
provider response, public source, video, social post, and official form
confirmation.

## External setup still required

The Zerops account and challenge project are now authenticated and verified.
Project `0xanand` (`IzGL13uGTKeL0Cg8qBNvjw`) is active. The `web`, `db`,
`nats`, and `worker` services are active. The remaining human-controlled setup
must be completed without pasting secrets into chat:

1. Add the real Supabase service-role key to the Zerops project environment;
   the browser-facing URL and publishable key are already public config in the
   committed deployment definition.
2. Add the real provider secrets required for the demonstrated workflow.
   OpenAI is already configured for the core flow; Firecrawl, Supermemory, and
   Tavily remain optional enrichment, while Composio plus one connected social
   account is required for provider-confirmed publishing.
3. Exercise one real URL-to-brand-memory/campaign flow on the live web app.
4. Exercise one approved publishing attempt and verify the returned provider
   identifier through the private worker.

The Zerops deployment itself is already externally verified. Until the
provider steps return evidence, the repository is not submission-ready for a
provider-confirmed demo.

## Implementation log — 2026-08-08

Completed locally in the first migration slice:

- Added the phase-1 root [`zerops.yaml`](../zerops.yaml) for a Node.js 22
  `web` service, Corepack/pnpm build, direct Next start command, and
  `/api/ready` health check.
- Added [`.deployignore`](../.deployignore) so local credentials, agent
  state, caches, and data do not enter the deployment bundle.
- Added Zerops runtime markers and reserved PostgreSQL/NATS environment names
  to [`.env.example`](../.env.example).
- Extended the existing Auth/site production guards to recognize Zerops.
  `isAuthBypassed()` now fails closed on a Zerops production container when
  Supabase Auth is missing instead of silently opening `/app`.
- Added `apps/web/src/lib/zerops-runtime.test.ts` for those guards.
- Updated root package scripts and the README to use Corepack, avoiding this
  machine’s broken global pnpm shim.

Verified locally:

```text
corepack pnpm test:unit                         PASS
corepack pnpm lint                              PASS
corepack pnpm --filter @vibe/engine typecheck   PASS
corepack pnpm build                             PASS
yq Zerops YAML structure check                   PASS
```

A local production-runtime smoke also verified: the homepage returned 200;
`/app` redirected to `/login` with public Auth configuration but no session;
`/api/ready` returned the honest 503 degraded state without the service-role
database connection; and a Zerops-marked boot without public Auth variables
was rejected by the production guard. These are local boundary checks, not a
public deployment claim.

The existing public URL `https://www.vibemarketer.fun` separately passed the
repository production gate at **10/10** (readiness, marketing narrative,
pricing, auth boundary, internal-route protection, HSTS, browser security
headers, and canonical host redirect). That proves the current public
deployment is healthy under the existing hosting setup; it does not prove
that the application is deployed on Zerops.

Zerops access is now authenticated. The following is the initial pre-deploy
inventory snapshot (the continuation evidence below is authoritative). Read-only
inventory found project
`0xanand` (`IzGL13uGTKeL0Cg8qBNvjw`, ACTIVE) with its existing `zcp` service.
The phase-1 `web` Node.js service was then created from
[`zerops-import.yaml`](../zerops-import.yaml) and verified as
`READY_TO_DEPLOY` (service ID `tlq6CSlESEeBfHignulafg`).

That initial deployment blocker is resolved for the web checkpoint. The
standalone Next.js runtime is deployed and the public subdomain is enabled at
`https://web-2b24-3000.prg1.zerops.app`. Server-only Supabase and provider
secrets are still intentionally absent from the repository and must be added
in Zerops before the authenticated research/publishing demo can be claimed.

## Continuation evidence — 2026-08-08

- The public source repository is `https://github.com/Anand-0038/vibemarketer`.
- Local Git commits are authored as `Anand-0038`.
- Zerops inventory currently contains active `web`, `db`, `nats`, and `worker`
  services.
- Public web evidence: `/api/ready` returned HTTP 200 with `ok: true`, `/`
  and `/login` returned HTTP 200, `/app` returned the expected 307 redirect
  to `/login`, and a Next static asset returned HTTP 200.
- The deployment used Next standalone output and Zerops runtime init commands
  to place static/public assets beside the traced server.
- The PostgreSQL marketing-store adapter, publishing-attempt adapter, NATS
  wake-up publisher, and private worker are implemented and locally verified.
- `corepack pnpm test:unit`, `corepack pnpm lint`, `corepack pnpm build`, and
  the worker typecheck/build gates pass locally.
- The worker reached NATS with explicit credentials and its private fallback
  drain checks are succeeding after the shared secret restart. The core and
  approval-boundary demo recordings are now committed under `docs/demo/`.
  One provider-confirmed publish, the social post, and final submission form
  remain outstanding. No provider success is claimed without real credentials
  and a returned provider identifier.
- The Zerops callback URL is now allowlisted in the external Supabase Auth
  project. The challenge Auth configuration uses autoconfirm because the
  default shared Supabase mailer is restricted to authorized team addresses;
  a disposable real signup returned an immediate session and the test user
  was deleted afterward. No email delivery is claimed from that smoke.
