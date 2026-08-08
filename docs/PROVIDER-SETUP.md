# Live provider gate

The Zerops deployment is healthy, and the core brand-to-campaign-to-draft
demo has returned real OpenAI and Zerops PostgreSQL responses. The product
demo must not claim provider-confirmed publication until the required
publishing provider has returned a real response. Add
secrets in the Zerops project environment only; never commit them or paste
their values into chat.

## Minimum URL-to-draft demo

| Variable | Used by | Required for |
| --- | --- | --- |
| `FIRECRAWL_API_KEY` | `POST /api/brand` | Optional richer map/markdown extraction |
| `OPENAI_API_KEY` | brand extraction, campaign and drafts | Extract the brand profile and generate channel-native drafts |
| `SUPERMEMORY_API_KEY` | brand sync and recall | Optional semantic/episodic retrieval enrichment |

The core live path does not fabricate a result when those optional providers
are absent. It uses the engine's SSRF-safe public HTTP reader, OpenAI's
evidence-grounded extraction, and the Zerops PostgreSQL structured brand
record as the source used by campaign and draft prompts. Responses label this
as `direct_http` + `zerops_postgres`; they do not claim Firecrawl or
Supermemory ran. Configure the optional keys when richer crawling or semantic
retrieval is available.

`TAVILY_API_KEY` is optional enrichment for web-research facts. A missing
Tavily response does not turn into invented research.

## Minimum provider-confirmed publish demo

| Variable / setup | Used by | Required for |
| --- | --- | --- |
| `COMPOSIO_API_KEY` | web connector routes and private publishing worker | Provider API access, OAuth connection management, and live execution |
| Connected Composio account | the selected channel | A real LinkedIn, X, or Reddit publish confirmation |

The connected account must be authorized through the product's OAuth flow for
the demo user. A draft becoming `approved` is not a publish: the worker only
records `published` after the provider returns a valid external identifier.

Add `COMPOSIO_API_KEY` as a project-level secret so both the public web
connector routes and the private worker receive it. Do not put the value in
`zerops.yaml`, Git, screenshots, or chat. After the secret is added, restart or
redeploy `web` and `worker`, open `/app/connectors`, connect one channel, and
refresh until that toolkit reports `ACTIVE`.

## Existing Zerops boundaries

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
  public browser configuration already supplied by the deployment manifest.
- Supabase Auth remains the login boundary for this challenge slice.
- `SUPABASE_SERVICE_ROLE_KEY` is needed for admin-only compatibility paths,
  billing/entitlement operations, and some existing non-core routes. It is not
  a substitute for the public Auth configuration and is not required merely
  for `/api/ready` or the Zerops PostgreSQL marketing store.
- `DODO_*` variables are billing-only and are out of the core hackathon demo.
- `INTERNAL_WORKER_SECRET` is generated and stored in the Zerops project
  environment; it must be shared by `web` and `worker` but never committed.

## Verification order

After adding the secrets through Zerops, verify in this order:

1. Open the public web URL and sign in with a real Supabase Auth account. The
   current challenge Auth project uses autoconfirm because its default shared
   mailer is not a general delivery service; no confirmation email is claimed.
2. Submit a real product URL through the brand-intake flow.
3. Confirm the direct HTTP or Firecrawl extraction, OpenAI response, and
   Zerops PostgreSQL brand state after refresh. Supermemory is optional
   enrichment and must only be described when it returned successfully.
4. Generate a campaign and at least one draft; keep it in the HITL queue.
5. Connect one social provider through Composio.
6. Approve one draft, observe the NATS wake-up and private worker logs, and
   verify the provider's returned post identifier in the execution record.

Capture URLs, timestamps, provider status, and returned identifiers for the
demo notes. Do not record secret values.
