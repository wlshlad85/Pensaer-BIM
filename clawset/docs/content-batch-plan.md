# Clawhatch Content Batch Production Plan

*One month of content in 3 focused days*
*Generated: 2025-06-24*

---

## Content Strategy Overview

**Source:** Pain-points research (C:\Users\RICHARD\clawd\clawset\research\pain-points.md)

**Top-performing topic areas** (ranked by search demand & community frustration):
1. **First-run setup failures** (A1, E2, B1-B3) — highest volume, every new user hits this
2. **WhatsApp connection pain** (C1-C5) — emotional, high engagement, lots of "me too"
3. **Windows/WSL setup** (A2, A3, H1) — huge audience, underserved
4. **Security footguns** (F1, F2) — fear-driven clicks, shareable
5. **API key / auth confusion** (B1-B7) — constant questions, evergreen

---

## PART 1: YouTube Video Scripts (4 videos)

### Video 1: "Why Your AI Bot Won't Reply (And How to Fix It in 2 Minutes)"
**Target pain points:** E2 (DM pairing), B1 (no API key), B3 (auth confusion)
**Format:** Problem → diagnosis → fix. Screen recording + face cam.
**Length:** 8-10 min
**Hook:** "You set up OpenClaw, sent your first message... and got nothing back. Here's why."

**Script Outline:**
1. **[0:00-0:30] Hook** — Show the experience: send message, nothing happens. "This is the #1 reason people think OpenClaw is broken."
2. **[0:30-2:00] Problem 1: DM Pairing** — Explain that OpenClaw uses pairing by default (security feature, not a bug). Show the pairing code in logs. Demo: `openclaw pairing approve`. "Your bot isn't ignoring you — it's waiting for permission."
3. **[2:00-4:00] Problem 2: No API Key** — Show the error in logs. Walk through `openclaw models auth setup-token --provider anthropic`. Explain: ONE path, don't overthink it. API key > OAuth > subscription.
4. **[4:00-6:00] Problem 3: Auth Confusion Simplified** — The decision tree: "Do you have an API key? Use it. Don't have one? Get one. Using Claude subscription? Here's why you should switch." Show `openclaw models status` to verify.
5. **[6:00-7:30] The 60-Second First-Message Checklist** — Quick recap: 1) API key configured, 2) Gateway running, 3) Pairing approved. Show successful first message.
6. **[7:30-8:30] Bonus: Pre-flight Check** — Show `openclaw doctor` catching all three problems at once.
7. **[8:30-9:00] CTA** — "If this saved you hours of debugging, subscribe. Next week: WhatsApp setup without the pain."

**B-roll needed:** Terminal recordings of each fix, error screenshots, success moment
**Key searchable phrases:** "openclaw not replying", "openclaw no response", "openclaw setup", "openclaw pairing"

---

### Video 2: "OpenClaw on Windows: The Complete Setup (Without Losing Your Mind)"
**Target pain points:** A2, A3, A4, H1, B6
**Format:** Full walkthrough tutorial. Screen recording + face cam.
**Length:** 12-15 min
**Hook:** "Windows setup for OpenClaw has 5 places it can break. I'll walk you through all of them."

**Script Outline:**
1. **[0:00-0:45] Hook** — "OpenClaw on Windows is totally doable — but there are 5 traps. Miss one and you're stuck. Let's hit them all."
2. **[0:45-3:00] Step 1: WSL2 + Systemd** — `wsl --install`, enable systemd in `/etc/wsl.conf`, restart. Show the gotcha: systemd is NOT enabled by default. Show what failure looks like without it.
3. **[3:00-5:00] Step 2: Node 22+ in WSL** — Why the Windows Node doesn't count. Install nvm in WSL, `nvm install 22`. Verify with `node --version`. Show the Bun trap: "Do NOT use Bun for WhatsApp or Telegram."
4. **[5:00-7:00] Step 3: Git + PATH** — Ensure git is in WSL PATH. Show the "git not found" error and fix. `sudo apt install git` — that's it.
5. **[7:00-9:00] Step 4: Install & First Run** — Run the installer inside WSL. Show `openclaw doctor` catching issues. Walk through onboarding.
6. **[9:00-11:00] Step 5: The Service Trap** — Env vars in `.bashrc` DON'T work for services. Put API keys in `~/.openclaw/.env`. Show the failure and fix side by side.
7. **[11:00-13:00] Step 6: LAN Access (Bonus)** — WSL2 networking gotcha. Port forwarding with `netsh interface portproxy`. Show the PowerShell script.
8. **[13:00-14:00] Recap Checklist** — Visual checklist of all 5 steps.
9. **[14:00-14:30] CTA** — "Pin this video for your Windows setup. Link to the checklist in the description."

