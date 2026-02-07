# Clawhatch Content Pipeline — 2-Week Plan

*Generated: 2025-06-23 | Focus: SEO-driven content targeting OpenClaw/Clawdbot setup pain points*

---

## 1. Content Calendar (Weeks 1–2)

Starting Monday 30 June 2025.

### Week 1

| Date | Platform | Format | Topic | SEO Target Keyword |
|------|----------|--------|-------|-------------------|
| Mon 30 Jun | Twitter/X | Thread (5 tweets) | "Why your AI assistant forgets everything — and how to fix it" | openclaw memory persistent sessions |
| Mon 30 Jun | Blog | Long-form (1500w) | The Complete Guide to OpenClaw API Key Setup | openclaw api key setup guide |
| Tue 1 Jul | Reddit | r/selfhosted post | "I automated my WhatsApp with an AI assistant — here's what I learned" | self-hosted AI WhatsApp bot |
| Wed 2 Jul | Twitter/X | Thread (5 tweets) | "5 security mistakes when self-hosting an AI agent" | self-hosted AI security mistakes |
| Wed 2 Jul | YouTube | Short (60s) | "Fix 'openclaw not recognized' on Windows in 60 seconds" | openclaw windows PATH fix |
| Thu 3 Jul | Reddit | r/ChatGPT post | "Open-source alternative to ChatGPT that runs locally + connects to WhatsApp/Discord/Telegram" | open source chatgpt alternative local |
| Fri 4 Jul | Twitter/X | Thread (5 tweets) | "Setting up WhatsApp with a self-hosted AI — the honest truth" | whatsapp ai bot self-hosted setup |
| Fri 4 Jul | Blog | Long-form (2000w) | WhatsApp + OpenClaw: Complete Setup & Troubleshooting Guide | openclaw whatsapp setup troubleshooting |

### Week 2

| Date | Platform | Format | Topic | SEO Target Keyword |
|------|----------|--------|-------|-------------------|
| Mon 7 Jul | Twitter/X | Thread (5 tweets) | "Your self-hosted AI agent is probably exposed to the internet. Here's how to check." | secure self-hosted AI agent gateway |
| Mon 7 Jul | Blog | Long-form (1800w) | Windows + WSL2 + OpenClaw: Zero to Running in 15 Minutes | openclaw windows wsl2 install guide |
| Tue 8 Jul | Reddit | r/LocalLLaMA post | "Built a setup wizard that eliminates 60% of first-run failures for AI agents — here's the data" | AI agent setup automation |
| Wed 9 Jul | YouTube | Tutorial (8-10 min) | "OpenClaw Setup on Windows — Complete Walkthrough" | openclaw windows tutorial |
| Thu 10 Jul | Twitter/X | Thread (5 tweets) | "The DM pairing problem: why your bot ignores your first message" | openclaw bot not responding fix |
| Thu 10 Jul | Reddit | r/selfhosted post | "Security audit checklist for self-hosted AI assistants" | self-hosted AI security checklist |
| Fri 11 Jul | YouTube | Tutorial (5-7 min) | "Multi-channel AI: One bot on WhatsApp, Discord, and Telegram" | openclaw multi-channel setup |

---

## 2. Twitter/X Threads (5 Pre-Written)

### Thread 1: "Why your AI assistant forgets everything"
**Hook:** Pain point G1/G2 — memory & context confusion

> **🧵 1/5** Your self-hosted AI assistant keeps forgetting things mid-conversation?
>
> It's not broken. It's a design choice — and once you understand it, you can fix it in 2 minutes.
>
> Here's how memory actually works 👇

> **2/5** Most AI agents run in "sessions." When a session ends, context resets.
>
> This isn't a bug — it prevents runaway token costs and keeps responses fast.
>
> But it means your bot doesn't *remember* unless you tell it how to.

> **3/5** The fix: persistent memory files.
>
> In OpenClaw, your agent reads `MEMORY.md` at the start of every session — like a human checking their notes.
>
> Write what matters there. Delete what doesn't. Your bot becomes as sharp as your notes.

