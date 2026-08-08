# VibeMarketer judge demo

This script is for a 60–90 second recording. Use the live Zerops URL and only
show states verified after the latest deployment.

## Current verified route

Live application: <https://web-2b24-3000.prg1.zerops.app>

Recorded core-flow walkthrough: [`demo/vibemarketer-core-demo.mp4`](demo/vibemarketer-core-demo.mp4)

Approval-boundary walkthrough: [`demo/vibemarketer-approval-boundary.mp4`](demo/vibemarketer-approval-boundary.mp4)

The verified core route is:

```text
product URL → direct HTTP evidence → OpenAI brand extraction
→ Zerops PostgreSQL brand memory → campaign → channel drafts
```

The live evidence is in [`LIVE-DEMO-EVIDENCE.md`](LIVE-DEMO-EVIDENCE.md).

## Recording script

### 0:00–0:08 — Product promise

Say:

> “VibeMarketer is Cursor for marketing: give it a product URL and get
> evidence-backed, on-brand campaign drafts that stay under human approval.”

Open the live application and show the product URL intake.

### 0:08–0:25 — Brand memory

Submit a real public product URL. Show the returned facts and source status.
Call out that the current fallback is an SSRF-guarded public HTTP reader, a
live OpenAI extraction, and a structured Zerops PostgreSQL record. Do not call
the fallback Firecrawl or Supermemory.

### 0:25–0:42 — Campaign and drafts

Generate the seven-day campaign preview and show the three channel drafts.
Refresh once to demonstrate that the structured brand state survives through
the Zerops PostgreSQL marketing store.

### 0:42–0:55 — Human approval boundary

Open the queue. Explain:

> “A draft is not a published post. Approval creates a durable publishing
> attempt; the application only marks it published after a provider returns a
> real external identifier.”

### 0:55–1:10 — Zerops architecture

Show the Zerops project services briefly: `web`, `db`, `nats`, and private
`worker`. Say:

> “PostgreSQL is the source of truth, NATS JetStream wakes the private worker,
> and the worker reaches the internal drain without exposing infrastructure
> services publicly.”

### 1:10–1:25 — Provider boundary

If Composio and one social account are connected, show the real provider
response, post ID/URL, and execution report. If they are not connected, show
the explicit unavailable state and say:

> “The system fails closed here. It does not fabricate a success or a post
> URL.”

## Do not show or claim

- No secret values, session tokens, or personal account details.
- No provider-confirmed post until a real provider response is persisted.
- No claim that Firecrawl, Supermemory, Tavily, or Composio ran unless its
  response is visible in the recorded run.
- No claim that the Vercel custom domain is the Zerops deployment. Use the
  Zerops URL above for the challenge submission.
