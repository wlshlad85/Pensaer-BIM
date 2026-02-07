# OpenClaw Complete Setup Guide 2026 — YouTube Video Script

## Video Metadata

### Title (SEO-optimized)
**OpenClaw Complete Setup Guide 2026 — Install AI on Your Phone in 25 Minutes (WhatsApp, Telegram, Discord)**

### Description
```
Set up OpenClaw from scratch in 25 minutes. By the end of this video, you'll have your own AI assistant running on your phone via WhatsApp, Telegram, or Discord.

This is the ONLY guide you need — covers installation, API keys, channel setup, and the most common issues that trip people up.

🔗 Links:
• OpenClaw docs: https://docs.openclaw.ai
• Node.js 22+: https://nodejs.org
• Get an Anthropic API key: https://console.anthropic.com

⏱️ Chapters:
0:00 — What you'll have by the end
0:30 — Prerequisites checklist
2:00 — Installation (Linux/Mac/Windows)
7:30 — API key setup (the RIGHT way)
10:00 — Channel setup (WhatsApp / Telegram / Discord)
15:00 — Configuration & security
18:00 — Personalizing your agent
20:00 — Testing & sending your first message
23:00 — Troubleshooting the 5 most common issues
25:00 — Wrap-up & next steps

💬 Still stuck? Drop a comment with your error message — I read every one.

#OpenClaw #AIAssistant #SelfHostedAI #WhatsAppBot #TelegramBot #DiscordBot #AI2026 #Tutorial
```

### Tags
```
openclaw, openclaw setup, openclaw tutorial, openclaw 2026, openclaw install, self-hosted ai, ai assistant phone, whatsapp ai bot, telegram ai bot, discord ai bot, openclaw whatsapp, openclaw guide, ai setup guide, personal ai assistant, claude api setup, anthropic api, openclaw windows, openclaw wsl2, openclaw configuration, how to install openclaw
```

### Thumbnail Concept
**Layout:** Split screen — left side shows a terminal with the `openclaw` CLI running (green text on dark background), right side shows a phone with a WhatsApp conversation where the AI is responding. Big bold text overlay: **"YOUR OWN AI"** top, **"25 MIN SETUP"** bottom. Arrow pointing from terminal → phone. Bright green accent color. Your face in bottom-right corner looking impressed/excited (optional).

**Alt concept:** Phone screen mockup showing AI conversation, with a giant green checkmark and "OpenClaw 2026 — Full Setup" text. Clean, minimal.

---

## Full Script

---

### CHAPTER 1: Hook (0:00–0:30)

**[ON SCREEN: Phone showing a WhatsApp conversation with an AI responding intelligently. Quick cuts of messages being sent and answered.]**

**NARRATOR:**
By the end of this video, OpenClaw will be running on your phone. Not a demo. Not a sandbox. Your own private AI assistant — answering you on WhatsApp, Telegram, or Discord — running on your hardware, under your control.

I'm going to walk you through every single step. No skipping ahead, no "just follow the docs." We're doing this together, start to finish, in 25 minutes.

And I'm going to save you from the five mistakes that trip up almost everyone. Let's go.

**[TITLE CARD: "OpenClaw Complete Setup Guide 2026"]**

---

### CHAPTER 2: Prerequisites (0:30–2:00)

**[ON SCREEN: Clean checklist graphic, items appearing one by one]**

**NARRATOR:**
Before we touch the terminal, let's make sure you have everything. This takes two minutes and saves you an hour of debugging later.

**[Checklist item 1 appears]**

**Number one: A computer that stays on.** This can be a laptop, a desktop, a Raspberry Pi, a cheap VPS — anything. OpenClaw is your server. When it's off, your AI is off. If you want it always available, a $5/month VPS or an old laptop works great.

**[Checklist item 2]**

**Number two: Node.js version 22 or higher.** This is the single biggest gotcha. If you have an older Node — and a lot of you do — it will not work. Open a terminal right now and type `node --version`. If it says anything below 22, go to nodejs.org and update. I'll wait.

**[Beat. Pause.]**

