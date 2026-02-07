# OpenClaw Costs Explained: The Complete 2026 Breakdown

**Every penny you'll actually spend running your own AI assistant — no surprises.**

*Last updated: June 2026*

---

You installed OpenClaw. You connected WhatsApp. You're chatting with your own AI assistant and it feels like magic.

Then the Anthropic bill arrives.

Let's talk about what OpenClaw *actually* costs to run in 2026 — the API pricing, the subscription trade-offs, the hidden costs nobody warns you about, and whether paying someone to set it up is worth the money.

No fluff. Real numbers.

---

## The Big Picture: OpenClaw Is Free, But AI Isn't

OpenClaw itself is **free and open source**. You download it, install it, run it. Zero licence fees. Forever.

The cost comes from the AI models it talks to. OpenClaw is a framework — it needs a brain, and brains cost money. For most users, that brain is **Claude by Anthropic**, though you can plug in OpenAI, Google Gemini, local models, or mix and match.

Here's the thing most guides skip: the cost varies *wildly* depending on how you use it. A casual user might spend £3/month. A power user can easily burn through £50+. And if you misconfigure things? You can rack up a terrifying bill in a single afternoon.

---

## 1. API Pricing Breakdown (The Real Numbers)

### Anthropic Claude API (Most Common for OpenClaw)

As of mid-2026, Anthropic's API pricing for Claude models:

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Context Window |
|-------|----------------------|------------------------|----------------|
| **Claude Sonnet 4** | $3 | $15 | 200K |
| **Claude Opus 4** | $15 | $75 | 200K |
| **Claude Haiku 3.5** | $0.80 | $4 | 200K |

**What's a token?** Roughly ¾ of a word. A typical message exchange — your prompt plus Claude's response — runs about 1,000–3,000 tokens total. A longer conversation with context and memory files might push 5,000–10,000 tokens per turn.

### Real-World Cost Per Message

Let's do the maths with **Claude Sonnet 4** (the sweet spot for most OpenClaw users):

| Scenario | Input Tokens | Output Tokens | Cost Per Message |
|----------|-------------|---------------|-----------------|
| Quick question ("What's the weather?") | ~500 | ~200 | **$0.0045** (~⅓p) |
| Normal chat with context | ~2,000 | ~800 | **$0.018** (~1.4p) |
| Complex task with tools + memory | ~8,000 | ~2,000 | **$0.054** (~4.3p) |
| Heavy coding/analysis session | ~20,000 | ~5,000 | **$0.135** (~11p) |

Most messages cost **1–5p each**. That's the number to remember.

### But Context Adds Up Fast

Here's what catches people: OpenClaw sends *context* with every message. Your SOUL.md, MEMORY.md, conversation history, tool outputs — all of that is input tokens. A typical OpenClaw turn with memory and a few tools might include:

- System prompt + AGENTS.md: ~1,500 tokens
- SOUL.md + USER.md: ~2,000 tokens
- Conversation history (last 10 messages): ~5,000 tokens
- Your actual message: ~100 tokens

That's **8,600 input tokens before Claude even reads your question**. At Sonnet rates, that's $0.026 in input alone — *every single message*.

This is why long conversations get expensive. By message 50, you might be sending 30,000+ tokens of context each turn.

---

## 2. Claude Pro vs Max Subscription: The OpenClaw Angle

Many OpenClaw users already have a Claude subscription. Here's how that plays with OpenClaw:

| | Claude Pro | Claude Max | API (Pay-as-you-go) |
|--|-----------|------------|---------------------|
| **Monthly cost** | $20/mo | $100/mo ($200 for 20x) | Usage-based |
| **Use with OpenClaw** | Via setup-token or OAuth | Via setup-token or OAuth | API key |
| **Rate limits** | Shared pool, aggressive limits | Higher limits, still shared | Dedicated, pay for what you use |
| **Reliability** | Frequent 429 rate limit errors | Better, but still hits limits | Consistent |
| **Best for** | Light personal use | Heavy personal use | Serious/always-on setups |

### The Honest Truth About Subscription Auth

Using your Claude Pro/Max subscription with OpenClaw (via setup-token) is **technically possible but frustrating**:

- **Rate limits are brutal.** You're sharing a pool with your web usage. Send 20 messages through OpenClaw and suddenly claude.ai starts throttling you.
- **Token refresh is fragile.** OAuth tokens expire. When they do, your bot goes silent until you manually re-auth. This is the #1 "my bot stopped working" complaint.
- **No usage visibility.** You can't see how many tokens OpenClaw is burning through your subscription. You're flying blind.

### When Subscription Makes Sense

- You message your bot a few times a day, casually
- You don't mind occasional rate limits
- You're already paying for Pro/Max anyway
- You're testing OpenClaw before committing to API costs

### When API Keys Win

- Your bot needs to be always-on and reliable
- You're running it on WhatsApp/Discord where others message it
- You want predictable, visible costs
- You're using tools, cron jobs, or heartbeats (these all burn tokens in the background)

**Our recommendation:** Start with your subscription to test. Switch to API keys within the first week. The reliability difference alone is worth it.

