# CLAWHATCH TASK LIST
**From Town Hall Verdict → Execution**

*Generated: 2026-02-03*  
*Use this checklist to track progress through P0-P3 priorities*

---

## P0 — CRITICAL (DO NOW / THIS WEEK)

### Payment Rails (BEFORE FIRST SALE)
- [ ] **CLA-200**: Set up Stripe account
- [ ] **CLA-201**: Migrate Concierge tier to Stripe (£499 → £249 founding)
- [ ] **CLA-202**: Clarify Support subscription delivery model (automated vs human)
- [ ] **CLA-203**: Update pricing page with dual payment rails
- [ ] **CLA-204**: Legal compliance check (TOS review, payment rails documentation)

### Manual Setups (3-5 SESSIONS)
- [ ] **CLA-210**: Create Reddit post offering free beta setups
- [ ] **CLA-211**: Set up Calendly + intake form
- [ ] **CLA-212**: Create manual setup checklist (session structure, security baseline, personalisation)
- [ ] **CLA-213**: Execute sessions:
  - [ ] Session 1 (detailed notes)
  - [ ] Session 2 (iterate)
  - [ ] Session 3 (iterate)
  - [ ] Session 4 (refine)
  - [ ] Session 5 (final)
- [ ] **CLA-214**: Extract wizard requirements from sessions → wizard-requirements.md

### Content Activation
- [ ] **CLA-220**: Compile Reddit ultimate setup guide
- [ ] **CLA-221**: Publish to r/OpenClaw, r/LocalLLaMA, r/SelfHosted
- [ ] **CLA-222**: Activate Fiverr listing (gig created, published)
- [ ] **CLA-223**: Create /manual-setup landing page with Calendly embed

---

## P1 — HIGH PRIORITY (WEEK 1-2)

### Pricing Update
- [ ] **CLA-230**: Update homepage pricing display (strikethrough + founding badge)
- [ ] **CLA-231**: Update Lemon Squeezy products (Pro £79, Enterprise £149)
- [ ] **CLA-232**: Update Stripe product (Concierge £249)
- [ ] **CLA-233**: Create founding-customer tracking JSON (20 limit)
- [ ] **CLA-234**: Add trust signals around pricing (explainer, comparison section)

### Homepage Rewrite
- [ ] **CLA-240**: Rewrite hero section ("Set up safely, built for you")
- [ ] **CLA-241**: Add Three Pillars section (Safe, Personalised, Maintained)
- [ ] **CLA-242**: Rewrite How It Works (wizard steps WITH security checkpoints visible)
- [ ] **CLA-243**: Update FAQ (security, comparison, existing installs)
- [ ] **CLA-244**: Add social proof section (placeholder, fill after manual setups)

### Wizard Build
- [ ] **CLA-250**: Define wizard tech stack (Electron vs Next.js — recommend Electron)
- [ ] **CLA-251**: Create wizard UI mockups via v0.dev (10 steps, progress bar, security badges)
- [ ] **CLA-252**: Implement wizard backend logic:
  - [ ] Step 1: System check
  - [ ] Step 2: Install method (Docker vs Node.js)
  - [ ] Step 3: API keys (validate, encrypt, .env template)
  - [ ] Step 4: Tools selection (allowlist generation)
  - [ ] Step 5: Channels (token validation, webhook security)
  - [ ] Step 6: Personality (questionnaire → SOUL.md)
  - [ ] Step 7: Security enforcement (sandbox policy review)
  - [ ] Step 8: Test connection (spawn test agent)
  - [ ] Step 9: Export (config.yaml, .env, install script)
  - [ ] Step 10: Security audit summary
- [ ] **CLA-253**: Implement security audit generator (checks, JSON report, PDF for Enterprise)
- [ ] **CLA-254**: Package wizard for distribution (Electron builds, hosted version)
- [ ] **CLA-255**: Integrate manual setup learnings (adjust UX, tooltips, defaults)

---

## P2 — MEDIUM PRIORITY (WEEK 2-3)

### Content Cleanup
- [ ] **CLA-260**: Audit site for fabricated content (customer stories, testimonials)
- [ ] **CLA-261**: Rewrite as templates/use cases (remove persona details)
- [ ] **CLA-262**: Prepare real testimonial section (placeholder → replace after manual setups)