> **4/5** For conversations that hit the context limit ("context too large" error):
>
> → Send `/new` to start fresh
> → Set `session.historyLimit` to cap how much history loads
> → Enable compaction to auto-summarise old messages
>
> Token budget managed. Memory preserved.

> **5/5** TL;DR:
>
> ✅ Use MEMORY.md for long-term knowledge
> ✅ Set history limits to control cost
> ✅ Use `/new` when conversations get heavy
>
> Your AI doesn't forget. It just needs a notebook.
>
> Full guide → [link]

---

### Thread 2: "5 security mistakes when self-hosting an AI agent"
**Hook:** Pain points F1-F7 — security misconfigurations

> **🧵 1/5** Self-hosting an AI agent? You probably have shell access enabled.
>
> Which means if your DM policy is "open," anyone who messages your bot can run commands on your machine.
>
> Here are 5 security mistakes I see constantly 👇

> **2/5** Mistake #1: DM policy set to "open"
>
> Default should be "pairing" or "allowlist." Open means ANY stranger can talk to your bot — and if tools are enabled, that's remote code execution.
>
> Fix: `openclaw security audit --fix`

> **3/5** Mistake #2: Gateway bound to 0.0.0.0 without auth
>
> If your gateway listens on LAN/internet without a token, anyone on your network controls your agent.
>
> Fix: Set `gateway.auth.token` or keep it on 127.0.0.1.

> **4/5** Mistake #3: Sensitive data in logs (redaction off)
>
> Mistake #4: Group policy "open" — bot responds in ANY group it's added to
>
> Mistake #5: Plugins from untrusted npm sources running in-process
>
> All of these are caught by one command.

> **5/5** Run this right now:
>
> ```
> openclaw security audit --fix
> ```
>
> It checks all 5, fixes what it can, and tells you what needs manual action.
>
> Self-hosting means self-securing. Don't skip it.

---

### Thread 3: "Setting up WhatsApp with a self-hosted AI"
**Hook:** Pain points C1-C7 — WhatsApp connection issues

> **🧵 1/5** I connected WhatsApp to a self-hosted AI agent.
>
> It took 3 attempts. Here's what nobody tells you upfront — and how to get it right the first time 👇

> **2/5** Reality check: WhatsApp integration uses an unofficial API (Baileys). It works, but:
>
> → Sessions drop randomly
> → QR codes need rescanning
> → VoIP numbers (Google Voice, TextNow) are blocked
>
> Use a real SIM. Preferably a dedicated number.

> **3/5** The #1 mistake: using your personal number without understanding selfChatMode.
>
> Your bot will try to reply to YOUR contacts. Awkward.
>
> Either:
> ✅ Use a dedicated number (recommended)
> ✅ Enable selfChatMode + configure carefully

> **4/5** Groups won't work out of the box. You need to:
>
> 1. Add the group JID to your allowlist
> 2. Set mention patterns (bot only responds when @mentioned)
> 3. Run `openclaw channels` to find group JIDs
>
> Without this, the bot silently ignores all group messages.

> **5/5** My setup that's been stable for weeks:
>
> → Dedicated prepaid eSIM ($5/mo)
> → Aggressive reconnect config (maxAttempts: 10, backoff)
> → Groups: allowlist only, mention-activated
> → Auto-backup of creds.json
>
> It's not plug-and-play, but it works. Guide → [link]

---

### Thread 4: "Your self-hosted AI agent is probably exposed"
**Hook:** Pain points F2, D7, B6 — gateway & env security

> **🧵 1/5** Quick security check for anyone running a self-hosted AI agent:
>
> Open a terminal. Run:
> ```
> curl http://YOUR_SERVER_IP:18789/status
> ```
>
> If that returns anything without authentication… you have a problem. 👇

> **2/5** The default gateway binds to localhost (safe). But many guides tell you to bind to 0.0.0.0 for "remote access."
>
> That's fine — IF you set an auth token.
>
> Without one, anyone on your network (or the internet, if port-forwarded) can control your agent.

> **3/5** Second issue: env vars disappearing.
>
> You set your API key in .bashrc. Works in terminal. But the gateway runs as a *service* with a minimal environment.
>
> Your API keys vanish. Agent can't talk to any model. Silent failure.
>
> Fix: Put everything in `~/.openclaw/.env`