---

## 3. Hidden Costs Nobody Mentions

### 🔥 Heartbeat Token Burn

OpenClaw's heartbeat feature polls your agent every ~30 minutes. Each heartbeat:
- Sends system context + HEARTBEAT.md + recent history
- That's roughly 3,000–8,000 input tokens per heartbeat
- At Sonnet rates: **$0.01–0.03 per heartbeat**
- 48 heartbeats/day × $0.02 = **$0.96/day just for heartbeats**
- That's **~$29/month doing absolutely nothing**

Most guides don't mention this. If you enable heartbeats with email checking, calendar scanning, and proactive notifications, you can easily double that.

**Fix:** Reduce heartbeat frequency to every 2–4 hours, or disable entirely if you don't need proactive check-ins.

### 🔥 Tool Calls Are Token-Heavy

When OpenClaw uses tools (reading files, running commands, browsing the web), each tool call adds tokens:
- Tool definition in system prompt: ~500 tokens per tool
- Tool call + result: ~1,000–5,000 tokens per use
- A single "search the web and summarise" task might chain 3–4 tool calls

If your agent has 10+ tools enabled, you're paying for ~5,000 extra input tokens *every message* just for tool definitions. Even when you're asking "what time is it?"

**Fix:** Only enable the tools your agent actually needs. Strip unused skills.

### 🔥 Memory File Bloat

Your MEMORY.md and daily memory files get loaded every session. A 2,000-word MEMORY.md = ~2,700 tokens loaded on every single message. Over a month of daily use, that memory file alone costs:

- 2,700 tokens × $3/1M × 100 messages/day × 30 days = **$2.43/month** just to repeatedly read your own memory

Not huge, but it adds up. Keep memory files lean.

### 🔥 Multi-Agent Tax

Running multiple agents? Each one has its own context, memory, and system prompts. Two agents don't cost 2x — they can cost 3–4x because of routing overhead and context duplication.

### 🔥 VPS / Server Costs

OpenClaw needs to run somewhere. Options:

| Platform | Cost | Notes |
|----------|------|-------|
| Your own PC (always on) | £0 (+ electricity ~£5–10/mo) | Free but your PC must stay on |
| Raspberry Pi | £50–80 one-time | Low power, works fine for light use |
| VPS (Hetzner, DigitalOcean) | £4–10/mo | Recommended for reliability |
| AWS/GCP free tier | £0 (for 12 months) | Fine initially, costs creep up |

Most people forget to factor in hosting. If you're running OpenClaw on a VPS, add £5–8/month minimum.

### 🔥 The WhatsApp Number

If you want a dedicated WhatsApp number (recommended), you need a SIM:
- Prepaid SIM: £5–15 one-time + £5–10/month to keep active
- eSIM services: £3–8/month
- Using your personal number: Free but risky (bot might message your contacts)

---

## 4. Monthly Cost by User Type

### 🟢 Light User (~10–20 messages/day, no heartbeats)

| Cost | Monthly |
|------|---------|
| API (Sonnet, ~500 msgs) | £4–8 |
| Hosting (own PC) | £0 |
| WhatsApp SIM | £0 (personal number) |
| **Total** | **£4–8/month** |

*You ask your bot a few questions a day. Check the weather, set reminders, quick lookups. No fancy tools.*

### 🟡 Medium User (~30–50 messages/day, basic heartbeats)

| Cost | Monthly |
|------|---------|
| API (Sonnet, ~1,200 msgs) | £15–25 |
| Heartbeats (every 2h) | £5–8 |
| Hosting (VPS) | £5 |
| WhatsApp SIM | £5 |
| **Total** | **£30–43/month** |

*Daily driver. Chat throughout the day, some tool use, email checking, calendar reminders. Running on a small VPS with a dedicated WhatsApp number.*

### 🔴 Heavy User (~100+ messages/day, full automation)

| Cost | Monthly |
|------|---------|
| API (Sonnet + occasional Opus) | £40–80 |
| Heartbeats (every 30min) | £20–30 |
| Cron jobs + background tasks | £10–20 |
| Hosting (VPS) | £8 |
| WhatsApp SIM | £5 |
| Multi-channel (Discord + WA + web) | +£10–15 overhead |
| **Total** | **£80–160/month** |

*Power user. Multiple channels, coding tasks, web browsing, file management, proactive monitoring. This is a genuine AI assistant running 24/7.*

### The Uncomfortable Truth

At heavy usage, OpenClaw costs more than a Claude Max subscription ($100/mo). The trade-off is **control, customisation, and reliability** — you're not sharing rate limits, you own your data, and you can connect any channel. But it's not "free" in any meaningful sense.

---

## 5. Money-Saving Tips (That Actually Work)

### Use Haiku for Simple Tasks

Configure model aliases so routine messages use **Claude Haiku 3.5** ($0.80/$4 per 1M tokens) instead of Sonnet. That's 4x cheaper for input and 3.75x cheaper for output. Reserve Sonnet/Opus for complex tasks.

```
# In your OpenClaw config, set up model routing:
# Quick questions → Haiku
# Complex tasks → Sonnet  
# Deep analysis → Opus
```

