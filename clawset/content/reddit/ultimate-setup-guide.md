# The Bulletproof OpenClaw Setup Guide (2026)

**I've set up OpenClaw 50+ times. Here's how to do it without losing your mind.**

---

## Why This Guide Exists

The official OpenClaw docs are excellent *reference material*. But if you're new, they feel like someone handed you a car manual and said "figure it out." You end up with:
- "Gateway won't start" (because `gateway.mode` wasn't set)
- "No API key found" (because auth doesn't inherit to new agents)
- "WhatsApp disconnects every 2 hours" (because Baileys is fragile)
- "Bot doesn't reply in groups" (because you're not in the allowlist)
- DM pairing codes that make you think the bot is broken

This guide walks you through setup **in order**, explains **why** each step matters, and shows you how to avoid every common footgun. By the end, you'll have a working, secure OpenClaw agent that actually does what you expect.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Platform-Specific Setup](#platform-specific-setup)
3. [Install OpenClaw](#install-openclaw)
4. [Configure Your Agent](#configure-your-agent)
5. [Set Up Channels](#set-up-channels)
6. [Security Baseline](#security-baseline)
7. [Personalisation](#personalisation)
8. [Test & Verify](#test--verify)
9. [Common Issues & Fixes](#common-issues--fixes)
10. [Next Steps](#next-steps)

---

## Prerequisites

Before you start, you need:

### 1. Node.js ≥ 22
```bash
node --version  # Should be v22.x or higher
```
If not: [Install Node.js](https://nodejs.org/) (LTS version)

⚠️ **Do NOT use Bun** for WhatsApp or Telegram channels. It's unsupported and will break.

### 2. API Keys
You need at least one:
- **Anthropic** (Claude): [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) — **Recommended**
- **OpenAI** (GPT): [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **OpenRouter** (Multi-provider): [openrouter.ai/keys](https://openrouter.ai/keys)

💡 **Tip:** Start with Anthropic. Claude Sonnet 3.5 is the best all-rounder for most tasks.

### 3. Platform-Specific Requirements

#### Windows
- **WSL2** (Windows Subsystem for Linux) — [Install guide](https://learn.microsoft.com/en-us/windows/wsl/install)
- **Systemd enabled** in WSL — Required for service management

#### macOS
- **Xcode Command Line Tools**: `xcode-select --install`

#### Linux
- Nothing extra needed (you're good to go)

---

## Platform-Specific Setup

### Windows (WSL2)

OpenClaw on Windows runs inside WSL2. Here's how to set it up:

#### 1. Install WSL2
```powershell
# In PowerShell (as Administrator)
wsl --install
```
Restart your computer.

#### 2. Enable Systemd
```bash
# Inside WSL2
sudo nano /etc/wsl.conf
```
Add these lines:
```
[boot]
systemd=true
```
Save (Ctrl+O, Enter, Ctrl+X), then restart WSL:
```powershell
# In PowerShell
wsl --shutdown
```
Open WSL again. Verify systemd is running:
```bash
systemctl --version
```

#### 3. Port Forwarding (If You Need LAN Access)
WSL2 has its own virtual network. If you want to access OpenClaw from other devices (phone, tablet), you need port forwarding:
```powershell
# In PowerShell (as Administrator)
# Replace <WSL-IP> with your WSL IP (get it with `wsl hostname -I`)
netsh interface portproxy add v4tov4 listenport=18789 listenaddress=0.0.0.0 connectport=18789 connectaddress=<WSL-IP>
```
⚠️ WSL IP changes on restart. You'll need to update this after reboots (or use a script).

---

### macOS

You're good to go. Install Xcode Command Line Tools if you haven't:
```bash
xcode-select --install
```

---

### Linux

You're already on the best platform for OpenClaw. No extra setup needed.

---

## Install OpenClaw

### 1. Install via npm (Recommended)
```bash
npm install -g openclaw
```

### 2. Verify Installation
```bash
openclaw --version
```
Should show something like `2026.2.1`.

### 3. Check System Health
```bash
openclaw doctor
```
This will flag any issues (missing dependencies, wrong Node version, etc.).

---

## Configure Your Agent

### 1. Run Initial Configuration
```bash
openclaw configure
```
This launches an interactive wizard. You'll be asked:

#### Gateway Mode
Choose `local` (single-user, runs on your machine).

#### Agent Name
Default is "main". You can change it later.

#### Model Selection
Pick your default model:
- `anthropic/claude-sonnet-3.5` — Best all-rounder (recommended)
- `openai/gpt-4` — Good for coding tasks
- `anthropic/claude-opus-3` — Most capable (expensive)

You can change this anytime with `openclaw config set agent.defaultModel <model>`.

### 2. Add Your API Key
```bash
openclaw models auth setup-token --provider anthropic
```
Paste your API key when prompted.

⚠️ **NEVER put API keys directly in `config.yaml`**. Always use `~/.openclaw/.env` or the auth commands.

### 3. Verify Auth Works
```bash
openclaw models status
```
You should see your provider listed with ✅ status.

---

## Set Up Channels

Channels let you talk to your OpenClaw agent from messaging apps. Pick the one(s) you want:

### Telegram (Easiest)

#### 1. Create a Bot
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Follow prompts (name + username)
4. Copy the bot token (looks like `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### 2. Add to OpenClaw
```bash
openclaw channels add telegram --token YOUR_BOT_TOKEN
```

#### 3. Allow Yourself to Use It
```bash
openclaw channels config telegram --allowFrom YOUR_TELEGRAM_USER_ID
```
💡 **How to get your Telegram user ID:**
- Message [@userinfobot](https://t.me/userinfobot)
- It will reply with your numeric user ID

#### 4. Start the Gateway
```bash
openclaw gateway start
```

#### 5. Test It
Message your bot on Telegram. You'll get a **pairing code**. This is not an error — it's a security feature.

Approve yourself:
```bash
openclaw pairing approve telegram <CODE>
```
Now message your bot again. It should reply!

---

### WhatsApp (More Setup, Less Stable)

⚠️ **Heads up:** WhatsApp uses an unofficial API (Baileys). It works but disconnects sometimes. Telegram/Discord are more reliable.

#### 1. Get a Phone Number
You need a dedicated phone number (or use your personal one with `selfChatMode`).

**Dedicated number (recommended):**
- eSIM (Airalo, Nomad)
- Prepaid SIM
- **Do NOT use VoIP/virtual numbers** (TextNow, Google Voice) — WhatsApp blocks them

**Personal number:**
- You'll only talk to your agent in your own chat (saved messages)
- Enable `selfChatMode: true` in config

#### 2. Add WhatsApp Channel
```bash
openclaw channels add whatsapp
```

#### 3. Scan QR Code
```bash
openclaw channels login whatsapp
```
A QR code appears. Scan it with WhatsApp (Settings → Linked Devices → Link a Device).

#### 4. Test Connection
```bash
openclaw status --deep
```
Look for WhatsApp status. Should say "Connected".

#### 5. Send a Test Message
If using personal number with `selfChatMode`:
- Message yourself on WhatsApp
- Your agent should reply

If using dedicated number:
- Add the number to your contacts
- Send it a message
- You'll get a pairing code (same flow as Telegram)

---

### Discord

#### 1. Create a Bot on Discord Developer Portal
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" tab → "Add Bot"
4. Copy the bot token
5. Enable these intents:
   - Message Content Intent
   - Server Members Intent
   - Presence Intent

#### 2. Invite Bot to Your Server
Go to OAuth2 → URL Generator:
- Scopes: `bot`
- Permissions: `Send Messages`, `Read Message History`, `View Channels`
- Copy generated URL and open in browser to invite

#### 3. Add to OpenClaw
```bash
openclaw channels add discord --token YOUR_BOT_TOKEN
```

#### 4. Allow Your Server
```bash
openclaw channels config discord --guildIds YOUR_SERVER_ID
```
💡 **How to get server ID:**
- Enable Developer Mode (Discord Settings → Advanced → Developer Mode)
- Right-click your server → Copy ID

---

## Security Baseline

**This section is critical.** Most OpenClaw security issues come from skipping these steps.

### 1. Run Security Audit
```bash
openclaw security audit
```
This will flag any misconfigurations.

To auto-fix issues:
```bash
openclaw security audit --fix
```

### 2. Check DM Policy
```bash
openclaw config get channels.telegram.dmPolicy
```
Should be `pairing` (default) or `allowlist`. **NEVER set to `open`** unless you want strangers executing shell commands on your machine.

### 3. Verify API Keys Are Not in Config
```bash
grep -r "sk-ant" ~/.openclaw/config.yaml
```
Should return nothing. If you see API keys in `config.yaml`, move them to `.env`:
```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> ~/.openclaw/.env
```
Then remove from `config.yaml` and restart gateway.

### 4. Set File Permissions
```bash
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/.env
chmod 600 ~/.openclaw/config.yaml
```

### 5. Configure Sandboxing (If Using Exec/Shell Tools)
If you want your agent to run shell commands, set up allowlists:
```bash
openclaw config set exec.security allowlist
openclaw config set exec.allowlist '["ls", "cat", "grep", "git"]'
```
**Do NOT set `exec.security` to `full` unless you understand the risks.**

---

## Personalisation

Make your agent actually yours.

### 1. Set Agent Name
```bash
openclaw config set agent.name "Jarvis"  # or whatever you want
```

### 2. Create SOUL.md (Personality File)
```bash
mkdir -p ~/.openclaw/workspace
nano ~/.openclaw/workspace/SOUL.md
```
Add your agent's personality:
```markdown
# SOUL.md

You are Jarvis, my personal AI assistant.

- Be concise and direct
- No corporate-speak or filler words
- Use British spelling
- When in doubt, ask rather than assume
- Remember: you have access to my files and messages — respect privacy
```
This file gets loaded into every conversation.

### 3. Set Timezone
```bash
openclaw config set agent.timezone "Europe/London"  # or your timezone
```

### 4. Configure Memory
```bash
# How many messages to keep in context
openclaw config set session.historyLimit 50

# Session persistence (keep history between restarts)
openclaw config set session.reset "never"
```

---

## Test & Verify

### 1. Check Gateway Status
```bash
openclaw gateway status
```
Should say "Running".

### 2. Test Model Connection
Send a test message via your channel (Telegram/WhatsApp/Discord). Agent should reply.

If it doesn't:
```bash
openclaw gateway logs --follow
```
Watch for errors.

### 3. Test Tool Execution (If Enabled)
Ask your agent to run a command:
> "What files are in my home directory?"

If allowlists are configured correctly, it should execute `ls` and reply with results.

### 4. Check Memory Persistence
1. Send: "Remember: my favourite color is blue"
2. Restart gateway: `openclaw gateway restart`
3. Send: "What's my favourite color?"

If memory is configured correctly, it should remember.

---

## Common Issues & Fixes

### Issue: "No API key found for provider 'anthropic'"
**Fix:**
```bash
openclaw models auth setup-token --provider anthropic
```
Paste your key when prompted.

---

### Issue: Gateway won't start — "Configuration invalid"
**Fix:**
```bash
openclaw doctor --fix
```
This will auto-correct most config issues.

---

### Issue: WhatsApp disconnects every few hours
**Fix:**
WhatsApp (Baileys) is inherently unstable. Set aggressive reconnect:
```bash
openclaw channels config whatsapp --reconnect.maxAttempts 10
```
You may need to re-scan QR occasionally.

---

### Issue: Bot doesn't reply in Discord/Telegram groups
**Fix:**
Groups require allowlists:
```bash
# For Telegram
openclaw channels config telegram --groupIds GROUP_ID_1,GROUP_ID_2

# For Discord
openclaw channels config discord --guildIds SERVER_ID_1,SERVER_ID_2
```

---

### Issue: "Context too large" errors
**Fix:**
Reduce history limit:
```bash
openclaw config set session.historyLimit 30
```
Or start a new conversation:
```
/new
```

---

### Issue: Pairing codes confusing you
**This is not an issue — it's a security feature.**

When someone sends a DM to your bot for the first time, they get a pairing code. You approve them:
```bash
openclaw pairing approve <channel> <code>
```
This prevents strangers from accessing your agent.

To pre-approve yourself (so you don't see pairing codes):
```bash
# For Telegram
openclaw channels config telegram --dmPolicy allowlist --allowFrom YOUR_USER_ID

# For Discord
openclaw channels config discord --dmPolicy allowlist --allowFrom YOUR_USER_ID
```

---

### Issue: Gateway exposed on LAN without auth
If you set `gateway.bind` to `0.0.0.0` or your LAN IP, you MUST set an auth token:
```bash
openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
```
Otherwise anyone on your network can control your agent.

---

### Issue: Windows — OpenClaw not recognized in PowerShell
**Fix:**
Node global bin folder not in PATH. Add it:
```powershell
# In PowerShell (as Administrator)
$env:Path += ";$env:APPDATA\npm"
```
Restart PowerShell.

---

## Next Steps

### 1. Add More Channels
```bash
openclaw channels list
```
Shows all available channels. Add the ones you want.

### 2. Explore Skills
Skills are OpenClaw's plugins. Browse available skills:
```bash
openclaw skills search
```
Install a skill:
```bash
openclaw skills install <skill-name>
```

### 3. Set Up Cron Jobs (Reminders, Scheduled Tasks)
```bash
openclaw cron add --schedule "0 9 * * *" --text "Good morning! Here's your daily brief."
```

### 4. Multi-Agent Setup
Want multiple agents with different personalities/models?
```bash
openclaw agents add work --model openai/gpt-4
openclaw agents add personal --model anthropic/claude-sonnet-3.5
```
Route channels to specific agents in config.

### 5. Pair a Node (Phone, Tablet, Smart Home)
OpenClaw can control paired devices (Android, iOS, macOS, Windows, Linux).

On your phone: Install OpenClaw Node app  
On your desktop:
```bash
openclaw nodes pending
openclaw nodes approve <node-id>
```
Now your agent can send notifications, take photos, get location, etc.

---

## Get Help

- **Docs:** [docs.openclaw.ai](https://docs.openclaw.ai)
- **Discord:** [discord.com/invite/clawd](https://discord.com/invite/clawd)
- **GitHub:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)

---

## Need Setup Help?

If this guide still feels overwhelming, I offer professional setup services:

**Clawhatch** — Your OpenClaw agent, set up safely and built for you.

- ✅ Safe baseline (sandboxing, key encryption, allowlists)
- ✅ Personalised (built for your workflow)
- ✅ Maintained (optional ongoing support)

**Free for first 5 beta testers** — [Book a slot here: INSERT CALENDLY LINK]

After beta: £79-249 depending on tier (founding-customer pricing, 47% off list).

---

## Closing Thoughts

OpenClaw is incredible once it's set up. The problem is getting there. The official docs assume you're comfortable with terminal commands, config files, and debugging. This guide tries to bridge that gap.

If you hit a wall that's not covered here, drop a comment or DM me. I'll update the guide with your fix.

Good luck. Go build something cool.

—  
**Clawhatch**  
*Setup done right, in 10 minutes instead of 10 hours*

---

## Changelog

**2026-02-03:** Initial version (v1.0)
- Covers Windows/WSL2, macOS, Linux setup
- Telegram, WhatsApp, Discord channels
- Security baseline
- Common issues + fixes