One more thing on Node — do NOT use Bun. I know it's fast. I know you love it. But WhatsApp and Telegram channels break on Bun. Use Node.

**[Checklist item 3]**

**Number three: An API key.** OpenClaw needs a brain — that's a language model. You'll need an API key from Anthropic, OpenAI, or another provider. I recommend Anthropic's Claude. I'll walk you through getting the key in a few minutes, but if you want to grab one now, the link is in the description.

**[Checklist item 4]**

**Number four — Windows users only:** You need WSL2. OpenClaw runs on Linux under the hood, so on Windows, we use the Windows Subsystem for Linux. If you don't have it, open PowerShell as admin and run `wsl --install`. Then restart your computer. Seriously — restart. Then come back.

You'll also need systemd enabled in WSL. I'll show you exactly how in the install section.

**[Checklist item 5]**

**Number five: A phone number** — if you want WhatsApp. I strongly recommend using a separate number, not your personal one. A cheap prepaid SIM or eSIM works perfectly. Do NOT use a VoIP number like Google Voice or TextNow — WhatsApp will block it.

**[Checklist clears. All green checkmarks.]**

Got everything? Good. Let's install.

---

### CHAPTER 3: Installation Walkthrough (2:00–15:00)

#### 3A: The Install Command (2:00–4:00)

**[ON SCREEN: Terminal, clean prompt]**

**NARRATOR:**
Open your terminal. On Mac or Linux, that's just your terminal. On Windows, open your WSL terminal — not PowerShell, not CMD. WSL.

**[Types command]**

```
curl -fsSL https://get.openclaw.ai | sh
```

That's it. One command. Hit enter.

**[Installer runs. Progress bars visible.]**

While this downloads, let me tell you what's happening. It's pulling the OpenClaw package, checking your Node version, setting up the directory structure at `~/.openclaw`, and preparing the onboarding wizard.

**[ON SCREEN: Callout box — "If installer hangs: check your internet, try with --verbose flag"]**

If this hangs with no output for more than 60 seconds, kill it with Ctrl+C and run it again with the `--verbose` flag. Usually it's a network blip.

**[Installer completes]**

Done. Now here's where people get their first surprise.

#### 3B: Windows/WSL2 Specific Steps (4:00–5:30)

**[ON SCREEN: "WINDOWS USERS" banner]**

**NARRATOR:**
If you're on Mac or Linux, skip ahead to the timestamp on screen — I'll see you at API keys.

**[Timestamp overlay: "Skip to 5:30 for API keys"]**

Windows people, stay with me. Two things you must do.

**First:** make sure systemd is enabled in WSL. Open your WSL terminal and run:

```
sudo nano /etc/wsl.conf
```

**[Types it out]**

Add these lines if they're not there:

```
[boot]
systemd=true
```

Save, exit, then back in PowerShell run:

```
wsl --shutdown
```

Then reopen WSL. Systemd is now enabled. OpenClaw needs this to run as a background service.

**Second gotcha:** if you ever need to access OpenClaw from other devices on your network — like your phone's browser going to the dashboard — WSL has its own virtual network. You'll need port forwarding. We'll cover that in configuration, but for now just know it's a thing.

**[ON SCREEN: Callout — "PATH issues? If 'openclaw' isn't recognized, close and reopen your terminal"]**

One more: if you type `openclaw` and get "command not recognized," close your terminal completely and open a new one. The installer updated your PATH but your current session doesn't know yet.

#### 3C: API Key Setup — The RIGHT Way (5:30–8:30)

**[ON SCREEN: Terminal prompt, fresh]**

**NARRATOR:**
Okay, everyone back together. This next part — API keys — is where the most people get stuck. Not because it's hard, but because there are too many options and the docs show you all of them at once.

I'm going to show you ONE path. The one that works, doesn't expire, and won't randomly break at 2 AM.

**[ON SCREEN: Graphic showing different auth methods — API Key highlighted in green, others greyed out with "❌ fragile" labels]**

OpenClaw supports API keys, OAuth tokens, setup tokens, subscription auth — ignore all of that. Get an API key. That's it.

