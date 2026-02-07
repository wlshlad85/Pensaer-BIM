# Clawhatch Setup Wizard — Complete UX Design

> **Version:** 1.0 — 2 Feb 2026  
> **Design philosophy:** Vercel's auto-detection meets TurboTax's guided experience. Under 10 minutes, zero dead ends.  
> **Core principle:** Every question we eliminate is a user we keep. Auto-detect everything, defer everything non-essential.

---

## Table of Contents

1. [Multi-Step Wizard Flow](#1-multi-step-wizard-flow)
2. [Intake Form Fields](#2-intake-form-fields)
3. [Error States & Recovery Paths](#3-error-states--recovery-paths)
4. [Post-Setup Handoff Checklist](#4-post-setup-handoff-checklist)
5. [Follow-Up Email Sequence](#5-follow-up-email-sequence)

---

## 1. Multi-Step Wizard Flow

### Overview

```
Landing → OS Detection → Channels → Model & Auth → Personalize → Payment Gate → Script Generation → Download & Install → Connect Channels → Health Check → Launch
```

**11 screens. 8-10 minutes. Zero terminal knowledge required for happy path.**

### Progress Stepper

- Horizontal pill stepper, fixed top: **Setup → Channels → Model → Personalize → Plan → Install → Configure → Connect → Verify → Launch**
- Current = filled accent, completed = ✅ green, future = gray outline
- Completed steps are clickable (preserves all state)
- Mobile: collapses to "Step 3 of 10" + mini progress bar
- All state persisted to `localStorage` + URL params (resume on browser close)

### Global Components (every screen)

| Component | Behaviour |
|-----------|-----------|
| **"Need help?" pill** | Bottom-right floating. Opens drawer: Discord link, FAQ, email — pre-fills current step context |
| **Inline errors** | Red border + shake + message below field. Always actionable: "X failed because Y. Try Z." |
| **Toast errors** | Top-center, 5s auto-dismiss, "Details" expand |
| **Blocking errors** | Red-left-border card with icon + suggested fix |
| **Loading states** | Skeleton shimmer for content; spinner + verb for actions ("Verifying…", "Generating…") |
| **Tooltips** | `ⓘ` next to any jargon. Hover/tap popover, 1-2 sentences + optional "Learn more →" |
| **Transitions** | 300ms fade + 20px slide-up (Framer Motion). Confetti on step completion. |

---

### Screen 1: Landing Page

**URL:** `/`  |  **Target time:** 30s  |  **Pain points addressed:** None (entry point)

```
┌─────────────────────────────────────────────┐
│  [Logo]                    [Docs] [GitHub ★] │
│                                              │
│   Your AI assistant,                         │
│   running on your machine.                   │
│   Private. Personal. Powerful.               │
│                                              │
│   [ Get Started — Free ]                     │
│   "Takes under 10 minutes"                   │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐               │
│  │ Free │  │ Pro  │  │ Team │               │
│  └──────┘  └──────┘  └──────┘               │
│                                              │
│  Social proof: stars, testimonials, logos     │
└─────────────────────────────────────────────┘
```

**Inputs:** None  
**CTA:** "Get Started — Free" → Screen 2  
**Mobile:** Pricing tiers stack vertically; CTA becomes sticky bottom bar

---

### Screen 2: OS Detection

**URL:** `/setup/os`  |  **Target time:** 20s (no WSL) / 5min (WSL install)  
**Pain points addressed:** A2, A3, A4, H1–H4

```
┌─────────────────────────────────────────────┐
│  We detected you're on:                      │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ ● macOS │  │  Linux  │  │ Windows │     │
│  │  (auto) │  │         │  │         │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│  "Not right? Click to change."               │
│                                              │
│  [Continue →]                                │
└─────────────────────────────────────────────┘
```

**Auto-detection:** User-Agent sniffing. Pre-selects OS card with "(detected)" badge.

**Windows sub-flow (inline expand):**
- Check: "Do you have WSL2 installed?"
- If no → show PowerShell command: `wsl --install` + copy button + "Restart and come back"
- If yes → "Do you have systemd enabled?" → show `/etc/wsl.conf` edit
- "I've done this, continue →" (self-report — not blocking)

**Raspberry Pi / ARM detection:** If Linux + ARM User-Agent → show performance warning card

**What we auto-detect and store:** `{ os, arch, hasWSL (self-report), nodeVersion (later) }`

---

### Screen 3: Choose Channels

**URL:** `/setup/channels`  |  **Target time:** 30s  
**Pain points addressed:** C3, C4 (number guidance), E2 (pairing preview)

```
┌─────────────────────────────────────────────┐
│  Where should your assistant live?           │
│  Select one or more.                         │
│                                              │
│  ┌────────────┐  ┌────────────┐             │
│  │ 💬 WhatsApp│  │ ✈️ Telegram│             │
│  │ Most       │  │ Free, easy │             │
│  │ popular    │  │ Best for   │             │
│  │            │  │ power users│             │
│  └────────────┘  └────────────┘             │
│  ┌────────────┐  ┌────────────┐             │
│  │ 🎮 Discord │  │ 📱 Signal  │             │
│  │ Great for  │  │ Privacy    │             │
│  │ communities│  │ focused    │             │
│  └────────────┘  └────────────┘             │
│  ┌────────────┐                              │
│  │ 🍎 iMessage│ ← grayed if OS ≠ macOS     │
│  └────────────┘                              │
│                                              │
│  ⓘ You can always add more later.           │
│  "2 channels selected"                       │
│  [Continue →]                                │
└─────────────────────────────────────────────┘
```

**Validation:** ≥1 channel required. Continue disabled until selection.  
**iMessage:** Disabled + tooltip if OS ≠ macOS  
**Signal:** Shows "(~5 extra minutes setup)" badge  

**WhatsApp sub-question (inline, appears on select):**
> "Will you use a **dedicated phone number** (recommended) or your **personal number**?"
> - Dedicated: "Best experience. Get a cheap prepaid/eSIM. ⓘ Why?"
> - Personal: "Works, but needs selfChatMode. We'll configure it."
> - ⚠️ "Don't use VoIP numbers (Google Voice, TextNow) — WhatsApp blocks them."

This solves pain points C3 and C4 at selection time, not troubleshooting time.

---

### Screen 4: Choose Model & Auth

**URL:** `/setup/model`  |  **Target time:** 45s  
**Pain points addressed:** B1, B2, B3, B4, B5 — THE critical auth screen

**Design principle:** Present ONE recommended path. Hide complexity. No OAuth/setup-token/subscription confusion.

```
┌─────────────────────────────────────────────┐
│  Which AI powers your assistant?             │
│                                              │
│  ┌────────────────────────────────────┐      │
│  │ ⭐ Claude (Recommended)            │      │
│  │ Best reasoning · Most capable      │      │
│  │ ● Selected                         │      │
│  └────────────────────────────────────┘      │
│  ┌────────────────────────────────────┐      │
│  │ GPT-4o · Fast all-rounder          │      │
│  └────────────────────────────────────┘      │
│  ┌────────────────────────────────────┐      │
│  │ Other (Ollama, Groq, etc.)         │      │
│  └────────────────────────────────────┘      │
│                                              │
│  ── API Key ───────────────────────────      │
│  │ sk-ant-...                    [👁] │      │
│  ──────────────────────────────────────      │
│  🔒 Stored locally in ~/.openclaw/.env       │
│     Never sent to our servers.               │
│                                              │
│  Don't have one? [Get a Claude API key →]    │
│  ┌ Inline accordion: 4-step guide ─────┐    │
│  │ 1. Go to console.anthropic.com      │    │
│  │ 2. Create account / sign in         │    │
│  │ 3. API Keys → Create Key            │    │
│  │ 4. Copy and paste above             │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  [ Verify & Continue → ]                     │
└─────────────────────────────────────────────┘
```

**Key decisions solving B3 confusion:**
- We ONLY ask for API keys. No OAuth flow, no setup-token, no subscription auth.
- One input field. One path. Wizard writes key to `~/.openclaw/.env` (solves B6 — env vars lost as service).
- Format validation: Claude = `sk-ant-*`, OpenAI = `sk-*`, Other = non-empty
- Optional live verification: test API call with spinner → "Key verified ✓" or "Couldn't verify — continue anyway?"

**Why API key only:** OAuth tokens expire (B2), subscription auth rate-limits (B5), setup-tokens confuse (B3). API keys are the most reliable path. We can document alternatives in docs for power users.

---

### Screen 5: Personalize

**URL:** `/setup/personalize`  |  **Target time:** 45s  
**Pain points addressed:** E3 (heartbeat config), G1 (memory defaults)

```
┌─────────────────────────────────────────────┐
│  Make it yours.                              │
│                                              │
│  Your name:     [ Richard          ]         │
│  Assistant name: [ Clawd           ] (default)│
│                                              │
│  Personality:                                │
│  [🏢 Pro] [😊 Friendly●] [🔧 Technical] [✏️ Custom]│
│                                              │
│  Timezone: [ Europe/London (detected) ▼ ]    │
│                                              │
│  ┌─ Preview ─────────────────────────┐       │
│  │ 🤖 "Hey Richard! I'm Clawd,      │       │
│  │    your friendly AI assistant.    │       │
│  │    What can I help with?"         │       │
│  └───────────────────────────────────┘       │
│  ↑ Updates live as you type                  │
│                                              │
│  [Continue →]                                │
└─────────────────────────────────────────────┘
```

**Inputs:** Name (required), assistant name (pre-filled), personality (4 presets + custom textarea), timezone (auto-detected)  
**Custom personality:** Textarea, 500 chars, placeholder: "e.g., Speak like a pirate who's also a financial advisor"  
**Behind the scenes:** This screen also sets sensible defaults for heartbeat interval, session history limits (G2, G7), and memory config (G1) — user doesn't see these but they're written to config.

---

### Screen 6: Payment Gate

**URL:** `/setup/plan`  |  **Target time:** 15s  
**Pain points addressed:** None (revenue)

```
┌─────────────────────────────────────────────┐
│  Choose your plan.                           │
│                                              │
│  ┌──────────────┐  ┌──────────────────┐     │
│  │ Free · $0    │  │ ⭐ Pro · $29/mo  │     │
│  │              │  │                  │     │
│  │ 1 channel    │  │ All channels     │     │
│  │ 1 model      │  │ Multi-model      │     │
│  │ Community    │  │ Priority support │     │
│  │ support      │  │ Auto-updates     │     │
│  │              │  │ Voice mode       │     │
│  │              │  │ 14-day free trial│     │
│  │              │  │                  │     │
│  │ [Continue    │  │ [Start Free     │     │
│  │  with Free]  │  │  Trial →]       │     │
│  └──────────────┘  └──────────────────┘     │
│                                              │
│  Both buttons equally prominent.             │
│  No dark patterns. No countdown timers.      │
└─────────────────────────────────────────────┘
```

**Design rules:**
- Free path = instant, no friction, no guilt text
- Pro trial = Stripe Checkout redirect → return to wizard (state preserved via localStorage)
- If payment fails → graceful fallback to free with "Try again later" note
- If user chose free, don't ask again for 30 days (stored preference)
- Free path proceeds to install immediately; Pro trial handles payment async

---

### Screen 7: Script Generation & Download

**URL:** `/setup/install`  |  **Target time:** 2min  
**Pain points addressed:** A1, A2, A4, A5, A6

The wizard generates a **personalized install command** based on all previous choices.

```
┌─────────────────────────────────────────────┐
│  Let's install OpenClaw.                     │
│                                              │
│  1️⃣ Open your terminal                       │
│     ⓘ [How to open a terminal →]             │
│                                              │
│  2️⃣ Paste this command:                      │
│  ┌────────────────────────────────────┐      │
│  │ curl -fsSL https://clawhatch.sh/  │      │
│  │ install?c=wa,tg&m=claude | bash   │      │
│  │                            [📋]   │      │
│  └────────────────────────────────────┘      │
│  "📋 Copied!" (2s revert)                   │
│                                              │
│  This command will:                          │
│  • Install OpenClaw + dependencies           │
│  • Check Node ≥22 (install if needed)        │
│  • Write your config to ~/.openclaw/         │
│  • Set up the gateway service                │
│                                              │
│  ── What to expect (animated terminal) ──    │
│  ┌────────────────────────────────────┐      │
│  │ $ curl -fsSL ... | bash            │      │
│  │ ✓ Node 24.8.0 detected             │ anim │
│  │ ✓ Installing OpenClaw v2.1.0...    │      │
│  │ ✓ Config written                    │      │
│  │ ✓ Gateway service installed         │      │
│  │ 🎉 OpenClaw installed!             │      │
│  └────────────────────────────────────┘      │
│                                              │
│  3️⃣ Verify: paste last line of output       │
│  [ ______________________________ ]          │
│  [ Verify Installation ]                     │
│                                              │
│  [Skip verification →]                       │
│                                              │
│  📧 [Email these instructions to myself]     │
└─────────────────────────────────────────────┘
```

**What the generated script does (solving pain points):**
1. Detects OS + arch (validates matches wizard selection)
2. Checks Node ≥22, offers to install via nvm if missing (A4)
3. Checks PATH for git, openclaw (A2)
4. On Windows: validates WSL2 + systemd (A3)
5. Installs OpenClaw binary
6. Writes `~/.openclaw/config.json` with all wizard choices pre-filled (D1, D2)
7. Writes API key to `~/.openclaw/.env` (B6 — not shell config)
8. Sets `gateway.mode=local` (D1)
9. Sets secure defaults: `dmPolicy=pairing`, `groupPolicy=allowlist`, `logging.redactSensitive=true` (F1, F4, F7)
10. Sets file permissions on `~/.openclaw/` (F5)
11. Installs gateway as system service
12. Outputs verification string for wizard

**Platform-specific commands:**
- macOS/Linux: `curl -fsSL https://clawhatch.sh/install?token=xxx | bash`
- Windows WSL: Same, with prefix note "Run inside WSL (Ubuntu terminal)"

**Verification:** Fuzzy-match on pasted output. Accept partial strings containing version number.

---

### Screen 8: Configure Review

**URL:** `/setup/configure`  |  **Target time:** 1min  
**Pain points addressed:** D2, D5, D6

```
┌─────────────────────────────────────────────┐
│  Here's your config.                         │
│                                              │
│  ┌── ~/.openclaw/config.json ──────────┐     │
│  │ {                                   │     │
│  │   "gateway": { "mode": "local" },   │     │
│  │   "model": {                        │     │
│  │     "provider": "anthropic",        │     │
│  │     "default": "claude-sonnet-4-*"  │     │
│  │   },                                │     │
│  │   "channels": { ... },              │     │
│  │   "assistant": {                    │     │
│  │     "name": "Clawd"                 │     │
│  │   },                                │     │
│  │   "security": {                     │     │
│  │     "dmPolicy": "pairing" ← 🔒     │     │
│  │   }                                 │     │
│  │ }                                   │     │
│  └─────────────────────────────────────┘     │
│  Annotated: hover sections for explanations  │
│  API key masked with [👁] toggle             │
│                                              │
│  ⓘ This was already written by the install   │
│    script. Review it, or just continue.      │
│                                              │
│  [Continue →]                                │
└─────────────────────────────────────────────┘
```

**Key point:** Config was already written by the install script (Screen 7). This screen is informational — lets power users review/edit, lets everyone else click Continue instantly.

Also shows generated workspace files (SOUL.md, USER.md) in collapsible previews with [Edit] buttons.

---

### Screen 9: Connect Channels

**URL:** `/setup/connect`  |  **Target time:** 3min (varies)  
**Pain points addressed:** C1, C5, E1, E2, E4, E5

Tab-based UI — one tab per selected channel. Each shows status: ✅ connected, ⏳ in progress, ○ not started.

#### WhatsApp Tab
```
Step 1: Start the bridge
  $ openclaw channel whatsapp        [📋]

Step 2: Scan QR code
  [QR image]  ← auto-refreshes on expiry
  Instructions: Open WhatsApp → Linked Devices → Scan
  📹 [30-second video guide]

Step 3: Test connection
  [ Test Connection ]
  ✅ Connected!

⚠️ About WhatsApp reliability:
  WhatsApp connections can drop occasionally.
  OpenClaw auto-reconnects. If it fails, run:
  $ openclaw channels login          [📋]
```

**QR expiry handling:** Auto-refresh with countdown. "QR expired — generating new one…" (solves C1)

#### Telegram Tab
```
Step 1: Create your bot
  Open @BotFather → /newbot → follow prompts
  [Open BotFather →] (deep link)

Step 2: Paste bot token
  [ 123456789:ABCdef... ]
  Format: numbers:letters (validated inline)

Step 3: Set allowed users
  Your Telegram user ID: [ _________ ]
  ⓘ Send /start to @userinfobot to find yours

Step 4: Test
  [ Test Connection ]
```

Solves E1 (format guidance) and validates token format inline.

#### Discord Tab
```
Step 1: Create bot on Discord Developer Portal
  [Open Developer Portal →]
  
Step 2: Enable required intents
  ☑ Message Content Intent
  ☑ Server Members Intent
  (with screenshots)

Step 3: Paste bot token
  [ _________ ]

Step 4: Add to server
  [Add bot to your server →] (auto-generated invite URL)

Step 5: Test
  [ Test Connection ]
```

Solves E5 with explicit intent checklist.

#### After All Channels Connected

**DM Pairing explanation card** (solves #1 pain point — E2):
```
┌─────────────────────────────────────────────┐
│  🔒 First-message security                   │
│                                              │
│  When someone messages your bot for the      │
│  first time, they'll get a pairing code.     │
│  You approve it with:                        │
│  $ openclaw pairing approve <channel> <code> │
│                                              │
│  YOUR account is pre-approved. ✅            │
│  Others need your approval first.            │
│                                              │
│  This prevents strangers from using your     │
│  assistant (which has access to your tools). │
└─────────────────────────────────────────────┘
```

---

### Screen 10: Health Check & Launch

**URL:** `/setup/launch`  |  **Target time:** 30s  
**Pain points addressed:** D3, D4, F1, F2, F5

Automated checklist — runs all checks sequentially with animated results:

```
✅ OpenClaw installed (v2.1.0)
✅ Node version compatible (24.8.0)
✅ Config valid (schema check)
✅ API key verified (test call succeeded)
✅ Gateway running (port 18789)
✅ WhatsApp connected
✅ Telegram connected
✅ Security audit passed
   ✅ dmPolicy = pairing
   ✅ Auth token set
   ✅ Permissions locked
   ✅ Redaction enabled
⏳ Sending test message...
✅ Test message delivered!
```

**On all pass:**
```
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

     Your assistant is ready!
     
     Clawd is live on WhatsApp & Telegram.

🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

💡 Try: "Hey Clawd, what can you do?"

┌──────────┐ ┌──────────┐ ┌──────────┐
│ Welcome  │ │ Trouble  │ │ Join     │
│ Guide →  │ │ shoot →  │ │ Discord →│
└──────────┘ └──────────┘ └──────────┘
```

3-second confetti animation (canvas-confetti). Respects `prefers-reduced-motion`.

**On failures:** Each failed check gets expandable "Fix this" with specific guidance. "Run checks again" button after fixing.

---

### Screen 11: Gentle Upsell (Pro users skip this)

**URL:** `/setup/complete`  |  **Target time:** 15s

Only shown to Free tier users. Equal-prominence buttons. No dark patterns.

```
┌────────────────────────────────────────┐
│  🛡️ OpenClaw Pro — $29/mo              │
│  Priority support · Auto-updates ·     │
│  Voice mode · Multi-device             │
│                                        │
│  [ Start Free Trial — 14 days ]        │
└────────────────────────────────────────┘

[ No thanks, take me to my assistant → ]
  ↑ Same size, just secondary style
```

---

## 2. Intake Form Fields

Complete inventory of every field collected across the wizard:

### Required Fields

| Field | Screen | Type | Validation | Default |
|-------|--------|------|------------|---------|
| OS | 2 | Select (3) | Must select one | Auto-detected |
| WSL2 installed | 2 | Boolean (Windows only) | Self-report | — |
| Channels | 3 | Multi-select (5) | ≥1 selected | — |
| WA number type | 3 | Radio: dedicated/personal | If WhatsApp selected | Dedicated |
| AI model provider | 4 | Radio (3) | Must select one | Claude |
| API key | 4 | Text (masked) | Format regex per provider | — |
| Your name | 5 | Text | Non-empty, ≤50 chars | — |
| Plan | 6 | Radio: Free/Pro | Must select | Free |

### Optional Fields (with smart defaults)

| Field | Screen | Type | Default |
|-------|--------|------|---------|
| Assistant name | 5 | Text (≤30 chars) | "Clawd" |
| Personality | 5 | Select (4) + custom | "Friendly" |
| Timezone | 5 | Dropdown (IANA) | Auto-detected via `Intl.DateTimeFormat` |
| Custom personality | 5 | Textarea (≤500 chars) | — |
| Telegram user ID | 9 | Text | — |
| Discord bot token | 9 | Text | — |
| Install verification | 7 | Text (paste) | Skippable |

### Auto-Detected (never asked)

| Data | Source | Used For |
|------|--------|----------|
| OS + arch | User-Agent | Install script, platform gating |
| Timezone | `Intl.DateTimeFormat` | Config + cron |
| Node version | Install script output | Compatibility check |
| Browser locale | `navigator.language` | UI language (future) |

### Fields We Deliberately Don't Ask

| Avoided Field | Why |
|---------------|-----|
| Email (during setup) | Defer until post-setup. Don't block install for marketing. |
| Business name | Not relevant for personal assistant |
| Phone number | WhatsApp uses their phone; we don't need it |
| Payment info (Free tier) | Zero friction for free users |
| Model aliases | Power user feature — sensible defaults set automatically |
| Heartbeat interval | Set to 30min default; configurable later |
| Session history limit | Set to 100 messages default |
| Sandbox config | Default safe settings; power users edit config |

---

## 3. Error States & Recovery Paths

### Error Design Principles

1. **Never "Something went wrong"** — always state what failed, why, and how to fix
2. **Never a dead end** — every error has a forward path (fix, skip, or ask for help)
3. **Progressive disclosure** — show simple fix first, "More details" expand for technical info
4. **Context preservation** — errors never lose wizard state; user can fix and retry without re-entering data

### Error Catalogue by Screen

#### Screen 2: OS Detection

| Error | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| Auto-detect fails | Unknown User-Agent | Show all 3 OS cards, no pre-selection, "We couldn't detect your OS — please select" | Manual selection |
| WSL2 not installed | Windows selected, self-report | Inline card: PowerShell command + "Restart and come back" | Install WSL2, or switch to another OS |

#### Screen 3: Channels

| Error | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| No selection | Continue clicked with 0 selected | Shake Continue button + "Pick at least one channel to continue" | Select a channel |
| iMessage on non-Mac | Select iMessage on Linux/Windows | Card disabled with tooltip: "iMessage requires macOS" | Select different channel |

#### Screen 4: Model & Auth

| Error | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| Invalid key format | Key doesn't match provider prefix | Red border: "This doesn't look like a [provider] key. It should start with `sk-ant-`" | Re-enter key |
| Key verification fails | Test API call returns 401/403 | Yellow warning: "We couldn't verify this key. Double-check it, or continue anyway." | Re-enter, or skip verification |
| Key verification timeout | API call >10s | "Verification timed out (Anthropic might be slow). Continue anyway?" | Skip or retry |
| Empty key | Continue with blank field | "You need an API key. [Get one →]" with inline guide | Get key from provider |
| Rate limited during verify | 429 from API | "Key looks valid but provider is rate-limiting. This is normal — continue." | Auto-continue |

#### Screen 6: Payment Gate

| Error | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| Payment fails | Stripe error | Redirect back to wizard: "Payment didn't go through. You're on the Free plan — upgrade anytime from settings." | Continue on Free |
| Payment cancelled | User closes Stripe | Same as above | Continue on Free |

#### Screen 7: Install

| Error | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| Verification mismatch | Pasted text doesn't contain version | "Hmm, that doesn't look right." + expandable troubleshooter | Retry, skip, or help |
| — Permission denied | In troubleshooter | `chmod +x` or `sudo` instructions | Retry |
| — curl not found | In troubleshooter | Install curl per-platform | Retry |
| — Network error | In troubleshooter | Check connectivity, try wget alternative | Retry |
| — Node too old | In troubleshooter | `nvm install 22` command | Retry |
| User on mobile | Mobile device detected | "You'll need a desktop for this step. 📧 Email instructions to yourself?" | Email handoff |

#### Screen 9: Connect Channels

| Error | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| QR code expired | WhatsApp QR timeout | "QR expired" + auto-regenerate with countdown | Wait for new QR |
| WA phone not connected | Test fails | "Is your phone connected to internet? WhatsApp Web needs your phone online." | Check phone, retry |
| Invalid Telegram token | Format check fails | "Token format: `123456789:ABCdefGHI...` — check BotFather" | Re-enter |
| Telegram API unreachable | IPv6/DNS issue (E6) | "Can't reach Telegram. If on a VPS, try forcing IPv4." + command | Fix network, retry |
| Discord missing intents | Bot can't read messages | "Enable Message Content Intent in Discord Developer Portal" + screenshot | Fix intents, retry |
| Connection timeout | Any channel >30s | "Connection timed out. Is OpenClaw running?" + `openclaw status` command | Check status, retry |
| Channel already connected elsewhere | Session conflict | "This WhatsApp account is linked elsewhere. Unlink first." | Unlink, retry |

#### Screen 10: Health Check

| Error | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| Any check fails | Individual check returns false | Red ✗ with specific "Fix" button → opens inline fix instructions | Fix and "Run checks again" |
| Multiple failures | >2 checks fail | "A few things need attention" + prioritized fix list | Fix in order, re-run |
| Gateway not running | Port check fails (D3, D4) | "Gateway isn't running. Try: `openclaw gateway start`" | Start gateway, re-run |
| Port conflict | 18789 in use (D3) | "Port 18789 is busy. Stop the other process or change port." | Fix and retry |
| Security audit warning | Open policy detected (F1) | "⚠️ Your DM policy is 'open' — anyone can use your assistant. [Fix to 'pairing']" | One-click fix |

### Global Recovery Mechanisms

| Mechanism | Description |
|-----------|-------------|
| **State persistence** | All inputs saved to localStorage on every change. Browser crash = resume exactly where you were. |
| **URL-based state** | Each screen has a URL. Share "I'm stuck on step 6" links. |
| **Skip buttons** | Non-critical screens (verification, config review) have skip option |
| **"Need help?" drawer** | Every screen. Pre-fills step context. Links to Discord, FAQ, email. |
| **Email handoff** | "Email these instructions to myself" on install screen (for phone→desktop) |
| **`openclaw doctor`** | CLI command runs all health checks from terminal — fallback when wizard can't help |

---

## 4. Post-Setup Handoff Checklist

Displayed on the success screen (Screen 10) and emailed if user provides email.

### Immediate Checklist (shown in wizard)

```markdown
## ✅ Your Clawd Setup Checklist

### Just completed
- [x] OpenClaw installed (v2.1.0)
- [x] Config written to ~/.openclaw/
- [x] API key stored in ~/.openclaw/.env
- [x] Gateway service running
- [x] WhatsApp connected
- [x] Telegram connected
- [x] Security audit passed

### Try these now (first 5 minutes)
- [ ] Send "Hey Clawd, what can you do?" on WhatsApp
- [ ] Ask Clawd to set a reminder for tomorrow
- [ ] Ask Clawd about the weather
- [ ] Try sending an image and asking about it

### This week
- [ ] Read the Welcome Guide (link)
- [ ] Join the Discord community (link)
- [ ] Explore available skills: `openclaw skills list`
- [ ] Customize SOUL.md to refine personality
- [ ] Set up a daily briefing with cron

### If something breaks
- Run `openclaw doctor` — diagnoses common issues
- Run `openclaw status --deep` — check all connections
- WhatsApp disconnected? `openclaw channels login`
- Check logs: `openclaw gateway logs --tail 50`
- Ask in Discord #support (link)
```

### Handoff Email (sent if user provides email on success screen)

**Subject:** Your assistant Clawd is ready! Here's your setup summary.

```
Hi Richard,

Clawd is live and listening on WhatsApp and Telegram! 🎉

Here's your setup summary:

- OS: macOS
- Model: Claude (Anthropic)
- Channels: WhatsApp, Telegram
- Plan: Free

Quick commands:
- Check status: openclaw status --deep
- View logs: openclaw gateway logs --tail 50
- Restart: openclaw gateway restart
- Diagnose issues: openclaw doctor

Bookmarks:
- Docs: https://docs.openclaw.ai
- Troubleshooting: https://docs.openclaw.ai/troubleshooting
- Discord: https://discord.gg/openclaw

Your config is at ~/.openclaw/config.json
Your API key is at ~/.openclaw/.env
Your personality files are at ~/.openclaw/workspace/

Welcome aboard!
— The OpenClaw Team
```

---

## 5. Follow-Up Email Sequence

Triggered only if user provides email (optional field on success screen). Unsubscribe link in every email. Sequence pauses if user unsubscribes or sends "stop".

### Email 1: 24-Hour Check-In

**Send:** +24 hours after setup completion  
**Subject:** How's Clawd doing? Quick check-in 🤖  
**Goal:** Catch early failures, drive first meaningful interaction

```
Hi Richard,

It's been about a day since you set up Clawd. How's it going?

🟢 If everything's working great:
Try these to get more out of Clawd:
- "Summarize this article" + paste a URL
- "Remind me to [x] at [time]"
- "What's on my calendar today?" (if calendar connected)
- Send a photo and ask "What is this?"

🟡 If something seems off:
The most common day-1 issue is WhatsApp disconnecting.
Fix: open your terminal and run:
  openclaw channels login
Then scan the QR code again.

For anything else:
  openclaw doctor
This checks everything and tells you what's wrong.

🔴 If nothing's working:
Reply to this email — a human will help you.
Or hop into Discord: https://discord.gg/openclaw

── Your setup ──
Channels: WhatsApp, Telegram
Model: Claude
Version: 2.1.0
Plan: Free

Cheers,
The OpenClaw Team

[Unsubscribe] | [Manage preferences]
```

### Email 2: 3-Day Tips

**Send:** +72 hours after setup  
**Subject:** 3 things most people don't know Clawd can do  
**Goal:** Feature discovery, increase stickiness

```
Hi Richard,

You've had Clawd for 3 days now. Here are some things 
you might not have tried:

1. 🧠 Clawd remembers things
   Tell it: "Remember that my dentist is Dr. Smith, 
   020 7946 0958"
   Later ask: "What's my dentist's number?"
   It stores this in memory files that persist forever.

2. 🔧 Clawd can use tools
   Depending on your setup, Clawd can:
   - Browse the web for you
   - Run terminal commands
   - Check your email
   Run `openclaw skills list` to see what's available.

3. 🎨 Make it more YOU
   Edit ~/.openclaw/workspace/SOUL.md to change how 
   Clawd behaves. Add your preferences, pet peeves, 
   inside jokes. The more context, the better it gets.

── Quick tip ──
If Clawd's responses feel too long/short, just tell it:
"Keep responses shorter" or "Be more detailed"
It adapts on the fly.

[Unsubscribe] | [Manage preferences]
```

### Email 3: 7-Day Review

**Send:** +7 days after setup  
**Subject:** Your first week with Clawd — how'd it go?  
**Goal:** Gather feedback, prevent churn, soft upsell for Free users

```
Hi Richard,

One week in! 🎉 

We'd love to know how it's going. Takes 30 seconds:

[ ⭐⭐⭐⭐⭐ Rate your experience ]
(links to 1-click rating form)

── Common week-1 tweaks ──

"It forgets things between conversations"
→ Check session.reset in your config. 
  Set to "manual" to keep context longer.
  Docs: [link]

"WhatsApp disconnected"  
→ This happens sometimes. Run:
  openclaw channels login
  Tip: the connection is more stable on 
  dedicated numbers vs personal ones.

"I want to add another channel"
→ openclaw channel add telegram
  (or discord, signal, imessage)

── What's next? ──

Join 2,400+ users in our Discord community:
https://discord.gg/openclaw

Read the deep-dive guides:
- Multi-agent setup: [link]  
- Custom skills: [link]
- Voice mode (Pro): [link]

{IF FREE TIER:}
── Unlock more ──
You're on the Free plan. Pro adds:
✅ All channels (not just 1)
✅ Auto-updates
✅ Priority support  
✅ Voice mode
[ Start 14-day free trial → ]
No commitment. Cancel anytime.
{END IF}

Thanks for being an early user. We're building 
this for people like you.

— The OpenClaw Team

[Unsubscribe] | [Manage preferences]
```

### Email 4: 14-Day Power User (conditional)

**Send:** +14 days, ONLY if user has been active (≥10 messages sent via channels)  
**Subject:** You're a power user now. Here's what's next.  
**Goal:** Advanced features, community, contribution

```
Hi Richard,

You've sent [X] messages through Clawd this week. 
You're getting serious! Here are power-user moves:

🤖 Multi-agent setup
Create specialized agents — one for work, one for 
personal, one for a specific project.
Docs: [link]

🔌 Build custom skills  
Know JavaScript? Teach Clawd new tricks.
Docs: [link]

🌐 Remote access via Tailscale
Access Clawd from anywhere, securely.
Docs: [link]

💬 Shape the project
- Star us on GitHub: [link]
- Report bugs: [link]  
- Request features: [link]
- Contribute: [link]

[Unsubscribe] | [Manage preferences]
```

### Email 5: 30-Day Dormant Win-Back (conditional)

**Send:** +30 days, ONLY if user has been inactive (0 messages in last 14 days)  
**Subject:** Clawd misses you 🥺  
**Goal:** Re-engage churned users

```
Hi Richard,

It's been a while since Clawd heard from you. 

If something broke → reply to this email, we'll help.
If you got busy → Clawd's still running, ready when you are.
If it wasn't useful → we'd love 30 seconds of feedback:
  [ Tell us what went wrong → ]

Since you last used it, we've shipped:
- [Feature 1]
- [Feature 2]  
- [Feature 3]

Quick restart:
  openclaw doctor    ← check everything's healthy
  openclaw gateway restart  ← restart if needed

[Unsubscribe] | [Stop all emails]
```

### Sequence Summary

| Email | Timing | Condition | Goal |
|-------|--------|-----------|------|
| 1. Check-in | +24h | All users | Catch failures |
| 2. Tips | +3 days | All users | Feature discovery |
| 3. Review | +7 days | All users | Feedback + soft upsell |
| 4. Power user | +14 days | Active users only | Advanced features |
| 5. Win-back | +30 days | Inactive users only | Re-engagement |

---

## Appendix: Design Tokens & Technical Notes

### State Management
- All wizard state → `localStorage` key: `clawhatch_wizard_state`
- Schema: `{ step, os, channels, model, apiKey (encrypted), name, assistantName, personality, timezone, plan, channelTokens, verified }`
- URL params mirror current step for deep-linking: `/setup/model?os=macos&channels=wa,tg`

### Analytics Events
Track at minimum:
- `wizard_started` — landed on Screen 1
- `wizard_step_completed` — per step, with time-on-step
- `wizard_step_error` — per error type + step
- `wizard_abandoned` — last completed step before drop-off
- `wizard_completed` — full completion, with total time
- `wizard_plan_selected` — free vs pro
- `channel_connected` — per channel
- `health_check_result` — pass/fail per check

### A/B Test Candidates
- Landing CTA text ("Get Started — Free" vs "Set Up in 10 Minutes")
- Channel card order (popularity vs alphabetical)
- Payment gate position (before vs after install)
- Personality preset options
- Upsell timing (end vs 7-day email)

### Accessibility
- Full keyboard navigation (Tab/Enter/Space)
- ARIA labels on all interactive elements
- Screen reader–friendly progress announcements
- `prefers-reduced-motion`: disable confetti, transitions
- Minimum 4.5:1 contrast ratios
- Focus indicators on all focusable elements