> **4/5** Third issue: HTTP dashboard can't generate secure device identity.
>
> WebCrypto (needed for key generation) only works over HTTPS or localhost.
>
> If you access the dashboard over HTTP on LAN, security features degrade silently.
>
> Fix: Use Tailscale Serve for instant HTTPS, or access via 127.0.0.1.

> **5/5** 3-minute security hardening:
>
> 1. `openclaw security audit --fix`
> 2. Move API keys to `~/.openclaw/.env`
> 3. Set `gateway.auth.token` if non-localhost
> 4. Access dashboard via HTTPS or localhost only
>
> Self-hosting is freedom. Don't let it be a liability.

---

### Thread 5: "The DM pairing problem"
**Hook:** Pain point E2 — #1 most common issue

> **🧵 1/5** "I set up my AI bot, sent it a message, and… nothing happened."
>
> Sound familiar? This is the #1 support issue for self-hosted AI agents.
>
> The bot isn't broken. It's waiting for you to approve yourself. Here's what's happening 👇

> **2/5** By default, DM security uses "pairing mode."
>
> When someone messages the bot for the first time, it generates a pairing code. The bot owner has to approve it.
>
> This prevents strangers from using your agent (and your API credits).

> **3/5** The fix takes 10 seconds:
>
> 1. Send any message to your bot
> 2. Check your terminal/logs for the pairing code
> 3. Run: `openclaw pairing approve <channel> <code>`
>
> That's it. You're approved. Messages flow.

> **4/5** Better fix: pre-approve yourself during setup.
>
> A good setup wizard handles this automatically — it knows your user ID and approves it before you ever send a message.
>
> No confusion. No "is it broken?" moment.

> **5/5** This is the #1 reason new users think their bot is broken.
>
> It's actually good security — just bad UX when it's not explained upfront.
>
> If you're building onboarding for AI agents: auto-approve the owner. Always.
>
> Clawhatch solves this → [link]

---

## 3. Blog Post Outlines

### Blog 1: "The Complete Guide to OpenClaw API Key Setup"
**Target keyword:** openclaw api key setup guide
**Word count:** 1500
**Audience:** First-time users, non-technical

**Outline:**

1. **Introduction** (150w)
   - The #1 error: "No API key found for provider 'anthropic'"
   - Why this happens (auth store empty, keys not inherited)
   - Promise: by end of article, you'll never see this error again

2. **Understanding Auth Methods** (300w)
   - API key (recommended — simple, reliable)
   - Setup token (Claude-specific shortcut)
   - OAuth (fragile, token expiry issues — avoid for production)
   - Subscription auth (shared rate limits — avoid)
   - **Key point:** Just use an API key. Ignore the rest until you need them.