**B-roll needed:** Fresh Windows VM recording, WSL terminal, side-by-side success/failure
**Key searchable phrases:** "openclaw windows", "openclaw wsl2", "openclaw windows setup"

---

### Video 3: "OpenClaw WhatsApp Setup: What the Docs Don't Tell You"
**Target pain points:** C1-C5
**Format:** Honest guide with troubleshooting. Screen recording + face cam.
**Length:** 10-12 min
**Hook:** "WhatsApp is the most requested channel — and the most fragile. Here's how to make it actually work."

**Script Outline:**
1. **[0:00-0:40] Hook** — "I'm going to be honest: WhatsApp integration uses an unofficial API. It WILL disconnect sometimes. But here's how to make it as reliable as possible."
2. **[0:40-2:30] The Number Decision** — Dedicated vs personal. Show the consequences of each. Strong recommendation: get a £1 prepaid SIM. Why VoIP numbers (TextNow, Google Voice) get banned instantly.
3. **[2:30-4:30] QR Code Login** — `openclaw channels login`. Walk through the QR scan. Show what success looks like in logs. Explain: this is like WhatsApp Web — your phone must stay connected.
4. **[4:30-6:30] The Disconnect Reality** — "It will disconnect. Here's what to do." Show reconnect config: aggressive backoff, maxAttempts. Show `openclaw status --deep`. Demo: manually re-linking.
5. **[6:30-8:30] Group Setup** — Why groups don't work by default. Find JIDs, add to allowlist, configure mention patterns. Demo: working group conversation.
6. **[8:30-9:30] The Image+Mention Bug** — "This is a WhatsApp limitation, not an OpenClaw bug." Show workaround: always include text with mentions.
7. **[9:30-10:30] selfChatMode** — For personal number users: how to talk to your bot via "Message Yourself". Quick config demo.
8. **[10:30-11:00] Reliability Tips** — Summary: dedicated number, aggressive reconnect, monitor with `openclaw status`, accept occasional re-links.
9. **[11:00-11:30] CTA** — "WhatsApp is worth the effort. Subscribe for more OpenClaw guides."

**B-roll needed:** Phone screen recordings (QR scan, WhatsApp messages), terminal logs
**Key searchable phrases:** "openclaw whatsapp", "openclaw whatsapp disconnect", "openclaw whatsapp setup"

---

### Video 4: "Is Your AI Bot a Security Hole? 5 OpenClaw Settings to Check NOW"
**Target pain points:** F1-F7
**Format:** Urgent/fear-driven. Screen recording + face cam.
**Length:** 8-10 min
**Hook:** "If you set up OpenClaw with default settings and exposed it to the internet... you might have a problem."

**Script Outline:**
1. **[0:00-0:30] Hook** — "Your AI bot has shell access to your computer. If anyone can message it, anyone can run commands on your machine. Let's fix that."
2. **[0:30-2:30] Risk 1: Open DM Policy** — Show what `dmPolicy: open` means. Demo: stranger sends prompt injection → bot runs `rm -rf`. Show the fix: `pairing` or `allowlist`. Run `openclaw security audit`.
3. **[2:30-4:00] Risk 2: Gateway Without Auth** — Bound to 0.0.0.0 without a token = anyone on your network controls your bot. Show: set `gateway.auth.token`, use Tailscale.
4. **[4:00-5:30] Risk 3: Open Group Policy** — Bot added to random groups = attack vector. Switch to allowlist. `openclaw security audit --fix` handles this.
5. **[5:30-7:00] Risk 4: HTTP Dashboard** — WebCrypto doesn't work over HTTP. Device identity broken. Use HTTPS (Tailscale Serve) or localhost only.
6. **[7:00-8:00] Risk 5: Logs Leaking Secrets** — `logging.redactSensitive` must be ON. Check file permissions on `~/.openclaw`. `openclaw security audit --fix`.
7. **[8:00-8:30] The One Command** — `openclaw security audit --fix` — fixes risks 1, 3, 5, and checks 2 and 4. Run it now.
8. **[8:30-9:00] CTA** — "Security isn't optional when your bot has shell access. Share this with anyone running OpenClaw."

