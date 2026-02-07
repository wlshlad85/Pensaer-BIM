# Twitter Lead Monitoring Playbook — Clawhatch

*Generated: 2025-07-18*

---

## 1. Search Query List

Run these searches daily on Twitter/X. Mix exact error strings with natural-language frustration signals.

### Exact Error Messages & Technical Queries

```
"No API key found for provider" openclaw
"wake up my friend" openclaw stuck
"gateway start blocked" openclaw
"openclaw not recognized" OR "git not found" wsl
"All models failed" openclaw
"rate_limit_error" openclaw anthropic
"configuration invalid" openclaw gateway
"port 18789 already in use"
"DM pairing" openclaw OR clawdbot
"WhatsApp not linked" openclaw OR baileys
"context too large" openclaw
"oauth token refresh failed" anthropic openclaw
```

### Natural-Language Frustration Queries

```
openclaw setup stuck
openclaw won't start
openclaw WhatsApp disconnects
openclaw "no reply" OR "not responding"
openclaw windows wsl2 help
"self hosted AI assistant" setup problems
openclaw "first message" nothing happens
baileys WhatsApp bot disconnecting
openclaw API key confused
openclaw config "not working"
```

### Competitor / Category Awareness

```
"AI assistant" self-hosted frustrated
"personal AI" WhatsApp setup hard
"AI butler" setup nightmare
"local AI agent" setup help
"claude API" WhatsApp bot
typingmind OR jan.ai OR openwebui setup frustrated
```

### Buying-Intent Signals

```
"wish someone would just set up" AI assistant
"pay someone" AI agent setup
"too complicated" self-hosted AI
"just want it to work" AI assistant
"don't have time" AI setup
```

---

## 2. Reply Templates — Top 10 Issues

**Rules:** Lead with help. No pitch in first reply. Sign off with name only — let them find Clawhatch if they check your profile.

---

### 1. Onboarding stuck / "wake up my friend" hangs

> That usually means a pre-flight check failed silently. Quick fix:
>
> 1. Run `openclaw doctor` — it'll flag the blocker
> 2. Check you're on Node 22+ (`node -v`)
> 3. Make sure your API key is actually loaded: `openclaw models status`
>
> 9 times out of 10 it's the API key not being set in the right place (shell env vs .env file). Happy to help if doctor shows something weird.

---

### 2. "No API key found" / auth confusion

> This one trips up almost everyone. The key thing: if you're running as a service, env vars from your shell (~/.bashrc) won't be there.
>
> Put your key in `~/.openclaw/.env` instead:
> ```
> ANTHROPIC_API_KEY=sk-ant-...
> ```
>
> Then restart the gateway. `openclaw models status` should show green after that.

---

### 3. DM pairing — first message gets no reply

> That's actually working as designed (security feature) — it just looks broken. When you DM the bot for the first time it generates a pairing code.
>
> Check your terminal/logs for the code, then run:
> ```
> openclaw pairing approve <channel> <code>
> ```
>
> After that it'll reply normally. The docs could definitely make this clearer tbh.

---

### 4. WhatsApp disconnects / QR re-login

> Baileys (the WhatsApp library) is unfortunately fragile here. A few things that help:
>
> - Use a dedicated phone number (not your personal one)
> - Keep your phone on WiFi and connected
> - If it disconnects, `openclaw channels login` to rescan the QR
> - Set reconnect.maxAttempts higher in your config
>
> It's the most common pain point with WA bots in general, not just OpenClaw.

---

### 5. Windows: "openclaw not recognized" / PATH issues

> Classic Windows PATH issue. Two options:
>
> **Option A (recommended):** Use WSL2 instead of native Windows
> ```
> wsl --install
> ```
> Then install OpenClaw inside the Linux environment.
>
> **Option B:** Add Git + Node to your Windows PATH manually. Open System → Environment Variables → edit PATH → add the install directories.
>
> WSL2 is genuinely less painful long-term.

---

### 6. Gateway won't start / config invalid

> Two common causes:
>
> 1. **Mode not set:** `openclaw config set gateway.mode local`
> 2. **Bad config:** Run `openclaw doctor --fix` — it'll find and repair invalid entries
>
> Check `openclaw gateway status` after to confirm it's actually running. The gateway is picky about config format.

---

### 7. WhatsApp group messages not triggering

> Groups need explicit setup — the bot won't respond in groups by default (security).
>
> 1. Find your group JID: check OpenClaw CLI for a group list command
> 2. Add it to your allowlist in config
> 3. Set the activation mode (mention-only is usually best for groups)
>
> After that, @mentioning the bot in the group should work.

---

### 8. Env vars disappear when running as service

> This catches everyone. The systemd service runs with a clean environment — it never loads your .bashrc/.zshrc.
>
> Move everything to `~/.openclaw/.env`:
> ```
> ANTHROPIC_API_KEY=sk-ant-...
> COPILOT_GITHUB_TOKEN=ghp_...
> ```
>
> Then `openclaw gateway restart`. This is the #1 gotcha in the OpenClaw ecosystem imo.

---

### 9. WSL2 not installed / systemd not enabled

> OpenClaw on Windows needs WSL2 with systemd. Quick setup:
>
> ```
> wsl --install
> ```
>
> Then enable systemd in WSL:
> ```
> sudo nano /etc/wsl.conf
> # Add:
> [boot]
> systemd=true
> ```
>
> Save, then `wsl --shutdown` from PowerShell and reopen. Most Windows issues disappear after this.

---

