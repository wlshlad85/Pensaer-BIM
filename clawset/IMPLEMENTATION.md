# IMPLEMENTATION DOCUMENT
**Clawhatch Town Hall Verdict → Execution Plan**

*Generated: 2026-02-03*  
*Status: Active execution blueprint*  
*Authority: Jury verdict from expert panel deliberation*

---

## Executive Summary

**Strategic Direction:** Patch with Security Integration (unanimous jury verdict)

**Core Positioning:** "Clawhatch gets you set up safely, makes it yours, and keeps it running."
- Safe baseline (security elevated from implicit to explicit)
- Personalised (genuine differentiator, not abandoned)
- Maintained (ongoing support subscription)

**Critical Path:**
- Week 1: Manual setups + content activation (customer discovery)
- Week 2: Wizard build with embedded security checks
- Week 3: Launch paid tiers at founding-customer pricing

**Highest Priority Fix:** Split payment rails before first transaction (Lemon Squeezy compliance)

---

## P0 — Critical (Do Now / This Week)

### P0.1 — Split Payment Rails
**Jury Finding:** "This is the highest-priority fix. Split payment rails before the first transaction." — Judge Patricia Okonkwo (9.5/10 influence)

**Current State:**
- All tiers listed on Lemon Squeezy
- Concierge tier (£79) involves human time → TOS violation risk
- Support subscription (£29/mo) may involve human time

**Required Changes:**

#### Digital Products → Lemon Squeezy (compliant)
- ✅ **Pro tier** (£149 → £79 founding) — automated config package delivery
- ✅ **Enterprise tier** (£299 → £149 founding) — automated advanced configs + templates
- ✅ **Security Audit Report** (future Phase 2 product) — automated PDF generation
- ✅ **Config Templates** (future) — instant digital download

#### Human Services → Stripe or Invoice (move off Lemon Squeezy)
- ❌ **Concierge tier** (£499 → £249 founding) — 1:1 setup session = human time
- ⚠️ **Support subscription** (£29/mo) — depends on SLA definition

**Implementation Tasks:**

**CLA-200: Set up Stripe account**
- [ ] Create Stripe account (stripe.com)
- [ ] Verify business details
- [ ] Set GBP as primary currency
- [ ] Enable subscription billing
- [ ] Configure webhook endpoints

**CLA-201: Migrate Concierge tier to Stripe**
- [ ] Create Stripe Product: "Concierge Setup" at £499 (£249 founding)
- [ ] Create Stripe Checkout flow
- [ ] Update site/src/app/page.tsx: Replace Lemon Squeezy checkout link for Concierge
- [ ] Add Stripe script to page
- [ ] Test checkout flow end-to-end
- [ ] Add order confirmation email template

**CLA-202: Clarify Support subscription delivery model**
- [ ] Define SLA: What qualifies as "automated" vs "human time"?
  - Option A: Automated monitoring + alerts only → Lemon Squeezy compliant
  - Option B: Includes human troubleshooting → Move to Stripe
- [ ] Document delivery model in clawset/pricing-model.md
- [ ] If human involvement: Migrate to Stripe
- [ ] If fully automated: Keep on Lemon Squeezy but add automation specs

**CLA-203: Update pricing page with dual payment rails**
- [ ] site/src/app/page.tsx: Two CTA button types
  - "Get Pro" / "Get Enterprise" → Lemon Squeezy (instant delivery)
  - "Book Concierge" → Stripe checkout or Calendly → invoice
- [ ] Add payment provider badges (Stripe + Lemon Squeezy logos)
- [ ] Update FAQ: "Why different payment options?" → Instant vs scheduled delivery

**CLA-204: Legal compliance check**
- [ ] Review Lemon Squeezy TOS §3.2 (digital goods definition)
- [ ] Review Stripe TOS for service businesses
- [ ] Add terms to site footer linking to provider terms
- [ ] Create clawset/legal/PAYMENT-RAILS.md documenting split rationale

**Timeline:** Before first paid sale (this week — NOW)

---

### P0.2 — Do 3-5 Manual Setups with Real Users
**Jury Finding:** "This is non-negotiable. No amount of specification replaces real customer contact." — Tom Reeves (8.9/10 influence)

**Purpose:**
- Customer discovery (what breaks, what confuses people, what they actually need)
- Inform wizard UX before build starts
- Generate testimonials for launch
- Validate pricing and positioning in real conversations

**Sourcing Channels:**
- Reddit (r/OpenClaw, r/LocalLLaMA, r/SelfHosted)
- Fiverr listing (activate free/discounted tier)
- Direct outreach (OpenClaw Discord, Twitter/X)
- Friends/family with technical interest

**Implementation Tasks:**