**B-roll needed:** Dramatic terminal demos, `security audit` output, before/after
**Key searchable phrases:** "openclaw security", "openclaw safe", "ai bot security"

---

## PART 2: Blog Post Outlines (4 posts)

### Blog 1: "The OpenClaw First-Run Checklist: From Install to First Message"
**Target:** Complete beginners. SEO keyword: "openclaw setup guide"
**Length:** 2,000-2,500 words

**Outline:**
1. **Intro** — What OpenClaw is (1 paragraph). What this guide covers.
2. **Prerequisites by Platform** — Table: Windows (WSL2 + Node 22), macOS (Node 22), Linux (Node 22). Link to Video 2 for Windows deep-dive.
3. **Step 1: Install** — One-liner install command. What to do if it hangs (A5).
4. **Step 2: Authentication** — The ONLY path you need: get API key → `openclaw models auth setup-token`. Ignore OAuth/subscription for now. Verify with `openclaw models status`.
5. **Step 3: Configure** — `openclaw configure`. Gateway mode = local. What each setting means (keep it short).
6. **Step 4: Start Gateway** — `openclaw gateway start`. Troubleshoot: port in use (D3), config invalid (D2), mode not set (D1).
7. **Step 5: Send First Message** — Explain pairing. Show approval. Celebrate the first reply.
8. **Step 6: Verify** — `openclaw doctor` as final check. `openclaw status --deep`.
9. **Common Gotchas Table** — Quick-reference: 10 most common errors with one-line fixes.
10. **Next Steps** — Link to WhatsApp guide (Blog 3), security hardening (Blog 4).

### Blog 2: "OpenClaw API Keys Explained: The Only Guide You Need"
**Target:** Users confused by auth options. SEO keyword: "openclaw api key setup"
**Length:** 1,800-2,200 words

**Outline:**
1. **Intro** — "There are 5 ways to authenticate. You only need to know 1." Cut through the confusion.
2. **The Decision Flowchart** — Visual: Do you have an Anthropic API key? → Yes → use it. No → get one ($5 min deposit). Fallback: setup-token.
3. **Method 1: API Key (Recommended)** — Step-by-step with screenshots. Where to get it, where to put it (`.env` file, NOT shell config), how to verify.
4. **Method 2: Setup Token** — For Claude subscription users. `openclaw models auth setup-token`. Explain: this wraps your subscription.
5. **Why NOT OAuth** — Token refresh failures (B2), fragility, rate limits (B5). "OAuth works until it doesn't."
6. **The Service Trap** — Why `export ANTHROPIC_API_KEY=...` in `.bashrc` doesn't work for the service (B6). Always use `.env`.
7. **Multi-Model Setup** — Brief: how to add OpenAI/Google as failover. `openclaw models status` to see what's configured.
8. **Troubleshooting Table** — Error message → cause → fix. Cover B1, B2, B4, B5, B6, B7.

### Blog 3: "OpenClaw + WhatsApp: The Honest Setup Guide"
**Target:** WhatsApp users. SEO keyword: "openclaw whatsapp"
**Length:** 2,500-3,000 words (longest — most complex topic)

**Outline:**
1. **Intro** — "WhatsApp is the most popular channel request. It's also the most fragile. Here's the truth."
2. **Before You Start: The Number** — Dedicated SIM vs personal. Pros/cons table. VoIP numbers: don't.
3. **Setup Walkthrough** — Install channel, `openclaw channels login`, QR scan (with phone screenshots).
4. **Configuration Deep-Dive** — selfChatMode, allowFrom, group allowlists with JID discovery (E4), mention patterns.
5. **The Disconnect Problem** — Why it happens (Baileys/unofficial API). Reconnect config. What "maxAttempts reached" means. When to re-link.
6. **Groups** — Why they don't work by default (C5). Complete group setup flow.
7. **Known Limitations** — Image+mention bug (C6), creds corruption (C7), random disconnects (C2).
8. **Reliability Playbook** — 10 settings for maximum stability. Monitoring with `openclaw status --deep`.
9. **FAQ** — Top 10 WhatsApp-specific questions from the pain points research.

