# Self-Service Onboarding Systems Research

> Compiled 2026-02-02 for OpenClaw Setup Wizard

---

## 1. Best Self-Service Onboarding Flows

### Vercel
- **Steps:** 3 — Create account → Connect Git repo → Deploy (auto-detected framework)
- **Info collected:** Git provider (GitHub/GitLab/Bitbucket), repo selection, team name
- **Error handling:** Build logs shown in real-time; failed deploys show logs with actionable suggestions
- **What makes it easy:** Zero-config — detects framework automatically, deploys immediately. No infrastructure choices needed.
- **Steal this:** Auto-detection of project type. The user doesn't configure anything Vercel can infer. Also: dual-path (Dashboard OR CLI) for every step.

### Railway
- **Steps:** 3 — New Project → Select source (GitHub/Docker/Template) → Deploy Now
- **Info collected:** GitHub link, optional env vars
- **Error handling:** Canvas-based UI shows service status visually; build logs inline
- **What makes it easy:** "Deploy Now" button skips all config. Template marketplace for one-click pre-configured stacks.
- **Steal this:** Template marketplace concept — pre-built configs for common setups. The "Deploy Now vs Add Variables" fork gives power users an escape hatch without slowing beginners.

### Supabase
- **Steps:** 4 — Create account → New project (name, password, region) → Wait for provisioning → Use quickstart for your framework
- **Info collected:** Project name, database password, region
- **Error handling:** Framework-specific quickstarts with copy-paste code blocks
- **What makes it easy:** Framework-specific paths (React, Next.js, Flutter, etc.) so you only see relevant instructions. Provisioning happens while you read docs.
- **Steal this:** Framework/platform selector that customises ALL subsequent instructions. Background provisioning while user reads next steps.

### Stripe
- **Steps:** 2 to first API call — Create account → Follow quickstart (Checkout integration)
- **Info collected:** Email, business info (deferred — can start coding immediately)
- **Error handling:** Test mode by default; webhook CLI for local testing; detailed error codes
- **What makes it easy:** Test mode is default — no real money risk. API keys shown inline in docs. Copy-paste code that actually works.
- **Steal this:** API keys embedded directly in documentation (personalised docs). Test mode as default removes fear. Interactive API explorer in dashboard.

### Clerk
- **Steps:** 3 — Create app → Select auth methods → Install SDK + add env vars
- **Info collected:** App name, sign-in methods (email, social, etc.), framework choice
- **Error handling:** Framework-specific quickstarts; AI-ready docs (links to paste into ChatGPT/Claude/Cursor)
- **What makes it easy:** Pre-built UI components — you add `<SignIn />` and it works. Visual dashboard for configuring auth without code.
- **Steal this:** "Open in Claude/ChatGPT" links on docs pages — revolutionary for AI-assisted setup. Pre-built components that handle the hard parts.

### Resend
- **Steps:** 3 — Create account → Get API key → Send first email (framework-specific quickstart)
- **Info collected:** Minimal — email, then domain verification for production
- **Error handling:** 13 framework quickstarts; domain verification wizard
- **What makes it easy:** Extremely focused — it does one thing (send email). First API call is ~5 lines of code.
- **Steal this:** Radical simplicity — one product, one API call to value. Framework matrix on getting-started page.

### Render
- **Steps:** ~4 — Sign up → New service → Connect repo → Configure & deploy
- **Info collected:** Service type (web service/cron/worker), repo, build command, env vars
- **What makes it easy:** Blueprint spec (render.yaml) for infrastructure-as-code
- **Steal this:** Infrastructure-as-code file (render.yaml) that users can commit to their repo — the setup IS the config file.

### Cross-Platform Patterns Summary

| Pattern | Used By | Priority for OpenClaw |
|---|---|---|
| Auto-detect project/OS type | Vercel, Railway | **HIGH** |
| Framework-specific paths | Supabase, Clerk, Resend | **HIGH** |
| Copy-paste code with real values | Stripe, all | **HIGH** |
| Template/preset marketplace | Railway | **MEDIUM** |
| Background work while user reads | Supabase | **MEDIUM** |
| Dual-path (GUI + CLI) | Vercel | **LOW** (CLI-first is fine) |
| "Open in AI" docs links | Clerk | **NICE-TO-HAVE** |

---

## 2. Technical Architecture for Install Wizard Web App

