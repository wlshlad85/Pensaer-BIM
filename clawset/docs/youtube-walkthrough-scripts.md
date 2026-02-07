# Clawhatch YouTube Walkthrough Scripts

*5 short-form (5–8 min) tutorial videos for the OpenClaw onboarding series*

---

## Video 1: OpenClaw Windows Setup in 5 Minutes

### SEO
- **Title:** OpenClaw Windows Setup in 5 Minutes — Full Walkthrough (2025)
- **Description:** Get OpenClaw running on Windows with WSL2 in under 5 minutes. Step-by-step guide covering WSL2 install, Node.js, Git, and your first "hello" from your AI agent. No Linux experience needed. Timestamps below.
- **Tags:** openclaw, openclaw windows, wsl2 setup, ai agent setup, openclaw install, openclaw tutorial, windows ai assistant, openclaw walkthrough, clawhatch

### Thumbnail Concept
Split screen: left side shows a Windows desktop with a terminal, right side shows a chat bubble from the agent saying "I'm alive!" Green checkmark overlay. Text: "5 MIN SETUP" in bold yellow.

### Script (~6 min)

**[0:00–0:30] HOOK**
"Most people give up installing OpenClaw on Windows before they even start — because nobody tells you about WSL2. In the next 5 minutes, you'll have a working AI agent on your Windows machine. Let's go."

**[0:30–1:30] STEP 1: Install WSL2**
- Open PowerShell as Administrator
- Run `wsl --install`
- Restart your PC when prompted
- After restart, WSL launches Ubuntu — set a username and password
- *Common mistake:* Skipping the restart. WSL2 won't work until you reboot.

**[1:30–2:15] STEP 2: Enable systemd**
- In your WSL terminal: `sudo nano /etc/wsl.conf`
- Add:
  ```
  [boot]
  systemd=true
  ```
- Save, exit, then in PowerShell: `wsl --shutdown` and reopen WSL
- *Common mistake:* Forgetting `wsl --shutdown`. The config won't apply until WSL fully restarts.

**[2:15–3:15] STEP 3: Install Node.js 22+**
- `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -`
- `sudo apt-get install -y nodejs git`
- Verify: `node --version` (must be 22+), `git --version`
- *Common mistake:* Installing Node on the Windows side instead of inside WSL. OpenClaw needs it inside WSL.

**[3:15–4:15] STEP 4: Install OpenClaw**
- `npx openclaw@latest init`
- Follow the onboarding wizard — it'll ask for your API key (Anthropic recommended)
- Paste your key when prompted
- *Common mistake:* Setting your API key in `.bashrc` instead of the `.env` file. When OpenClaw runs as a service, it won't see shell environment variables. Always use the wizard or `~/.openclaw/.env`.

**[4:15–5:15] STEP 5: Start the gateway**
- `openclaw gateway start`
- `openclaw status` — should show gateway running
- Open the web UI at `http://127.0.0.1:18789`
- Send your first message — if it replies, you're done!
- *Common mistake:* Seeing "gateway.mode not set" error. If the wizard didn't complete, run `openclaw config set gateway.mode local`.

**[5:15–5:45] COMMON MISTAKES RECAP**
1. **"openclaw not recognized"** — You're in PowerShell, not WSL. Type `wsl` first.
2. **"git not found"** — Install git inside WSL: `sudo apt install git`
3. **Port 18789 in use** — A previous instance is running. `openclaw gateway stop` first.
4. **Installer hangs** — Check your network. Run with `--verbose` flag for details.

**[5:45–6:00] OUTRO**
"That's it — OpenClaw on Windows in 5 minutes. Next video: connecting it to WhatsApp so you can chat with your agent from your phone. Subscribe so you don't miss it."

---

## Video 2: OpenClaw Mac Setup Guide

### SEO
- **Title:** OpenClaw Mac Setup Guide — Install Your AI Agent on macOS (2025)
- **Description:** Complete guide to installing OpenClaw on Mac. Covers Homebrew, Node.js, API keys, and launching your first AI agent. Works on Intel and Apple Silicon. Timestamps below.
- **Tags:** openclaw, openclaw mac, macos ai agent, openclaw install mac, ai assistant setup, openclaw tutorial, apple silicon openclaw, clawhatch

