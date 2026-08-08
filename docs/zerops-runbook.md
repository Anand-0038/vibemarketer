# Zerops deployment runbook

The repository contains two separate Zerops configuration layers:

- `zerops-*-import.yaml` provisions the non-secret project services.
- `zerops.yaml` builds and runs `web` and the private `worker`.

## Runtime secret variables

Add these as Zerops secret variables in the project environment. Do not commit
or paste their values into chat. This existing project is platform-managed with
`envIsolation=none`, so the web and private worker intentionally share only
this one internal secret. Provider keys should remain service-scoped where
possible. The browser-facing Supabase URL and publishable key are public client
configuration and are already pinned in `zerops.yaml`; they are not server
secrets.

```text
INTERNAL_WORKER_SECRET
```

`SUPABASE_SERVICE_ROLE_KEY` is an admin-only compatibility secret. Add it
when using the existing billing, entitlement, waitlist, or other admin paths;
the core Zerops marketing-store and Auth flow do not require it.

For the complete real product flow, configure the exact provider gate in
[`docs/PROVIDER-SETUP.md`](PROVIDER-SETUP.md). The minimum brand-to-draft
flow needs `OPENAI_API_KEY`, `FIRECRAWL_API_KEY`, and
`SUPERMEMORY_API_KEY`; provider-confirmed publishing additionally needs
`COMPOSIO_API_KEY` and a connected social account.

`DATABASE_URL` and `NATS_URL` are created in `zerops.yaml` from the private
`db` and `nats` service references. The worker receives the NATS connection
and the web internal secret reference from the same file.

The existing project reports `envIsolation=none` as platform-managed/read-only
through ZCP, so this runbook uses a generated project-scoped
`INTERNAL_WORKER_SECRET` and does not place it in the repository. The manifest
still uses explicit cross-service database/NATS references.

## Auth configuration for the live challenge URL

The Supabase Auth project keeps the canonical `www.vibemarketer.fun` callback
entries and now also allowlists:

```text
https://web-2b24-3000.prg1.zerops.app/auth/callback
```

The challenge environment currently uses Auth autoconfirm because Supabase's
default shared mailer is restricted and is not a dependable delivery service
for arbitrary signup addresses. This lets a real user create an account and
continue to the protected app without pretending that an email was delivered.
For a normal production release, set autoconfirm back to `false` and configure
a custom SMTP provider before relying on email confirmation.

If a signup attempt says the account needs confirmation but no message arrives,
first check whether the address is an older pending account. Supabase
deliberately returns an empty identity list for existing addresses in some
signup responses; the web app reports that case as an existing account so the
user can sign in instead. New accounts in the current challenge configuration
are activated immediately and do not require an email. To provide real
confirmation emails for arbitrary users, configure custom SMTP in the Supabase
Auth settings and only then turn autoconfirm off.

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

The web checkpoint is live at
`https://web-2b24-3000.prg1.zerops.app`: `/` and `/login` return 200,
`/app` remains protected, and `/api/ready` reports `{ "ok": true }`.
The worker is deployed and its logs show a real NATS connection plus successful
private drain checks. The overall multi-service submission is not complete
until real provider credentials are added and one provider-confirmed flow is
verified. A `READY_TO_DEPLOY` service is not live-deployment evidence.
