# Clawhatch — Product Hunt Launch Plan

> Created: 2025-07-18  
> Status: DRAFT — Needs Rich's review before scheduling

---

## 1. Launch Readiness Checklist

### Product (Must-Have)
- [ ] Landing page live at production URL (clawhatch.com or similar)
- [ ] Setup wizard fully functional end-to-end (all steps complete without errors)
- [ ] Lemon Squeezy checkout working ($39 Pro Setup, $19/mo Support)
- [ ] At least 1 template working (developer, business-user, solo-founder)
- [ ] Troubleshooting page populated with real FAQs
- [ ] Mobile-responsive — PH visitors will check on phones
- [ ] Page load < 3s (Next.js should handle this, but verify)

### Assets (Must-Have)
- [ ] 240×240 logo (see Section 2)
- [ ] 5–8 gallery images created (see Section 2)
- [ ] Tagline finalised (60 char limit)
- [ ] Description written (see Section 2)
- [ ] Maker comment drafted (see Section 3)
- [ ] First comment ready to paste within 60 seconds of going live

### Social Proof (Should-Have)
- [ ] At least 3 real users who've completed the wizard successfully
- [ ] 1–2 testimonial quotes ready (even informal "this saved me hours" tweets)
- [ ] OpenClaw Discord presence — people know the name Clawhatch
- [ ] Twitter account active with recent posts

### Technical (Must-Have)
- [ ] Analytics tracking launch day traffic (Plausible/Vercel Analytics)
- [ ] Server can handle traffic spike (~500–2,000 visitors in 24h)
- [ ] Error monitoring active (catch wizard failures in real-time)
- [ ] Contact/support channel ready (email or Discord)

### Community (Should-Have)
- [ ] 15+ supporters lined up to upvote + comment in first 2 hours (see Section 4)
- [ ] Scheduled tweets/posts for launch morning
- [ ] Reddit posts prepped (r/sideproject, r/SaaS, r/ClaudeAI)

---

## 2. Product Hunt Assets

