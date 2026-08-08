# The Zerops Challenge — Submission Draft

**Status:** Local draft. This file is not an official submission.

## Before you submit

Read the full rules before filing. The following requirements determine whether the project can be judged:

- The project must be deployed on Zerops and working. If judges cannot open the live project, it does not qualify.
- A Hello World does not qualify. Aim for a reasonably complex architecture, ideally three or more services: a frontend, a backend, and a database.
- Judges must be able to read the source code. It does not need to be fully open source, but the judging team must have access to it.

## Submission fields

### Project title *(required)*

VibeMarketer — Cursor for Marketing

### Project description *(required)*

VibeMarketer turns a product URL into evidence-backed brand memory,
channel-native campaign drafts, a human approval queue, provider-confirmed
publishing attempts, and execution reports. During the Zerops Challenge, the
existing prototype is being transformed into a multi-service SaaS: Zerops
PostgreSQL stores durable marketing and publishing state, NATS JetStream
transports publishing wake-ups, and a private Node.js worker drains the
outbox through the existing real provider integrations. Supabase remains the
external authentication boundary.

### Repository / source code *(required)*

<!-- The repository URL. Public is simplest; private access may be shared with judges. -->

`https://github.com/Anand-0038/vibemarketer`

### Live deployment on Zerops *(required)*

<!-- The working public URL judges can open. -->

`https://web-2b24-3000.prg1.zerops.app`

### Social post

<!-- The public build-post URL. The best social post wins a Logitech MX Master 3. -->

`https://…`

The prepared copy is in [`docs/SOCIAL-POST-DRAFT.md`](docs/SOCIAL-POST-DRAFT.md).
The current core-flow recording is [`docs/demo/vibemarketer-core-demo.mp4`](docs/demo/vibemarketer-core-demo.mp4).
Publish it only after the working video and provider-confirmed result URL are
available.

## Final checks

- [ ] Project title entered
- [ ] Description entered
- [x] Repository URL is correct and judge-accessible
- [x] Live Zerops deployment is reachable
- [x] Deployment has the required architecture and is more than Hello World
- [x] Core live URL → brand memory → campaign → draft smoke is verified
- [ ] Social build post is published
- [ ] Official submission form is completed before the deadline