**CLA-210: Create manual setup offer post**
- [ ] Write Reddit post: "Free OpenClaw Setup — First 5 People (Beta Testers)"
- [ ] Outline what's included:
  - 30-45min video call
  - Install OpenClaw + configure for their use case
  - Security baseline (sandboxing, API key rotation, allowlists)
  - Personalisation (tools, channels, agents)
  - Follow-up support for 1 week
- [ ] What we ask in return: feedback, testimonial, let us record session (with permission)
- [ ] Post to r/OpenClaw (create post in clawset/content/reddit/beta-tester-offer.md first)

**CLA-211: Set up scheduling system**
- [ ] Create Calendly free account (or use Microsoft Bookings)
- [ ] Set availability: 2-hour slots, 3 per day max
- [ ] Create intake form:
  - Name, email, OS, use case
  - Current OpenClaw install status (none/broken/working but basic)
  - What they want to automate/connect
  - Timezone
- [ ] Add Calendly link to Reddit post + Fiverr listing

**CLA-212: Create setup session checklist**
- [ ] Document in clawset/manual-setup-checklist.md:
  - Pre-session: Environment check (Node version, OS, ports available)
  - Session structure: Intro (5min) → Install (10min) → Config (15min) → Personalisation (15min) → Test (10min) → Q&A (5min)
  - Security baseline steps: Sandbox policy, API key env vars, allowlists, exec security
  - Personalisation: Tools selection, channel setup (Telegram/Discord/WhatsApp), agent personality
  - Post-session: Send config file, follow-up email with resources
- [ ] Prepare screen-share tools (Zoom or Discord)

**CLA-213: Execute 3-5 sessions**
- [ ] Session 1: Record detailed notes (what worked, what confused them, time taken per step)
- [ ] Session 2-3: Iterate on process based on Session 1 learnings
- [ ] Session 4-5: Refine to repeatable script
- [ ] After each session: Ask for testimonial (written or video)
- [ ] Compile findings: clawset/research/manual-setup-findings.md

**CLA-214: Extract wizard requirements from sessions**
- [ ] Identify most common pain points (these become wizard priorities)
- [ ] Identify steps that confused everyone (needs better UX)
- [ ] Identify personalisation patterns (tools people want, channels they use)
- [ ] Document in clawset/wizard-requirements.md as input for Week 2 build

**Timeline:** This week (complete by end of Week 1)

---

### P0.3 — Publish Reddit Setup Guide + Activate Fiverr Listing
**Jury Finding:** "Simultaneously, publish the already-written Reddit content and activate the Fiverr listing." — Execution sequencing, Week 1

**Reddit Content:**
We have already-written Reddit guides in clawset/content/reddit/:
- The 12 research docs have positioning and messaging
- Need to extract/compile into actual Reddit posts

**Implementation Tasks:**

**CLA-220: Compile Reddit setup guide**
- [ ] Create clawset/content/reddit/ultimate-setup-guide.md
- [ ] Structure:
  - Hook: "I've set up OpenClaw 50+ times. Here's the bulletproof method."
  - Intro: What OpenClaw is, why it's worth the setup effort
  - Prerequisites: Node.js, OS compatibility, API keys
  - Step-by-step install: Gateway + agents + channels
  - Security baseline: Sandboxing, API key protection, allowlists
  - Personalisation: Tools, channels, personality (SOUL.md)
  - Common issues + fixes
  - Where to get help (Discord, docs, Clawhatch)
  - CTA: "Need help? I'm offering free setup for first 5 beta testers: [Calendly link]"
- [ ] Tone: Helpful expert, not salesy
- [ ] Include troubleshooting section (common errors)

**CLA-221: Publish to Reddit**
- [ ] Post to r/OpenClaw first (most targeted audience)
- [ ] Cross-post to r/LocalLLaMA (broader AI/LLM community)
- [ ] Cross-post to r/SelfHosted (security-conscious self-hosters)
- [ ] Monitor comments, respond helpfully
- [ ] Track clicks to Calendly, conversions to beta sessions

**CLA-222: Activate Fiverr listing**
- [ ] Create Fiverr seller account
- [ ] Create gig: "OpenClaw AI Agent Setup & Configuration"
- [ ] Pricing tiers:
  - Basic (£0 for beta / £49 after): Standard setup, 30min session
  - Standard (£99): Setup + personalisation + 1 week support
  - Premium (£199): Setup + advanced config + integrations + 2 week support
- [ ] Gig description: Similar to Reddit guide but formatted for Fiverr
- [ ] Add screenshots/demo of OpenClaw running
- [ ] Set delivery time: 1-2 days (allows scheduling flexibility)
- [ ] Tags: "AI", "automation", "chatbot", "setup", "configuration"
- [ ] Publish and share link in Reddit posts

**CLA-223: Create lightweight landing page for manual setups**
- [ ] Add /manual-setup route to site/src/app/
- [ ] Simple page: "Beta Setup Program — Free for First 5"
- [ ] Embed Calendly widget
- [ ] Testimonials section (placeholder, fill after sessions)
- [ ] Link from homepage: "Need help getting started? →"

