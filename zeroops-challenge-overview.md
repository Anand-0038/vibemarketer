The Zerops Challenge | WeMakeDevs
WeMakeDevs Logo
About
Prizes
Challenge
Kickoff
Sponsor
The Zerops Challenge: deploy fast, scale smart, win an Apple MacBook. August 8 to 9, 2026, with $5,000 in Zerops credits

The Zerops Challenge
Break free from infrastructure drag

Build a working product, deploy it on Zerops, and take it from an idea to a live application in one weekend.

Prizes

MacBook Neo, Logitech MX Master 3 & $5,000 in Zerops credits

Registration

Loading…
One moment. Pulling up this hackathon.

When
August 8–9, 2026
Where
Online, from anywhere
Format
Solo only, one project each
Overview
Rules
Resources
01 / About

From concept to a working product
Now

Registration open
Sign in, fill in the registration form, and you're on the list.

Sat, Aug 8

Kickoff livestream
The challenge, the rules, and a real application built and deployed with ZCP. Watch the stream.

Aug 8–9

48 hours to build
Build the product and get it deployed on Zerops. Registration stays open through August 8.

Sun, Aug 9

Submissions close
File your project in the same panel before the deadline.

From idea to live
No planning phase, no slide decks. Forty-eight hours, concept to deployed product.

Any stack, no limits
No fixed tracks, no prescribed categories. Bring whatever fits the idea.

Real infrastructure
Production-grade infrastructure, not a local demo or a screen recording.

Built to last
Your application keeps working through judging, not just at launch.

02 / Prizes

Two tracks, two winners
One for the best project, one for the best social post. The theme is open-ended: build anything you like, as long as the project uses Zerops.

Main track

1 winner
The MacBook Neo awarded for the best overall project
Best overall project

MacBook Neo
The strongest product built and shipped over the weekend.

Judged on the idea, the execution, and how Zerops is used.

Social track

1 winner
The Logitech MX Master 3 awarded for the top social post
Top social post

Logitech MX Master 3
The build post that best shows the work behind the project.

Judged on the clarity of the story, the demo, and its reach.

Credits pool

$5,000

In Zerops credits, split across standout projects that make real use of the platform.

03 / The challenge

Take your project from code to orbit
Build an application, service, platform, or developer tool, and deploy it on Zerops.

Example project

Illustration only

One way a project could be put together on Zerops. None of it is required, and a single container counts, so take as much or as little of this as your product needs.

Public traffic

Frontend

Static or SSR

API

Any runtime

Private network

Database

Postgres, Mongo…

Cache

Valkey, KeyDB

Workers

Queues, cron

Storage

Object store

What counts as finished

The project is reachable through a live URL.
Zerops is meaningfully involved in how it is built, deployed, or operated.
The source is public, and the deployment stays up through judging.
04 / Build with ZCP

Let your agent ship projects, from prompt to live url.
ZCP · Zerops Control Plane

A coding agent that works inside your project, not beside it
01
Reads your live services
02
Writes code and wiring
03
Deploys to Zerops
04
Verifies it runs
Round again on a failure, with the logs, until it works

01
Sign up
A Zerops account is the only one the challenge needs, and it takes about a minute.

$15 in credits, free

02
Start a project with ZCP
Turn on ZCP and authorise your own coding agent.

Claude Code
Codex
Antigravity
Grok Build
Cursor CLI
Runtime, workspace and browser VS Code, in one go.

03
Prompt, and it ships
Describe what you want, in the agent panel or the remote IDE.

>
Build a task board for my team. Tasks should stay saved after a refresh.

You get back a live URL.


Building and deploying a 7-service app with ZCP, start to finish

Eleftheria Batsou

YouTube

Building on real infrastructure: a ZCP walkthrough

Zerops

YouTube
Zerops

The cloud underneath all of that, and where everything ZCP builds is deployed: runtimes, containers, databases, brokers and storage in one project, wired together over a private network.

Application runtimes
Linux containers
Managed databases
Object storage
Message brokers
Search engines
Private networking
Build pipelines
zerops.yaml

written for you

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
One file describes how the application is built, deployed, and run. Your agent writes and maintains it as you prompt. Write it yourself and push, if you'd rather.

05 / How participation works

Four steps, one weekend
Register, build, post, submit. Step three is not optional, and it has a shape.

Step 01
Register
Takes a minute, and it's the only way in. Do it before you start building.

Step 02
Build on Zerops
Make something meaningful, and deploy it on Zerops. ZCP and your own agent are the quickest way there.

Step 03
Share your build
Post publicly about what you built and how Zerops is used.

Step 04
Submit your project
File the form here with your repository, live URL, demo, and post.

Your build post

Step three is a public post about what you built, and the link to it goes in the submission form. It has to carry:

The name of your project
A short explanation of what it does
A short video of the working product
A link to the live deployment
A brief explanation of how Zerops is used
@WeMakeDevs and @zeropsio tagged in the post
AI-use policy

Read before you submit
AI can help you build it. It can't build it for you.

Use it for code, debugging, tests, design, or docs. A project generated entirely by AI, with no meaningful work of your own, is rejected - however good it looks.

What you're held to

Every AI tool you used, disclosed in the submission form
Meaningful original work and contribution of your own
An understanding of the code you're submitting
The architecture and the decisions behind it, explained to judges
06 / Kickoff livestream

Watch it done, before you do it
Saturday, August 8. Kunal and Francesco take ZCP end to end, live.


Saturday, August 8 · Livestream

A real application, built and deployed live
The challenge and what a submission needs, then the ZCP quickstart run end to end on a working project. Bring your questions and ask them before you start building.

Kunal Kushwaha
WeMakeDevs
Francesco Ciulla
Zerops
01
Deploy an AI Agent recipe
02
Authorise a coding agent
03
Ask for a feature in plain English
04
Deploy it, and verify it works
07 / What can you build

Bring your own idea, or start from one of these
Any category, as long as the finished project is deployed on Zerops.

AI products
A research assistant, document platform, support agent, or knowledge search tool with a real backend behind it.

Developer tools
An uptime monitor, deployment dashboard, API workspace, feature flag service, or status page.

Real-time applications
A collaborative editor, multiplayer workspace, live incident room, or shared planning tool.

Processing platforms
Document conversion, image processing, report generation, data ingestion, webhooks, or scheduled jobs.

SaaS products
A booking platform, project management tool, creator product, or business operations dashboard.

Zerops tools
A zerops.yaml generator, deployment analyser, migration assistant, or architecture visualiser.

08 / FAQ

Got questions?
Is the event online?
Yes. The event is completely online, and you can take part from anywhere.

Where do I register?
Where do I submit my project?
What is the main technical requirement?
What is ZCP, and do I have to use it?
Which coding agents can I use with ZCP?
Can I use any programming language or framework?
Can I participate as part of a team?
Can I use AI coding tools?
Does the project need to be open source?
Does the project need to remain live?
Where can I ask for help?
One weekend, one deployment, one shot at orbit.
Registration is open now, and it closes when the event does. Read the rules before you start building.

WeMakeDevs Logo
Helping great developer tools reach the builders who will shape the future.

Keep in touch

Developers
Hackathons
Meetups
Scholarships
Event Calendar
Businesses
Partners
Contact Us
Company
Blog
Careers
Code of Conduct
Privacy Policy
Terms of Service
© 2026 WeMakeDevs. All rights reserved.
llms.txt