### Blog 4: "Securing Your OpenClaw Instance: A 5-Minute Hardening Guide"
**Target:** All users post-setup. SEO keyword: "openclaw security"
**Length:** 1,500-1,800 words

**Outline:**
1. **Intro** — "Your bot has shell access. Let's make sure only YOU can talk to it."
2. **The Risk** — Prompt injection + open DM policy = remote code execution. Not theoretical.
3. **The One Command** — `openclaw security audit --fix`. What it checks, what it fixes.
4. **Setting by Setting** — dmPolicy (F1), gateway auth (F2), groupPolicy (F4), log redaction (F7), file permissions (F5).
5. **Network Hardening** — Loopback-only vs LAN. Tailscale recommendation. HTTP vs HTTPS (F3).
6. **Plugin Safety** — Allowlists, version pinning (F6).
7. **Ongoing Checklist** — Monthly security review in 60 seconds.

---

## PART 3: Twitter Posts (20 pre-written)

### Standalone Tweets (12)

**Tweet 1 — The Hook**
> Your AI bot has shell access to your machine.
>
> If dmPolicy is set to "open," anyone who messages it can run commands on your computer.
>
> Run: `openclaw security audit --fix`
>
> Right now. I'll wait.

**Tweet 2 — Pain Point Empathy**
> "I set up OpenClaw, sent a message, and got nothing back."
>
> You're not alone. This is the #1 first-run issue.
>
> The fix takes 30 seconds: `openclaw pairing approve`
>
> Your bot isn't broken — it's waiting for you to say it's okay to talk.

**Tweet 3 — Hot Take**
> Unpopular opinion: You should NOT use your personal WhatsApp number with OpenClaw.
>
> Get a £1 prepaid SIM.
>
> Your contacts will thank you. Your reconnection rate will thank you. Your sanity will thank you.

**Tweet 4 — Quick Tip**
> OpenClaw tip that'll save you an hour:
>
> API keys in .bashrc DON'T work when running as a service.
>
> Put them in ~/.openclaw/.env instead.
>
> Every. Single. Time.

**Tweet 5 — Stat/Insight**
> Looked at the top 20 OpenClaw setup problems.
>
> 60% are fully automatable.
>
> The other 40% are mostly WhatsApp being WhatsApp.
>
> A proper setup wizard would eliminate most first-run failures overnight.

**Tweet 6 — Controversial**
> Stop using OAuth for your AI bot auth.
>
> Token refresh fails. Rate limits are shared. It breaks at 2am when you're sleeping.
>
> API keys are $5 to start. Just do it.

**Tweet 7 — Beginner Friendly**
> New to OpenClaw? Here's the only setup checklist you need:
>
> ☐ Node 22+ installed
> ☐ API key in ~/.openclaw/.env
> ☐ `openclaw configure` → gateway.mode = local
> ☐ `openclaw gateway start`
> ☐ `openclaw doctor` passes
> ☐ Approve your pairing code
>
> That's it. You're live.

**Tweet 8 — Windows Specific**
> Windows + OpenClaw = WSL2.
>
> Not optional. Not negotiable.
>
> And enable systemd in /etc/wsl.conf or nothing works.
>
> Two lines. Saves hours:
> ```
> [boot]
> systemd=true
> ```

**Tweet 9 — Engagement Question**
> What's been your biggest OpenClaw setup headache?
>
> Mine was WhatsApp disconnecting every 6 hours until I figured out the reconnect config.