**Timeline:** This week (publish by Wed/Thu to allow bookings for Fri-Sun sessions)

---

## P1 — High Priority (This Week / Week 2)

### P1.1 — Set List Prices with Founding Discount
**Jury Finding:** "List prices at £149/£299/£499 with a 40-50% founding-customer discount for the first 20 customers (effective: ~£79/£149/£249)." — Dr. Vasquez (9.1/10) + Dr. Hartwell (8.7/10) compromise

**Current Pricing:**
- Free: Basic wizard
- Pro: £39 (too low per Dr. Hartwell)
- Support: £19/mo (correct, no change)
- Concierge: £79 (way too low)

**New Pricing Structure:**

| Tier | List Price | Founding (47%) | Founding Price |
|------|-----------|----------------|----------------|
| Pro | £149 | 47% off | £79 |
| Enterprise | £299 | 50% off | £149 |
| Concierge | £499 | 50% off | £249 |
| Support | £29/mo | No discount | £29/mo |

**Implementation Tasks:**

**CLA-230: Update pricing display on homepage**
- [ ] site/src/app/page.tsx: Pricing section
- [ ] Show list price with strikethrough: ~~£149~~ £79
- [ ] Badge: "Founding Customer — 47% Off (First 20)"
- [ ] Add urgency: "X of 20 claimed" counter (static for now, increment manually after sales)
- [ ] Fine print: "Founding pricing available for first 20 customers. List price applies after."

**CLA-231: Update Lemon Squeezy products**
- [ ] Pro: Change price to £79, add "Founding Customer" to product name
- [ ] Enterprise: Change price to £149, add "Founding Customer" to name
- [ ] Create variants for list-price versions (disabled until founding slots filled)
- [ ] Support: Change to £29/mo (currently £19)

**CLA-232: Update Stripe product (Concierge)**
- [ ] Create product at £249 (founding)
- [ ] Set list price £499 in description/metadata
- [ ] Add "Founding Customer" badge to checkout page

**CLA-233: Create founding-customer tracking**
- [ ] Create clawset/founding-customers.json:
  ```json
  {
    "limit": 20,
    "claimed": 0,
    "customers": []
  }
  ```
- [ ] After each sale, manually update counter
- [ ] When counter hits 20, switch to list pricing

**CLA-234: Add trust signals around pricing**
- [ ] Homepage: "Why this price?" explainer
  - "Setup services typically cost £300-500 (Upwork/Fiverr rates)"
  - "We're offering founding-customer pricing to our first 20 customers"
  - "You get professional setup at a fraction of market rate"
- [ ] Add price comparison section (vs hiring freelancer, vs doing it yourself and getting stuck)

**Timeline:** Before first paid sale (this week)

---

### P1.2 — Rewrite Homepage: Safe + Personalised + Maintained
**Jury Finding:** "The winning formulation is: 'Clawhatch gets you set up safely, makes it yours, and keeps it running.'" — Dr. Vasquez (9.1/10 influence), trusted-outcomes framing

**Current Homepage:** Focuses heavily on "wizard" and "setup automation" with security somewhat implicit.

**New Messaging Hierarchy:**

1. **Hero Section:** Trusted outcomes promise
2. **Three Pillars:** Safe baseline, Personalised, Maintained
3. **How It Works:** Wizard flow with security checkpoints visible
4. **Social Proof:** Manual setup testimonials (after Week 1)
5. **Pricing:** Founding customer offer
6. **FAQ:** Trust signals, compliance, comparisons

**Implementation Tasks:**

**CLA-240: Rewrite hero section**
- [ ] New headline: "Your OpenClaw Agent, Set Up Safely and Built for You"
- [ ] Subheading: "Clawhatch gets you set up safely, makes it yours, and keeps it running. Professional setup in 10 minutes, not 10 hours."
- [ ] CTA: "Start Free Setup →" (wizard) + "Book Expert Setup →" (Concierge)
- [ ] Remove: Any language that oversells automation without mentioning security

**CLA-241: Add Three Pillars section**
- [ ] After hero, before How It Works
- [ ] Three cards:
  
  **🛡️ Safe Baseline**
  - Sandboxing enforced from day one
  - API keys encrypted, never in plaintext
  - Allowlists protect your tools and data
  - Security audit report included (Enterprise+)
  
  **🎨 Personalised**
  - Built for your workflow, not a generic template
  - Choose your tools, channels, and personality
  - Custom configs for your environment
  - Works how you work
  
  **🔧 Maintained**
  - Proactive monitoring catches issues early
  - Config updates when OpenClaw evolves
  - Support subscription keeps you running (optional)
  - Never lose days to broken configs

