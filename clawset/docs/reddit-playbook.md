# Reddit Engagement Playbook — Clawhatch

*Goal: Become the recognized OpenClaw setup expert on Reddit within 2 weeks.*
*Created: 2025-07-13*

---

## 1. Search Terms to Monitor

Set up alerts (Reddit search, Gummysearch, or manual daily sweeps) for these terms:

### Primary (high intent — these people need help NOW)
- `openclaw setup`
- `openclaw install`
- `openclaw error`
- `openclaw help`
- `clawdbot help`
- `clawdbot setup`
- `openclaw not working`
- `openclaw gateway`
- `openclaw whatsapp`
- `openclaw windows`
- `openclaw WSL`
- `openclaw API key`
- `openclaw node version`
- `openclaw docker`
- `openclaw config`
- `openclaw pairing`
- `"wake up my friend" openclaw`
- `openclaw QR code`
- `openclaw telegram`
- `openclaw discord bot`

### Secondary (broader discovery — people exploring the space)
- `self-hosted AI assistant`
- `run claude locally`
- `whatsapp AI bot`
- `telegram AI bot setup`
- `AI assistant self-hosted`
- `local LLM assistant`
- `claude API setup`
- `anthropic API key how`
- `AI chatbot raspberry pi`
- `moltbot`

### Negative/Competitor Awareness
- `openclaw alternative`
- `openclaw vs`
- `typingmind setup`
- `librechat setup`
- `open-webui setup`

---

## 2. Template Responses — Top 10 Pain Points

Each template is a *starting point*. Always personalise to the specific post. Never copy-paste verbatim — Reddit detects and punishes that.

---

### T1. "My bot doesn't reply to DMs / first message gets no response"

**Root cause:** DM pairing (E2) — the #1 confusion point.

> That's the pairing system working as intended — it's a security feature, not a bug! When someone messages your bot for the first time, it generates a pairing code that you (the owner) need to approve.
>
> Run this on your server:
> ```
> openclaw pairing approve <channel> <code>
> ```
> After that, messages from that person will go through. If you want to pre-approve yourself as owner during setup, you can do that during `openclaw configure`.
>
> The alternative is setting `dmPolicy: "allowlist"` and adding your user ID, but pairing is the recommended approach since it's more flexible.

---

### T2. "No API key found for provider 'anthropic'" / Auth confusion

**Root cause:** B1/B3 — auth not configured or wrong method used.

> This trips up almost everyone. OpenClaw has several auth methods and it's easy to pick the wrong one. Here's the simplest path:
>
> 1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
> 2. Run: `openclaw models auth setup-token --provider anthropic`
> 3. Paste your key when prompted
> 4. Verify with: `openclaw models status`
>
> **Important:** If you're running as a service (systemd/launchd), don't put the key in `.bashrc` — the service won't see it. Put it in `~/.openclaw/.env` instead.
>
> If you created additional agents, they don't inherit keys automatically — you need to copy `auth-profiles.json` or re-run auth setup per agent.

---

### T3. "Onboarding stuck on 'wake up my friend' / won't hatch"

**Root cause:** A1 — first-run hatch failure.

> The hatching phase needs a working model connection + correct Node version. Before retrying:
>
> 1. Check Node: `node --version` (needs 22+)
> 2. Check model auth: `openclaw models status` (needs at least one green provider)
> 3. Check network: can you reach api.anthropic.com from your server?
> 4. Run `openclaw doctor` — it'll flag exactly what's wrong
>
> If all that checks out, restart the gateway and try again. The hatch is basically the first model call + config write, so it's almost always an auth or connectivity issue.

---

### T4. "Windows: 'openclaw not recognized' / 'git not found'"

**Root cause:** A2/A3 — Windows PATH and WSL issues.

> Windows setup has a few gotchas. The recommended path:
>
> 1. Install WSL2: `wsl --install` (PowerShell as admin)
> 2. Enable systemd: edit `/etc/wsl.conf` inside WSL, add `[boot]\nsystemd=true`
> 3. `wsl --shutdown` then reopen WSL
> 4. Install Node 22+ inside WSL (use nvm)
> 5. Install OpenClaw inside WSL
>
> Don't try to run it natively on Windows — WSL2 is the supported path. If you're hitting PATH issues, it's usually because Git or Node were installed on the Windows side but you're running commands in WSL (or vice versa).

---

### T5. "WhatsApp keeps disconnecting / QR code needed again"

**Root cause:** C1/C2 — Baileys session fragility.