### YouTube Video
- [ ] **CLA-270**: Script first video (setup walkthrough, 10-15min)
- [ ] **CLA-271**: Record video (OBS, screen + voiceover)
- [ ] **CLA-272**: Edit and publish (DaVinci Resolve, YouTube upload)
- [ ] **CLA-273**: Promote video (Reddit, Discord, Twitter, embed on site)

### Launch
- [ ] **CLA-280**: Launch checklist (all P0/P1 complete, test checkout flows, load test)
- [ ] **CLA-281**: Launch announcement (Reddit post, Discord, Twitter)
- [ ] **CLA-282**: Monitor first sales (analytics, customer support, 1hr response SLA)
- [ ] **CLA-283**: Iterate based on feedback (review after first 5 sales)

---

## P3 — LOW PRIORITY (MONTH 2+)

### Security Audit Tool
- [ ] **CLA-300**: Design audit tool architecture (CLI + web versions)
- [ ] **CLA-301**: Implement audit checks (reuse wizard logic + additional checks)
- [ ] **CLA-302**: Build CLI version (npx clawhatch-audit)
- [ ] **CLA-303**: Build web version (upload config, client-side audit)
- [ ] **CLA-304**: Marketing integration (homepage CTA, blog post, Reddit post)

### Referral Programme
- [ ] **CLA-310**: Set up referral tracking (?ref= parameter handling)
- [ ] **CLA-311**: Build referral dashboard (account page, earnings, redemption)
- [ ] **CLA-312**: Automate credit application (after referred purchase, send email)

---

## QUICK WINS (Can Do Today)

**Immediate Actions (Next 2 Hours):**
1. **CLA-200**: Create Stripe account → 15min
2. **CLA-210**: Write Reddit beta tester offer post → 30min
3. **CLA-211**: Set up Calendly with intake form → 20min
4. **CLA-220**: Compile Reddit setup guide from existing research → 45min

**By End of Day:**
5. **CLA-221**: Publish Reddit guide to r/OpenClaw
6. **CLA-230**: Update homepage pricing display (strikethrough + founding badge)

**By End of Week:**
7. **CLA-213**: Complete 3-5 manual setup sessions
8. **CLA-240-244**: Homepage rewrite (Safe + Personalised + Maintained messaging)

---

## SUCCESS CRITERIA

### Week 1 Complete When:
- ✅ Payment rails split (Lemon Squeezy digital, Stripe services)
- ✅ 3-5 manual setups done with testimonials
- ✅ Reddit guide published (50+ upvotes target)
- ✅ Fiverr listing live with first booking
- ✅ Homepage messaging updated

### Week 2 Complete When:
- ✅ Wizard v0.1 functional (end-to-end setup works)
- ✅ Security audit generator working
- ✅ Manual setup learnings integrated into wizard
- ✅ Fabricated content reclassified as templates

### Week 3 Complete When:
- ✅ Paid tiers live at founding pricing
- ✅ First paid customer
- ✅ £500+ in sales (5-10 customers)
- ✅ YouTube video published (100+ views)

---

## BLOCKERS & DEPENDENCIES

**Cannot Launch Until:**
- Payment rails split (P0.1) — BLOCKING
- 3+ manual setups (P0.2) — BLOCKING
- Wizard functional (P1.3) — BLOCKING
- Homepage messaging updated (P1.2) — BLOCKING

**Nice to Have But Not Blocking:**
- YouTube video (can launch without, publish after)
- Referral programme (Month 2+)
- Audit tool (Phase 2 product)

---

## DAILY STANDUP QUESTIONS

Ask yourself each day:
1. Which P0 tasks are DONE? (Payment rails, manual setups, content)
2. Which P1 tasks are IN PROGRESS? (Pricing, homepage, wizard)
3. Any BLOCKERS? (Technical issues, customer no-shows, unclear requirements)
4. What's the NEXT TASK? (Pick from checklist above)

Update clawset/MISSION-CONTROL.md daily with progress.

---

**Current Sprint:** Week 1 (Manual Setups + Content Activation)  
**Next Milestone:** First manual setup session booked  
**Target Launch:** Week 3 (Fri/Sat for weekend traffic)