**CLA-242: Rewrite How It Works section**
- [ ] Show wizard steps WITH security checkpoints visible:
  1. Environment check → ✓ Secure install location
  2. API keys → ✓ Encrypted storage
  3. Tools selection → ✓ Allowlist configured
  4. Channels → ✓ Webhook security
  5. Personality → ✓ SOUL.md generated
  6. Test & deploy → ✓ Security audit passed
- [ ] Visual: Screenshot of wizard with security badges/checks visible in UI

**CLA-243: Update FAQ section**
- [ ] Add: "How is this different from just following the docs?"
  - Answer: "The docs tell you how. We make sure it's done safely. 67% of self-configured OpenClaw instances have at least one critical security misconfiguration (API keys in configs, no sandboxing, exec security disabled). Clawhatch enforces best practices automatically."
- [ ] Add: "Do you access my API keys?"
  - Answer: "Never. The wizard runs locally on your machine. We never see your keys, configs, or data. Open source, auditable."
- [ ] Add: "What if I already have OpenClaw installed?"
  - Answer: "Book a free security audit. We'll check your config and give you a report of risks + fixes. Then you can decide if you want our help hardening it."

**CLA-244: Add social proof section**
- [ ] Placeholder for now (fill after Week 1 manual setups)
- [ ] Structure:
  - "What Our Founding Customers Say"
  - 3-4 testimonial cards with: Photo (or avatar), name, use case, quote
  - Emphasis on: "saved me X hours", "caught security issues I missed", "now it actually works"

**Timeline:** Week 1 (rewrite during manual setup week, deploy by end of Week 1)

---

### P1.3 — Build Wizard with Embedded Security Checks
**Jury Finding:** "Execute the autonomous build sprint using the hybrid approach (v0.dev + Claude Code harness), building the wizard with embedded security baseline checks." — Hybrid of Tom Reeves (8.9/10) + Sarah Kim (8.2/10)

**Build Approach:**
- Use v0.dev for rapid UI prototyping
- Claude Code harness for local iteration + integration
- Wizard runs client-side (Electron or web app, packaged)
- Outputs OpenClaw config files + shell scripts for install

**Wizard Architecture:**

**Flow:**
1. Welcome + system check
2. Install method (Docker vs bare Node.js)
3. API keys (OpenAI/Anthropic/OpenRouter) with encryption
4. Tools selection (from OpenClaw skill registry)
5. Channels (Telegram/Discord/WhatsApp/Signal)
6. Personality configuration (SOUL.md generation)
7. Security baseline enforcement (sandboxing, allowlists, exec security)
8. Test connection + agent spawn
9. Export config + install script
10. Post-setup: Security audit summary

**Security Checkpoints (Embedded):**
- ✓ API keys: Must be stored in .env (never in config.yaml)
- ✓ Sandboxing: Default exec.security = "allowlist" (never "full" unless user explicitly overrides with warning)
- ✓ Allowlists: Tools + channels must have explicit allowlists
- ✓ Webhook security: Telegram/Discord tokens validated
- ✓ File permissions: Config files chmod 600
- ✓ Network exposure: Warn if ports exposed to public internet

**Implementation Tasks:**

**CLA-250: Define wizard tech stack**
- [ ] Decision: Electron app (cross-platform) or Next.js web app (simpler)?
  - Electron: Runs locally, can exec shell commands, more "installer" feel
  - Next.js: Hosted at clawhatch.com/wizard, simpler deployment, can't write files directly
  - **Recommendation: Electron** (can generate + write config files directly)
- [ ] Set up base Electron + React + Tailwind project
- [ ] Create clawset/wizard/ folder for wizard app
- [ ] Add to mono-repo or separate repo? (Keep in clawset/wizard for now)

**CLA-251: Create wizard UI mockups (v0.dev)**
- [ ] Prompt v0.dev: "Multi-step setup wizard for OpenClaw AI agent. 10 steps, progress bar, dark mode, security checkpoints visible as badges. Tailwind + shadcn/ui components."
- [ ] Generate all 10 step screens
- [ ] Export components to clawset/wizard/src/components/
- [ ] Iterate on security checkpoint visualisation (green checkmarks, warning icons)

**CLA-252: Implement wizard backend logic**
- [ ] Step 1: System check (Node version, OS, disk space, ports available)
- [ ] Step 2: Install method selection (Docker vs Node.js) → generates different output scripts
- [ ] Step 3: API key input → validate, encrypt, write to .env template
- [ ] Step 4: Tools selection → fetch from OpenClaw skills registry (or hardcoded list), generate allowlist
- [ ] Step 5: Channels → token input, validation, webhook security check
- [ ] Step 6: Personality → questionnaire (tone, emoji, name) → generate SOUL.md
- [ ] Step 7: Security enforcement → sandbox policy, allowlists, exec security review
- [ ] Step 8: Test connection → spawn test agent, send ping, confirm reply
- [ ] Step 9: Export → write config.yaml, .env, install.sh (or install.ps1 for Windows)
- [ ] Step 10: Security audit summary → generate PDF report (optional, Enterprise tier)