### 10. Rate limiting (429 errors) with Anthropic

> If you're using Claude subscription auth (not API key), you share a rate limit pool with everyone else. That's what causes the 429s.
>
> The fix is switching to an API key — you get your own dedicated rate limit:
> ```
> openclaw models auth setup-token --provider anthropic
> ```
>
> API keys cost per-use but the reliability improvement is night and day.

---

## 3. Decision Tree: Free Help vs Mention Paid

```
Someone tweets about an OpenClaw / AI assistant setup problem
│
├─ Can I solve it in 1-2 tweets?
│   ├─ YES → Help for free. Full solution. No pitch.
│   │         (builds trust + reputation, they'll check your profile)
│   │
│   └─ NO → Is it a config/technical issue?
│       ├─ YES → Give the diagnostic steps (openclaw doctor, etc.)
│       │         If they come back still stuck after 2-3 exchanges:
│       │         "Happy to jump on a quick call if you want — 
│       │          I do this setup stuff professionally. DM me."
│       │
│       └─ NO → Is it a "wish someone would do this for me" signal?
│               ├─ YES → "I actually help people set this up — 
│               │         DM me if you want, no pressure."
│               │         (ONE mention, then drop it)
│               │
│               └─ NO → Help freely, move on.
│
├─ Are they comparing tools / asking what to use?
│   ├─ Give honest comparison. Mention OpenClaw strengths AND weaknesses.
│   │   Only mention Clawhatch if setup complexity is their stated concern.
│   │
│   └─ Never trash competitors.
│
└─ Are they already a Clawhatch customer?
    └─ Priority support. Fast, thorough, public reply + DM for details.
```

### Hard Rules

| Rule | Why |
|------|-----|
| **Never pitch in the first reply** | Kills trust instantly |
| **Max 1 soft mention of paid services per thread** | More = spam |
| **If they say "no thanks" → drop it immediately** | Respect > revenue |
| **Always be genuinely helpful even if they'll never buy** | Long game wins |
| **Never DM first without permission** | Creepy + against Twitter norms |
| **Credit OpenClaw docs when applicable** | Shows good faith to OSS community |

---

## 4. Lead Tracking Spreadsheet Template

Use this as column headers in a Google Sheet or CSV:

| Column | Description | Example |
|--------|-------------|---------|
| **Date** | When you found the tweet | 2025-07-18 |
| **Handle** | Twitter username | @frustrated_dev |
| **Tweet URL** | Link to the tweet | https://x.com/... |
| **Problem Category** | From pain-points list (A1-H4) | B1 — No API key |
| **Pain Level** | 🟢 Mild / 🟡 Frustrated / 🔴 Angry | 🟡 |
| **Buying Intent** | None / Low / Medium / High | Medium |
| **Our Reply** | What we said | Gave .env fix |
| **Reply Date** | When we replied | 2025-07-18 |
| **Response?** | Did they reply back? Y/N/Pending | Y |
| **Outcome** | Helped / DM opened / Booked call / Customer / Dead | DM opened |
| **Follow-up Date** | When to check back | 2025-07-25 |
| **Notes** | Anything relevant | Has 3 bots, wants managed setup |

### Buying Intent Signals Cheat Sheet

| Signal | Intent Level |
|--------|-------------|
| "How do I fix X?" | None — just wants help |
| "This is so frustrating" + technical | Low — might want help later |
| "Wish someone would just do this" | **High** |
| "Anyone know a service that..." | **High** |
| "I don't have time for this" | Medium-High |
| "Is there a managed version?" | **Very High** |
| Founder/exec posting about AI setup | Medium (budget likely exists) |

---

## 5. Daily Routine Checklist

### Morning (15 min) ☀️

- [ ] Run all search queries from Section 1 (use Twitter/X advanced search or TweetDeck columns)
- [ ] Scan results from last 24h — skip anything already replied to
- [ ] Reply to 3-5 threads where you can genuinely help
- [ ] Log new leads in tracking sheet
- [ ] Check DMs for replies to yesterday's threads

### Midday (5 min) 🌤️

- [ ] Quick scan of notifications — anyone reply to your help?
- [ ] Follow up on open threads (give more help if needed)
- [ ] Check "buying intent" searches specifically

### Evening (10 min) 🌙

- [ ] Final scan of the day's new tweets
- [ ] Update tracking sheet: outcomes, follow-up dates
- [ ] Queue any follow-ups for tomorrow
- [ ] Note which search queries produced best results this week

### Weekly Review (Friday, 15 min) 📊

- [ ] How many leads found this week?
- [ ] How many DMs opened?
- [ ] How many converted to calls/customers?
- [ ] Which problem categories appear most? (feed back to product)
- [ ] Any new error messages / pain points to add to search queries?
- [ ] Update search queries based on what's working

### Monthly (30 min)

- [ ] Review conversion funnel: tweets seen → replied → DM → call → customer
- [ ] Calculate rough CAC from time invested
- [ ] Identify top 3 pain points driving leads — feed to Clawhatch messaging
- [ ] Archive dead leads, refresh tracking sheet
- [ ] Update reply templates based on what resonated

---

## Appendix: Twitter/X Search Tips

- Use `min_faves:0` to find low-engagement tweets (less competition to help)
- `lang:en` to filter language
- `-filter:replies` to find original posts (not buried in threads)
- Save searches as TweetDeck columns for one-glance monitoring
- Best posting times for developer audience: 9-11am and 2-4pm EST weekdays
- Engage with the OpenClaw community genuinely (not just when leads appear)
