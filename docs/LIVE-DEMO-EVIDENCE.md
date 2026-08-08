# VibeMarketer live demo evidence

This is a redacted engineering record for the live Zerops deployment. It is
not an official challenge submission and contains no tokens, passwords, user
identifiers, or provider secrets.

## Deployment under test

- Date: 2026-08-08 UTC
- Repository: `https://github.com/Anand-0038/vibemarketer`
- Verified web source commit: `5954d78`
- Verified worker/deployment-manifest commit: `4065282`
- Zerops web rollout containing `5954d78` completed at 2026-08-08 23:02:53
  UTC; `/api/ready` returned `ready` at 23:02:56 UTC. The private worker
  rollout containing `4065282` completed earlier at 21:43 UTC and started
  successfully with the pruned runtime bundle.
- Zerops URL: `https://web-2b24-3000.prg1.zerops.app`
- Zerops project: `0xanand`
- Active services: `web`, managed `db` PostgreSQL, `nats`, private `worker`

## Public checks

The following checks were run against the public deployment after the verified
commit was deployed:

| Check | Result |
| --- | --- |
| `GET /api/ready` | HTTP 200, `ok=true`, `status=ready`, Auth configured/reachable, signup enabled, confirmation not required |
| `GET /` | HTTP 200 |
| `GET /login` | HTTP 200 |
| `GET /signup` | HTTP 200 |
| `POST /api/auth/email` with invalid fields | HTTP 303 to `/signup`; no email, password, or confirm field appears in the redirect URL |
| Unauthenticated `GET /app` | Expected redirect to `/login` |
| Next static asset | HTTP 200 |
| Unauthenticated `GET /api/marketing/posts` | HTTP 401; marketing state is private |
| Unauthenticated `GET /api/internal/publishing/status` | HTTP 401; worker secret required |

## Auth browser smoke

The public signup and login forms were exercised in a real headless Chrome
session against the Zerops URL. The email form now uses a same-origin native
POST to `/api/auth/email`; this avoids the Server Action transport that
returned a platform 502 on the Zerops runtime. Disposable test accounts were
used for verification; no password or session token is retained in this
record.

| Check | Result |
| --- | --- |
| New-account signup | Native form → `/api/auth/email` HTTP 303; Supabase session cookies returned; browser reached `/app` |
| Signup destination | `/app`, authenticated workspace rendered; `/api/marketing/posts` HTTP 200 |
| Signout destination | `https://web-2b24-3000.prg1.zerops.app/login`; no internal `0.0.0.0` redirect |
| Existing confirmed-account login | Native form → `/api/auth/email` HTTP 303; session cookie returned |
| Login destination | `/app`, authenticated workspace rendered; `/api/marketing/posts` HTTP 200 |
| Email/OTP dependency | New challenge accounts use Auth autoconfirm; no inbox or OTP delivery is claimed |

Judges can use any disposable email address, an eight-character password
containing a letter and a number, and continue immediately. Older accounts
created while email confirmation was enabled may still need confirmation; the
UI reports that state instead of hanging on a spinner.

## Core product smoke

Using a disposable `example.com` test account, the live flow completed. The
test did not expose the email address, password, or session token in the
evidence:

```text
signup             HTTP 303 -> /app; authenticated session established
POST /api/brand    HTTP 200  extraction=direct_http persistence=zerops_postgres
POST /api/campaign HTTP 200  source=openai+zerops_postgres days=7
POST /api/draft    HTTP 200  source=openai+zerops_postgres drafts=3 pending
GET /api/marketing/posts  HTTP 200  persisted tenant-owned posts=3
POST /api/marketing/posts/:id/approve  HTTP 200  queue_denied/provider_not_connected; post=queued
```

The latest rollout also rejected `POST /api/brand` with
`error_code=UNSAFE_URL` for `http://127.0.0.1/internal` and accepted the live
public deployment URL with HTTP 200. Remote crawling is now preceded by DNS
and private/reserved-address validation.

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
- The private worker rollout logged `publishing_worker_connected` for the
  `VIBEMARKETER_MARKETING` JetStream stream with explicit credentials, then
  completed private drain polling after the shared internal secret was
  activated.
- The worker build deploys a 1.4 MiB production artifact (333.5 KiB uploaded)
  containing only its compiled runtime and production dependencies; the full
  monorepo remains build-only input.
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

The combined judge walkthrough is
[`demo/vibemarketer-judge-demo.mp4`](demo/vibemarketer-judge-demo.mp4).

## External follow-ups

The following claims remain deliberately open:

- Composio provider access with a connected LinkedIn, X, or Reddit account.
- A provider-confirmed post ID/URL and execution report for a real social post.
- The submitted Medium URL is a product/problem essay; a separate build-post
  package containing the video, live URL, Zerops explanation, and required tags
  is still needed for a defensible social-track claim.
- The official challenge page displayed `Submitted` after the owner filed the
  form; this is recorded as owner-confirmed rather than an independently
  queried organizer API result.

Do not describe the current deployment as having published a social post until
the worker receives a real provider response and the returned identifier is
captured here and in the final demo notes.