### Thumbnail Concept
MacBook screen showing a terminal with the OpenClaw logo. Apple logo in corner. Text: "MAC SETUP" with a rocket emoji. Clean, minimal aesthetic.

**[0:00–0:25] HOOK**
"Setting up OpenClaw on Mac is the easiest platform — if you skip two traps that catch everyone. Here's the full setup, zero to chatting, in under 6 minutes."

**[0:25–1:15] STEP 1: Prerequisites — Homebrew & Node**
- If you don't have Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- `brew install node@22 git`
- Verify: `node --version` (22+), `git --version`
- *Common mistake:* Having an ancient Node from years ago. `brew upgrade node` if it's below 22. Don't use Bun — it breaks WhatsApp and Telegram channels.

**[1:15–2:15] STEP 2: Install OpenClaw**
- `npx openclaw@latest init`
- The wizard walks you through everything
- When it asks for a model provider — pick Anthropic, paste your API key
- *Common mistake:* Confusion between API key, OAuth, setup-token, and subscription auth. Just use an **API key from console.anthropic.com**. One key, no token refresh headaches.

**[2:15–3:00] STEP 3: API Key — Do It Right**
- Go to console.anthropic.com → API Keys → Create Key
- Copy it. The wizard stores it in `~/.openclaw/auth-profiles.json`
- Verify it works: `openclaw models status` — should show a green checkmark
- *Common mistake:* Using Claude Pro subscription auth instead of an API key. Subscription auth uses shared rate limits and tokens expire. API keys are rock-solid.

**[3:00–3:45] STEP 4: Start & Verify**
- `openclaw gateway start`
- `openclaw status --deep` — everything should be green
- Open `http://127.0.0.1:18789` in your browser
- Send "Hello" — your agent should respond
- *Common mistake:* Getting "No API key found for provider 'anthropic'". Re-run `openclaw models auth` or check that `auth-profiles.json` exists.

**[3:45–4:30] STEP 5: Install as a Service (Optional but Recommended)**
- `openclaw gateway install`
- Now it starts automatically on boot
- `openclaw gateway status` to confirm
- *Common mistake:* Setting API keys in `.zshrc` then wondering why the service can't find them. The service doesn't load your shell config. Use `~/.openclaw/.env` for environment variables.

**[4:30–5:15] macOS-SPECIFIC TIPS**
- **Permissions:** If you want skills that control your Mac (screenshots, automation), you'll need to grant Accessibility and Full Disk Access in System Preferences → Privacy & Security
- **Apple Silicon:** Everything works natively on M1/M2/M3. No Rosetta needed.
- **Firewall:** If macOS firewall prompts you about Node, click Allow.

**[5:15–5:45] COMMON MISTAKES RECAP**
1. Wrong Node version (need 22+)
2. API key in shell config instead of .env file
3. Subscription auth instead of API key
4. Skipping `openclaw models status` verification

**[5:45–6:00] OUTRO**
"Your Mac is now an AI-powered machine. Next up: connecting WhatsApp so your agent lives in your pocket. Hit subscribe."

---

## Video 3: Connect OpenClaw to WhatsApp

### SEO
- **Title:** Connect OpenClaw to WhatsApp — Full Setup Guide (2025)
- **Description:** Step-by-step guide to connecting your OpenClaw AI agent to WhatsApp. Covers dedicated vs personal numbers, QR code linking, group setup, and fixing disconnections. The #1 requested tutorial.
- **Tags:** openclaw whatsapp, ai whatsapp bot, openclaw whatsapp setup, whatsapp ai agent, openclaw channels, baileys whatsapp, clawhatch, openclaw tutorial

### Thumbnail Concept
WhatsApp green background with a phone showing a chat conversation with an AI agent. QR code graphic in the corner. Text: "AI ON WHATSAPP" in white bold.

**[0:00–0:35] HOOK**
"Imagine texting your AI from your phone — anywhere, anytime. That's what OpenClaw on WhatsApp gives you. But WhatsApp is also the trickiest channel to set up. I'm going to save you hours of debugging in the next 7 minutes."

