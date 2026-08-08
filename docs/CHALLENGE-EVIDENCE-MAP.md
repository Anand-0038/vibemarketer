# WeMakeDevs Zerops Challenge evidence map

This is an internal release checklist for the existing VibeMarketer product.
It maps the official challenge requirements and resources to inspectable
repository files, live behavior, and remaining human-controlled gates.

## Official source material

- [Challenge overview](https://www.wemakedevs.org/hackathons/zerops)
- [Challenge rules](https://www.wemakedevs.org/hackathons/zerops/rules)
- [Challenge resources](https://www.wemakedevs.org/hackathons/zerops/resources)
- [ZCP overview](https://docs.zerops.io/zcp/overview)
- [Zerops deployment reference](https://docs.zerops.io/)

## Requirement mapping

| Organizer requirement | Evidence or owner | Status |
| --- | --- | --- |
| Solo project and one submission | `Anand-0038/vibemarketer`; official page displayed `Submitted` | Owner-confirmed |
| Working application, not Hello World | URL-to-brand-memory-to-draft flow and `specs/marketing-loop.md` | Verified |
| Meaningful Zerops usage | `zerops.yaml`, `README.md`, `docs/decisions.md`; web, PostgreSQL, NATS, private worker | Verified |
| Reachable live deployment | `https://web-2b24-3000.prg1.zerops.app`; `/api/ready` | Verified |
| Persistent application state | Zerops PostgreSQL adapter and lifecycle evidence | Verified |
| Asynchronous infrastructure | NATS JetStream wake-up plus private worker | Verified at infrastructure boundary |
| Human approval before publishing | `/app/queue`, approval route, publish state machine | Verified |
| Real provider confirmation | `docs/PROVIDER-SETUP.md`; Composio plus connected social account | Pending credentials/account |
| Public source access | Public repository and visible commit history | Verified |
| AI-use disclosure | `docs/ai-usage.md` | Verified |
| Demo video | `docs/demo/` recordings, including the combined judge walkthrough | Verified for core and approval-boundary paths |
| Public build post | Submitted Medium URL plus `docs/SOCIAL-POST-DRAFT.md` | URL submitted; build-post package needs follow-up |
| Official submission form | `submission.md`; official page displayed `Submitted` | Owner-confirmed submitted |
| Deployment remains live through judging | Zerops project and public URL | Human monitoring gate |

## Resource usage

| Resource | How this project uses it |
| --- | --- |
| ZCP / MCP | Project-scoped infrastructure inspection and deployment workflow; `.mcp.json` keeps the local server configuration. |
| zCLI | Human-controlled project inspection, service deployment, logs, and public URL verification. |
| `zerops.yaml` | Reproducible web and worker build/run definitions with readiness checks. |
| Environment variables | Public browser configuration is separated from runtime secrets; provider secrets stay outside Git. |
| Private networking | The worker reaches the web drain through the `web` service hostname; database, NATS, and worker operations are not public. |
| Managed PostgreSQL | Durable tenant-scoped marketing state, attempts, leases, retries, and reports. |
| NATS JetStream | Durable publishing wake-up transport; the database remains authoritative. |
| Health checks and logs | Zerops health checks gate the web runtime; service logs verify worker/NATS behavior. |
| GitHub delivery | Source repository and visible commit history provide judge access and reproducibility. |

## Release gate

Do not submit a provider-confirmed publishing claim until a real connected
account returns an external post identifier. The remaining release follow-up
sequence is:

```text
add COMPOSIO_API_KEY in Zerops
  -> reload web and worker
  -> connect one real social account
  -> approve one draft
  -> verify provider URL/ID and report
  -> publish or update the required build post if pursuing the social track
```