**Tweet 10 — Educational**
> OpenClaw auth methods ranked:
>
> 🥇 API key (reliable, dedicated rate limits)
> 🥈 Setup token (wraps subscription, decent)
> 🥉 OAuth (works until it doesn't)
> 💀 Subscription auth (shared rate limits, fragile)
>
> Pick gold. Always pick gold.

**Tweet 11 — Social Proof**
> The best OpenClaw setup I've seen:
>
> • Dedicated WhatsApp SIM
> • API key in .env (not shell config)
> • Pairing mode (not open)
> • Security audit passing
> • Gateway behind Tailscale
>
> Took 20 minutes. Hasn't broken in weeks.

**Tweet 12 — Quick Win**
> One command to check if your OpenClaw setup is healthy:
>
> `openclaw doctor`
>
> It catches Node version issues, missing auth, config problems, and service failures.
>
> Run it before asking for help. Seriously.

### Twitter Threads (4 threads = 8 more tweets)

**Thread 1: "5 WhatsApp Setup Mistakes" (3 tweets)**

> 🧵 5 mistakes everyone makes setting up OpenClaw + WhatsApp:
>
> 1/ Using a VoIP number (TextNow, Google Voice)
> WhatsApp will ban it. Get a real SIM — even a £1 prepaid one works.
>
> 2/ Not configuring reconnect settings
> Baileys WILL disconnect. Set aggressive backoff defaults or you'll be re-scanning QR codes weekly.

> 3/ Forgetting group allowlists
> "Why won't my bot respond in groups?" Because groups are blocked by default. Find the JID, add it to the allowlist, set mention patterns.
>
> 4/ Using your personal number
> Your contacts get confused. selfChatMode is finicky. Just get a dedicated number.
>
> 5/ Expecting 100% uptime
> This is an unofficial API. It's WhatsApp Web under the hood. Set expectations, monitor with `openclaw status --deep`, and accept occasional re-links.

> The honest truth: WhatsApp is the most-requested OpenClaw channel and the most work to maintain.
>
> But when it works, it's magic. DM me your setup questions.

**Thread 2: "OpenClaw Security in 60 Seconds" (2 tweets)**

> 🧵 Your OpenClaw security checklist (60 seconds):
>
> ☐ dmPolicy: "pairing" or "allowlist" (NEVER "open")
> ☐ gateway.auth.token set (if not localhost-only)
> ☐ groupPolicy: "allowlist"
> ☐ logging.redactSensitive: true
> ☐ ~/.openclaw permissions locked
>
> Or just run: `openclaw security audit --fix`

> Why this matters: your bot can execute shell commands.
>
> Open DM policy + shell access = anyone can run code on your machine.
>
> This isn't theoretical. Prompt injection is real.
>
> Secure it today, not after something goes wrong.

**Thread 3: "Windows Setup Speed Run" (3 tweets)**

> 🧵 OpenClaw on Windows — the speed run:
>
> Step 1: Open PowerShell as admin
> `wsl --install`
> Restart.
>
> Step 2: Inside WSL, edit /etc/wsl.conf:
> ```
> [boot]
> systemd=true
> ```
> Then: `wsl --shutdown` from PowerShell, reopen WSL.

> Step 3: Install Node 22
> ```
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
> nvm install 22
> ```
>
> Step 4: Install OpenClaw (the one-liner from docs)
>
> Step 5: Put API key in ~/.openclaw/.env (NOT .bashrc)

> Step 6: `openclaw configure` → set gateway.mode = local
> Step 7: `openclaw gateway start`
> Step 8: `openclaw doctor`
>
> Total time: ~15 minutes if nothing goes wrong.
>
> Bookmark this. You'll need it.

---

## PART 4: Thumbnail Concepts

### Video 1 Thumbnail: "Why Your Bot Won't Reply"
- **Visual:** Split screen — left side: phone with message sent + no reply (red X overlay), right side: terminal with the fix highlighted in green
- **Text overlay:** "NO REPLY?" in bold red, "2 MIN FIX" in green
- **Expression:** Frustrated face (left) → relieved face (right) — if using face cam stills
- **Color scheme:** Red/green contrast, dark background

### Video 2 Thumbnail: "Windows Setup"
- **Visual:** Windows logo + WSL terminal side by side, with a checklist overlay showing 5 items (some checked, some not)
- **Text overlay:** "WINDOWS SETUP" in white, "5 TRAPS" in red with warning icon
- **Style:** Clean tech tutorial look, blue/dark theme matching Windows
- **Alt concept:** Windows logo with a bomb emoji, defused → "The Complete Guide"

### Video 3 Thumbnail: "WhatsApp Setup"
- **Visual:** WhatsApp green background, QR code in center, with "DISCONNECTED" stamp in red across it
- **Text overlay:** "WhatsApp + AI" in white, "THE TRUTH" in yellow
- **Style:** WhatsApp green (#25D366) dominant, honest/raw vibe
- **Alt concept:** Phone showing WhatsApp with a "connected" green dot flickering to red

### Video 4 Thumbnail: "Security"
- **Visual:** Terminal with scary command output (simulated `rm -rf` or data exfiltration), red warning overlay
- **Text overlay:** "IS YOUR BOT SAFE?" in red, lock icon
- **Expression:** Shocked/concerned face if using face cam
- **Color scheme:** Red/black, urgent feel
- **Alt concept:** Open padlock → closed padlock transformation

---

## PART 5: Batch Production Schedule

### Day 1: RECORDING (8-10 hours)

| Time | Task | Details |
|------|------|---------|
| 08:00-08:30 | Setup | Check camera, mic, lighting. Open all scripts. Prep terminal with clean environments. |
| 08:30-09:00 | Pre-record terminal demos | Record all terminal B-roll for Video 1 (error states, fixes, `openclaw doctor`) |
| 09:00-10:30 | **Record Video 1** | "Why Your Bot Won't Reply" — face cam + screen. Do 2 takes of hook. |
| 10:30-10:45 | Break | |
| 10:45-11:15 | Pre-record terminal demos | Fresh Windows VM recordings for Video 2 (WSL install, Node, PATH errors) |
| 11:15-13:00 | **Record Video 2** | "Windows Setup" — screen recording heavy, face cam for intros/outros. Longest video. |
| 13:00-13:45 | Lunch | |
| 13:45-14:15 | Pre-record terminal + phone demos | WhatsApp QR scan, phone screen recordings, disconnect/reconnect scenarios |
| 14:15-15:45 | **Record Video 3** | "WhatsApp Setup" — mixed phone + terminal + face cam |
| 15:45-16:00 | Break | |
| 16:00-16:30 | Pre-record terminal demos | Security audit output, before/after, scary demos |
| 16:30-17:30 | **Record Video 4** | "Security" — shortest video, high energy, urgency |
| 17:30-18:00 | Review & pickup shots | Re-record any flubbed hooks or unclear explanations |

**Day 1 Deliverables:**
- [ ] 4 videos raw footage recorded
- [ ] All terminal B-roll captured
- [ ] Phone screen recordings done
- [ ] Hooks recorded (2 takes each)

### Day 2: EDITING (8-10 hours)

| Time | Task | Details |
|------|------|---------|
| 08:00-08:30 | Organize footage | Import, label, create project files for all 4 videos |
| 08:30-10:30 | **Edit Video 1** | Assembly cut → rough cut → fine cut. Add B-roll, text overlays, transitions. |
| 10:30-10:45 | Break | |
| 10:45-13:00 | **Edit Video 2** | Longest edit — lots of screen recordings to sync. Add chapter markers. |
| 13:00-13:45 | Lunch | |
| 13:45-15:30 | **Edit Video 3** | Phone + terminal intercuts. Add WhatsApp message overlays. |
| 15:30-15:45 | Break | |
| 15:45-17:00 | **Edit Video 4** | Fastest edit — dramatic cuts, red overlays, urgency pacing. |
| 17:00-18:00 | **Create thumbnails** | Design all 4 thumbnails. Export at 1280x720. A/B variants. |
| 18:00-18:30 | Export & review | Export all 4 videos. Quick watch-through for errors. |

**Day 2 Deliverables:**
- [ ] 4 videos edited and exported
- [ ] 4 thumbnails created (+ A/B variants)
- [ ] Chapter markers/timestamps for each video
- [ ] End screens and cards configured

### Day 3: WRITING (8-10 hours)

| Time | Task | Details |
|------|------|---------|
| 08:00-10:00 | **Write Blog Post 1** | "First-Run Checklist" — reference Video 1 script, expand with screenshots |
| 10:00-10:15 | Break | |
| 10:15-12:00 | **Write Blog Post 2** | "API Keys Explained" — decision flowchart, troubleshooting table |
| 12:00-12:45 | Lunch | |
| 12:45-14:45 | **Write Blog Post 3** | "WhatsApp Honest Guide" — longest post, reference Video 3 |
| 14:45-15:00 | Break | |
| 15:00-16:15 | **Write Blog Post 4** | "Security Hardening" — shortest post, checklist-driven |
| 16:15-17:00 | **Finalize tweets** | Review all 20 tweets/threads, adjust for current events/trending topics |
| 17:00-17:30 | **Write video descriptions** | YouTube descriptions for all 4 videos with timestamps, links, keywords |
| 17:30-18:00 | **Upload & schedule everything** | Queue all content in scheduling tools (see Part 6) |

**Day 3 Deliverables:**
- [ ] 4 blog posts written and formatted
- [ ] 20 tweets/threads finalized
- [ ] 4 YouTube descriptions with timestamps
- [ ] All content uploaded and scheduled

---

## PART 6: Scheduling Plan (4-Week Calendar)

### Week 1
| Day | Platform | Content |
|-----|----------|---------|
| Mon | YouTube | **Video 1:** "Why Your Bot Won't Reply" |
| Mon | Blog | **Post 1:** "First-Run Checklist" (cross-links Video 1) |
| Mon | Twitter | Tweet 2 (pain point empathy — "sent a message, got nothing") |
| Tue | Twitter | Tweet 7 (beginner checklist) |
| Wed | Twitter | Tweet 12 (`openclaw doctor` quick win) |
| Thu | Twitter | Tweet 4 (.env tip) |
| Fri | Twitter | Tweet 9 (engagement question — "biggest setup headache?") |

### Week 2
| Day | Platform | Content |
|-----|----------|---------|
| Mon | YouTube | **Video 2:** "Windows Setup" |
| Mon | Blog | **Post 2:** "API Keys Explained" (cross-links Video 2) |
| Mon | Twitter | Tweet 8 (Windows + WSL2) |
| Tue | Twitter | Thread 3 — "Windows Speed Run" (3 tweets) |
| Wed | Twitter | Tweet 10 (auth methods ranked) |
| Thu | Twitter | Tweet 6 (stop using OAuth hot take) |
| Fri | Twitter | Tweet 5 (60% automatable stat) |

### Week 3
| Day | Platform | Content |
|-----|----------|---------|
| Mon | YouTube | **Video 3:** "WhatsApp Setup" |
| Mon | Blog | **Post 3:** "WhatsApp Honest Guide" (cross-links Video 3) |
| Mon | Twitter | Tweet 3 (don't use personal number) |
| Tue | Twitter | Thread 1 — "5 WhatsApp Mistakes" (3 tweets) |
| Thu | Twitter | Tweet 11 (best setup social proof) |
| Fri | Twitter | Tweet 9 repurpose or fresh engagement tweet |

### Week 4
| Day | Platform | Content |
|-----|----------|---------|
| Mon | YouTube | **Video 4:** "Security" |
| Mon | Blog | **Post 4:** "Security Hardening" (cross-links Video 4) |
| Mon | Twitter | Tweet 1 (security hook — "shell access") |
| Tue | Twitter | Thread 2 — "Security in 60 Seconds" (2 tweets) |
| Wed | Twitter | Tweet 11 (best setup — repost or variant) |
| Fri | Twitter | Retrospective tweet — "This month we covered..." with links to all 4 videos |

### Posting Times (UK timezone)
- **YouTube:** Monday 12:00 PM (lunchtime views)
- **Blog:** Monday 12:00 PM (same as video, cross-promote)
- **Twitter:** Weekdays at 9:00 AM and 5:00 PM (commute times), stagger to avoid double-posting

### Cross-Promotion Rules
- Every YouTube video description links to the corresponding blog post
- Every blog post embeds the corresponding video
- Every Monday tweet promotes that week's video
- Thread tweets reference specific videos/blog posts where relevant
- All content links back to OpenClaw docs where applicable

---

## Appendix: Content Reuse Matrix

| Source | → YouTube | → Blog | → Twitter | → Other |
|--------|-----------|--------|-----------|---------|
| Video 1 script | ✅ Primary | Expand → Blog 1 | Extract tips → Tweets 2, 7, 12 | Reddit post |
| Video 2 script | ✅ Primary | Expand → Blog 2 | Extract tips → Tweets 4, 8, Thread 3 | Dev.to article |
| Video 3 script | ✅ Primary | Expand → Blog 3 | Extract tips → Tweets 3, Thread 1 | WhatsApp community post |
| Video 4 script | ✅ Primary | Expand → Blog 4 | Extract tips → Tweets 1, 6, Thread 2 | HN/security forums |
| Pain points research | Reference | Data for all posts | Stats → Tweet 5 | Internal roadmap |

---

*Total output: 4 videos, 4 blog posts, 20 tweets/threads, 4 thumbnails, scheduled across 4 weeks.*
*Production time: 3 focused days.*