**Step 1:** Go to console.anthropic.com. Sign up or log in. Go to API Keys. Create a new key. Copy it.

**[Screen recording of Anthropic console, key creation]**

**Step 2:** Back in your terminal:

```
openclaw models auth add --provider anthropic --key sk-ant-your-key-here
```

**[Types command, blurs key]**

Now here's the critical part that catches people. Watch carefully.

**[ON SCREEN: Red emphasis box]**

This key gets stored in `~/.openclaw/auth-profiles.json`. That's great. But if you run OpenClaw as a service later — which you will — the service runs in a different environment. It does NOT read your `.bashrc` or `.zshrc`.

So if you put your API key in an environment variable in your shell config? The service won't see it. Your bot will start, look fine, and then reply to every message with "No API key found."

**[ON SCREEN: Side-by-side comparison]**

```
# ❌ WRONG — service can't see this
export ANTHROPIC_API_KEY=sk-ant-xxx    # in .bashrc

# ✅ RIGHT — service reads this
# Key stored via: openclaw models auth add
# Or in: ~/.openclaw/.env
```

The `openclaw models auth add` command stores it in the right place. If you need environment variables for any reason, put them in `~/.openclaw/.env`, never in your shell config.

Let's verify it worked:

```
openclaw models status
```

**[Output shows Anthropic provider with green checkmark, model list]**

Green checkmark next to Anthropic. Models listed. We're good.

**[ON SCREEN: "Pro tip" callout]**

Pro tip: run `openclaw models test` to actually send a test message to the API. This catches rate limit issues, expired keys, and billing problems before you wonder why your bot isn't responding.

#### 3D: Running the Onboarding Wizard (8:30–10:00)

**[ON SCREEN: Terminal]**

**NARRATOR:**
Now let's bring your agent to life.

```
openclaw onboard
```

**[Wizard starts — animated terminal showing the hatching sequence]**

This is the onboarding wizard. It's going to ask you a few questions — your agent's name, which model to use as default, and some basic preferences.

**[Wizard asks for agent name]**

I'll call mine "Atlas." Pick whatever you want.

**[Wizard asks for default model]**

For the model, I'm picking Claude — since we set up the Anthropic key. It'll be your agent's default brain.

**[Wizard progresses to "hatching" phase]**

Now it's going to do its "hatching" thing. This takes 30 seconds to a minute. If it hangs here for more than 3 minutes — and this DOES happen — here's what you do:

```
openclaw doctor
```

**[Shows in split terminal]**

This command checks everything: Node version, auth, network, config. It'll tell you exactly what's wrong. Nine times out of ten, it's the API key not being reachable.

**[Wizard completes. Agent is alive.]**

There we go. Agent is onboarded. But it's just sitting there on your computer. Nobody can talk to it yet. Let's fix that.

#### 3E: Channel Setup — WhatsApp (10:00–12:30)

**[ON SCREEN: "Choose Your Channel" screen with WhatsApp, Telegram, Discord logos]**

**NARRATOR:**
Time to connect a messaging channel. I'll cover all three, starting with WhatsApp since it's the most popular — and the most finicky.

```
openclaw channels add whatsapp
```

**[Terminal shows QR code]**

A QR code appears. Grab the phone with your dedicated WhatsApp number. Open WhatsApp, go to Settings → Linked Devices → Link a Device, and scan this code.

**[Phone screen recording of scanning QR]**

Linked. Now here's what you need to understand about WhatsApp.

**[ON SCREEN: Warning graphic]**

WhatsApp is NOT an official bot platform. OpenClaw uses a library called Baileys that reverse-engineers WhatsApp Web. It works. Millions of people use it. But it can disconnect randomly — especially if your phone loses internet, if WhatsApp updates, or just... because.

When that happens, you rescan the QR code. That's the deal with WhatsApp.

**[ON SCREEN: Config snippet]**

Now, dedicated number vs personal number. If you're using a dedicated number — which I recommended — you're set. Messages come in, your agent replies.

If you're using your personal number, you need self-chat mode:

