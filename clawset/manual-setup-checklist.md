# Manual Setup Session Checklist
**CLA-212 — Session Structure & Runbook**

*Use this checklist for every 1:1 manual setup session*

---

## Pre-Session (24 Hours Before)

### Environment Check
- [ ] Confirm OS from intake form (Windows/macOS/Linux)
- [ ] Check OpenClaw install status (None / Broken / Working)
- [ ] Note their use case from intake form
- [ ] Verify timezone for session time

### Prepare Materials
- [ ] Screen-share tool ready (Zoom or Discord)
- [ ] Recording software ready (OBS or built-in)
- [ ] Terminal/SSH ready on your end (for reference commands)
- [ ] This checklist open in a tab

### Send Reminder Email
```
Subject: Your OpenClaw Setup Session Tomorrow

Hi [NAME],

Looking forward to our setup session tomorrow at [TIME] [TIMEZONE].

Before we start, please:
1. Make sure you have 45 minutes uninterrupted
2. Have your computer ready with admin/sudo access
3. (Optional) Get your API keys ready:
   - Anthropic: https://console.anthropic.com/settings/keys
   - OpenAI: https://platform.openai.com/api-keys

I'll send a [Zoom/Discord] link 30 minutes before we start.

See you soon!
—Clawhatch
```

---

## Session Structure (45 Minutes Total)

### Phase 1: Introduction (5 minutes)
- [ ] Greet them, confirm name
- [ ] Explain session structure
- [ ] Ask for screen-share permission
- [ ] Start recording (with consent)
- [ ] Quick check: "What's your main goal with OpenClaw?"

**Talking points:**
> "We'll get you fully set up in about 40 minutes. I'll walk you through each step, explain why it matters, and make sure everything's secure from day one. Ready?"

---

### Phase 2: Environment Setup (10 minutes)

#### Windows Users
- [ ] Check WSL2 installed: `wsl --status`
- [ ] If not: `wsl --install` (restart required)
- [ ] Check systemd enabled: `systemctl --version`
- [ ] If not: Edit `/etc/wsl.conf`, add `[boot]\nsystemd=true`, restart WSL

#### All Platforms
- [ ] Check Node version: `node --version` (must be ≥22)
- [ ] If wrong version: Install via nvm or nodejs.org
- [ ] Check npm: `npm --version`

**Script:**
```bash
# Verify environment
node --version    # Should be v22.x+
npm --version     # Should be 10.x+
```

---

### Phase 3: Install OpenClaw (5 minutes)
- [ ] Install: `npm install -g openclaw`
- [ ] Verify: `openclaw --version`
- [ ] Run doctor: `openclaw doctor`
- [ ] Fix any issues flagged

**If issues:**
- PATH not set → Add npm global bin to PATH
- Permission errors → May need sudo or fix npm prefix

---

### Phase 4: Configuration (10 minutes)

#### API Key Setup
- [ ] Ask which provider they want (Anthropic recommended)
- [ ] Guide to console:
  - Anthropic: https://console.anthropic.com/settings/keys
  - OpenAI: https://platform.openai.com/api-keys
- [ ] Add key: `openclaw models auth setup-token --provider anthropic`
- [ ] Verify: `openclaw models status`

**🛡️ SECURITY CHECK:**
- [ ] Keys stored in .env, NOT config.yaml
- [ ] Verify: `grep -r "sk-" ~/.openclaw/config.yaml` should return nothing

#### Gateway Configuration
- [ ] Run: `openclaw configure`
- [ ] Set gateway.mode: `local`
- [ ] Set agent name (default "main" is fine)
- [ ] Set default model: `anthropic/claude-sonnet-3.5`

---

### Phase 5: Channel Setup (10 minutes)

#### Ask Preference
> "Which messaging app do you want to use? Telegram is most stable, WhatsApp works but can disconnect, Discord is great for servers."

#### Telegram (Recommended)
- [ ] Create bot via @BotFather → `/newbot`
- [ ] Copy bot token
- [ ] Add channel: `openclaw channels add telegram --token TOKEN`
- [ ] Get user ID: Message @userinfobot
- [ ] Allow self: `openclaw channels config telegram --allowFrom USER_ID`

#### WhatsApp (If Chosen)
- [ ] Add channel: `openclaw channels add whatsapp`
- [ ] Scan QR: `openclaw channels login whatsapp`
- [ ] Wait for connection
- [ ] Set selfChatMode if personal number: `openclaw channels config whatsapp --selfChatMode true`
- [ ] **Warn:** WhatsApp is unstable (Baileys), may disconnect

#### Discord (If Chosen)
- [ ] Guide through Discord Developer Portal
- [ ] Create application + bot
- [ ] Enable intents (Message Content, Server Members, Presence)
- [ ] Get token
- [ ] Add: `openclaw channels add discord --token TOKEN`
- [ ] Get server ID (Developer Mode → right-click server)
- [ ] Allow server: `openclaw channels config discord --guildIds SERVER_ID`

---

### Phase 6: Security Baseline (5 minutes)

**🛡️ CRITICAL — Do Not Skip**

- [ ] Run audit: `openclaw security audit`
- [ ] Review findings
- [ ] Fix issues: `openclaw security audit --fix`

