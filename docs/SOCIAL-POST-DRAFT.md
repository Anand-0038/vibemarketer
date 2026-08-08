# Build post draft — social-track follow-up

The official form has been filed, but the submitted Medium URL is a
product/problem essay rather than a complete build post. This copy is ready
for manual publication with the committed judge walkthrough video.
Add a provider result only if a real connected account has returned one. The
build post must contain the project name, product explanation, working video,
live deployment, Zerops explanation, and the required organizer/sponsor tags.

> A green deployment is not the same as a working marketing workflow.
>
> I built **VibeMarketer — Cursor for Marketing** during the Zerops Challenge.
> Give it a product URL and it builds evidence-backed brand memory, generates
> channel-native drafts, and routes them through human approval.
>
> The challenge transformation runs the web app, managed PostgreSQL, NATS
> JetStream wake-up transport, and private publishing worker on Zerops. The
> database remains the source of truth for marketing state, while the worker
> owns the asynchronous publishing boundary. The live demo proves the URL →
> brand memory → campaign → drafts → HITL approval path. Provider publishing
> fails closed until a connected account returns a real identifier.
>
> Live: https://web-2b24-3000.prg1.zerops.app
> Repository: https://github.com/Anand-0038/vibemarketer
> Demo video: https://github.com/Anand-0038/vibemarketer/raw/refs/heads/main/docs/demo/vibemarketer-judge-demo.mp4
>
> @WeMakeDevs @zeropsio
> #ZeropsChallenge

## Before publishing

- Keep the Medium essay as the product thesis/article; use this copy for the
  actual build post so the two purposes are not conflated.
- Show the failed or unavailable dependency honestly if it is still present.
- Use the committed judge walkthrough now; replace it with a provider-confirmed
  cut only after a real account returns a post ID.
- Use a public video URL with captions and no private credentials in frame.
- Copy the resulting post URL into `submission.md` after manual publication.