### OS Detection from Browser
```javascript
// Reliable OS detection
function detectOS() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || navigator.userAgentData?.platform;
  
  if (/Mac/i.test(platform)) return 'macos';
  if (/Win/i.test(platform)) return 'windows'; // assume WSL2
  if (/Linux/i.test(platform)) return 'linux';
  return 'unknown';
}
// navigator.userAgentData (newer API) is more reliable but not universal
// Fallback chain: userAgentData → platform → userAgent string
```
**Verdict:** Reliable enough for Mac/Windows/Linux detection (~99%). Use it to pre-select OS, but let user override.

### Generating Config Files from Browser
```javascript
// Blob URL pattern for downloadable configs
function downloadConfig(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```
**Better pattern:** Don't make users download files. Generate a single shell command that creates the file:
```bash
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-xxx
DISCORD_TOKEN=xxx
EOF
```

### Copy-to-Clipboard with Verification
```javascript
// Modern clipboard API
async function copyCommand(text) {
  await navigator.clipboard.writeText(text);
  // Show "Copied!" feedback
  // Then show "Did it work?" verification step
}
```
**Key pattern:** After each copied command, show a "Verify" step that tells the user what output to expect, with a "It worked" / "Something went wrong" fork.

### Progress Tracking
- **LocalStorage** for anonymous users (simplest, no backend needed)
- **URL hash state** for shareable progress (`setup.openclaw.com/#step=3&os=mac`)
- **Account-based** only if payment is involved
- **Recommended:** LocalStorage + URL state. No accounts needed for the wizard itself.

```javascript
// Simple progress tracking
const progress = JSON.parse(localStorage.getItem('openclaw-setup') || '{}');
progress.currentStep = 3;
progress.os = 'macos';
progress.completedSteps = [1, 2];
localStorage.setItem('openclaw-setup', JSON.stringify(progress));
```

### How Homebrew's Install Works (curl | bash pattern)
1. Single command: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/.../install.sh)"`
2. Script detects OS, architecture (Intel vs ARM)
3. Shows what it will do and pauses for confirmation
4. Installs to isolated prefix (`/opt/homebrew` on ARM, `/usr/local` on Intel)
5. Gives post-install instructions (add to PATH)

**Applicable pattern for OpenClaw:**
```bash
/bin/bash -c "$(curl -fsSL https://setup.openclaw.com/install.sh)"
```
The script would:
1. Detect OS + package manager (brew/apt/dnf)
2. Check prerequisites (Node.js, Git, npm)
3. Install missing deps
4. Clone/download Clawdbot
5. Run interactive config (prompt for API keys)
6. Start the service
7. Verify it's running

### How nvm/fnm Detect and Install Node
- Check `$SHELL` and `$PROFILE` to know which RC file to modify (.bashrc, .zshrc, etc.)
- Use `uname -s` and `uname -m` for OS/arch detection in shell
- Download pre-built binaries from known URLs
- Add PATH modification to shell profile
- **fnm is simpler** and Rust-based — faster install, recommend over nvm

### Recommended Technical Architecture
```
┌─────────────────────────────────────┐
│     setup.openclaw.com (Next.js)    │
│                                     │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ OS      │  │ Step-by-step     │  │
│  │ Detect  │→ │ wizard UI        │  │
│  └─────────┘  │ (React state)    │  │
│               │                  │  │
│  ┌─────────┐  │ Step 1: Prereqs  │  │
│  │ Payment │  │ Step 2: API Keys │  │
│  │ Gate    │  │ Step 3: Install  │  │
│  │(Stripe) │  │ Step 4: Config   │  │
│  └─────────┘  │ Step 5: Verify   │  │
│               └──────────────────┘  │
│                                     │
│  Output: Custom install script OR   │
│  copy-paste commands per step       │
└─────────────────────────────────────┘
```

---

## 3. Payment Integration

### Stripe Checkout (Recommended for MVP)
- **One-time payment:** Stripe Checkout session → redirect to success URL with session ID
- **Implementation:** ~50 lines of code. Create a checkout session server-side, redirect client.
- **Pricing page:** Use Stripe's hosted pricing table (embeddable `<stripe-pricing-table>` web component) — zero custom UI needed
- **Gating:** After payment, redirect to wizard with a signed token/session. Verify server-side before generating install scripts.
- **Timeline:** 1-2 days to implement