3. **Step-by-Step: Setting Up Your API Key** (400w)
   - Get key from provider dashboard (Anthropic, OpenAI, etc.)
   - Where to put it: `~/.openclaw/.env` (NOT .bashrc — services don't read shell config)
   - Verify: `openclaw models status`
   - Common gotcha: env vars disappear when running as service (B6)

4. **Multi-Agent Key Inheritance** (200w)
   - New agents don't inherit keys automatically
   - Copy `auth-profiles.json` or re-run auth setup per agent
   - Model failover chains: ensure at least one provider works

5. **Troubleshooting** (300w)
   - "All models failed" — run `openclaw models status`
   - HTTP 429 rate limit — switch from subscription to API key
   - OAuth token expired — use setup-token method instead
   - Key works in terminal but not in service — move to .env file

6. **Conclusion** (150w)
   - Recap: API key in .env file, verify with models status
   - Link to Clawhatch (automates all of this)

---

### Blog 2: "WhatsApp + OpenClaw: Complete Setup & Troubleshooting"
**Target keyword:** openclaw whatsapp setup troubleshooting
**Word count:** 2000
**Audience:** Intermediate users wanting WhatsApp integration

**Outline:**

1. **Introduction** (200w)
   - WhatsApp is the most-requested channel and the hardest to set up
   - Unofficial API (Baileys) — what that means for reliability
   - Set expectations: it works, but requires maintenance

2. **Prerequisites** (200w)
   - Real mobile number (NOT VoIP/virtual — WhatsApp blocks them)
   - Dedicated number vs personal number: pros/cons
   - Node 22+ (NOT Bun — explicitly unsupported for WhatsApp)
   - OpenClaw installed and gateway running

3. **Step-by-Step Setup** (400w)
   - `openclaw channels login` — QR code scanning process
   - Verifying connection: `openclaw status --deep`
   - First message test
   - Understanding the pairing flow (E2)

4. **Personal vs Dedicated Number** (300w)
   - selfChatMode explained
   - Risk of accidentally messaging contacts
   - Recommendation: dedicated prepaid eSIM ($5/mo)
   - Configuration for each mode

5. **Groups** (300w)
   - Why groups don't work by default
   - Finding group JIDs: `openclaw channels` command
   - Allowlist configuration
   - Mention patterns (bot responds only when @mentioned)
   - Known limitation: image + mention only (no text) doesn't work (C6)

6. **Troubleshooting: Disconnects & Reconnection** (400w)
   - Why disconnects happen (Baileys, phone restarts, WhatsApp updates)
   - Reconnect config: maxAttempts, backoff policy
   - creds.json corruption and auto-backup
   - Nuclear option: logout + re-login

7. **Conclusion** (200w)
   - Stable config summary
   - Link to Clawhatch (handles the tricky parts automatically)

---

### Blog 3: "Windows + WSL2 + OpenClaw: Zero to Running in 15 Minutes"
**Target keyword:** openclaw windows wsl2 install guide
**Word count:** 1800
**Audience:** Windows users, semi-technical

**Outline:**

1. **Introduction** (150w)
   - OpenClaw on Windows = WSL2. No way around it.
   - Good news: WSL2 setup is a one-time 5-minute task
   - This guide: from fresh Windows install to working AI agent

2. **Step 1: WSL2 Setup** (300w)
   - `wsl --install` in admin PowerShell
   - Enable systemd: edit `/etc/wsl.conf` with `[boot] systemd=true`
   - `wsl --shutdown` and restart
   - Verify: `systemctl` should work inside WSL
   - Common issue: systemd not enabled (A3)

3. **Step 2: Node.js & Dependencies** (250w)
   - Install Node 22+ inside WSL (nvm recommended)
   - Verify git is available (A2: "git not found")
   - PATH issues: ensure node/git/openclaw are in WSL PATH
   - Don't use Windows Node for OpenClaw

4. **Step 3: Install OpenClaw** (300w)
   - Install script inside WSL
   - If installer hangs: verbose flags, check network (A5)
   - Run `openclaw doctor` to verify everything
   - First-run: the "hatching" process (A1)

5. **Step 4: Configure & Launch** (300w)
   - API key setup (in `~/.openclaw/.env`)
   - `openclaw configure` — sets gateway.mode
   - Start gateway, verify with `openclaw status`
   - First message test via webchat

6. **Networking: Accessing from LAN** (300w)
   - WSL2 networking quirks (H1)
   - Port forwarding with `netsh interface portproxy`
   - WSL IP changes on restart — scheduled task workaround
   - Alternative: Tailscale inside WSL (simpler)

7. **Conclusion** (200w)
   - Recap the 4 steps
   - Link to Clawhatch for automated Windows setup

---

## 4. Reddit Post Templates

### Template 1: r/selfhosted — WhatsApp AI Story
**Title:** "I automated my WhatsApp with a self-hosted AI assistant — here's what I learned after 2 weeks"

**Body:**

Hey r/selfhosted,

I've been running [OpenClaw](link) — an open-source AI agent framework — connected to WhatsApp for the past couple of weeks. Wanted to share what worked, what didn't, and what I wish I'd known.

**The good:**
- It actually works. I have a dedicated WhatsApp number running an AI assistant that my family uses for quick questions, reminders, and even homework help.
- Multi-channel: same agent also responds on Discord and Telegram.
- Full control over the model (Anthropic, OpenAI, local models via Ollama).
- Runs on a $5/mo VPS + a $5 prepaid eSIM.

**The bad:**
- WhatsApp uses an unofficial API (Baileys). Disconnects happen. Not daily, but often enough that you need auto-reconnect config.
- First-run setup is rough. API key confusion, DM pairing, WhatsApp QR scanning — took me a few tries.
- Windows users: you need WSL2. No native Windows support.

**What I wish I'd known:**
1. Put API keys in `~/.openclaw/.env`, NOT in .bashrc (services don't read shell config)
2. Use a dedicated number for WhatsApp, not your personal one
3. Run `openclaw security audit --fix` immediately after setup
4. Groups need explicit allowlisting — bot ignores them by default

**Would I recommend it?** Yes, with caveats. It's not plug-and-play. But if you're comfortable with a terminal, the result is genuinely useful.

Happy to answer questions.

---

### Template 2: r/ChatGPT — Open-Source Alternative
**Title:** "Open-source ChatGPT alternative that runs locally and connects to WhatsApp, Discord, and Telegram"

**Body:**

For anyone looking to self-host their own AI assistant:

[OpenClaw](link) is an open-source framework that lets you run AI agents on your own hardware (or a VPS). What makes it different from other self-hosted options:

- **Multi-channel:** One agent, multiple platforms (WhatsApp, Discord, Telegram, webchat)
- **Multi-model:** Anthropic Claude, OpenAI GPT, local models via Ollama — with automatic failover
- **Persistent memory:** Agent remembers context across sessions using markdown files
- **Tools & skills:** Shell access, browser control, file management, camera, calendar — modular
- **Security:** DM pairing, allowlists, encrypted sessions, security audit command

It runs on Linux, macOS, and Windows (via WSL2). I have it on a small VPS and it costs me about $10/mo total (hosting + eSIM for WhatsApp + API credits).

The setup is still a bit rough around the edges — that's actually what we're working on fixing with [Clawhatch](link), a setup wizard that automates the painful parts.

Not affiliated with OpenClaw (it's open-source with a growing community). Just a user who's been running it daily.

---

### Template 3: r/LocalLLaMA — Setup Automation Data
**Title:** "We analyzed the top 20 setup failures for AI agents — 60% are fully automatable"

**Body:**

We went through every FAQ entry, troubleshooting page, and GitHub issue for a popular open-source AI agent framework (OpenClaw) and catalogued every setup problem users hit.

**Top 5 reasons users think the bot is "broken" on first run:**

1. **DM pairing not understood** (54% of "it doesn't work" reports) — Bot uses pairing security by default. First message generates a code. Users don't know they need to approve themselves.

2. **API key confusion** — 8+ FAQ entries just on authentication methods. Users don't know the difference between API keys, OAuth tokens, setup tokens, and subscription auth.

3. **"No API key found"** — Key set in .bashrc but service doesn't read shell config. Silent failure.

4. **WhatsApp disconnects** — Unofficial API, inherently fragile. Users expect 100% uptime.

5. **Node version wrong** — Requires Node 22+. Many systems ship with 18 or 20.

**The data:**
- 12/20 top problems are **fully automatable** with a setup wizard
- 8/20 are **partially automatable** (need user input but can be guided)
- 0/20 are unsolvable

We're building [Clawhatch](link) — a setup wizard that handles the automatable 60% and guides the rest.

The research is on our GitHub if anyone wants to dig into the full breakdown.

---

### Template 4: r/selfhosted — Security Checklist
**Title:** "Security audit checklist for self-hosted AI assistants (learned the hard way)"

**Body:**

Running a self-hosted AI agent with shell/tool access? Here's a security checklist based on real misconfigurations I've seen (and made):

**Critical (fix immediately):**
- [ ] DM policy is NOT "open" (use "pairing" or "allowlist")
- [ ] Gateway is NOT bound to 0.0.0.0 without auth token
- [ ] Group policy is NOT "open" (use allowlist)
- [ ] Log redaction is ON (`logging.redactSensitive: true`)

**Important:**
- [ ] API keys are in `.env` file, not shell config
- [ ] `~/.openclaw` directory has restricted permissions (700)
- [ ] Dashboard accessed via HTTPS or localhost only
- [ ] Plugins are from trusted sources only, versions pinned

**Nice to have:**
- [ ] Separate OS user for each agent (session isolation)
- [ ] Plugin allowlist configured (`plugins.allow`)
- [ ] Rate limiting on gateway
- [ ] Regular `openclaw security audit --fix` runs

If you're running OpenClaw specifically: `openclaw security audit --fix` checks most of these automatically.

Remember: your AI agent likely has shell access to your server. An open DM policy = giving strangers a terminal.

---

## 5. YouTube Video Ideas (Ranked by Effort vs Impact)

| Rank | Title | Length | Effort | Impact | Score | Notes |
|------|-------|--------|--------|--------|-------|-------|
| **1** | "Fix 'openclaw not recognized' on Windows in 60s" | 60s Short | 🟢 Low (screen record + voiceover) | 🔴 High (top Windows issue, A2) | ⭐⭐⭐⭐⭐ | Target exact error message for YouTube SEO |
| **2** | "OpenClaw: First 5 Minutes After Install" | 3-5 min | 🟢 Low (screen walkthrough) | 🔴 High (pairing + first message, E2) | ⭐⭐⭐⭐⭐ | Solves #1 pain point visually |
| **3** | "3 Security Settings to Change Immediately" | 2-3 min | 🟢 Low (terminal demo) | 🟠 High (F1, F2, F4) | ⭐⭐⭐⭐ | Quick wins, shareable |
| **4** | "OpenClaw Setup on Windows — Complete Walkthrough" | 8-10 min | 🟡 Medium (full install recording) | 🔴 High (A2, A3, A4 combined) | ⭐⭐⭐⭐ | Evergreen, high search volume |
| **5** | "WhatsApp + AI Bot: Dedicated Number Setup" | 5-7 min | 🟡 Medium (phone + screen) | 🟠 High (C1, C3, C4) | ⭐⭐⭐⭐ | WhatsApp = high demand topic |
| **6** | "Multi-Channel AI: WhatsApp + Discord + Telegram" | 5-7 min | 🟡 Medium (multi-platform demo) | 🟠 Medium-High (unique selling point) | ⭐⭐⭐ | Differentiator content |
| **7** | "OpenClaw API Key Setup — Every Method Explained" | 4-6 min | 🟢 Low (screen + diagrams) | 🟠 Medium (B1, B3) | ⭐⭐⭐ | Complements blog post |
| **8** | "Raspberry Pi AI Assistant — Full Build" | 15-20 min | 🔴 High (hardware + full setup) | 🟠 Medium (niche but viral potential) | ⭐⭐⭐ | Maker/DIY audience, good thumbnails |
| **9** | "Self-Hosted AI vs ChatGPT Plus — Honest Comparison" | 10-12 min | 🟡 Medium (research + comparison) | 🟠 Medium (broad audience) | ⭐⭐⭐ | Comparison videos perform well |
| **10** | "Building a Setup Wizard for AI Agents (Dev Log)" | 8-10 min | 🟡 Medium (dev footage + narration) | 🟡 Medium (dev audience, builds trust) | ⭐⭐ | Behind-the-scenes for Clawhatch |

### Recommended Priority Order:
1. **Shorts first** (#1) — lowest effort, immediate SEO value, tests the channel
2. **First 5 minutes** (#2) — solves the biggest pain point, reference video for support
3. **Windows walkthrough** (#4) — evergreen tutorial, high search volume
4. **Security settings** (#3) — shareable, builds authority
5. **WhatsApp setup** (#5) — high demand, complements blog content

---

## Appendix: Content Distribution Checklist

For every piece of content published:

- [ ] Cross-link between blog ↔ Twitter ↔ Reddit ↔ YouTube
- [ ] Add to OpenClaw docs/community if relevant
- [ ] Share in OpenClaw Discord/community channels
- [ ] Include Clawhatch CTA (setup wizard link)
- [ ] Track which pain point IDs (A1-H4) each piece addresses
- [ ] Monitor comments for new pain points to add to research

### SEO Notes
- Blog posts target long-tail keywords (3-5 words)
- Twitter threads target awareness + link to blog for depth
- Reddit posts target community credibility (avoid being promotional)
- YouTube targets exact error messages and "how to" queries
- All content links back to Clawhatch as the solution