#### Verify Security Settings
- [ ] DM policy is `pairing` or `allowlist` (NOT `open`)
- [ ] Exec security is `allowlist` (NOT `full`)
- [ ] Gateway auth token set if bind != loopback
- [ ] File permissions: `chmod 700 ~/.openclaw && chmod 600 ~/.openclaw/.env`

**Script:**
```bash
# Security verification
openclaw config get channels.telegram.dmPolicy  # Should be 'pairing' or 'allowlist'
openclaw config get exec.security               # Should be 'allowlist'
```

---

### Phase 7: Personalisation (5 minutes)

#### Create SOUL.md
- [ ] Navigate to workspace: `cd ~/.openclaw/workspace`
- [ ] Create personality file: `nano SOUL.md`

**Template:**
```markdown
# SOUL.md

You are [NAME], my personal AI assistant.

- Be concise and direct
- No filler words or corporate-speak
- Use [British/American] spelling
- When unsure, ask rather than assume
- Respect privacy — you have access to my files and messages
```

#### Set Basic Config
- [ ] Set timezone: `openclaw config set agent.timezone "Europe/London"`
- [ ] Set history limit: `openclaw config set session.historyLimit 50`

---

### Phase 8: Test & Verify (5 minutes)

#### Start Gateway
- [ ] Start: `openclaw gateway start`
- [ ] Check status: `openclaw gateway status`
- [ ] View logs: `openclaw gateway logs --follow`

#### Send Test Message
- [ ] Open channel (Telegram/WhatsApp/Discord)
- [ ] Send: "Hello, what's your name?"
- [ ] Verify reply arrives
- [ ] If pairing code: Approve with `openclaw pairing approve <channel> <code>`
- [ ] Send again after approval
- [ ] Confirm agent replies with its name from SOUL.md

#### Test Tool Execution (If Enabled)
- [ ] Send: "What files are in my home directory?"
- [ ] Verify it executes `ls` and replies with results
- [ ] If blocked: Check allowlist config

---

### Phase 9: Wrap-Up (5 minutes)

#### Summary
> "You're all set! Here's what we configured:
> - OpenClaw installed and running
> - [Channel] connected with secure settings
> - Security baseline enforced (sandboxing, allowlists, encrypted keys)
> - Personalised agent with your preferences
>
> You can always check status with `openclaw gateway status` and logs with `openclaw gateway logs`."

#### Follow-Up Support
- [ ] Explain 1-week support: "Message me on Telegram/Discord if anything breaks"
- [ ] Share troubleshooting doc link
- [ ] Ask for testimonial:
  > "If this was helpful, would you mind writing a short testimonial? Just a sentence or two about your experience. I'll use it on the website with your permission."

#### Testimonial Prompt
> "What would you tell someone considering Clawhatch? What was most valuable about the setup?"

- [ ] Record their response (written or video)
- [ ] Get permission to use name/quote

---

## Post-Session (Within 24 Hours)

### Send Follow-Up Email
```
Subject: Your OpenClaw Setup — Resources & Support

Hi [NAME],

Great session today! Your OpenClaw agent is now running.

Quick reference:
- Start gateway: `openclaw gateway start`
- Check status: `openclaw gateway status`
- View logs: `openclaw gateway logs --follow`
- Restart: `openclaw gateway restart`

Troubleshooting: [LINK TO REDDIT GUIDE]

If anything breaks this week, message me on [Telegram/Discord] and I'll help fix it.

Thanks for being a beta tester! 🙏

—Clawhatch
```

### Document Learnings
- [ ] Note what confused them (add to wizard requirements)
- [ ] Note what worked well (keep doing)
- [ ] Note any bugs or issues encountered
- [ ] Update `clawset/research/manual-setup-findings.md`

### Request Testimonial (If Not Done)
```
Subject: Quick Favor — 30-Second Testimonial

Hi [NAME],

Hope your OpenClaw agent is working well!

Would you mind writing a quick testimonial? Just 1-2 sentences about your experience. Something like:

"[Describe what you liked or what was valuable]"

I'll use it on the Clawhatch website with your first name only (or anonymous if you prefer).

Thanks!
—Clawhatch
```

---

## Session Notes Template

Copy and fill out after each session:

```markdown
## Session: [NAME] — [DATE]

**Platform:** Windows/macOS/Linux
**Channel:** Telegram/WhatsApp/Discord
**Use Case:** [What they want to automate]

### What Worked
- 

### What Confused Them
- 

### Time Breakdown
- Environment setup: X min
- Install: X min
- Config: X min
- Channel: X min
- Security: X min
- Personalisation: X min
- Testing: X min
- Total: X min

### Issues Encountered
- 

### Testimonial
> "[Quote]"
> — [Name], [Date]

### Follow-Up Needed
- [ ] 
```

---

## Quick Reference Commands

```bash
# Status & Health
openclaw --version
openclaw doctor
openclaw gateway status
openclaw gateway logs --follow
openclaw status --deep

# Configuration
openclaw configure
openclaw config get <key>
openclaw config set <key> <value>

# Auth
openclaw models auth setup-token --provider anthropic
openclaw models status

# Channels
openclaw channels add <channel> --token <token>
openclaw channels config <channel> --<option> <value>
openclaw channels login whatsapp
openclaw pairing approve <channel> <code>

# Security
openclaw security audit
openclaw security audit --fix

# Gateway
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
```

---

**Checklist Version:** 1.0  
**Last Updated:** 2026-02-03  
**Owner:** Clawhatch
