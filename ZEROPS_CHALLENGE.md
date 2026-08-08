# The Zerops Challenge

Source: supplied WeMakeDevs event-page notes. Verify the live event page before submitting because dates, links, and eligibility details are time-sensitive.

## Event

- **Organizer:** WeMakeDevs, with Zerops
- **Dates:** August 8–9, 2026
- **Format:** Online, solo only, one project per participant
- **Status in the supplied page:** Registered; submissions are open
- **Prize pool:** $5,000 in Zerops credits
- **Main prize:** MacBook Neo for the best overall project
- **Social prize:** Logitech MX Master 3 for the top social post

## Challenge

Build a useful working product, deploy it on Zerops, and take it from an idea to a live application in one weekend. The theme is open-ended: applications, platforms, developer tools, games, automations, AI products, and other useful projects are allowed.

The finished project must:

- Be reachable through a live URL.
- Be deployed and running on Zerops.
- Use Zerops meaningfully in how it is built, deployed, or operated.
- Have source code available for judge review.
- Stay accessible through the judging period.
- Be more than a Hello World. The suggested target is a reasonably complex architecture with at least three services, such as a frontend, backend, and database.

Any programming language, framework, and stack are allowed. Zerops can provide application runtimes, Linux containers, managed databases, object storage, message brokers, search engines, private networking, and build pipelines.

## Timeline

- **Registration:** Open through August 8; registration is required before submission.
- **Kickoff:** Livestream on Saturday, August 8, covering the challenge, rules, and a real ZCP deployment.
- **Build window:** August 8–9, with 48 hours to build and deploy.
- **Submission deadline:** Sunday, August 9.

## ZCP — Zerops Control Plane

ZCP is the Zerops coding-agent workflow. It can:

1. Read live services.
2. Write code and wiring.
3. Deploy to Zerops.
4. Verify that the application runs.
5. Retry after failures using deployment logs.

The page lists Claude Code, Codex, Antigravity, Grok Build, and Cursor CLI as compatible coding agents. The supplied rules require Zerops, but do not state that ZCP itself is mandatory.

Zerops projects can be described with a `zerops.yaml` file. The supplied example uses a Node.js 22 service, installs dependencies with Bun, builds the application, exposes port 3000 over HTTP, and starts the production server.

```yaml
zerops:
  - setup: api
    build:
      base: nodejs@22
      buildCommands:
        - bun install
        - bun run build
      deployFiles: ./
    run:
      base: nodejs@22
      ports:
        - port: 3000
          httpSupport: true
      start: bun run start
```

## Submission requirements

The official submission form must include or link to:

- A working Zerops deployment.
- The live project URL.
- The source repository or judge-accessible source code.
- A short demo video of the working product.
- A clear explanation of how Zerops is used.
- A public build post link.
- Disclosure of every AI tool used.

The social post is required but does **not** replace the official submission form.

## Required build post

The public post must contain:

- The project name.
- A short explanation of what it does.
- A short video showing the working product.
- The live deployment link.
- A brief explanation of the Zerops usage.
- Tags for `@WeMakeDevs` and `@zeropsio`.

The social-track winner is judged on the clarity of the story, the demo, and the post's reach.

## Rules

1. Participation is solo only. Build and submit the project yourself.
2. The final project must be deployed and running on Zerops, with meaningful Zerops usage.
3. The deployment must be correct, reachable by judges, and kept online until judging is complete.
4. The project category is open-ended, but every submission must use Zerops.
5. A Hello World does not qualify; aim for a reasonably complex architecture, ideally at least a frontend, backend, and database.
6. Register through the event page before submitting.
7. Planning, architecture work, Zerops setup, and a head start are allowed. The project must not have been fully finished before the challenge began.
8. Templates, frameworks, open-source libraries, public APIs, third-party tools, and public assets are allowed. The work judged must be original work completed during the event.
9. Every submission needs a working Zerops deployment, live URL, source-code access, demo video, and Zerops explanation.
10. Source code must be available for review. A public repository is simplest; a private repository may be shared with judges.
11. A social-media post alone is not a submission; complete the official event-page submission form before the deadline.
12. AI tools, including ChatGPT, Claude, Cursor, and Copilot, are allowed but must be disclosed in the submission form.
13. Projects generated entirely by AI without meaningful original work, technical understanding, or participant contribution will be rejected.
14. Be able to explain the submitted code, architecture, Zerops deployment, and technical decisions.
15. Only one project may be submitted. Duplicate, copied, incomplete, or previously finished projects may be disqualified.
16. Intellectual property developed during the event belongs to the participant who created it.
17. Follow the WeMakeDevs Code of Conduct. Harassment, discrimination, spam, plagiarism, or judging manipulation can result in immediate disqualification.
18. Rule or Code of Conduct violations may result in disqualification. Final eligibility and judging decisions belong to WeMakeDevs and Zerops.

## Important reminders

- Check the registered inbox: the event page says the challenge information lands there.
- Confirm registration before finalizing the project.
- Keep the deployment publicly reachable and healthy through judging.
- Make Zerops usage visible in the architecture and submission explanation.
- Record the working product, not only slides or a local screen recording.
- Publish the required build post and include both organizer tags.
- Submit through the official form; do not rely on the social post alone.
- Disclose all AI tools and be prepared to explain the implementation and decisions.
- Submit exactly one original project.
- Before submission, recheck the live deadline, form URL, source visibility, deployment URL, demo URL, and post URL.

## Resources

The supplied event resource page groups the following materials for building and deploying on Zerops. The original URLs were not included in the notes.

### Watch

- Kickoff livestream: a real application built and deployed live.
- **Building and deploying a 7-service app with ZCP, start to finish** — Eleftheria Batsou.
- **Building on real infrastructure: a ZCP walkthrough** — Zerops.

### Build with ZCP

- ZCP quickstart.
- What ZCP is and what it gives an agent.
- How the agent's build-and-deploy loop works.
- Workspace choices: browser or local machine.
- End-to-end project-building guide with ZCP.

### Get started by hand

- Zerops quickstart.
- Deploy your first application.
- Explore Zerops recipes.

### Documentation and deployment essentials

- Zerops documentation.
- Zerops on GitHub.
- `zerops.yaml` specification.
- Zerops pipeline.
- GitHub integration setup.
- Zerops CLI.
- Environment-variable configuration.
- Public-access configuration.
- Internal networking.

### Help

- The Zerops Discord is described as the fastest place to get help with the platform itself.

## Judge-facing framing

The main track evaluates the idea, execution, and meaningful use of Zerops. The strongest evidence is a live, reliable product with a clear multi-service architecture, a short working demo, and a concise explanation of what Zerops handles in the system.
