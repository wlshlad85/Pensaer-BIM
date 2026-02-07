# Clawhatch: 3 Free Setup-for-Testimonial Exchanges

*Plan for acquiring first 3 paying-quality testimonials through free setup sessions*

---

## 1. Ideal Client Criteria

Pick people who match **at least 3 of 5**:

- **Stuck at setup** — already installed OpenClaw/Clawdbot but hit a wall (auth confusion, WhatsApp won't connect, gateway won't start, WSL issues)
- **Non-developer** — not a programmer; struggles with CLI, config files, API keys. These people get the MOST value and give the best testimonials because the transformation is dramatic
- **Active in community** — posts in r/OpenClaw, OpenClaw Discord, or tweets about it. Their testimonial carries social proof
- **Has a real use case** — not just kicking tyres. Wants WhatsApp assistant for their business, family group bot, productivity setup, etc. Specific use case = specific testimonial
- **Willing to be public** — will use real name/handle, allow screen recording or written quote

**Disqualify if:**
- They're a developer who could figure it out with 30 min of docs
- They just want free consulting with no intent to share feedback
- Their use case requires unsupported/custom features (scope creep)

**Where to find them:**
- r/OpenClaw — people posting "help, X doesn't work"
- OpenClaw Discord #help channel — stuck users
- Twitter/X — people tweeting frustration about setup
- GitHub Issues — users filing config/setup bugs that are actually user error

---

## 2. Outreach Templates

### Reddit DM

> Hey! Saw your post about [specific problem — e.g. "WhatsApp disconnecting after QR scan"]. I've been building a setup wizard for OpenClaw that solves exactly this.
>
> I'm looking for 3 people to do a **free guided setup session** (30-45 min, screen share) where I walk you through getting everything working. In exchange, I'd just ask for an honest testimonial about the experience.
>
> No catch — I'm validating the product and need real feedback from real users. Interested?

### Twitter/X DM

> Hey [name] — saw your tweet about [problem]. I help people get OpenClaw set up without the headaches.
>
> Doing 3 free setup sessions this week in exchange for honest testimonials. 30-45 min, I'll get you fully working. Want in?

### Discord DM

> Hey! Noticed you're stuck on [problem] in #help. I'm building something that automates all the painful setup bits.
>
> I'm doing 3 free 1:1 setup sessions this week — I'll get your whole instance running (WhatsApp, auth, gateway, the lot) in exchange for a short testimonial afterwards.
>
> No strings. Just need honest feedback. Want to grab a slot?

### Key principles:
- **Reference their specific problem** (shows you read their post, not spam)
- **Be concrete** about what they get (full working setup)
- **Be concrete** about what you need (testimonial)
- **Low commitment framing** (30-45 min, honest feedback)
- **Scarcity** (only 3 slots)

---

## 3. Setup Session Checklist

### Pre-session (15 min before)
- [ ] Ask client to share: OS, Node version, what channels they want, what they've tried so far
- [ ] Prepare screen recording (OBS or built-in) — ask permission to record
- [ ] Have their pain points doc open for reference
- [ ] Test your own screen share

### During session (30-45 min)
- [ ] **Intro (2 min):** "Here's what we'll do today — by the end you'll have a working [channel] setup"
- [ ] **Platform detection:** OS, WSL status, Node version, existing install state
- [ ] **Auth setup:** Walk through API key setup (ONE path, no confusion). Verify model connectivity
- [ ] **Gateway config:** Set gateway.mode, validate config, ensure service starts
- [ ] **Channel setup:** WhatsApp QR / Telegram token / Discord bot — whatever they need
- [ ] **Security hardening:** DM policy = pairing, auth token for non-loopback, permissions
- [ ] **First message test:** Send a message, get a reply. This is the money moment
- [ ] **Personalisation:** Set up their agent name, personality basics, any specific use case config
- [ ] **Post-setup verification:** `openclaw doctor`, `openclaw status --deep`, test each channel

### Post-session
- [ ] Send them a "what we set up" summary (reinforces value)
- [ ] Note any issues hit for case study material
- [ ] Schedule testimonial capture (same day or next day while fresh)

---

## 4. Testimonial Recording Guide

### Format options (offer all, let them choose):
1. **Video call recording** (best) — 5-10 min recorded Zoom/Meet after setup
2. **Written responses** (good) — send questions, they reply in their own words
3. **Voice memo** (easy) — they record on phone and send

