# Zerops deployment runbook

The repository contains two separate Zerops configuration layers:

- `zerops-*-import.yaml` provisions the non-secret project services.
- `zerops.yaml` builds and runs `web` and the private `worker`.

## Required secret variables

Add these as Zerops secret variables on the `web` service. Do not commit or
paste their values into chat:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
INTERNAL_WORKER_SECRET
```

For the complete real product flow, also configure the provider/research
variables required by the chosen demo, such as `OPENAI_API_KEY`,
`FIRECRAWL_API_KEY`, `SUPERMEMORY_API_KEY`, and `COMPOSIO_API_KEY`.

`DATABASE_URL` and `NATS_URL` are created in `zerops.yaml` from the private
`db` and `nats` service references. The worker receives the NATS connection
and the web internal secret reference from the same file.

## Deploy

```bash
zcli service push web \
  --project-id IzGL13uGTKeL0Cg8qBNvjw \
  --setup web \
  --working-dir . \
  --workspace-state all \
  --zerops-yaml-path zerops.yaml

zcli service enable-subdomain web --project-id IzGL13uGTKeL0Cg8qBNvjw

zcli service push worker \
  --project-id IzGL13uGTKeL0Cg8qBNvjw \
  --setup worker \
  --working-dir . \
  --workspace-state all \
  --zerops-yaml-path zerops.yaml
```

Inspect build/runtime logs without printing environment values:

```bash
zcli service log web --project-id IzGL13uGTKeL0Cg8qBNvjw --show-build-logs
zcli service log web --project-id IzGL13uGTKeL0Cg8qBNvjw --limit 100
zcli service log worker --project-id IzGL13uGTKeL0Cg8qBNvjw --limit 100
```

The deployment is not complete until the generated public URL returns 200
from `/`, `/api/ready` reports `{ "ok": true }`, `/app` remains protected,
and the worker logs show a NATS connection. A `READY_TO_DEPLOY` service is not
live-deployment evidence.