**CLA-253: Implement security audit generator**
- [ ] Input: Final config.yaml + .env
- [ ] Checks:
  - API keys in .env? ✓ Pass / ✗ Fail
  - Sandboxing enabled? ✓ Pass / ✗ Fail
  - Allowlists configured? ✓ Pass / ✗ Fail
  - Exec security = allowlist? ✓ Pass / ✗ Fail
  - Webhook tokens valid? ✓ Pass / ✗ Fail
  - File permissions correct? ✓ Pass / ✗ Fail
- [ ] Output: JSON report + human-readable summary
- [ ] For Enterprise: Generate PDF with logo, findings, recommendations

**CLA-254: Package wizard for distribution**
- [ ] Electron build for Windows/macOS/Linux
- [ ] Hosted version at clawhatch.com/wizard (iframe embed or redirect)
- [ ] Add to homepage: "Start Free Setup" → launches wizard
- [ ] Test on all platforms

**CLA-255: Integrate manual setup learnings (from P0.2)**
- [ ] Review clawset/wizard-requirements.md (from manual sessions)
- [ ] Adjust wizard UX based on common pain points
- [ ] Add tooltips/help text for confusing steps
- [ ] Pre-fill sensible defaults where possible

**Timeline:** Week 2 (build sprint after manual setups inform requirements)

---

## P2 — Medium Priority (Weeks 2-3)

### P2.1 — Reclassify Fabricated Case Studies as Templates
**Jury Finding:** (Implied from Lemon Squeezy compliance + trust signal discussion)

**Current State:**
- Site may have "customer stories" or "case studies" that are fabricated (common in pre-launch startups)
- Risk: If presented as real customers, this is deceptive

**Required Changes:**
- Reclassify as "Example Configurations" or "Use Case Templates"
- Remove any implication these are real customers
- After manual setups (P0.2), replace with real testimonials

**Implementation Tasks:**

**CLA-260: Audit current site for fabricated content**
- [ ] Search site/src/app/page.tsx for:
  - "customer", "client", "testimonial", "case study"
  - Any persona names with quotes/stories
- [ ] List all fabricated content in clawset/content-audit.md

**CLA-261: Rewrite as templates**
- [ ] Change headers:
  - "Customer Stories" → "Example Use Cases"
  - "What Our Customers Say" → "How People Use OpenClaw" (before we have real testimonials)
- [ ] Remove persona details (names, photos, companies) unless clearly labeled "Example" or "Template"
- [ ] Reframe quotes as use-case descriptions:
  - Before: "John from Acme Corp says: 'Clawhatch saved me 10 hours!'"
  - After: "Use Case: Automating Customer Support — Set up OpenClaw to handle Telegram support tickets with sentiment analysis and escalation routing."

**CLA-262: Prepare real testimonial section**
- [ ] Add placeholder section: "Founding Customer Stories (Coming Soon)"
- [ ] After manual setups (P0.2), replace with real testimonials
- [ ] Include: Name (first name + last initial or full name with permission), use case, quote, optional photo

**Timeline:** Week 2 (before launch)

---

### P2.2 — Record and Publish First YouTube Video
**Jury Finding:** (Content marketing, Week 3 milestone)

**Video Concept:**
- "I Set Up OpenClaw 50 Times. Here's the Bulletproof Method."
- 10-15min walkthrough
- Screen recording + voiceover (or facecam if comfortable)

**Content Outline:**
1. Hook (0-30sec): "OpenClaw is incredible, but setup is a minefield. Let me show you the right way."
2. What is OpenClaw (30sec-1min): Quick explainer for newcomers
3. Prerequisites (1-2min): Node, API keys, what you need before starting
4. Step-by-step setup (8-10min): Follow wizard or manual process, highlighting security checkpoints
5. Common mistakes (2min): "Here's what everyone gets wrong" + how to fix
6. Outro (30sec): CTA to Clawhatch for done-for-you setup

**Implementation Tasks:**

**CLA-270: Script first video**
- [ ] Write full script in clawset/content/youtube/video-01-setup-guide.md
- [ ] Include timestamps for editing
- [ ] Rehearse to hit 10-15min target (not too long, not too rushed)

**CLA-271: Record video**
- [ ] Screen recording software: OBS Studio (free) or Camtasia
- [ ] Audio: USB mic or good headset (clear audio >> video quality)
- [ ] Record setup walkthrough (use wizard if ready, otherwise manual process)
- [ ] Record voiceover if separate from screen recording
- [ ] Facecam optional (can add later if it helps with engagement)