**[0:35–1:30] STEP 1: Choose Your Number Strategy**
- **Option A — Dedicated number (RECOMMENDED):** Get a cheap prepaid SIM or eSIM. Register a new WhatsApp account on it. Your agent gets its own identity.
- **Option B — Personal number:** Your agent shares your WhatsApp. Works but requires `selfChatMode` config.
- *Common mistake:* Using VoIP numbers (Google Voice, TextNow). WhatsApp blocks them. You need a **real mobile number** — prepaid SIM, eSIM, whatever. Just not VoIP.

**[1:30–2:30] STEP 2: Configure the WhatsApp Channel**
- `openclaw configure` → select WhatsApp channel
- Or manually: `openclaw config set channels.whatsapp.enabled true`
- If using a dedicated number, that's all you need
- If using personal number: set `channels.whatsapp.selfChatMode true`
- *Common mistake:* Not understanding the difference. Dedicated = agent responds to anyone who texts that number. Personal = agent only responds when you message yourself (or via explicit config).

**[2:30–3:30] STEP 3: Link via QR Code**
- `openclaw channels login whatsapp`
- A QR code appears in your terminal
- Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
- Scan the QR code
- Wait for "Successfully linked!" message
- *Common mistake:* QR code expires fast (about 60 seconds). If it expires, press Enter to get a fresh one. Don't screenshot it — scan it live.

**[3:30–4:15] STEP 4: Verify the Connection**
- `openclaw status --deep` — WhatsApp should show "linked"
- Send a test message to/from the connected number
- First-time DM? You'll get a **pairing code**. This is a security feature!
- Approve it: `openclaw pairing approve whatsapp <code>`
- *Common mistake:* Thinking the bot is broken because it sent a pairing code instead of a reply. That's by design — it's access control. Approve yourself and you're in.

**[4:15–5:15] STEP 5: Set Up Groups (Optional)**
- By default, the agent only responds in groups when @mentioned
- To add a group to the allowlist: `openclaw config set channels.whatsapp.groups.allowlist <group-JID>`
- Don't know the JID? Run `openclaw channels whatsapp groups` to list them
- Configure `mentionPatterns` if you want custom trigger words
- *Common mistake:* Adding the bot to a group and wondering why it doesn't reply. Groups require allowlisting AND mention by default.

**[5:15–6:15] STEP 6: Handling Disconnections**
- WhatsApp uses an unofficial API (Baileys). Disconnections **will** happen.
- OpenClaw auto-reconnects with backoff. Usually fixes itself in seconds.
- If it stays disconnected: `openclaw gateway restart`
- Nuclear option: `openclaw channels logout whatsapp` then re-scan QR
- *Common mistake:* Panicking when WhatsApp disconnects overnight. Check `openclaw status --deep` — if it says "connected", it already reconnected. The logs may show a brief disconnect but recovery is automatic.

**[6:15–6:45] KNOWN LIMITATIONS**
- Sending an image with ONLY an @mention (no text) won't trigger the bot — WhatsApp doesn't pass mention metadata on image-only messages. Always add text with your mention.
- WhatsApp may throttle or block numbers that send too many automated messages. Use a dedicated number so your personal account isn't at risk.

**[6:45–7:00] OUTRO**
"WhatsApp is the most popular channel for OpenClaw — and now you know why it's also the fussiest. But once it's set up, it's magic. Next video: installing your first skill. Subscribe."

---

## Video 4: Install Your First OpenClaw Skill

### SEO
- **Title:** Install Your First OpenClaw Skill — Extend Your AI Agent (2025)
- **Description:** Learn how to find, install, and configure OpenClaw skills (plugins). Give your AI agent new abilities — web search, home automation, calendar access, and more. Beginner-friendly walkthrough.
- **Tags:** openclaw skills, openclaw plugins, ai agent skills, openclaw extend, openclaw tutorial, install openclaw skill, clawhatch, openclaw customization

### Thumbnail Concept
Puzzle piece being clicked into place on a robot/agent icon. Colorful skill icons floating around (search, calendar, music). Text: "ADD SUPERPOWERS" in bold.

**[0:00–0:25] HOOK**
"Out of the box, your OpenClaw agent can chat and run shell commands. But skills turn it into something way more useful — web search, smart home control, calendar management. Let's install your first one."

**[0:25–1:15] WHAT ARE SKILLS?**
- Skills = plugins that give your agent new tools
- They're npm packages that OpenClaw loads at runtime
- Each skill comes with a `SKILL.md` that tells the agent how to use it
- Think of them like apps for your AI
- **Security note:** Skills run in-process with full access. Only install skills you trust. Stick to the official registry or inspect the code yourself.