### Lemon Squeezy (Strong Alternative)
- **5% + 50¢ per transaction** (no monthly fee)
- **Built for digital products** — handles license keys, downloads, VAT/tax automatically
- **Simpler than Stripe** for this use case — no need to build billing portal
- **Checkout overlay** embeds directly on your site
- **Best for:** If selling a "product" (license to use OpenClaw setup wizard)
- **Recommendation:** Use Lemon Squeezy for MVP. Switch to Stripe only if you need subscriptions or complex billing later.

### Gumroad (Simplest Possible)
- **10% + 30¢** (higher fee but zero setup)
- Good for validation — can start selling in 30 minutes
- No custom integration needed — just a link
- **Use for:** Pre-selling / validating demand before building the wizard

### Recommended Payment Flow
1. **Landing page** → pricing → "Get Started" button
2. **Lemon Squeezy checkout** (or Stripe) → payment
3. **Redirect to wizard** with license key in URL
4. **Wizard validates key** → unlocks full setup flow
5. **Key also used** as support ticket identifier

---

## 4. Support Automation

### Tier 1: Self-Service (Handles 80% of issues)
- **Knowledge base:** Use **GitBook** (free for open source, clean UI) or **Notion** (if already using it)
- **Structure:** FAQ → Troubleshooting by error message → Platform-specific guides
- **Key insight:** Write docs for error messages, not features. Users search for errors.

### Tier 2: Automated Chat (Handles 15% of issues)
- **Crisp.chat** — Free tier includes live chat + basic chatbot. Best free option.
- **Tawk.to** — 100% free live chat, but less polished
- **Intercom** — Best but expensive ($74/mo+). Only if revenue supports it.
- **Recommended for MVP:** Crisp.chat free tier + knowledge base integration