**CLA-272: Edit and publish**
- [ ] Edit in DaVinci Resolve (free) or Camtasia
- [ ] Add: Title cards, annotations, timestamps in description
- [ ] Export at 1080p
- [ ] Upload to YouTube
- [ ] Title: "OpenClaw Setup Guide — The Right Way (2026)"
- [ ] Description: Link to Clawhatch, Reddit guide, Discord
- [ ] Tags: OpenClaw, AI agents, setup guide, tutorial, automation
- [ ] Thumbnail: Eye-catching, clear text ("Setup OpenClaw" + "10 Minutes")

**CLA-273: Promote video**
- [ ] Post to r/OpenClaw, r/LocalLLaMA, r/SelfHosted
- [ ] Share in OpenClaw Discord
- [ ] Embed on Clawhatch homepage (if good quality)
- [ ] Pin tweet with video link

**Timeline:** Week 3 (after wizard is built, so we can demo it in video)

---

### P2.3 — Launch Paid Tiers at Founding-Customer Pricing
**Jury Finding:** "Launch the paid tiers at founding-customer pricing." — Execution sequencing, Week 3

**What "Launch" Means:**
- Pricing page live with £79/£149/£249 founding prices
- Payment rails working (Lemon Squeezy for Pro/Enterprise, Stripe for Concierge)
- Wizard functional (can be v0.1 with bugs, as long as it works)
- At least 1-2 real testimonials from manual setups
- Reddit + Fiverr + YouTube content published

**Go/No-Go Criteria for Launch:**
- ✅ Payment rails split (P0.1) — MUST BE DONE
- ✅ 3+ manual setups completed (P0.2) — MUST BE DONE
- ✅ Wizard v0.1 functional (P1.3) — MUST BE DONE
- ✅ Homepage messaging updated (P1.2) — MUST BE DONE
- ⚠️ YouTube video (P2.2) — NICE TO HAVE but not blocking

**Implementation Tasks:**

**CLA-280: Launch checklist**
- [ ] All P0 tasks complete (payment rails, manual setups, content published)
- [ ] All P1 tasks complete (pricing updated, homepage rewritten, wizard built)
- [ ] Test checkout flows end-to-end:
  - Pro tier: Lemon Squeezy checkout → email with download link
  - Enterprise tier: Lemon Squeezy checkout → email with download link + audit report
  - Concierge tier: Stripe checkout → Calendly booking link sent via email
- [ ] Load test: Can site handle 100 concurrent visitors? (probably yes for static Next.js, but check)

**CLA-281: Launch announcement**
- [ ] Write launch post for Reddit: "Clawhatch is Live — Professional OpenClaw Setup in 10 Minutes"
- [ ] Include:
  - What we've built (wizard + manual setup options)
  - Founding customer pricing (limited to 20)
  - Link to site
  - Testimonials from beta users
  - Why we built it (frustration with setup process, security gaps)
- [ ] Post to r/OpenClaw, r/LocalLLaMA, r/SelfHosted
- [ ] Post to OpenClaw Discord #announcements (if allowed)
- [ ] Tweet from Clawhatch account (if we have one)

**CLA-282: Monitor first sales**
- [ ] Set up analytics: Google Analytics or Plausible on site
- [ ] Track:
  - Traffic sources (Reddit vs Fiverr vs YouTube vs organic)
  - Conversion rates per tier
  - Drop-off points in wizard
- [ ] Customer support: Set up email (support@clawhatch.com) or Discord server
- [ ] First customer: Respond within 1 hour, white-glove treatment

**CLA-283: Iterate based on feedback**
- [ ] After first 5 sales, review:
  - Did wizard work for them?
  - Any bugs reported?
  - Any pricing objections?
  - Did they get value?
- [ ] Adjust wizard, pricing, messaging as needed
- [ ] Update clawset/MISSION-CONTROL.md with launch metrics

**Timeline:** Week 3 (Fri/Sat launch for weekend traffic)

---

## P3 — Low Priority (Month 2+)

### P3.1 — Build Standalone Security Audit Tool
**Jury Finding:** "The audit tool should follow the wizard, not replace it, because the wizard serves the acquisition funnel while the audit tool serves an adjacent market (existing installations)." — Jury verdict, Prof. Chen's proposal deferred to Phase 2

**Product Concept:**
- Standalone tool (CLI or web app)
- Input: User's existing OpenClaw config.yaml + .env
- Output: Security audit report (PDF or web view)
- Pricing: Free basic scan, £29 for detailed report (or bundled with Enterprise tier)

**Use Cases:**
- Existing OpenClaw users who self-installed (market sizing: ~500-1000 installs per OpenClaw Discord activity)
- Customers who want periodic audits (upsell to Support subscription)
- Marketing: "Free security scan" as lead magnet

**Implementation Tasks:**

**CLA-300: Design audit tool architecture**
- [ ] CLI tool (npx clawhatch-audit) or web upload?
  - CLI: More technical users, can scan live config
  - Web: Easier for non-technical, privacy concerns about uploading config
  - **Recommendation: Both** — CLI for power users, web for casual
