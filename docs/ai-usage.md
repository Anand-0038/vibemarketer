# AI usage disclosure

This project uses AI-assisted development in accordance with the challenge
policy. The submitted code is reviewed, tested, and understood by the
participant; AI assistance does not replace the participant's product,
architecture, security, or deployment decisions.

## Tools

- OpenAI Codex
- Zerops Control Plane (ZCP) setup and project tooling
- Zerops zCLI

## AI-assisted work

- Existing repository audit and dependency/configuration review
- Zerops build and runtime configuration assistance
- TypeScript and PostgreSQL adapter scaffolding
- NATS worker wiring and failure-path debugging
- Unit-test and documentation assistance

## Original human contribution

- Selecting and preserving the VibeMarketer product for the challenge
- Defining the URL-to-brand-memory-to-draft-to-approval product narrative
- Choosing the staged Zerops architecture
- Designing the PostgreSQL tenant boundary and compare-and-swap persistence
- Designing the durable publishing outbox, idempotency, leases, and retries
- Choosing NATS as a wake-up transport rather than the source of truth
- Keeping Supabase Auth external while moving marketing state to Zerops
- Defining the private worker boundary and internal authentication
- Rejecting auth bypasses, fake provider success, and unnecessary services
- Reviewing the code, running verification gates, and controlling deployment

## Verification

All generated or assisted code is reviewed before submission. Local unit
tests, lint, TypeScript checks, the production build, and the deployment
manifest validation are required gates. Live provider and public Zerops
claims are made only after the corresponding runtime evidence is captured.
