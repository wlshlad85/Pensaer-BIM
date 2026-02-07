# The Complete OpenClaw Setup Guide for Non-Developers

*Last updated: February 2026 · Reading time: ~12 minutes*

You're not a developer. You don't know what a "PATH variable" is, you've never touched a terminal on purpose, and the phrase "enable systemd in WSL" makes you want to close your laptop and go for a walk.

But you've heard about OpenClaw — a personal AI assistant that lives on your computer, connects to WhatsApp or Telegram or Discord, remembers things across conversations, and actually *does stuff* for you. Not a chatbot in a browser tab. An AI that runs in the background, 24/7, on your own machine.

You want that. You just don't want to mass a computer science exam to get it.

This guide is for you.

We've spent months watching people set up OpenClaw. We've catalogued every error message, every dead end, every moment where someone stares at their screen and thinks *I have no idea what just happened*. This guide exists because we took all of those failure points and wrote the instructions that should have existed from the start.

No jargon without explanation. No steps that assume you already know things. No "just run this command" without telling you where to run it and what to do if it doesn't work.

Let's get your AI assistant running.

---

## What You'll Need (Prerequisites Checklist)

Before you install anything, let's make sure your machine is ready. Check these off one by one.

### Every Platform

- [ ] **A computer that stays on.** OpenClaw runs as a background service. If your laptop sleeps, your AI sleeps. A desktop PC, an old laptop plugged in permanently, or a mini PC works best.
- [ ] **An Anthropic API key.** This is how your AI thinks. Go to [console.anthropic.com](https://console.anthropic.com), create an account, add a payment method, and generate an API key. Copy it somewhere safe — you'll need it during setup. *Do not use OAuth or subscription auth. A plain API key is the most reliable method and will save you hours of debugging later.*
- [ ] **A messaging account for your AI.** If you want WhatsApp, you'll need a **real mobile number** (a cheap prepaid SIM or eSIM works). VoIP numbers from TextNow, Google Voice, etc. will not work — WhatsApp blocks them. For Telegram or Discord, you just need to create a bot through their respective platforms.
- [ ] **A stable internet connection.** Your AI talks to cloud AI models. No internet means no thinking.

### Windows-Specific

- [ ] **Windows 10 (version 2004+) or Windows 11.**
- [ ] **Administrator access** on your account.
- [ ] **At least 4GB of free RAM** and 2GB of free disk space.

### Mac-Specific

- [ ] **macOS 13 (Ventura) or later.**
- [ ] **Homebrew installed.** If you open Terminal and type `brew --version` and see a version number, you're good. If not, visit [brew.sh](https://brew.sh) and run the one-line install command they show you.

---

## Step-by-Step Setup: Windows

Windows is the trickiest platform for OpenClaw because the software runs inside something called WSL2 — essentially a lightweight Linux system embedded in Windows. Don't panic. We'll walk through every step.

### Step 1: Open PowerShell as Administrator

Click the Start button, type **PowerShell**, right-click **Windows PowerShell**, and select **Run as administrator**. Click **Yes** when Windows asks for permission.

You'll see a blue window with white text. This is your terminal. Every command in this section gets typed here.

### Step 2: Install WSL2

Type this and press Enter:

```
wsl --install
```

Wait for it to finish. It will download Ubuntu (a Linux distribution) automatically. **Restart your computer when it asks.**

After restarting, a terminal window may pop up asking you to create a Linux username and password. Pick something simple — you'll need this password occasionally. It won't show characters as you type the password. That's normal. Just type it and press Enter.

### Step 3: Enable systemd

This step is critical and frequently skipped. Open your WSL terminal (search for "Ubuntu" in the Start menu) and type:

```bash
sudo sh -c 'echo -e "[boot]\nsystemd=true" >> /etc/wsl.conf'
```

It'll ask for the password you just created. Type it and press Enter.

Now close the Ubuntu window entirely. Go back to **PowerShell (as Administrator)** and type:

```
wsl --shutdown
```

Wait 10 seconds, then open Ubuntu again from the Start menu. systemd is now enabled.

> **Why this matters:** OpenClaw runs as a system service. Without systemd, the service manager doesn't exist, and your AI can't start automatically or run in the background.

### Step 4: Install Node.js 22+

Still in the Ubuntu terminal:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

Verify it worked:

```bash
node --version
```

You should see `v22.x.x` or higher. If you see a lower number or an error, something went wrong — check that you're in the WSL/Ubuntu terminal, not PowerShell.

### Step 5: Install OpenClaw

```bash
curl -fsSL https://get.openclaw.ai | bash
```

This downloads and installs OpenClaw. It may take 2–5 minutes. If it appears to hang with no output for more than 5 minutes, press `Ctrl+C` and try running it again — sometimes the first attempt stalls on slow connections.

### Step 6: Run the Setup Wizard

```bash
openclaw configure
```

The wizard will walk you through:

1. **API key** — paste your Anthropic API key when asked. This is the key from the prerequisites. The wizard will verify it works before continuing.
2. **Gateway mode** — choose `local`. This means your AI runs on your machine only.
3. **Channel setup** — pick your messaging platform and follow the prompts. For WhatsApp, you'll scan a QR code with your phone. For Telegram, you'll paste a bot token.

> **Critical:** When the wizard asks where to store your API key, let it write to the `.env` file. Do **not** manually add it to `.bashrc` or `.zshrc` — environment variables set in shell config files disappear when OpenClaw runs as a background service. This is the single most common cause of "No API key found" errors.

### Step 7: Start the Gateway

```bash
openclaw gateway install
openclaw gateway start
```

Check that it's running:

```bash
openclaw gateway status
```

You should see a green "running" status. Your AI is now alive.

### Step 8: Send Your First Message

Open your messaging app and send a message to your AI. If you're using WhatsApp with a dedicated number, message that number. If you're using Telegram, message your bot.

**Important:** The first time you message your AI from a new account, you'll receive a **pairing code** instead of a real response. This is a security feature — it prevents strangers from talking to your AI. Run this command in your Ubuntu terminal:

```bash
openclaw pairing approve <channel> <code>
```

Replace `<channel>` with `whatsapp`, `telegram`, or `discord`, and `<code>` with the code you received. Now send another message — your AI should respond.

---

## Step-by-Step Setup: Mac

macOS is the smoother experience. No WSL layer, no systemd workaround.

### Step 1: Open Terminal

Press `Cmd + Space`, type **Terminal**, press Enter.

### Step 2: Install Prerequisites

```bash
brew install node@22 git
```

Verify:

```bash
node --version
```

Should show `v22.x.x` or higher.

### Step 3: Install OpenClaw

```bash
curl -fsSL https://get.openclaw.ai | bash
```

### Step 4: Run the Setup Wizard

```bash
openclaw configure
```

Same process as Windows — API key, gateway mode (`local`), channel setup. Same rule: let the wizard write your API key to the `.env` file.

### Step 5: Start the Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway status
```

### Step 6: Grant macOS Permissions

macOS will ask for permissions as your AI tries to use features — Accessibility access, Full Disk Access, etc. **Grant them when prompted.** You can also pre-grant them in **System Settings → Privacy & Security**.

### Step 7: Send Your First Message

Same as Windows — message your AI, approve the pairing code, and you're live.

---

## Common Mistakes (and How to Avoid Them)

These are the mistakes we see over and over. Read this section *before* you start, and you'll save yourself an hour of frustration.

### Mistake #1: Using OAuth Instead of an API Key

OpenClaw supports multiple ways to authenticate with AI providers — API keys, OAuth tokens, setup tokens, subscription auth. **Use a plain API key.** OAuth tokens expire and fail to refresh. Subscription auth hits rate limits because you're sharing a pool with other users. An API key just works, every time, permanently (until you revoke it).

### Mistake #2: Putting API Keys in Shell Config

If you Google "how to set environment variables," every answer says to add them to `~/.bashrc` or `~/.zshrc`. This works for commands you run manually but **not** for background services. When OpenClaw runs as a service, it doesn't load your shell config. Your API key vanishes. Use the `.env` file in `~/.openclaw/` instead.

### Mistake #3: Skipping systemd on Windows

WSL2 without systemd is like a car without an ignition. OpenClaw installs fine, the wizard runs fine, but the gateway service can't start because there's no service manager. Go back to Step 3 in the Windows section. Yes, really.

### Mistake #4: Using a Virtual Number for WhatsApp

Google Voice, TextNow, Skype numbers — WhatsApp will flag and block these. Use a real SIM card. A £5 prepaid SIM from any carrier works. If you want to keep your personal WhatsApp separate, use an eSIM or a second cheap phone.

### Mistake #5: Not Understanding the Pairing System

Your AI doesn't respond to strangers by default. This is a *security feature*, not a bug. The first message from any new person triggers a pairing request. You approve it from the terminal. If you're wondering why your AI "isn't working" after setup, this is almost certainly why.

### Mistake #6: Leaving Security Wide Open

Never set `dmPolicy` to `open` unless you truly want anyone on the internet to talk to your AI — which has access to your computer. The default `pairing` mode is correct. If you're exposing the gateway to your local network, always set an auth token. Run `openclaw security audit` to check your configuration.

### Mistake #7: Ignoring `openclaw doctor`

When something seems wrong, run this first:

```bash
openclaw doctor
```

It checks your Node version, config validity, auth status, service health, and a dozen other things. It's like a mechanic running diagnostics before opening the hood. Use it.

---

## Troubleshooting FAQ

### "openclaw: command not found"

The install script didn't add OpenClaw to your PATH. Close your terminal completely and open a new one. If it still doesn't work, run:

```bash
export PATH="$HOME/.openclaw/bin:$PATH"
```

Then add that same line to your `~/.bashrc` (Linux/WSL) or `~/.zshrc` (Mac) so it persists.

### "No API key found for provider 'anthropic'"

Your API key isn't where OpenClaw expects it. Run:

```bash
openclaw models auth setup-token --provider anthropic
```

This will walk you through setting it up correctly in the `.env` file.

### The Gateway Starts Then Immediately Stops

Run `openclaw doctor --fix`. The most common causes are:
- `gateway.mode` not set (the wizard should set this, but manual config edits can clear it)
- Invalid config syntax (a stray comma, a missing quote)
- Port 18789 already in use by another program

For the port issue, check with `openclaw gateway status` and kill the conflicting process, or change the port in your config.

### WhatsApp Disconnects After a Few Hours

WhatsApp connections through Baileys (the library OpenClaw uses) are inherently less stable than official APIs. This is normal. OpenClaw will auto-reconnect. If it doesn't, run:

```bash
openclaw channels login
```

and scan the QR code again. For persistent disconnections, check your internet stability and make sure the phone with the linked number stays connected to the internet.

### "All models failed"

No working AI model credentials. Run:

```bash
openclaw models status
```

This shows which providers are configured and whether their credentials are valid. You need at least one working provider (Anthropic recommended).

### Context Too Large / Memory Issues

Long conversations eat memory. If your AI starts acting confused or throwing context errors:

```bash
/new
```

Send this as a message to reset the conversation. For persistent memory management, configure `session.historyLimit` in your config to cap conversation length.

### My AI Doesn't Respond in WhatsApp Groups

By default, your AI only responds when directly mentioned in groups. You also need to add the group to your allowlist. Use:

```bash
openclaw channels groups list
```

to find the group ID, then add it to your config's `allowFrom` list.

### High Memory Usage Over Time

The gateway accumulates conversation history. Set a history limit in your config:

```yaml
session:
  historyLimit: 100
```

And restart the gateway periodically if memory creeps up.

---

## You Did It

If you've followed this guide from top to bottom, you now have a personal AI assistant running on your own machine, connected to your messaging platform of choice, secured against unauthorized access, and ready to help with whatever you throw at it.

The first few days are a learning curve. You'll figure out how it handles memory, what it's good at, where its limits are. That's normal. The hard part — the setup — is behind you.

Welcome to the future of personal AI. It lives on your computer, it works for you, and nobody else has access to it.

---

## Need Help?

If you hit a wall, don't want to deal with terminals, or just want someone to handle the whole thing for you — **[Clawhatch](https://clawhatch.com) offers professional OpenClaw setup services.** We'll get your AI running, configured, secured, and connected to your channels, so you can skip straight to the good part.

Visit **[clawhatch.com](https://clawhatch.com)** to get started.