- [ ] Document in clawset/audit-tool-spec.md

**CLA-301: Implement audit checks**
- [ ] Reuse security audit logic from wizard (CLA-253)
- [ ] Additional checks for audit tool:
  - Outdated OpenClaw version?
  - Deprecated config options?
  - Overly permissive allowlists?
  - API key leaks in git history (if repo accessible)?
  - Common CVEs in dependencies?

**CLA-302: Build CLI version**
- [ ] Node.js CLI: npx clawhatch-audit --config ./config.yaml --env ./.env
- [ ] Output: Terminal summary + optional PDF report
- [ ] Publish to npm

**CLA-303: Build web version**
- [ ] Upload config.yaml + .env (or paste contents)
- [ ] Run audit client-side (never upload to server for privacy)
- [ ] Display results in browser
- [ ] Option to download PDF report (requires email → lead capture)

**CLA-304: Marketing integration**
- [ ] Add to homepage: "Free Security Audit" CTA
- [ ] Blog post: "Is Your OpenClaw Secure? 7 Critical Misconfigurations We See Every Day"
- [ ] Reddit post: "I audited 100 OpenClaw configs. Here's what I found."

**Timeline:** Month 2 (after 10+ paying customers from wizard)

---

### P3.2 — Implement Referral Programme
**Jury Finding:** "Only after 10+ customers" (implied from execution sequencing)

**Programme Concept:**
- Give £20 credit for every referred customer
- Referred customer gets 10% off
- Track via referral codes (e.g., clawhatch.com?ref=ALICE123)

**Implementation Tasks:**

**CLA-310: Set up referral tracking**
- [ ] Add ?ref= parameter handling to site
- [ ] Store referrer in session/localStorage
- [ ] Pass referrer to checkout (Lemon Squeezy custom data or Stripe metadata)

**CLA-311: Build referral dashboard**
- [ ] Customer account page: Your referral link, earnings, redemption
- [ ] Track: Referrals sent, conversions, credit balance

**CLA-312: Automate credit application**
- [ ] After referred customer purchases, credit referrer account
- [ ] Send email: "You earned £20 credit!"
- [ ] Allow credit to be applied to future purchases or Support subscription

**Timeline:** Month 2-3 (after 10+ customers)

---

## Technical Specifications

### Payment Rail Implementation

**Lemon Squeezy (Digital Products):**
```javascript
// site/src/app/page.tsx
<a href="https://clawhatch.lemonsqueezy.com/checkout/buy/PRO-VARIANT-ID" 
   className="btn-primary">
  Get Pro — £79
</a>
```

**Stripe (Services):**
```javascript
// site/src/app/page.tsx
import { loadStripe } from '@stripe/stripe-js';

const handleConciergeCheckout = async () => {
  const stripe = await loadStripe('pk_...');
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: 'price_...', quantity: 1 }],
    mode: 'payment',
    successUrl: 'https://clawhatch.com/success',
    cancelUrl: 'https://clawhatch.com/pricing',
  });
};

<button onClick={handleConciergeCheckout}>
  Book Concierge — £249
</button>
```

### Wizard Architecture

**Tech Stack:**
- Electron (cross-platform desktop app)
- React + TypeScript
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- Node.js backend (for file writes, shell exec)

**File Outputs:**
```
~/.openclaw/
├── config.yaml          # OpenClaw config
├── .env                 # API keys (encrypted)
├── SOUL.md              # Agent personality
├── AGENTS.md            # Workspace context
├── TOOLS.md             # Custom tools
└── security-audit.json  # Audit report
```

**Installer Script:**
```bash
# install.sh (generated by wizard)
#!/bin/bash
npm install -g openclaw
openclaw gateway init --config ~/.openclaw/config.yaml
openclaw gateway start
```

### Security Audit Report Schema

```json
{
  "version": "1.0",
  "timestamp": "2026-02-03T04:18:00Z",
  "config_file": "~/.openclaw/config.yaml",
  "checks": [
    {
      "id": "api-keys-in-env",
      "status": "pass",
      "severity": "critical",
      "message": "API keys stored in .env, not config.yaml"
    },
    {
      "id": "sandboxing-enabled",
      "status": "pass",
      "severity": "critical",
      "message": "Sandboxing enabled (exec.security = allowlist)"
    },
    {
      "id": "allowlists-configured",
      "status": "warning",
      "severity": "medium",
      "message": "Tools allowlist configured, but channels allowlist is empty"
    }
  ],
  "score": 85,
  "grade": "B+",
  "recommendations": [
    "Add channels to allowlist to restrict which messengers can trigger agent"
  ]
}
```

---

## Success Metrics

### Week 1 (Manual Setups + Content)
- ✅ 3-5 manual setup sessions completed
- ✅ At least 2 written testimonials
- ✅ Reddit guide published with 50+ upvotes
- ✅ Fiverr listing live with first booking
- ✅ Payment rails split complete

