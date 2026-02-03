# Twitter Thread: OpenClaw Setup Mistakes

---

**Tweet 1 (Hook)**

I've helped 50+ people set up OpenClaw.

Here's what everyone gets wrong 🧵

---

**Tweet 2**

❌ Mistake #1: Putting API keys in .bashrc

When OpenClaw runs as a service, it doesn't load your shell config. Your keys vanish.

✅ Put them in `~/.openclaw/.env` instead. Always works, no surprises.

---

**Tweet 3**

❌ Mistake #2: Sending the first DM and thinking it's broken

OpenClaw uses pairing by default. Your first message gets a code, not a reply.

✅ Run `openclaw pairing approve` with that code. It's security, not a bug.

---

**Tweet 4**

❌ Mistake #3: Using your personal WhatsApp number

You'll accidentally spam your contacts. Trust me.

✅ Get a cheap prepaid SIM or eSIM. Dedicated number = dedicated bot. And never use VoIP numbers — WhatsApp blocks them.

---

**Tweet 5**

❌ Mistake #4: Skipping `gateway.mode` in config

You'll get "Gateway start blocked" and wonder why nothing works.

✅ Run `openclaw configure` or set `gateway.mode=local`. One line saves an hour of debugging.

---

**Tweet 6**

❌ Mistake #5: Running Node 18 and hoping for the best

OpenClaw needs Node 22+. Old Node = silent failures.

Also: don't use Bun for WhatsApp or Telegram channels. It breaks things.

✅ `node -v` first. Always.

---

**Tweet 7**

❌ Mistake #6: Leaving dmPolicy on "open" with tools enabled

This means anyone can DM your bot and execute shell commands on your machine. Yes, really.

✅ Run `openclaw security audit --fix`. Use "pairing" or "allowlist" mode. Non-negotiable.

---

**Tweet 8**

❌ Mistake #7: Exposing the gateway on your LAN without an auth token

Binding to 0.0.0.0 with no token = anyone on your network controls your bot.

✅ Set `gateway.auth.token` or use Tailscale. Takes 30 seconds.

---

**Tweet 9 (Summary)**

TL;DR:
→ Keys in .env, not .bashrc
→ Pairing codes aren't bugs
→ Dedicated WhatsApp number
→ Set gateway.mode
→ Node 22+
→ Lock down dmPolicy
→ Auth token on LAN

Get these right and you skip 90% of first-week headaches.

---

**Tweet 10 (CTA)**

Setting up OpenClaw this weekend?

Bookmark this thread. You'll thank me on tweet #6.

And if you're stuck, `openclaw doctor` catches most of these automatically. Start there.

---