**[1:15–2:15] STEP 1: Browse Available Skills**
- `openclaw skills list` — shows the skill registry
- Or browse the docs at docs.openclaw.ai/skills
- Popular starter skills: web search, calendar, file manager, home assistant
- Pick one — we'll use **web search** as our example

**[2:15–3:15] STEP 2: Install the Skill**
- `openclaw skills install @openclaw/skill-web-search`
- That's it. One command.
- It downloads the package, registers it with your agent, and loads the SKILL.md
- Verify: `openclaw skills status` — should show the skill as active
- *Common mistake:* Installing a skill then wondering why the agent doesn't use it. Some skills need configuration (API keys, etc). Check the skill's docs.

**[3:15–4:15] STEP 3: Configure the Skill (If Needed)**
- Some skills need additional config or API keys
- Example: web search might need a Brave Search API key
- `openclaw config set skills.web-search.apiKey <your-key>`
- Check the skill's SKILL.md for required config
- *Common mistake:* Putting skill config in the wrong place. Skill settings go under `skills.<skill-name>` in your OpenClaw config, not in environment variables (unless the skill docs say otherwise).

**[4:15–5:00] STEP 4: Test It**
- Restart the gateway: `openclaw gateway restart`
- Open a chat and ask your agent something that requires the skill
- "Search the web for the latest news about AI"
- The agent should use the web search tool and return results
- *Common mistake:* Not restarting the gateway after installing a skill. The gateway needs to reload to pick up new skills.

**[5:00–5:45] MANAGING SKILLS**
- **Update:** `openclaw skills update @openclaw/skill-web-search`
- **Remove:** `openclaw skills remove @openclaw/skill-web-search`
- **Pin versions:** In config, set exact versions to prevent unexpected updates
- **Allowlist:** Use `plugins.allow` in config to restrict which skills can run — good security practice