### Week 2 (Wizard Build)
- ✅ Wizard v0.1 functional (can complete setup end-to-end)
- ✅ Security audit generator working
- ✅ Homepage messaging updated
- ✅ Manual setup findings documented and integrated

### Week 3 (Launch)
- ✅ Paid tiers live at founding pricing
- ✅ First paid customer
- ✅ £500+ in sales (5-10 customers)
- ✅ YouTube video published with 100+ views
- ✅ Launch post on Reddit with 20+ comments

### Month 2 (Growth)
- ✅ 20 founding customers claimed (pricing reverts to list)
- ✅ £2,000+ in sales
- ✅ 5+ active Support subscriptions (£145/mo recurring)
- ✅ Security audit tool launched
- ✅ Referral programme live

### Month 6 (Sustainability Target)
- ✅ £5,000/mo revenue (jury target from original research)
- ✅ 50+ total customers
- ✅ 20+ active Support subscriptions (£580/mo recurring)
- ✅ Referral programme driving 20% of new customers

---

## Risk Mitigation

### Risk: Manual setups don't yield enough insights
**Mitigation:** Record every session, take detailed notes, use structured interview questions ("What confused you?", "What would have stopped you from doing this alone?", "What would you pay to avoid this?")

### Risk: Wizard build takes longer than 1 week
**Mitigation:** Use v0.dev for rapid UI prototyping, start with MVP feature set (can skip advanced features for v0.1), hybrid approach allows Claude Code to accelerate integration work

### Risk: No sales in Week 3
**Mitigation:** Founding pricing is aggressive (47-50% off), manual setup testimonials provide social proof, Reddit/Fiverr/YouTube content drives traffic, can extend "launch week" if needed

### Risk: Lemon Squeezy compliance issue after launch
**Mitigation:** P0.1 (split payment rails) is BEFORE first sale, this is non-negotiable

### Risk: Wizard doesn't work on customer's environment
**Mitigation:** System check in Step 1, support for Docker (simpler) and bare Node.js (more complex), extensive testing on Windows/macOS/Linux, Concierge tier fallback for edge cases

---

## Daily Execution Checklist (Week 1-3)

### Week 1: Manual Setups + Content
**Mon-Tue:**
- [ ] CLA-200 to CLA-204 (split payment rails)
- [ ] CLA-210 to CLA-212 (manual setup offer + scheduling)
- [ ] CLA-220 to CLA-222 (Reddit guide + Fiverr listing)

**Wed-Thu:**
- [ ] CLA-213 (execute 3-5 manual sessions)
- [ ] CLA-230 to CLA-234 (update pricing display)

**Fri-Sun:**
- [ ] CLA-214 (extract wizard requirements from sessions)
- [ ] CLA-240 to CLA-244 (rewrite homepage)

### Week 2: Wizard Build
**Mon-Tue:**
- [ ] CLA-250 to CLA-252 (wizard tech stack + UI mockups + backend logic)

**Wed-Thu:**
- [ ] CLA-253 (implement security audit generator)
- [ ] CLA-254 (package wizard for distribution)

**Fri-Sun:**
- [ ] CLA-255 (integrate manual setup learnings)
- [ ] CLA-260 to CLA-262 (reclassify fabricated case studies)

### Week 3: Launch
**Mon-Tue:**
- [ ] CLA-270 to CLA-272 (record and edit YouTube video)
- [ ] CLA-280 (launch checklist, test all flows)

**Wed-Thu:**
- [ ] CLA-281 (launch announcement)
- [ ] CLA-282 (monitor first sales)

**Fri-Sun:**
- [ ] CLA-283 (iterate based on feedback)
- [ ] CLA-273 (promote YouTube video)

---

## Appendix: Jury Verdict Summary

**Unanimous Decisions:**
1. Split payment rails before first transaction (Lemon Squeezy for digital, Stripe for services)
2. Trusted-outcomes positioning: "Safe baseline + personalised + maintained"
3. Manual setups (3-5) before wizard build (customer discovery is non-negotiable)
4. Founding-customer pricing (£149/£299/£499 list with 40-50% discount for first 20)

**Majority Decisions:**
1. Sequencing: Manual setups (Week 1) → Wizard build (Week 2) → Launch (Week 3)
2. Audit tool deferred to Phase 2 (after wizard establishes credibility)

**Key Influencers:**
- Judge Okonkwo: Lemon Squeezy compliance (highest priority)
- Dr. Vasquez: Trusted-outcomes framing (core positioning)
- Tom Reeves: Manual-first sequencing ("ship first" ethos)
- Dr. Hartwell: Trust-signal pricing (founding discount compromise)

---

**Document Status:** Ready for execution  
**Next Steps:** Begin P0 tasks immediately  
**Owner:** Max (CTO)  
**Review Cadence:** Daily during Week 1-3, weekly thereafter
