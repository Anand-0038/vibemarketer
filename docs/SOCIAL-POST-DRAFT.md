# Social post draft

Replace the video and provider-result placeholders only after the live
provider run is verified. The official post must be published manually and linked from
`submission.md`.

> My deployment was green. The product workflow still needed evidence.
>
> I built **VibeMarketer — Cursor for Marketing** during the Zerops Challenge:
> give it a product URL, build evidence-backed brand memory, generate
> channel-native drafts, route them through human approval, and publish only
> after a real provider confirms the action.
>
> The challenge transformation runs the web app, managed PostgreSQL, NATS
> JetStream wake-up transport, and private publishing worker on Zerops. The
> database remains the source of truth for marketing state, while the worker
> records provider-confirmed execution results. The current live smoke proves
> the URL → brand memory → campaign → draft path; the connected-provider step
> is shown only after its real result is available.
>
> Live: https://web-2b24-3000.prg1.zerops.app
> Repository: https://github.com/Anand-0038/vibemarketer
> Demo video: [add working 60–90 second video]
> Provider-confirmed result: [add verified public result URL]
>
> @WeMakeDevs @zeropsio
> #ZeropsChallenge

## Before publishing

- Show the failed or unavailable dependency honestly if it is still present.
- Record the working brand → draft → approval → provider-confirmed path. If a
  social account is not connected yet, show the explicit unavailable state
  instead of implying a publication.
- Use a public video URL with captions and no private credentials in frame.
- Replace every placeholder above and then copy the resulting post URL into
  `submission.md`.