**[5:45–6:15] PLATFORM-SPECIFIC SKILLS**
- Some skills only work on certain platforms (e.g., macOS automation skills won't work on Linux)
- If a skill fails, check its SKILL.md for platform requirements
- You can use **node pairing** to run macOS-only skills from a Mac while your main agent runs on Linux
- *Common mistake:* Installing a macOS-only skill on a Linux VPS and filing a bug report. Read the requirements first.

**[6:15–6:30] OUTRO**
"One skill down, dozens to go. Skills are what make OpenClaw yours. Next video: the top 5 errors you'll hit and how to fix them instantly. Subscribe."

---

## Video 5: OpenClaw Troubleshooting — Top 5 Errors Fixed

### SEO
- **Title:** OpenClaw Troubleshooting: Top 5 Errors Fixed in Minutes (2025)
- **Description:** The 5 most common OpenClaw errors and how to fix them fast. Covers "No API key found", gateway won't start, WhatsApp disconnects, pairing confusion, and "context too large". Save hours of debugging.
- **Tags:** openclaw troubleshooting, openclaw errors, openclaw fix, openclaw gateway error, openclaw whatsapp disconnect, openclaw api key error, openclaw help, clawhatch, openclaw debug

### Thumbnail Concept
Red error message overlaid with a big green "FIXED" stamp. Frustrated face emoji → happy face emoji. Text: "TOP 5 FIXES" in red/green.

**[0:00–0:30] HOOK**
"If you're watching this, something broke. Don't worry — there are really only 5 errors that catch 90% of people. I'll fix each one in under a minute. Let's start with number one."

**[0:30–1:45] ERROR #1: "No API key found for provider 'anthropic'"**
- **Why:** Your auth credentials are missing, expired, or in the wrong place
- **Quick fix:**
  1. `openclaw models status` — check which providers are configured
  2. `openclaw models auth` — re-run auth setup
  3. Paste your API key when prompted
- **Root cause prevention:** Always use an API key (not OAuth/subscription auth). Store it via the wizard or in `~/.openclaw/.env` as `ANTHROPIC_API_KEY=sk-...`
- **Service gotcha:** If it works in your terminal but not as a service, your key is in `.bashrc`/`.zshrc` and the service can't see it. Move it to `~/.openclaw/.env`.

**[1:45–3:00] ERROR #2: Gateway won't start**
Three common causes:
- **"gateway.mode not set"** → `openclaw config set gateway.mode local`
- **"Configuration invalid"** → `openclaw doctor --fix` validates and repairs your config
- **"Port 18789 already in use"** → `openclaw gateway stop` first, or check for zombie processes: `lsof -i :18789`
- **Catch-all:** `openclaw doctor` diagnoses most gateway issues. Run it first, fix later.
- *Bonus:* If you see "gateway.bind requires auth" — you've bound to a network interface without setting a token. Either `openclaw config set gateway.auth.token <random-string>` or set bind back to `127.0.0.1`.

**[3:00–4:15] ERROR #3: WhatsApp says "Not linked" or keeps disconnecting**
- **Not linked:** Session expired. Re-scan: `openclaw channels login whatsapp`
- **Keeps disconnecting:** Baileys (the unofficial WhatsApp API) is inherently fragile. OpenClaw auto-reconnects, but if it fails:
  1. `openclaw gateway restart`
  2. Still broken? `openclaw channels logout whatsapp` then `openclaw channels login whatsapp`
  3. Check `~/.openclaw/channels/whatsapp/creds.json` — if corrupted, delete it and re-login
- **Prevention:** Keep your gateway running 24/7 (install as service). Brief disconnections heal themselves. Only intervene if `openclaw status --deep` shows "not linked" for more than a few minutes.

**[4:15–5:30] ERROR #4: "I message the bot but it just sends a code, not a reply"**
- **This isn't a bug — it's the pairing system.**
- OpenClaw uses DM pairing for security. First message from a new contact triggers a pairing code.
- **Fix:** `openclaw pairing approve whatsapp <code>` (or the equivalent for your channel)
- After approval, that contact can chat normally.
- **Why it exists:** Without pairing, anyone who knows your bot's number could use it — including running shell commands on your machine. Pairing = access control.
- **Disable (not recommended):** You can set `dmPolicy: "open"` but then you're exposing your entire system to anyone who messages you. Don't do this unless you've removed dangerous tools.

**[5:30–6:45] ERROR #5: "Context too large" / agent forgets mid-conversation**
- **Why:** Long conversations exceed the model's context window. The agent starts dropping earlier messages.
- **Quick fix:** Send `/new` to reset the conversation. Start fresh.
- **Config fix:** Set `session.historyLimit` to a reasonable number (e.g., 50 messages) so old context gets compacted rather than crashing.
- **Memory fix:** If the agent forgets things between sessions, that's by design — sessions reset. For persistent memory, use `MEMORY.md` files or configure `session.reset` settings.
- **High memory usage?** Long-running gateways accumulate history in RAM. Set `session.historyLimit` and restart periodically.

**[6:45–7:15] BONUS: THE ONE COMMAND THAT FIXES MOST THINGS**
- `openclaw doctor`
- It checks: Node version, config validity, auth status, gateway health, channel connectivity, security posture
- `openclaw doctor --fix` auto-repairs what it can
- `openclaw security audit --fix` tightens security settings (closes open DM policies, enables log redaction, fixes permissions)
- When in doubt, run the doctor.

**[7:15–7:30] OUTRO**
"Those five errors cover about 90% of what goes wrong with OpenClaw. Bookmark this video — future you will thank you. And if you haven't set up OpenClaw yet, check out video one in this series. Link in the description. Subscribe."

---

## Series Production Notes

### Consistent Branding
- Intro animation: Clawhatch logo, 3-second sting
- Lower third: Step numbers always visible during walkthroughs
- Color coding: Green = success/correct, Red = error/mistake, Yellow = caution/tip
- End screen: Links to all 5 videos in the series

### Recording Tips
- Screen record the actual terminal — don't fake it
- Use a large font size (18pt+) for terminal text
- Zoom into relevant areas of the screen when showing UI
- Show the actual error messages before showing the fix

### Upload Order
1. Windows Setup (biggest audience, most pain points)
2. Mac Setup
3. WhatsApp (most requested feature)
4. First Skill (natural next step)
5. Troubleshooting (catch-all, evergreen)

### Cross-Linking
- Each video description links to all others in the series
- End cards point to the next video in sequence
- Troubleshooting video is linked from all other videos as "if something goes wrong"
