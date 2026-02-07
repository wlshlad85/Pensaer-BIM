# Reddit r/SideProject Post — Clawhatch / AI Setup Service

> **Title:** I quit my job to help people set up AI assistants. Here's week 3.

---

I left a stable role in [PREVIOUS ROLE] three weeks ago to build a service that sets up personal AI assistants for non-technical people. Not a SaaS. Not a chatbot wrapper. Literally: I configure, test, and deliver a working AI assistant tailored to how you actually work.

Here's the radically honest update.

---

## The problem

There's an explosion of powerful open-source AI assistant frameworks right now. The kind that can manage your calendar, check your email, run automations — basically a junior PA that lives on your laptop.

The problem? Setting them up requires:

- Command line fluency
- Node.js, API keys, config files
- Security hardening so your assistant isn't leaking data
- Connecting channels (WhatsApp, Discord, Slack)
- Writing a "personality file" so the AI actually behaves how you want

Most people hit a wall 15 minutes in and give up.

The existing solution in this space charges **$99 for a Zoom call** where someone walks you through it. One human, one client, one hour. No automation. No quality checks. They recruit freelancers at $50/setup and pocket $49.

I thought: what if we flip this?

---

## What we're building

**Three tiers:**

1. **Self-service wizard (free / $29)** — A web app that automates 80% of setups. OS detection, config generation, pre-flight checks. Most setups are identical — a wizard handles them in 10 minutes.

2. **Async concierge ($79)** — You fill a 5-minute intake form. We configure everything remotely. No Zoom scheduling, no timezone hell. You get a fully working assistant within 24 hours. Includes a custom personality file and security audit.

3. **White glove ($199)** — Full concierge + a 30-min Zoom *after* setup (when you can actually use the thing), 3 pre-installed skills tailored to your workflow, and a month of priority support.

The key insight: the Zoom call should happen **after** setup, not during. Training someone on a working system beats fumbling through installation together.

---

## The numbers (week 3)

| Metric | Number |
|---|---|
| Landing page live | [YES/NO] |
| Wizard MVP shipped | [YES/NO] |
| Intake form built | [YES/NO] |
| Paid setups completed | [X] |
| Revenue to date | $[X] |
| Free setups (beta/friends) | [X] |
| Avg setup time (concierge) | [X] min |
| Support tickets post-setup | [X] |
| Refund requests | [X] |
| Email list signups | [X] |
| Stripe connected | [YES/NO] |
| Hours worked this week | [X] |

*I'll update these every week. Holding myself accountable publicly.*

---

## What's actually working

- **Async beats Zoom.** Nobody wants to schedule a call. Fill a form → get a result. Faster for us, easier for them.
- **Automation compounds.** Every setup teaches us something. Common issues become FAQ entries, FAQ entries reduce support tickets, fewer tickets mean more setups per day.
- **Using our own product to deliver the service.** Our AI assistant manages the client pipeline — follow-ups, templates, reminders. It's dogfooding and delivery infrastructure at the same time.

---

## What's NOT working (the honest bit)

- **The self-service wizard is behind schedule.** I underestimated the edge cases across different OS + Node versions. [X]% of beta testers hit issues the wizard didn't catch.
- **Pricing confidence is low.** $79 feels right for async concierge but I have zero market validation beyond gut feeling. The competitor charges $99 for worse service — but they have distribution and I don't.
- **Discovery is the bottleneck.** Building the product is the easy part. Finding people who (a) want a personal AI assistant and (b) know they want one but can't set it up — that's the real challenge.
- **I haven't shipped the landing page yet / it's rough.** [UPDATE WITH REALITY]. Perfectionism is the enemy and I keep tweaking instead of launching.
- **Cash runway is real.** No income yet. Savings are the funding round. Every week that passes without revenue is a week closer to "maybe I should have kept the job."

---

## What I've learned in 3 weeks

1. **Sell the outcome, not the technology.** Nobody cares about Node.js config files. They care about "I wake up and my assistant has already checked my calendar and flagged what matters."

2. **Async delivery is a competitive moat nobody talks about.** Everyone defaults to Zoom. But async lets you batch similar setups, work across timezones, and deliver faster. It requires better systems but it scales.

3. **Your first customer teaches you more than your first 100 hours of building.** I spent a week perfecting the intake form before anyone had filled one out. Should have shipped ugly and iterated.

4. **The freelancer model is fragile.** The competitor recruits freelancers who do manual work. If you can automate 80% of what they do manually, you don't need freelancers — and your quality is more consistent.

5. **Building in public is uncomfortable.** Posting "$0 revenue, week 3" is not glamorous. But it's honest, and the feedback is worth more than the ego hit.

---

## What I need from you

I'd genuinely appreciate specific feedback on:

1. **Pricing** — Does $79 for "we set it up for you, async, 24hr delivery" feel right? Too cheap? Too expensive? Would you pay more for guaranteed same-day?

2. **Discovery channels** — Where do non-technical people who want AI assistants actually hang out? I've been posting in developer communities but those people can set it up themselves.

3. **The wizard vs concierge split** — Should I focus all energy on the automated wizard (scalable but complex to build) or the concierge (higher margin, simpler to start, but requires my time)?

4. **What would make you trust a new service like this?** No reviews, no brand, just some guy on the internet offering to configure AI on your machine. What would de-risk it for you?

Drop a comment or DM. I read everything.

---

*Week 4 update coming next [DAY]. Following along? I'll keep posting these whether it's going well or not.*