### Questions to ask (in order):

**The Before:**
1. "What were you trying to set up, and what was it for?" *(establishes use case)*
2. "How long had you been stuck before we connected?" *(quantifies pain)*
3. "What specifically was frustrating about the setup process?" *(names the pain point)*
4. "Had you considered giving up on OpenClaw entirely?" *(shows stakes)*

**The During:**
5. "What surprised you about how the session went?" *(captures the "aha" moment)*
6. "Was there a moment where something clicked that you couldn't figure out alone?" *(specific value)*

**The After:**
7. "What's working now that wasn't before?" *(concrete outcome)*
8. "How are you using it day-to-day?" *(real use case proof)*
9. "If you had to explain Clawhatch to a friend in one sentence, what would you say?" *(they write your tagline)*
10. "Would you have paid for this session? How much would it have been worth?" *(price anchoring for future sales)*

### Recording tips:
- Let them ramble — edit later. Authentic > polished
- If on video, record their screen showing the working setup at the end
- Get explicit permission: "Can I use this testimonial on the Clawhatch website with your name/handle?"
- Ask for a star rating (1-5) — useful for social proof

---

## 5. Follow-up Sequence

### Day 0 (after session)
- Thank you message + summary of what was set up
- "Let me know if anything breaks or if you have questions"
- Capture testimonial (if not done live)

### Day 3
- "How's everything running? Any issues?"
- If issues → fix them (builds loyalty, improves testimonial)
- If smooth → "Glad it's working! Quick reminder — if you haven't sent your testimonial yet, [link/instructions]"

### Day 7
- "What's the coolest thing you've done with your setup this week?"
- Use their answer as case study material
- Ask: "Would you be open to me writing up your story as a case study? I'll send it for your approval first"

### Day 14
- "Still going strong? Any new features you wish existed?"
- Their feature requests = product roadmap input
- Soft ask: "Know anyone else struggling with OpenClaw setup? I'm opening a few more slots"
- This is your referral loop

### Day 30
- Check in one last time
- Ask if their use case has evolved
- If they're power users now → ask for updated testimonial (even more valuable)

---

## 6. Turning Each Into a Written Case Study

### Case Study Template

```markdown
# [Client Name/Handle]: [One-line result]
*e.g. "Sarah M: From 3 days stuck to WhatsApp bot running in 40 minutes"*

## The Problem
- Who they are (role, technical level)
- What they were trying to do (use case)
- How long they'd been stuck
- What they'd already tried
- How they were feeling (frustrated, ready to quit, etc.)

## The Setup Session
- What we found (specific issues — e.g. "Node 18 instead of 22, API key in .bashrc instead of .env, WhatsApp using VoIP number")
- How we fixed it (without being too technical — focus on speed and ease)
- The "aha" moment
- Time from start to working: X minutes

## The Result
- What's working now (specific: "WhatsApp bot responds in <2 seconds, handles family group of 15 people")
- How they use it daily
- Their quote (pull best line from testimonial)

## Key Takeaway
- What this proves about Clawhatch's value
- Link to the specific pain points solved (map to pain-points.md categories)
```

### Distribution plan for each case study:
1. **Website/landing page** — headline quote + full story
2. **Reddit post** — "How I helped [person] get OpenClaw running in 40 min after 3 days stuck" (in r/OpenClaw, with their permission)
3. **Twitter thread** — problem → session → result arc, tag the client
4. **Discord** — share in relevant channels
5. **Future sales conversations** — "Here's someone in a similar situation..."

### What makes a strong case study:
- **Specific numbers** ("3 days stuck → 40 min fix", "tried 5 different guides")
- **Emotional arc** (frustrated → relieved → delighted)
- **Relatable problem** (matches common pain points from research)
- **Quotable line** from the client
- **Before/after contrast** that's visually or narratively clear

---

## Timeline

| Week | Action |
|------|--------|
| **Week 1** | Find and reach out to 5-8 candidates (expect ~50% response rate) |
| **Week 1-2** | Book and run 3 sessions |
| **Week 2** | Collect all testimonials |
| **Week 2-3** | Write 3 case studies, get client approval |
| **Week 3** | Publish case studies, begin using in marketing |

## Success Metrics
- 3 completed sessions with working setups
- 3 testimonials captured (at least 2 video/audio, 1 written minimum)
- 3 case studies published
- At least 1 referral from the 3 clients
- Price validation data from question #10
