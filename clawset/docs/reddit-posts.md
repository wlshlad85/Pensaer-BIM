# Reddit Posts — Clawhatch Setup Guide

*For sharing the OpenClaw setup guide. Adapt links before posting.*

---

## Post 1: r/ClaudeAI

**Title:** I wrote the setup guide I wish existed when I first installed OpenClaw

**Body:**

I spent way too long getting OpenClaw running properly. The docs are fine once you know what you're doing, but the first-time experience had me hitting walls that would've been avoidable with better guidance.

So I wrote the guide I wanted when I started — covers the full path from zero to a working assistant on WhatsApp/Discord/Telegram.

**What it covers:**

- Pre-flight checks (Node version, WSL2 on Windows, the stuff that silently breaks everything)
- Auth setup without the confusion — there are like 5 different ways to authenticate and most of them are wrong for most people. The guide just tells you which one to use.
- Channel config that actually works first try (WhatsApp is especially fiddly — dedicated vs personal number, QR code lifecycle, group JID discovery)
- Security hardening — the defaults are *okay* but if you're exposing the gateway on your LAN without an auth token you've basically given the internet shell access to your machine
- The "first message and nothing happens" problem — turns out DM pairing is on by default and nobody tells you that you need to approve the pairing code

**Common gotchas the guide helps you avoid:**

- Setting API keys in `.bashrc` instead of `.env` (they vanish when running as a service)
- Running `gateway.mode` unset (gateway just refuses to start with a cryptic error)
- WhatsApp disconnecting randomly because reconnect defaults are too conservative
- Using a Google Voice / VoIP number for WhatsApp (it won't work)
- Port 18789 conflict from a zombie gateway process

The guide also includes a preflight checklist you can run through in 5 minutes to verify everything before you even start the install.

**[LINK]**

Happy to answer questions — I've probably already hit whatever error you're seeing.

---

## Post 2: r/selfhosted

**Title:** Guide: self-hosting an AI assistant with OpenClaw (WhatsApp, Discord, Telegram) — all the stuff the docs don't tell you

**Body:**

For anyone running or considering OpenClaw — it's a self-hosted AI assistant framework that connects Claude/GPT to your messaging apps. Think of it as your own ChatGPT that lives on your server and talks to you on WhatsApp.

The official docs are decent reference material but the first-run experience is rough. I kept a log of every issue I hit and turned it into a setup guide that covers the full path from fresh machine to working assistant.

**Why you'd want this over just using ChatGPT/Claude directly:**

- Runs on your hardware, your data stays local
- Persistent memory across sessions (it actually remembers things)
- Proactive — it can check your email, monitor things, run scheduled tasks
- Multi-channel — same assistant on WhatsApp + Discord + Telegram + web
- Extensible with skills/plugins

**What the guide covers that the docs don't make obvious:**

1. **Platform prep** — WSL2 + systemd on Windows (non-negotiable but easy to miss), Node 22+ requirement, why Bun doesn't work for WhatsApp/Telegram
2. **Auth that doesn't break** — API keys vs OAuth vs setup tokens vs subscription auth. Short answer: just use an API key and put it in `~/.openclaw/.env`, not your shell config. Env vars in `.bashrc` don't survive service mode.
3. **WhatsApp** — the most popular channel and the most fragile. Uses Baileys (unofficial API), disconnects are expected, VoIP numbers are blocked. Guide covers: dedicated number setup, QR code login, reconnect policy tuning, group allowlisting.
4. **Security** — `openclaw security audit --fix` is your friend. The guide walks through: DM policy (never use "open"), gateway auth tokens for LAN/Tailnet exposure, file permissions on `~/.openclaw`, plugin allowlisting.
5. **The pairing trap** — you send your first message, nothing happens, you think it's broken. It's not. DM pairing requires approval. The guide explains this upfront so you don't waste 30 minutes debugging a working system.

**Infra notes:**

- Runs fine on a Raspberry Pi (slow but functional)
- Linux VPS works but watch for IPv6/DNS issues with Telegram
- macOS needs specific system permissions for some skills
- Gateway binds to loopback by default — use Tailscale Serve for remote HTTPS access

**[LINK]**

Been running this for a while now. Happy to share config snippets if anyone's stuck on a specific channel.

---

## Post 3: Reply Templates

### Q: "Does this work on Windows?"

Yes, but you need WSL2 with systemd enabled — OpenClaw doesn't run natively on Windows. The guide covers the WSL2 setup. Main gotcha: make sure Git and Node are in your PATH inside WSL, and if you want LAN access you'll need to set up port forwarding with `netsh interface portproxy` because WSL2 has its own virtual network.

### Q: "WhatsApp keeps disconnecting"

That's unfortunately normal — it uses Baileys (unofficial WhatsApp Web API). A few things help: set aggressive reconnect defaults in your config, don't use the same WhatsApp account on another device simultaneously, and make sure your gateway service stays running. If it fully deauths, you'll need to re-scan the QR code with `openclaw channels login`. The guide has a section on reconnect tuning.

### Q: "Can I use my Claude subscription instead of an API key?"

You can, but I wouldn't recommend it. Subscription auth uses OAuth tokens that expire and need refreshing — it's fragile and you'll hit rate limits because you're sharing a pool. API keys are more reliable and give you dedicated rate limits. The guide walks through API key setup specifically.

### Q: "I sent a message and nothing happened"

Almost certainly the DM pairing system. By default, OpenClaw requires you to approve new contacts. When you send your first message, it generates a pairing code. You need to run `openclaw pairing approve <channel> <code>` to approve yourself. The guide covers how to pre-approve your own account during setup so you don't hit this.

### Q: "Is this secure? It has shell access..."

It can be, but you need to configure it properly. Never run with `dmPolicy: "open"` — that lets anyone who messages the bot execute commands on your machine. Use `pairing` or `allowlist` mode. Run `openclaw security audit --fix` after setup. If you're exposing the gateway beyond localhost, set an auth token. The guide has a full security hardening section.

### Q: "How much does it cost to run?"

Just the API costs. OpenClaw itself is free/open source. With Anthropic's API you're looking at roughly $3-15/month for moderate personal use depending on model and usage. The guide covers how to set up model aliases so you can use cheaper models for simple tasks and save the expensive ones for complex work.

### Q: "Can I run multiple assistants with different personalities?"

Yes — OpenClaw supports multi-agent setups. Each agent gets its own SOUL.md (personality), memory, and model config. You can bind different agents to different channels. Config is a bit involved though — the guide covers single-agent setup. Multi-agent is an advanced topic I might write up separately.

### Q: "Raspberry Pi / ARM?"

It works but expect slower response times. Make sure you're using a compatible Node version for ARM. Some dependencies may need building from source. The guide mentions Pi compatibility but doesn't deep-dive it — if there's interest I can add a section.

### Q: "I'm getting 'context too large' errors"

Your conversation history exceeded the model's context window. Send `/new` to start fresh, or `/compact` to compress the history without losing it completely. For a permanent fix, set `session.historyLimit` in your config. The guide covers recommended defaults.