```
openclaw config set channels.whatsapp.selfChatMode true
```

This makes your agent only respond to messages you send to yourself — the "Message Yourself" chat in WhatsApp. This way it won't accidentally reply to your friends, which is... awkward. Trust me.

**[Beat]**

One more WhatsApp thing. Groups. By default, your agent ignores groups. If you want it in a group:

```
openclaw channels whatsapp groups list
```

This shows all your groups with their JIDs — those long ID strings. Pick the one you want:

```
openclaw config set channels.whatsapp.groups.allow "120363xxx@g.us"
```

And set a mention pattern so it only responds when tagged, not to every single message in the group.

#### 3F: Channel Setup — Telegram (12:30–13:30)

**[ON SCREEN: Telegram section]**

**NARRATOR:**
Telegram is easier. You need a bot token from BotFather.

Open Telegram, search for @BotFather, send `/newbot`, follow the prompts, get your token.

```
openclaw channels add telegram --token YOUR_BOT_TOKEN
```

**[Types command]**

Done. Telegram's official bot API, so it's much more stable than WhatsApp. No random disconnects.

**[ON SCREEN: Callout]**

One gotcha for VPS users: if your server only has IPv6 and Telegram's API resolves to IPv6 first, you might get connection errors. Force IPv4 in your config or enable IPv6 egress on your VPS.

For `allowFrom`, use numeric Telegram user IDs, not usernames. Usernames can change. IDs don't.

#### 3G: Channel Setup — Discord (13:30–15:00)

**[ON SCREEN: Discord section]**

**NARRATOR:**
Discord needs a bit more setup because you're creating a bot application on Discord's developer portal.

Go to discord.com/developers, create a new application, go to Bot, create a bot, copy the token. Make sure to enable these intents:

**[ON SCREEN: Checklist with checkmarks animating]**
- ✅ Message Content Intent
- ✅ Server Members Intent
- ✅ Presence Intent

Without Message Content Intent, your bot literally cannot read messages. Discord turns it off by default. This catches people all the time.

```
openclaw channels add discord --token YOUR_BOT_TOKEN
```

Then invite the bot to your server using the OAuth2 URL generator in the developer portal. Select `bot` scope, give it Send Messages + Read Messages permissions.

**[Shows OAuth2 URL generator]**

Alright. Channel connected. Let's configure everything properly.

---

### CHAPTER 4: Configuration (15:00–20:00)

#### 4A: Gateway Setup (15:00–16:30)

**[ON SCREEN: Terminal]**

**NARRATOR:**
Your agent exists. Your channel is connected. Now we need the gateway — the thing that actually runs in the background and keeps everything alive.

```
openclaw configure
```

**[Interactive configurator runs]**

This walks you through the main settings. The important one:

**Gateway mode.** Set it to `local`.

```
openclaw config set gateway.mode local
```

**[ON SCREEN: Red emphasis]**

If you skip this, you'll get "Gateway start blocked: set gateway.mode=local" and wonder what went wrong. Ask me how I know.

Now start the gateway:

```
openclaw gateway start
```

**[Gateway starts, status shows green]**

And install it as a service so it survives reboots:

```
openclaw gateway install
```

Verify:

```
openclaw gateway status
```

**[Shows running status with uptime]**

Running. Beautiful.

**[ON SCREEN: Callout — "Port 18789 in use? Another instance is running. Run: openclaw gateway stop, then start again"]**

If you get a port conflict — port 18789 already in use — you have another instance running. Stop it first with `openclaw gateway stop`.

#### 4B: Security Configuration (16:30–18:00)

**[ON SCREEN: "SECURITY — Don't Skip This" banner with lock icon]**

**NARRATOR:**
I know you want to skip this part. Don't. OpenClaw has shell access to your machine. If you misconfigure security, anyone who messages your bot can run commands on your computer.

**[Pause for effect]**

Let's lock it down.

```
openclaw security audit
```

**[Audit output shows findings]**

This scans your setup and flags risks. The big ones:

**DM Policy.** This should be `pairing` or `allowlist`. Never `open`.

