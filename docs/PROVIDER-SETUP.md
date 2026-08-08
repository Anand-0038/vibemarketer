# Live provider gate

The Zerops deployment is healthy, but the product demo must not claim a live
campaign until the required providers have returned real responses. Add
secrets in the Zerops project environment only; never commit them or paste
their values into chat.

## Minimum URL-to-draft demo

| Variable | Used by | Required for |
| --- | --- | --- |
| `FIRECRAWL_API_KEY` | `POST /api/brand` | Read the submitted product URL and build evidence-backed brand facts |
| `OPENAI_API_KEY` | brand extraction, campaign and drafts | Extract the brand profile and generate channel-native drafts |
| `SUPERMEMORY_API_KEY` | brand sync and recall | Persist/retrieve the indexed brand memory used by drafts |

`TAVILY_API_KEY` is optional enrichment for web-research facts. The core
brand extraction path remains Firecrawl-backed and does not turn a missing
Tavily response into invented research.

## Minimum provider-confirmed publish demo

| Variable / setup | Used by | Required for |
| --- | --- | --- |
| `COMPOSIO_API_KEY` | the private publishing worker | Provider API access and OAuth connection management |
| Connected Composio account | the selected channel | A real LinkedIn, X, or Reddit publish confirmation |

The connected account must be authorized through the product's OAuth flow for
the demo user. A draft becoming `approved` is not a publish: the worker only
records `published` after the provider returns a valid external identifier.

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

1. Open the public web URL and sign in with a real Supabase Auth account.
2. Submit a real product URL through the brand-intake flow.
3. Confirm Firecrawl, OpenAI, and Supermemory responses and inspect the saved
   brand state after refresh.
4. Generate a campaign and at least one draft; keep it in the HITL queue.
5. Connect one social provider through Composio.
6. Approve one draft, observe the NATS wake-up and private worker logs, and
   verify the provider's returned post identifier in the execution record.

Capture URLs, timestamps, provider status, and returned identifiers for the
demo notes. Do not record secret values.