> WhatsApp connections via Baileys (which is what OpenClaw uses under the hood) are inherently a bit fragile — it's an unofficial API reverse-engineering WhatsApp Web.
>
> Things that help:
> - Keep the gateway running 24/7 (don't stop/start frequently)
> - Don't open WhatsApp Web on the same number simultaneously
> - Make sure your `creds.json` isn't getting corrupted (there's an auto-backup)
> - After a disconnect, `openclaw channels login` to rescan the QR
> - Check `openclaw status --deep` for the disconnect reason
>
> If you're getting frequent disconnects, consider using a dedicated prepaid SIM/eSIM for the bot — keeps it isolated from your personal WhatsApp.

---

### T6. "Gateway won't start / configuration invalid"

**Root cause:** D1/D2 — missing gateway.mode or config errors.

> Two common causes:
>
> **1. gateway.mode not set:**
> ```
> openclaw config set gateway.mode local
> ```
> or re-run `openclaw configure` which sets it automatically.
>
> **2. Invalid config:**
> ```
> openclaw doctor --fix
> ```
> This validates your config and fixes common issues. The config format is strict — unknown keys or wrong types will block startup.
>
> Also check `openclaw gateway status` to make sure there isn't already an instance running (port 18789 conflict).

---

### T7. "Env vars / API keys disappear when running as service"

**Root cause:** B6/B7 — service doesn't inherit shell environment.

> Classic gotcha. When OpenClaw runs as a systemd service, it doesn't load your `.bashrc` or `.zshrc`, so any env vars you set there are invisible to the service.
>
> The fix: put everything in `~/.openclaw/.env`:
> ```
> ANTHROPIC_API_KEY=sk-ant-...
> ```
> Then restart the service. This is the officially supported way — shell env is convenient for CLI testing but unreliable for services.

---

### T8. "Node version too old" / Build errors

**Root cause:** A4/A6 — wrong Node version or build issues.

> OpenClaw needs Node 22+. Check with `node --version`.
>
> Easiest fix:
> ```bash
> # Install nvm if you don't have it
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
> source ~/.bashrc
> nvm install 22
> nvm use 22
> ```
>
> Also: don't use Bun for WhatsApp or Telegram channels — there are known incompatibilities. Stick with Node.
>
> If you're building from source and hitting pnpm errors, make sure you run `pnpm ui:build` before `pnpm build`.

---

### T9. "WhatsApp: personal number vs dedicated number / selfChatMode"

**Root cause:** C4 — personal vs dedicated number confusion.

> Two approaches:
>
> **Dedicated number (recommended):** Get a cheap prepaid SIM or eSIM, set it up as a separate WhatsApp account. The bot owns that number entirely. Other people message it to talk to your AI. Clean and simple.
>
> **Personal number with selfChatMode:** You chat with your own bot by messaging yourself. Enable `selfChatMode` in your WhatsApp channel config. Works but is a bit quirky — you're essentially talking to yourself in WhatsApp's UI.
>
> Avoid VoIP numbers (Google Voice, TextNow) — WhatsApp blocks them.

---

### T10. "Security: is my bot safe? / open to the internet"

**Root cause:** F1/F2 — open dmPolicy or exposed gateway.

> Run this first:
> ```
> openclaw security audit --fix
> ```
> It'll flag and fix the most common issues.
>
> Key things to check:
> - `dmPolicy` should be `pairing` or `allowlist`, never `open` (anyone could run shell commands through your bot)
> - If `gateway.bind` is anything other than `127.0.0.1`, you MUST set `gateway.auth.token`
> - Keep `logging.redactSensitive` on (default)
> - Lock permissions on `~/.openclaw` directory
>
> If you want remote access, Tailscale is the recommended approach — it gives you HTTPS + access control without exposing ports.

---

## 3. When to Mention Clawhatch vs. Just Help for Free

### Always Help First — Mention Service Only When It Fits

**The 90/10 Rule:** 90% of your comments should be pure, genuine help with zero mention of Clawhatch. 10% can softly reference it when organically relevant.

### NEVER mention Clawhatch when:
- Someone has a simple question with a clear answer
- They're troubleshooting a specific error (just fix it)
- The thread already has a good answer
- You'd be the first reply (looks spammy)
- The subreddit has strict self-promotion rules

### Soft mention is OK when:
- Someone says "I gave up on setting this up" or "this is too complicated"
- Someone asks "is there a managed version?" or "I don't want to self-host"
- Someone lists 5+ problems they've hit (your response fixes all of them, then you mention "if you'd rather skip all this...")
- You've already built rapport with the poster (multiple helpful exchanges)
- Someone explicitly asks for paid setup help or consulting

### How to mention it (when appropriate):
> *"Full disclosure, I also run a setup service for OpenClaw (clawhatch.com) — but honestly your issue is just [fix]. Happy to help either way."*

or:

> *"If you'd rather skip the setup entirely, there are managed options out there (I run one at clawhatch.com), but if you want to DIY it, here's exactly what to do: [detailed fix]"*