### Logo
- **Size:** 240×240px PNG, no transparency needed
- **Design:** Clawhatch egg/claw icon on the dark void (#0A0A0F) background. Use the neon pink (#ff2d87) as the primary mark color. Keep it simple — PH thumbnails are tiny. No text in the logo.
- **Alt option:** If no icon exists yet, use a stylised "CH" monogram in the Hatch Gradient (pink→purple).

### Tagline (60 characters max)
**Primary:** `Set up your AI assistant in minutes, not hours` (49 chars) ✅  
**Alt 1:** `The setup wizard for OpenClaw AI assistants` (44 chars)  
**Alt 2:** `Hatch your personal AI assistant — no code needed` (51 chars)  
**Alt 3:** `One-click setup for OpenClaw/Clawdbot assistants` (49 chars)

### Description (260 char limit for short, unlimited for long)

**Short description (for PH card):**
> Clawhatch walks you through setting up a personal AI assistant powered by OpenClaw. Pick your AI provider, connect your channels (WhatsApp, Discord, Telegram), configure personality, and deploy — all through a visual wizard. No terminal required.

**Long description (PH page):**
> **Stop copy-pasting config files.** OpenClaw is the most popular open-source AI assistant framework (149K+ GitHub stars), but setting it up means wrestling with API keys, YAML configs, channel tokens, and deployment scripts.
>
> Clawhatch fixes that. It's a guided setup wizard that turns a 2-hour terminal session into a 10-minute visual flow:
>
> 🔑 **Choose your AI** — Anthropic Claude, OpenAI GPT, or local models  
> 💬 **Connect channels** — WhatsApp, Discord, Telegram, or all three  
> 🧠 **Set personality** — Pick from templates or customise SOUL.md  
> 🚀 **Deploy** — Generates your config and launches your assistant  
>
> **Who it's for:**
> - Solo founders who want an AI assistant but don't want to become DevOps engineers
> - Developers who've stared at OpenClaw docs and thought "there must be an easier way"
> - Non-technical users who heard about AI assistants and want one without the headache
>
> **Pricing:** Free wizard to explore. $39 one-time for Pro Setup (priority support + advanced templates). $19/mo optional support subscription.
>
> Built by someone who set up OpenClaw the hard way too many times.

### Gallery Images (5–8 images, 1270×760px recommended)

1. **Hero shot** — Full landing page screenshot showing the headline "Hatch Your AI Assistant in Minutes" with the neon glow effect. Establishes brand and vibe immediately.

2. **Wizard Step 1: Provider Selection** — Screenshot of the wizard showing AI provider selection (Anthropic/OpenAI/Local). Shows the clean UI and that setup starts with a simple choice.

3. **Wizard Step 2: Channel Setup** — Screenshot showing WhatsApp/Discord/Telegram channel connection. The "connect your life" moment.

4. **Wizard Step 3: Personality Config** — Screenshot of SOUL.md template selection or personality customisation. The fun/creative step.

5. **Before/After Split** — Left side: intimidating terminal with YAML config files. Right side: Clawhatch's clean wizard UI. Caption: "From this → to this."

6. **Pricing Page** — Clean screenshot of the pricing tiers. Transparency builds trust on PH.

7. **Template Gallery** — Show the 3 templates (Developer, Business User, Solo Founder) as cards. Demonstrates breadth of use cases.

8. **Final Deploy Screen** — The satisfying "Your assistant is ready!" completion screen. End on a high note.

---

## 3. Maker Comment (Post Within 60 Seconds of Launch)

> Hey Product Hunt! 👋
>
> I built Clawhatch because I kept setting up OpenClaw assistants for friends and realised the same thing every time: the software is incredible, but the setup is a wall.
>
> OpenClaw (149K stars on GitHub, formerly Clawdbot) lets you run a personal AI assistant that connects to your WhatsApp, Discord, calendar, email — basically your whole digital life. But getting there means configuring API keys, YAML files, channel tokens, deployment scripts... it's a 2-hour rabbit hole even for developers.
>
> Clawhatch is the guided path through that maze. You pick your AI provider, connect your channels, choose a personality template, and it generates everything for you.
>
> **What I'd love feedback on:**
> - Is the wizard flow intuitive? (Be honest — I can take it)
> - Which channels matter most to you? (WhatsApp? Discord? Something else?)
> - Would you use this for yourself or to set up assistants for clients?
>
> I'm here all day answering questions. Happy to help anyone get their assistant running — even if you don't use Clawhatch to do it. 🦞
>
> — Rich

---

## 4. Supporter Outreach Plan

### Tier 1: Inner Circle (Contact 1 week before launch) — 5 people
These people upvote, leave a genuine comment, and share on social.

1. **Friends/colleagues who've used Clawhatch** — The most authentic commenters. Ask them to share their actual experience.
2. **OpenClaw Discord regulars** — People who've seen you help others. DM individually, don't spam the channel.
3. **Twitter mutuals in AI/dev tooling** — Anyone who's engaged with your build-in-public posts.

**Message template (personalise each one):**
> Hey [name]! I'm launching Clawhatch on Product Hunt on [date]. You helped me test it / gave great feedback on [specific thing]. Would you be up for leaving a comment about your experience on launch day? No pressure at all — even just an upvote helps. I'll send you the link the morning of. 🙏

### Tier 2: Warm Network (Contact 3–5 days before) — 8 people

4. **r/ClaudeAI active members** who've asked about setup help
5. **r/SideProject / r/SaaS commenters** who've engaged with your posts
6. **Dev Twitter accounts** who post about AI assistants / personal AI
7. **OpenClaw GitHub contributors** (check issues/PRs for friendly faces)
8. **Indie hacker communities** (IndieHackers, HackerNews regulars)
9. **YouTube commenters** on OpenClaw setup videos
10. **Discord server owners** who run AI-related communities
11. **Other PH makers** — find recent launches in AI/dev tools category, support theirs first, then ask

**Message template:**
> Hey! I'm launching an OpenClaw setup wizard on Product Hunt soon. I noticed you [specific context — posted about AI setup, asked about OpenClaw, etc.]. Would love your feedback on launch day if you have 2 minutes. I'll drop you the link!

### Tier 3: Cold but Relevant (Contact 1–2 days before) — 5–7 people

12. **Tech bloggers** who cover AI tools / open source
13. **Newsletter authors** (AI/dev focused — offer exclusive angle)
14. **Podcast hosts** who cover indie hacking / AI tools
15. **ProductHunt community members** — engage in discussions in the days before, build name recognition

### Rules
- **Never ask for upvotes explicitly** — PH penalises this. Ask for "feedback" and "honest comments"
- **Stagger engagement** — Don't have 15 people all comment at 00:01. Spread across the first 4 hours
- **Quality > quantity** — 5 genuine comments beat 20 "Great product!" ones
- **Reciprocate** — Support their projects too. This is a long game.

---

## 5. Day-of Timeline (All times BST / London)

### Night Before
- **22:00** — Final check: landing page, wizard, checkout all working
- **22:30** — Pre-write all social posts (Twitter, Reddit, Discord)
- **23:00** — Sleep. Seriously.

### Launch Day

| Time (BST) | Action |
|------------|--------|
| **00:01** | PH launches at midnight PT = 08:01 BST. Schedule the post for 00:01 PT (08:01 BST) or go live manually |
| **08:00** | Wake up, check PH is live, verify all links work |
| **08:02** | Post maker comment (Section 3) — must be within minutes |
| **08:05** | Send launch link to Tier 1 supporters via DM |
| **08:10** | Tweet launch announcement with PH link |
| **08:15** | Post in OpenClaw Discord #showcase or #general (if allowed) |
| **08:30** | Send link to Tier 2 supporters |
| **09:00** | Post on r/SideProject with genuine "I built this" narrative |
| **09:30** | Reply to every single PH comment. Every one. |
| **10:00** | Send link to Tier 3 contacts |
| **10:00–12:00** | Monitor PH, reply to comments, engage on Twitter |
| **12:00** | Post a "midday update" tweet — share vote count, fun stats |
| **12:00–14:00** | Post on r/ClaudeAI, r/SaaS (space them out) |
| **14:00** | Second wave of Twitter engagement — RT supporters, thank people |
| **16:00** | Reddit engagement — reply to comments on your posts |
| **18:00** | Thank-you tweets to top commenters |
| **20:00** | Wind down. Results are mostly locked in by now. |
| **22:00** | Final PH comment thanking everyone for the support |

### Day After
- **Morning:** Write a "launch retrospective" tweet thread — numbers, lessons, surprises
- **Post results** to r/SideProject and IndieHackers
- **Follow up** with everyone who commented — new connections are the real prize

---

## 6. Risk Assessment — Should We Wait or Go?

### GO Signals ✅
- [ ] Wizard works end-to-end without errors
- [ ] At least 3 people have completed setup successfully (not just you)
- [ ] Landing page is polished and fast
- [ ] Payment flow works
- [ ] You have 10+ committed supporters for launch day

### WAIT Signals 🛑
- [ ] Wizard has known broken flows (any step fails consistently)
- [ ] No real users have tested it yet
- [ ] Landing page is placeholder / incomplete
- [ ] No social proof at all (zero testimonials, zero Discord presence)
- [ ] You haven't built any audience yet (0 Twitter followers, no Reddit history)

### Honest Assessment

**Current risks:**
1. **No live URL yet** — Can't launch what people can't visit. This is the #1 blocker.
2. **Thin social proof** — PH voters are skeptical. "149K stars on GitHub" is OpenClaw's credibility, not Clawhatch's. Need at least a few real user stories.
3. **Solo maker** — Not inherently bad (PH loves solo makers), but means you're doing everything on launch day. Prepare everything in advance.
4. **OpenClaw name confusion** — Some PH users won't know what OpenClaw is. The description needs to stand alone without assuming knowledge.
5. **Free alternatives exist** — OpenClawInstaller (975 stars) does a simpler version for free. Your value prop must clearly be "guided + visual + non-technical" vs "curl | bash for devs."

**Recommendation:**

🟡 **Not ready today. Target 2–4 weeks out.**

Before launching, you need:
1. ✅ Live production URL with working wizard
2. ✅ 3–5 real users who've gone through the flow
3. ✅ At least 2 genuine testimonials
4. ✅ Twitter account with 5+ build-in-public posts (establishes you're real)
5. ✅ All gallery images created and polished

**Ideal launch window:** Tuesday, Wednesday, or Thursday (highest PH traffic). Avoid Mondays (crowded with big launches) and weekends (low traffic). First week of the month tends to have less competition.

**When those 5 boxes are checked, you're ready. Don't over-polish — ship it.**

---

## Appendix: PH Listing Checklist

- [ ] PH maker account created and verified
- [ ] Product page drafted (can save as draft before publishing)
- [ ] Topics selected: `Artificial Intelligence`, `Developer Tools`, `Open Source`, `Productivity`
- [ ] Makers tagged (just you, unless collaborators)
- [ ] Pricing model set: Freemium
- [ ] Logo uploaded (240×240)
- [ ] Gallery images uploaded (1270×760)
- [ ] Links: website, Twitter, GitHub (if public)
- [ ] Launch scheduled (or ready for manual launch)
