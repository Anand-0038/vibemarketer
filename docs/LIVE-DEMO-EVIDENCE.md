# VibeMarketer live demo evidence

This is a redacted engineering record for the live Zerops deployment. It is
not an official challenge submission and contains no tokens, passwords, user
identifiers, or provider secrets.

## Deployment under test

- Date: 2026-08-08 UTC
- Repository: `https://github.com/Anand-0038/vibemarketer`
- Verified deployed commit: `c744b24`
- Repository evidence commit: `69a628a`
- Zerops URL: `https://web-2b24-3000.prg1.zerops.app`
- Zerops project: `0xanand`
- Active services: `web`, managed `db` PostgreSQL, `nats`, private `worker`

## Public checks

The following checks were run against the public deployment after the verified
commit was deployed:

| Check | Result |
| --- | --- |
| `GET /api/ready` | HTTP 200, `{ "ok": true, "product": "vibemarketer", "status": "ready" }` |
| `GET /` | HTTP 200 |
| `GET /login` | HTTP 200 |
| Unauthenticated `GET /app` | Expected redirect to `/login` |
| Next static asset | HTTP 200 |

## Core product smoke

Using a disposable test account, the live flow completed and the temporary
Auth user was removed afterward. The test did not expose the email address or
session token in the evidence:

```text
signup             HTTP 200
POST /api/brand    HTTP 200  extraction=direct_http retrieval=zerops_postgres facts=10
POST /api/campaign HTTP 200  source=openai+zerops_postgres days=7
POST /api/draft    HTTP 200  source=openai+zerops_postgres drafts=3 pending
Auth cleanup       HTTP 200
```

This proves the current challenge slice is a real URL-to-brand-to-campaign-
to-draft path. The `direct_http` reader is SSRF-guarded, OpenAI produced the
structured extraction and campaign/draft output, and the structured brand
record was persisted through the Zerops PostgreSQL backend. Firecrawl and
Supermemory are optional enrichment providers and are not claimed in this
smoke.

## Zerops infrastructure evidence

- The web runtime selects Zerops PostgreSQL for tenant-scoped marketing state
  and publishing outbox state.
- NATS JetStream is used as a durable worker wake-up transport; PostgreSQL
  remains authoritative for idempotency, leases, retries, and outcomes.
- The private worker reached NATS with explicit credentials and completed
  private drain health checks after the shared internal secret was activated.
- Internal database, NATS, and worker services are not public application
  endpoints.

## Approval-boundary smoke

A second disposable-account run approved one generated draft through the live
HITL queue. The public UI reported `Queued for provider execution` while
Composio was unavailable, and the report showed one queue event with zero
provider-published posts. This is the intended fail-closed behavior: approval
records delivery intent, but the product does not claim publication without a
provider identifier.

The recorded browser evidence is
[`demo/vibemarketer-approval-boundary.mp4`](demo/vibemarketer-approval-boundary.mp4).

## Not yet verified

The following claims remain deliberately open:

- Composio provider access with a connected LinkedIn, X, or Reddit account.
- A provider-confirmed post ID/URL and execution report for a real social post.
- The public build video and social post.
- The official challenge submission form and confirmation.

Do not describe the current deployment as having published a social post until
the worker receives a real provider response and the returned identifier is
captured here and in the final demo notes.