**[ON SCREEN: Comparison table]**

| Policy | What it means |
|--------|--------------|
| `open` | ❌ Anyone can message your bot and it responds. Dangerous. |
| `pairing` | ✅ New users get a pairing code. You approve them. |
| `allowlist` | ✅ Only pre-approved users can talk to it. |

Default is `pairing`, which is fine. If someone messages your bot for the first time, they get a code. You approve it with:

```
openclaw pairing approve whatsapp ABC123
```

This trips up almost every new user. They set up the bot, send it a message from their phone, and get back... a pairing code instead of an AI response. They think it's broken. It's not — it's security working correctly.

**[ON SCREEN: Big callout — "First message = pairing code, not AI response. That's normal!"]**

If you want to skip pairing for yourself, pre-approve your number during setup:

```
openclaw config set channels.whatsapp.allowFrom "+447xxxxxxxxx"
```

**Gateway auth.** If your gateway is only on localhost — the default — you're fine. But if you bind it to your LAN or the internet:

```
openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
```

Always. No exceptions. An unauthenticated gateway on your network means anyone on your WiFi can control your AI.

Now auto-fix everything the audit found:

```
openclaw security audit --fix
```

**[Shows fixes applied]**

Done. Locked down.

#### 4C: Personalizing Your Agent (18:00–20:00)

**[ON SCREEN: Agent customization screen]**

**NARRATOR:**
Now the fun part. Let's make your agent actually useful.

**System prompt.** This is your agent's personality and instructions. Open:

```
~/.openclaw/agents/default/SOUL.md
```

**[Opens file in editor]**

This is a markdown file. Write whatever you want your agent to be. A coding assistant. A writing partner. A snarky friend. A personal scheduler. It reads this file at the start of every conversation.

**Memory.** Your agent forgets everything between conversations by default. To change that:

```
openclaw config set session.persistence true
```

Or use `MEMORY.md` files in the agent directory — the agent reads and updates these automatically, like a notebook it carries between sessions.

**[ON SCREEN: Config snippet]**

A few settings I recommend changing from defaults:

```yaml
# Reduce memory usage over time
session.historyLimit: 100

# Set your timezone (for cron/reminders)
timezone: "Europe/London"

# Heartbeat interval — the agent checks in periodically
heartbeat.interval: 30m
```

Speaking of heartbeats — your agent will send you a message every 30 minutes by default. Some people love this. Some people find it annoying at 3 AM. Configure it or disable it:

```
openclaw config set heartbeat.enabled false
```

Or set quiet hours:

```
openclaw config set heartbeat.quiet "23:00-08:00"
```

---

### CHAPTER 5: Testing & First Message (20:00–23:00)

#### 5A: The Moment of Truth (20:00–21:00)

**[ON SCREEN: Phone in hand, chat open]**

**NARRATOR:**
Everything's set up. Let's test it.

First, let's make sure the system is healthy:

```
openclaw status --deep
```

**[Output shows all green: gateway running, channel connected, auth valid, agent loaded]**

All green. Now open your messaging app — WhatsApp, Telegram, or Discord — and send your bot a message.

**[Phone screen: types "Hey, are you there?"]**

**[Pause... typing indicator appears... response comes in]**

**[ON SCREEN: AI responds with a friendly greeting]**

There it is. Your own AI. Running on your machine. Talking to you on your phone.

#### 5B: Testing Key Features (21:00–23:00)

**[ON SCREEN: Phone conversation continuing]**

**NARRATOR:**
Let's make sure everything actually works properly. Try these:

**Test 1: Basic conversation.** Just chat. Make sure responses are coherent and fast.

**[Sends a follow-up question, gets intelligent response]**

**Test 2: Memory.** Tell it something, start a new conversation, ask if it remembers.

**[Types "Remember that my favorite color is green." Then sends "/new" to reset. Then asks "What's my favorite color?"]**

If you enabled persistence, it should remember. If not, it won't — and that's by design.

**Test 3: Send an image** (if your channel supports it). Send a photo and ask "What's in this image?"

