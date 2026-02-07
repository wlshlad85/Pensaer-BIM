# Clawhatch Sprint Plan — Race to Market

> **Goal:** First automated OpenClaw setup wizard live and taking payments. Others ARE doing this manually (Clawhatch charges $99/setup via Zoom). We automate it, undercut them, and own the market before anyone else builds a wizard.
>
> **Timeline:** 4 weeks to revenue. No perfection, just shipped.
>
> **Stack:** Next.js + Tailwind + shadcn/ui → Vercel. Lemon Squeezy payments. No backend needed for MVP.

---

## WEEK 1: Foundation (Feb 3–9)

**Theme: Name it, brand it, scaffold it**

| # | Task | Time | Owner | Deliverable |
|---|------|------|-------|-------------|
| 1.1 | **Lock the name** — Clawhatch confirmed. Buy domain (clawhatch.com or clawhatch.dev) | 1h | Rich | Domain purchased |
| 1.2 | **Logo v1** — "The Closet Door" concept (ajar door + claw handle). SVG, dark bg. Good enough, not perfect. | 2h | Max (AI gen) + Rich approval | logo.svg |
| 1.3 | **Scaffold Next.js project** — `create-next-app`, Tailwind, shadcn/ui, deploy to Vercel on push | 2h | Max | Repo + live URL |
| 1.4 | **Landing page** — Hero, 3 tiers (Free / Pro $39 / Support $19/mo), social proof placeholder, CTA | 4h | Max | Live page |
| 1.5 | **Lemon Squeezy account** — Create store, add Pro Setup product ($39) + Support subscription ($19/mo) | 1h | Rich | Payment links live |
| 1.6 | **Wizard skeleton** — Multi-step form scaffold (11 screens from wizard-ux-flow.md). No logic yet, just the UI flow. | 4h | Max | Clickable wizard prototype |
| 1.7 | **OS detection** — Browser-side platform detection (Win/Mac/Linux). WSL2 check via copy-paste command. | 2h | Max | Working detection |

**Week 1 Exit Criteria:** Live landing page with pricing. Clickable wizard prototype. Payment links ready.

---

## WEEK 2: Build the Wizard MVP (Feb 10–16)

**Theme: Make it actually work**

| # | Task | Time | Owner | Deliverable |
|---|------|------|-------|-------------|
| 2.1 | **Pre-flight checks** — Node version, npm/pnpm, OS compat, disk space. Visual checklist with ✅/❌. | 3h | Max | Working preflight screen |
| 2.2 | **Config quiz** — 5 questions: What channels? What persona? What model? API keys? Security level? | 3h | Max | Quiz → JSON config |
| 2.3 | **Config generator** — Template fragments per channel, deep-merged, validated with JSON schema | 4h | Max | Generates valid openclaw.json |
| 2.4 | **Install script generator** — Single bash/PowerShell script. Embedded config as heredocs. Interactive secret prompts. | 4h | Max | Copy-paste install script |
| 2.5 | **Workspace file generator** — SOUL.md, USER.md, AGENTS.md, HEARTBEAT.md from quiz answers. Bundled as ZIP via JSZip. | 3h | Max | Downloadable workspace.zip |
| 2.6 | **Channel sub-flows** — WhatsApp QR instructions, Telegram BotFather guide, Discord dev portal walkthrough, Signal setup | 4h | Max | Per-channel setup guides |
| 2.7 | **Pro gate** — After quiz, before download: Free gets manual steps doc. Pro ($39) gets automated script + workspace + priority support queue. | 2h | Max | Lemon Squeezy checkout integrated |
| 2.8 | **Troubleshooting FAQ** — Top 20 pain points from pain-points.md, searchable | 2h | Max | /troubleshooting page |

**Week 2 Exit Criteria:** Working wizard that generates real, valid configs. Pro tier payment flow. FAQ live.

---

## WEEK 3: Launch & Distribution (Feb 17–23)

**Theme: Get it in front of people**

| # | Task | Time | Owner | Deliverable |
|---|------|------|-------|-------------|
| 3.1 | **Post-setup upsell flow** — "Setup complete! 🎉" → support plan CTA at moment of maximum trust | 2h | Max | Upsell screen |
| 3.2 | **Email capture** — Post-setup: "Get updates + tips" opt-in. Use Lemon Squeezy email or Buttondown. | 2h | Max | Email list collecting |
| 3.3 | **SEO pages** — "How to set up OpenClaw on [Windows/Mac/Linux]", "OpenClaw WhatsApp setup guide", "OpenClaw vs manual setup" | 4h | Max | 5 SEO articles |
| 3.4 | **OpenClaw Discord launch** — Post in #showcase / #community. Genuine, not spammy. Show the tool, offer free setups for feedback. | 1h | Rich | Community post |
| 3.5 | **Reddit posts** — r/selfhosted, r/OpenClaw (if exists), r/ChatGPT, r/artificial. "I built a free setup wizard for OpenClaw" | 1h | Rich | 3-4 posts |
| 3.6 | **Video walkthrough** — 3-min screen recording: "Set up OpenClaw in under 10 minutes" | 2h | Rich | YouTube video |
| 3.7 | **Hosting affiliate links** — DigitalOcean ($25/referral), Vultr ($35/referral) embedded in wizard's hosting step | 1h | Max | Affiliate links live |
| 3.8 | **Apply to Clawhatch as freelancer** — Learn their process from inside. Intelligence gathering. | 1h | Rich | Application submitted |
| 3.9 | **Analytics** — Vercel Analytics + Lemon Squeezy dashboard. Track: wizard starts, completions, conversions. | 1h | Max | Dashboard live |

