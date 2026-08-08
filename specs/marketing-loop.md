# VibeMarketer marketing loop acceptance contract

This contract defines the one judge-verifiable workflow the product must
support. It keeps deterministic infrastructure state separate from
non-deterministic model output and prevents a queued action from being called
published without a real provider response.

## Core journey

```text
public product URL
  -> attributable brand memory
  -> channel-native campaign drafts
  -> human approval
  -> durable publishing attempt
  -> private worker execution
  -> provider-confirmed result
  -> execution report
```

## Acceptance criteria

| ID | Requirement | Evidence |
| --- | --- | --- |
| ML-01 | A signed-in founder can submit a valid public product URL. | Live onboarding request returns a structured result or an actionable provider error. |
| ML-02 | Brand memory contains attributable facts and source status. | Each fact records source/provenance; unsupported claims are not silently accepted. |
| ML-03 | Brand memory survives a refresh and web restart. | The live deployment reads the same owner-scoped record from Zerops PostgreSQL. |
| ML-04 | A campaign produces channel-native drafts from stored brand memory. | Live campaign and draft responses identify their evidence/storage path. |
| ML-05 | Drafts remain pending until an explicit human approval. | HITL queue exposes edit, approve, reject, and unavailable-provider states. |
| ML-06 | Approval creates an idempotent durable publishing attempt. | PostgreSQL outbox state contains the attempt and its content revision/hash. |
| ML-07 | NATS wakes a private worker without becoming the source of truth. | Worker consumes the wake-up, calls the private drain, and the database remains authoritative. |
| ML-08 | A post becomes published only after a real provider identifier is persisted. | Provider URL/ID is present; queued, failed, and unknown outcomes remain distinct. |
| ML-09 | Provider failures fail closed. | No fixture, template, or fabricated success appears in the queue or report. |
| ML-10 | The report distinguishes drafted, queued, failed, and provider-confirmed activity. | Report values come from persisted workspace and execution records only. |
| ML-11 | The public deployment remains reachable and production-safe. | Zerops `/api/ready`, public routes, Auth guard, and service health checks pass. |

## Current verification boundary

ML-01 through ML-07, ML-09, ML-10, and ML-11 are covered by the current live
core-flow and infrastructure evidence in
[`docs/LIVE-DEMO-EVIDENCE.md`](../docs/LIVE-DEMO-EVIDENCE.md).

ML-08 remains an external credential gate: it requires a real Composio key,
one connected LinkedIn, X, or Reddit account, and a provider response with an
external identifier. The product must remain honest and show the unavailable
state until that gate is verified.

## Verification commands

```bash
corepack pnpm test:unit
corepack pnpm lint
corepack pnpm build
```

The live boundary also requires a public `/api/ready` check, an authenticated
browser smoke, and—once a provider is connected—a real provider response and
execution record.