**[Sends photo, gets description back]**

**Test 4: Try a command.** Send `/status` to your bot. It should respond with system info.

**[Shows /status response]**

If any of these fail, don't panic. That's what the next section is for.

**[ON SCREEN: Quick feature showcase — rapid cuts of different interactions: asking for weather, getting reminders, code help, etc.]**

Play around with it. Try different things. Break it. That's how you learn what it can do.

---

### CHAPTER 6: Troubleshooting Common Issues (23:00–25:00)

**[ON SCREEN: "TOP 5 ISSUES" title card with error emoji]**

**NARRATOR:**
These are the five problems I see people hit the most. Save this timestamp.

**[ON SCREEN: Issue #1]**

**Issue 1: "I sent a message and got a pairing code instead of a response."**

That's the DM pairing system. It's security, not a bug. Run `openclaw pairing approve` with the code, or pre-approve your number in config. We covered this in the security section.

**[ON SCREEN: Issue #2]**

**Issue 2: "All models failed" or "No API key found."**

Your key isn't where the service can find it. Run `openclaw models status`. If it shows nothing, your key is in your shell environment, not in OpenClaw's auth store. Fix it with `openclaw models auth add` or put it in `~/.openclaw/.env`. Not `.bashrc`. Not `.zshrc`. The `.env` file.

**[ON SCREEN: Issue #3]**

**Issue 3: WhatsApp disconnected.**

Welcome to the WhatsApp experience. Run `openclaw channels login` to rescan the QR. If it happens constantly, check that your phone has a stable internet connection — WhatsApp Web sessions depend on your phone being online.

**[ON SCREEN: Issue #4]**

**Issue 4: Gateway won't start.**

Three things to check, in order:

```
openclaw doctor        # diagnoses everything
openclaw gateway status   # check if another instance is running
openclaw config validate  # check for config errors
```

Usually it's either `gateway.mode` not being set, a port conflict, or a broken config. `openclaw doctor --fix` handles most of it.

**[ON SCREEN: Issue #5]**

**Issue 5: Works in terminal but not as a service.**

The service runs in a clean environment. It doesn't load your shell profile. Any API keys, PATH additions, or environment variables you set in `.bashrc` or `.zshrc` are invisible to it. Move everything to `~/.openclaw/.env`.

Run `openclaw gateway install --force` to reinstall the service with current config.

**[ON SCREEN: Nuclear option]**

And if everything is truly broken — the nuclear option:

```
openclaw doctor --fix
openclaw security audit --fix
openclaw gateway install --force
```

That fixes 90% of everything.

---

### WRAP-UP (25:00)

**[ON SCREEN: Back to face cam or clean outro screen]**

**NARRATOR:**
That's it. You now have a self-hosted AI assistant on your phone. It runs on your machine, your data stays with you, and you control everything about it.

If this helped, hit like and subscribe — I'm making more OpenClaw videos covering advanced topics: multi-agent setups, custom skills, voice integration, and running this on a Raspberry Pi.

Drop a comment if you're stuck on anything. I'll pin solutions to common problems.

Links to everything mentioned are in the description.

See you in the next one.

**[END SCREEN: Subscribe button, next video suggestions, comment CTA]**

---

## Production Notes

### B-Roll Needed
- Terminal screencasts for all commands (use asciinema or screen recording)
- Phone screen recordings: WhatsApp QR scan, first message, conversation examples
- Anthropic console walkthrough (API key creation)
- Discord developer portal walkthrough
- Telegram BotFather interaction

### Graphics Needed
- Prerequisites checklist (animated)
- Auth methods comparison (API key vs OAuth vs subscription)
- DM policy comparison table
- "Choose Your Channel" selection screen
- Error/issue cards for troubleshooting section
- Chapter title cards

### Estimated Raw Recording Time
- Narration: ~35 minutes (will cut to 25)
- Screen recordings: ~45 minutes
- Total edit time: 6-8 hours

### Music
- Lo-fi/chill background for main sections
- Slightly upbeat for the hook and testing section
- No music during troubleshooting (clarity)