### Tier 3: Community Support (Handles remaining 5%)
- **Discord server** with channels per topic (#windows-setup, #api-keys, #general)
- **Discord bot** for FAQ matching: use simple keyword → answer mapping, not AI (cheaper, more reliable)
- **GitHub Discussions** for persistent searchable Q&A

### Support Automation Architecture
```
User has issue
    → Searches knowledge base (GitBook) [80% resolved]
    → Opens chat widget (Crisp.chat) [15% resolved]
        → Bot suggests KB articles
        → Escalates to human if unresolved
    → Posts in Discord [5% resolved]
        → Community or you answers
        → Answer gets added to KB
```

### Key Principle
Every support interaction should result in a KB article update. Support should get easier over time, not harder.

---

## 5. Video Walkthrough Production

### Recording Tools
- **Loom** — Fastest for quick recordings. Free tier: 25 videos, 5 min each. Embed anywhere.
- **OBS Studio** — Free, unlimited, but more setup. Use for polished final versions.
- **Scribe.how** — Auto-generates step-by-step screenshot guides from your actions. Perfect for setup walkthroughs. Free tier available.
- **Tango** — Similar to Scribe, browser extension that captures clicks into a guide.

### Video Structure for Setup Walkthroughs
1. **Hook (0-15s):** "By the end of this video, you'll have OpenClaw running"
2. **Prerequisites (15-30s):** Quick list of what you need
3. **Walkthrough (main):** One step at a time, show terminal + result
4. **Verification (last 30s):** Show it working
5. **Total target: 3-5 minutes** (under 5 min gets 2x completion rate vs 10+ min)

### Optimal Lengths
- **Quick setup:** 3-5 minutes (single topic, e.g., "Install on Mac")
- **Full walkthrough:** 8-12 minutes max (end-to-end with explanations)
- **Troubleshooting:** 1-2 minutes per issue (short, searchable)

### Embedding Strategy
- **Loom embed** — Simplest, good analytics, auto-updates if you re-record
- **YouTube unlisted** — Free, good SEO if public, reliable CDN
- **Self-hosted (Mux/Cloudflare Stream)** — Most control, ~$1/1000 views
- **Recommended:** Loom for MVP (fast iteration), YouTube for SEO later

### Auto-Generated Guides
- **Scribe.how** is the killer tool here — walk through the setup once, it generates a screenshot guide automatically
- Embed Scribe guides alongside video for users who prefer reading
- Export as PDF for offline reference

---

## 6. Similar Products That Automated Manual Services

### TurboTax (Intuit)
- **Replaced:** Simple tax returns done by accountants
- **How:** Wizard-style Q&A that builds the tax form. "Interview" format.
- **What worked:** Breaking complex forms into simple yes/no questions. Real-time refund estimate as motivation.
- **What didn't:** Complex cases still need humans. They upsell "expert review" for these.
- **Lesson for OpenClaw:** The wizard should handle 80% of cases perfectly. Have a "get human help" escape hatch for the rest.

### Wix/Squarespace
- **Replaced:** Web developers for simple sites
- **How:** Templates + drag-and-drop + hosting bundled
- **What worked:** Templates eliminate blank-page paralysis. Opinionated defaults.
- **What didn't:** Customisation ceiling — power users outgrow it.
- **Lesson:** Provide templates/presets for common setups. Don't try to cover every edge case.

### Zapier
- **Replaced:** Integration consultants
- **How:** Visual builder + pre-built connectors + templates ("Zaps")
- **What worked:** Template gallery for common automations. "Just works" out of the box.
- **Lesson:** A template library of pre-built configs (Discord bot + calendar + email) beats a blank config file.

### The Tipping Point: Self-Service vs Human
- **Self-service wins when:** The task is repeatable, the inputs are predictable, and the outcome is verifiable
- **Human wins when:** Edge cases are common, emotional reassurance matters, or debugging requires contextual reasoning
- **OpenClaw assessment:** Setup IS repeatable, inputs ARE predictable (OS, API keys, preferences), outcome IS verifiable (bot responds). **This is a strong self-service candidate.**
- **Hybrid model:** Self-service wizard for setup + human support for troubleshooting = optimal

---

## Recommended Architecture

### Tech Stack
| Component | Choice | Reason |
|---|---|---|
| **Wizard app** | Next.js (App Router) | SSR for SEO landing page, client for wizard, API routes for script generation |
| **Styling** | Tailwind + shadcn/ui | Fast to build, professional look, good for step-by-step UIs |
| **Payment** | Lemon Squeezy | Simplest for digital products, handles tax, has license keys built-in |
| **Knowledge base** | GitBook | Free, clean, searchable |
| **Live chat** | Crisp.chat (free) | Good enough for launch |
| **Video** | Loom (recording) + embed | Fast iteration, re-record without changing embeds |
| **Guides** | Scribe.how | Auto-generate screenshot guides |
| **Hosting** | Vercel | Free tier, instant deploys, perfect for Next.js |
| **Install script** | Custom bash (generated) | Served from `/api/install` based on user config |

### User Flow Design
```
1. LANDING PAGE (setup.openclaw.com)
   → What is OpenClaw? Benefits. Social proof.
   → Pricing (one-time or tiered)
   → "Get Started" → payment

2. PAYMENT (Lemon Squeezy overlay)
   → Pay → receive license key
   → Redirect to /setup?key=xxx

3. WIZARD - STEP 1: Environment
   → Auto-detect OS (confirm/override)
   → Check: Do you have Node.js? Git? 
   → Generate prerequisite install commands

4. WIZARD - STEP 2: API Keys
   → Guide through getting each key (Anthropic, Discord, etc.)
   → Links open in new tabs
   → Paste keys into form (validated in real-time)

5. WIZARD - STEP 3: Configuration
   → Choose features (Discord bot? Calendar? Email?)
   → Select from presets or customise
   → Preview generated config

6. WIZARD - STEP 4: Install
   → Option A: Single curl|bash command (generates custom script with their config baked in)
   → Option B: Step-by-step copy-paste commands
   → Each step has "Verify" button with expected output

7. WIZARD - STEP 5: Verify & Launch
   → "Send a test message to your bot"
   → Success confetti 🎉
   → Links to: docs, Discord community, support
```

### Estimated Build Time

**MVP (functional wizard, no payment):** 1-2 weeks
- Landing page: 2 days
- Wizard UI (5 steps): 3-4 days
- Install script generator: 2 days
- Testing across OS: 2 days

**V1 (with payment + support):** 3-4 weeks
- Add payment integration: 2 days
- Knowledge base setup: 2 days
- Video walkthroughs (3 videos): 2 days
- Chat widget: 1 day
- Polish + testing: 3-4 days

**Full Version:** 6-8 weeks
- Template marketplace
- Account system with saved configs
- Auto-update mechanism
- Discord bot for support
- Analytics dashboard

### MVP vs Full Scope

**MVP must have:**
- OS detection + platform-specific commands
- API key collection + validation
- Config file generation
- Install script (curl | bash)
- Step verification
- Basic landing page

**MVP can skip:**
- Payment (give it away free initially to validate)
- Accounts/login
- Video walkthroughs (text is fine)
- Live chat (use Discord)
- Templates (one default config)

**Key principle:** Ship the wizard that works for ONE path (Mac + Discord bot) perfectly. Expand to other OS/configurations after validating with real users.
