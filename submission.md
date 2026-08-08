# The Zerops Challenge — Submission Draft

**Status:** Submitted. The official challenge page displayed `Submitted` after
the entry was filed. This file is the repository-side record, not the form
itself.

## Submission record

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

`https://medium.com/@anandvashishtha/the-founders-new-problem-isn-t-building-it-s-being-heard-7651bc9cda1b`

The submitted URL points to the Medium article listed above. The prepared
build-post copy is in [`docs/SOCIAL-POST-DRAFT.md`](docs/SOCIAL-POST-DRAFT.md).
The current core-flow recording is [`docs/demo/vibemarketer-core-demo.mp4`](docs/demo/vibemarketer-core-demo.mp4); the approval-boundary recording is [`docs/demo/vibemarketer-approval-boundary.mp4`](docs/demo/vibemarketer-approval-boundary.mp4). The combined judge walkthrough is [`docs/demo/vibemarketer-judge-demo.mp4`](docs/demo/vibemarketer-judge-demo.mp4).
The Medium article is a product/problem essay. Its visible text does not yet
serve as the complete build-post package for the social prize; publish the
prepared build post separately if that track is still being pursued. A
provider result may be added later, but must not be claimed until a real
connected account returns an external identifier.

## Final checks

- [x] Project title entered
- [x] Description entered
- [x] Repository URL is correct and judge-accessible
- [x] Live Zerops deployment is reachable
- [x] Deployment has the required architecture and is more than Hello World
- [x] Core live URL → brand memory → campaign → draft smoke is verified
- [x] Social-post URL entered in the official form
- [ ] Submitted URL is a complete build-post package for the social track
- [x] Official submission form is completed; challenge page displayed `Submitted`