**Week 3 Exit Criteria:** Wizard live and discoverable. First real users. Email list growing. Affiliate links active.

---

## WEEK 4: Iterate & Scale (Feb 24 – Mar 2)

**Theme: Double down on what's working**

| # | Task | Time | Owner | Deliverable |
|---|------|------|-------|-------------|
| 4.1 | **Analyse first week data** — Where do users drop off? What questions do they ask? What breaks? | 2h | Max + Rich | Iteration priorities |
| 4.2 | **Fix top 3 user issues** — Whatever broke in week 3, fix it fast | 4h | Max | Patches shipped |
| 4.3 | **7-day email sequence** — Drip: Day 1 (tips), Day 3 (advanced config), Day 7 (support plan pitch) | 3h | Max | Automated emails |
| 4.4 | **Concierge tier launch** — $79 async setup. Intake form → we configure → deliver in 24h. | 3h | Max + Rich | Tier 2 live |
| 4.5 | **Testimonials** — Ask first 10 users for quotes. Add to landing page. | 1h | Rich | Social proof |
| 4.6 | **"OpenClaw Mastery Course" outline** — Plan the $49 course. Module structure, key topics. Don't build yet. | 2h | Max | Course outline doc |
| 4.7 | **Monthly support report template** — For $19/mo subscribers: "Your system is healthy, we updated X" | 1h | Max | Report template |
| 4.8 | **Twitter/X presence** — Start posting tips, setup guides, "did you know" about OpenClaw. 1 post/day. | Ongoing | Rich | Content calendar |

**Week 4 Exit Criteria:** First paying customers. Iteration cycle running. Support tier operational. Course planned.

---

## Revenue Targets

| Milestone | Users/Month | Monthly Revenue | Timeline |
|-----------|------------|-----------------|----------|
| **First dollar** | 10 | ~$39-79 | Week 3 |
| **$500/mo** | 50 | $500 | Month 2 |
| **$1,000/mo** | 100 | $1,000 | Month 3 |
| **$5,000/mo** | 500 | $5,000 | Month 6-9 |
| **$10,000/mo** | 1,000 | $10,000 | Month 12-18 |

## Revenue Stack at Maturity

| Stream | % | Notes |
|--------|---|-------|
| Pro Setup ($39) | 35% | One-time, acquisition driver |
| Support Sub ($19/mo) | 30% | Compounds monthly, real business |
| Concierge ($79-199) | 15% | High-touch, premium |
| Course ($49) | 10% | Build once, sell forever |
| Affiliates | 10% | Hosting referrals, passive |

## Competitive Moat

**Clawhatch's weakness:** Manual, 1:1 Zoom calls. Doesn't scale. Charges $99 for 30 mins of hand-holding.

**Our edge:**
1. **Automated** — wizard handles 80% of setups with zero human time
2. **Better outcome** — generates tested, validated, security-hardened configs
3. **Cheaper** — $39 vs $99, and the free tier is genuinely useful
4. **Faster** — 10 minutes vs scheduling a Zoom call next week
5. **First mover on automation** — once we own "OpenClaw setup" in SEO, we're the default

**The play:** Own the bottom of the funnel. When someone Googles "how to set up OpenClaw", we're the first result. The wizard IS the product. Everything else (subscriptions, courses, concierge) builds on top.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Lemon Squeezy over Stripe | Handles VAT/tax globally, overlay checkout, less dev work. Migrate later. |
| $39 Pro (not $29 or $49) | Below "ask permission" threshold, above "not worth it". Test and adjust. |
| $19/mo support (not $29) | Impulse-friendly for individuals. $49/mo priority tier comes later. |
| Next.js on Vercel | We know React. Free hosting. Fast deploys. SEO-friendly. |
| No backend for MVP | Config gen is client-side. No accounts. No database. Ship faster. |
| Soft gates over hard gates | Devs hate being locked out. Show them the manual way, offer the easy way. |

---

*Speed is the advantage. Ship week 1. Iterate weeks 2-4. Revenue by end of month.*