### The golden rule:
**Would this comment be valuable if Clawhatch didn't exist?** If yes, post it. If the only point of the comment is to promote Clawhatch, don't.

---

## 4. Karma-Building Strategy

### Week 1: Establish Presence (Days 1–7)

**Daily targets:**
- 3–5 helpful comments on OpenClaw / self-hosted AI threads
- 2–3 comments on general sysadmin/homelab/selfhosted threads (broader karma)
- 1 upvoted comment in a popular thread (find rising posts early)

**Content to post:**
- Answer every unanswered OpenClaw question you find (even old ones — Google indexes Reddit)
- Share quick tips as standalone posts: "PSA: OpenClaw on Windows? Here's the 5-minute WSL setup"
- Comment on adjacent topics: self-hosted AI, Claude API tips, WhatsApp bot development

**Karma boosters:**
- Sort by New in target subreddits — be first to answer
- Write detailed answers with code blocks and steps (Reddit rewards effort)
- Use formatting: headers, bullet points, code blocks
- Reply to your own top-level answers with follow-up tips (shows depth)

### Week 2: Become the Go-To (Days 8–14)

**Level up:**
- Post a "Complete Guide to OpenClaw Setup" tutorial (consolidate your best answers)
- Cross-post to relevant subreddits with tailored intros
- Start a "Weekly OpenClaw Help Thread" if mods allow
- Comment on GitHub issues with Reddit cross-references
- Help in Discord/forums and reference your Reddit posts

**Engagement patterns:**
- Reply to every response on your posts (build threads)
- Thank people who upvote with additional info
- Update old answers when you discover better solutions
- Link between your answers ("I covered this in detail here: [link]")

### Ongoing Metrics to Track:
| Metric | Week 1 Target | Week 2 Target |
|--------|--------------|--------------|
| Comments posted | 25+ | 25+ |
| Posts created | 2–3 | 3–5 |
| Comment karma (new) | 100+ | 300+ |
| "Helpful" replies received | 5+ | 15+ |
| DMs asking for help | 1–2 | 5+ |

---

## 5. Subreddit Priority List

### Tier 1 — Primary (check daily)
| Subreddit | Why | Content Angle |
|-----------|-----|--------------|
| r/selfhosted | Core audience. Self-hosters love OpenClaw. | Setup guides, troubleshooting, comparisons |
| r/LocalLLaMA | AI enthusiasts running models locally | Claude API tips, model config, performance |
| r/ChatGPT | Massive audience exploring AI assistants | "Here's how to self-host your own" angle |
| r/homelab | Overlaps with self-hosted, loves projects | Hardware requirements, Docker, always-on setup |

### Tier 2 — High Value (check every 2 days)
| Subreddit | Why | Content Angle |
|-----------|-----|--------------|
| r/artificial | Broader AI discussion | Self-hosted AI assistants as a concept |
| r/raspberry_pi | OpenClaw runs on Pi — niche but passionate | Pi-specific setup guides |
| r/node | Node.js community, relevant for troubleshooting | Node version issues, pnpm, build tips |
| r/Telegram | Telegram bot developers | Bot setup, channel config |
| r/whatsapp | WhatsApp automation seekers | WhatsApp bot setup (carefully — sub may restrict) |

### Tier 3 — Opportunistic (check weekly / search-driven)
| Subreddit | Why | Content Angle |
|-----------|-----|--------------|
| r/linux | WSL, systemd, service management | Linux-specific OpenClaw tips |
| r/sysadmin | Professional admins | Security, service management, production setup |
| r/windows | WSL2 setup help | Windows+WSL guide |
| r/tailscale | Remote access for OpenClaw | Tailscale + OpenClaw gateway guide |
| r/privacy | Self-hosting for privacy | "Own your AI conversations" angle |
| r/automation | Workflow automation | OpenClaw cron, multi-agent, integrations |
| r/discord_bots | Discord bot developers | OpenClaw Discord channel setup |

### Subreddit Rules to Watch:
- **r/selfhosted** — Self-promotion allowed if you're helpful (10% rule)
- **r/ChatGPT** — No direct advertising; educational posts fine
- **r/homelab** — Loves detailed builds; no low-effort promo
- **r/LocalLLaMA** — Technical audience; substance over marketing

---

## Appendix: Daily Routine Checklist

```
□ Search all Tier 1 subreddits for primary search terms
□ Check Reddit inbox for replies to previous answers
□ Answer 3–5 OpenClaw questions (pure help, no promo)
□ Post 1–2 helpful comments in adjacent threads
□ Check if any old answers need updating
□ Log karma gained and notable interactions
□ (If applicable) Softly mention Clawhatch in 1 thread max
```

---

*Review and update this playbook weekly based on what's working.*