This alone can cut your bill by 50–70%.

### Reduce Context Window Aggressively

Set `session.historyLimit` to 10–15 messages instead of the default. Each message in history costs you input tokens on every subsequent turn. Shorter history = dramatically lower costs.

### Disable or Slow Heartbeats

Change heartbeat interval from 30 minutes to 2–4 hours. Or disable heartbeats entirely and just use cron jobs for specific scheduled tasks (cron is cheaper because it runs in isolation without full conversation history).

### Trim Your Memory Files

Keep MEMORY.md under 500 words. Archive old daily memory files. Every word in your memory costs you tokens on every single message.

### Prune Unused Tools

If you don't use the browser tool, camera tool, or node control — remove them. Each tool definition adds ~500 tokens to every API call.

### Use Prompt Caching

Anthropic supports prompt caching for repeated system prompts. OpenClaw can take advantage of this — your system prompt, SOUL.md, and tool definitions get cached and charged at a reduced rate on subsequent calls. Make sure this is enabled.

### Batch Your Requests

Instead of 10 separate "what about X?" messages, send one detailed message with everything you need. One long exchange is cheaper than 10 short ones because you pay the context tax once instead of ten times.

### Consider Local Models for Simple Tasks

For basic tasks (reminders, note-taking, simple lookups), a local model via Ollama costs literally nothing to run. Use cloud models only when you need the intelligence.

---

## 6. Is Clawhatch Worth $39?

*An honest assessment.*

Clawhatch is a setup wizard that gets your OpenClaw instance running correctly in ~15 minutes. It handles the environment detection, API auth, channel configuration, security hardening, and post-setup verification that trips up most new users.

### What You're Really Paying For

Looking at the [top 20 setup problems](/docs/troubleshooting-faq), the majority are things Clawhatch automates:

- **Auth confusion** (which key? where does it go? why isn't it working?) — this alone wastes 1–3 hours for most people
- **Gateway won't start** (config invalid, mode not set, port conflict) — another 30–60 minutes of debugging
- **Security misconfiguration** (open DM policy with shell tools = your bot is a hacking target) — you might never catch this without an audit
- **WhatsApp setup** (QR scanning, number confusion, group configuration) — the single most complained-about setup experience
- **Environment issues** (wrong Node version, WSL2 not configured, PATH problems) — death by a thousand paper cuts

### The Maths

Your time has a value. Let's be conservative:

- **Average DIY setup time:** 2–6 hours (if nothing goes wrong)
- **Average "something went wrong" time:** 4–12 hours (config issues, auth confusion, security mistakes)
- **Clawhatch setup time:** ~15 minutes

If your time is worth £20/hour, spending 4 hours on DIY setup costs you £80 in time. Even at £10/hour, that's £40.

Clawhatch at $39 (~£31) pays for itself if it saves you more than 90 minutes. Based on the pain points data, it saves most people 3–8 hours.

### Who Should Buy It

- **Non-technical users** who want OpenClaw on WhatsApp without learning Linux sysadmin — **absolutely yes**
- **Busy developers** who could figure it out but value their weekend — **probably yes**
- **Experienced Linux users** who've already set up similar tools — **probably no**, the docs are good enough if you read them carefully
- **Tinkerers who enjoy the setup process** — **no**, half the fun is the journey

### Who Shouldn't

- You're comfortable with CLI tools, Node.js, and reading docs
- You enjoy debugging config files (genuinely — some people do)
- You're on a very tight budget and the £31 matters more than the 3–5 hours

### The Real Value Nobody Talks About

The security configuration alone might be worth $39. OpenClaw with default-ish settings and shell tools enabled is a **remote code execution vulnerability** if your DM policy is wrong. Clawhatch forces secure defaults — pairing mode, auth tokens for non-loopback binds, proper permission lockdown. Getting hacked because you skipped the security audit is a lot more expensive than $39.

### Verdict

**For most people setting up OpenClaw for the first time: yes, it's worth it.** Not because the setup is impossibly hard, but because there are dozens of small decisions (auth method, security policy, heartbeat config, memory settings) where the wrong choice wastes hours or costs money. Clawhatch makes the right choices automatically.

If you're the type who reads the entire Arch Wiki for fun, save your money. For everyone else, it's a fair price for a smooth start.

---

## TL;DR Cost Summary

| | Light | Medium | Heavy |
|--|-------|--------|-------|
| **Messages/day** | 10–20 | 30–50 | 100+ |
| **Monthly API cost** | £4–8 | £20–33 | £50–100+ |
| **Monthly total (all-in)** | £4–8 | £30–43 | £80–160 |
| **Best model** | Haiku | Sonnet | Sonnet + Opus |
| **Biggest hidden cost** | Context overhead | Heartbeats | Everything compounds |

**The single most impactful thing you can do to control costs:** Route simple messages to Haiku and keep your context window small. Everything else is optimisation.

---

*Have questions about your specific setup costs? Join the [OpenClaw Discord](https://discord.gg/openclaw) — we're happy to help you estimate.*
