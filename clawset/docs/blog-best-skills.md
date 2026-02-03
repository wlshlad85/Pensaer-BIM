# The 10 Best OpenClaw Skills in 2026: The Definitive Guide

*Last updated: June 2026 · Reading time: ~18 minutes*

Your OpenClaw agent is running. It answers messages, remembers your preferences, and handles basic tasks. But right now, it's like a smartphone with no apps installed — capable hardware running on potential alone.

Skills are what turn OpenClaw from a clever chatbot into something genuinely useful. They're modular knowledge packs that teach your agent *how* to do specific things: control your smart home, manage your calendar, write code in your preferred style, monitor your servers. Each skill is a folder of markdown files and optional scripts that your agent reads and follows.

This guide covers the 10 best OpenClaw skills in 2026 — the ones that are actually worth installing, actually work reliably, and actually change how you use your assistant day-to-day. No filler, no vapourware, no "coming soon" skills that exist only as a README.

But first, let's make sure you know how to install them.

---

## How to Install OpenClaw Skills (Tutorial)

If you've never installed a skill before, this section will take you from zero to working in under five minutes.

### What is a skill?

A skill is a folder inside your OpenClaw workspace's `skills/` directory. At minimum, it contains a `SKILL.md` file — a structured document that tells your agent what the skill does, when to use it, and how to use it. Some skills also include scripts, templates, or configuration files.

Your agent reads `SKILL.md` automatically when it needs the skill. No compilation. No build steps. Drop it in the folder, and your agent knows it.

### Method 1: Install from ClawHub (Recommended)

ClawHub is the community registry for OpenClaw skills. If a skill is published there, installation is one command:

```bash
openclaw skill install <skill-name>
```

For example:

```bash
openclaw skill install home-assistant
```

This downloads the skill to your `skills/` directory, validates the `SKILL.md` format, and runs any setup hooks (like checking for required API keys).

To browse available skills:

```bash
openclaw skill search <keyword>
```

To update all installed skills:

```bash
openclaw skill update
```

### Method 2: Install from Git

Many skill authors publish directly on GitHub. You can install from any git repository:

```bash
openclaw skill install --git https://github.com/author/openclaw-skill-name
```

Or if you prefer doing it manually:

```bash
cd your-openclaw-workspace/skills
git clone https://github.com/author/openclaw-skill-name skill-name
```

### Method 3: Manual Installation

Download or create the skill folder, drop it into `skills/`, and make sure it has a valid `SKILL.md` at the root. That's it.

```
your-workspace/
  skills/
    my-new-skill/
      SKILL.md        ← required
      scripts/        ← optional
      templates/      ← optional
```

### Verifying Installation

After installing any skill, confirm it's detected:

```bash
openclaw skill list
```

You should see your new skill in the output. If it's not showing, check that the folder is directly inside `skills/` (not nested in a subdirectory) and that `SKILL.md` exists and has valid YAML frontmatter.

### A Note on Skill Quality

Not all skills are created equal. The best skills have:
- Clear frontmatter with `name`, `description`, and `metadata`
- Explicit trigger conditions (when should the agent use this?)
- Error handling instructions (what should the agent do when things go wrong?)
- Minimal external dependencies

The skills in this guide all meet that bar.

---

## The 10 Best OpenClaw Skills in 2026

### 1. Home Assistant Bridge

**What it does:** Connects your OpenClaw agent to a Home Assistant instance, giving it full control over your smart home — lights, thermostats, locks, sensors, cameras, automations, and scenes. Your agent can query device states, execute commands, trigger automations, and even create new routines based on natural language.

**Real use case:** You message your agent on WhatsApp: "I'm heading to bed." It dims the living room lights to 0%, locks the front door, sets the thermostat to 18°C, arms the alarm, and turns on your bedroom white noise machine. All from one sentence, no specific commands needed — because the skill teaches your agent what "heading to bed" means in the context of your home.

**Installation:**

```bash
openclaw skill install home-assistant
```

You'll need to set `HA_URL` and `HA_TOKEN` in your environment or `.env` file. The skill walks you through generating a long-lived access token in Home Assistant.

**Difficulty:** ⭐⭐ (Easy — if you already have Home Assistant running)

**Pros:**
- Most comprehensive smart home skill available
- Supports 2,000+ Home Assistant integrations by extension
- Natural language device control without rigid command syntax
- Can create and modify automations, not just trigger existing ones

**Cons:**
- Requires a running Home Assistant instance (not a beginner setup itself)
- Initial device mapping can take a few iterations to get right
- Complex scenes with 10+ devices sometimes need explicit confirmation prompts

---

### 2. Google Workspace Manager

**What it does:** Gives your agent read/write access to Gmail, Google Calendar, Google Drive, and Google Contacts. It can triage your inbox, draft replies, schedule meetings, find files, and manage contacts — all through natural conversation.

**Real use case:** During a heartbeat check at 8:30am, your agent scans your inbox and messages you: "You've got 3 things worth looking at — a contract from Sarah that needs signing by Friday, a meeting reschedule request from Dave (he wants to move tomorrow's 2pm to Thursday), and a shipping notification for your keyboard. Want me to handle the reschedule and flag the contract?" You reply "yes" and it's done.

**Installation:**

```bash
openclaw skill install google-workspace
```

Requires OAuth2 setup with a Google Cloud project. The skill includes a step-by-step guide for creating credentials, but budget 15–20 minutes for the initial Google Cloud Console configuration.

**Difficulty:** ⭐⭐⭐ (Moderate — Google OAuth setup is the bottleneck)

**Pros:**
- Covers the full Google Workspace suite in one skill
- Intelligent email triage that learns your priorities over time
- Calendar conflict detection and automatic rescheduling suggestions
- Works with both personal Gmail and Google Workspace (business) accounts

**Cons:**
- Google OAuth2 setup is tedious (not the skill's fault — blame Google)
- Token refresh can occasionally fail, requiring manual re-auth
- Gmail API rate limits can bite if your agent checks too frequently

---

### 3. Git & GitHub Ops

**What it does:** Teaches your agent to work with Git repositories and the GitHub API. It can check repo status, create branches, review pull requests, manage issues, write commit messages, and even push code changes — all from a chat message.

**Real use case:** You're on your phone and remember a bug you spotted yesterday. You message your agent: "Create an issue on pensaer-bim about the curtain wall grid snapping being off by 1px when the zoom level is below 50%. Label it as a bug, priority medium." Your agent creates the issue with a properly formatted description, applies the labels, and sends you the link.

**Installation:**

```bash
openclaw skill install github-ops
```

Requires a GitHub Personal Access Token with `repo` and `issues` scopes. Set `GITHUB_TOKEN` in your environment.

**Difficulty:** ⭐ (Easy)

**Pros:**
- Dead simple setup — one token and you're running
- Covers the most common Git and GitHub workflows
- Great commit message generation based on staged changes
- PR review summaries save serious time on large diffs

**Cons:**
- Push operations require explicit confirmation (by design, but can feel slow)
- Doesn't support GitLab or Bitbucket (separate skills exist for those)
- Complex merge conflict resolution still needs human intervention

---

### 4. Finance Tracker

**What it does:** Tracks personal or small business finances through natural conversation. Logs expenses, categorises transactions, generates spending reports, tracks budgets, and can parse bank statement CSVs or connect to open banking APIs.

**Real use case:** You snap a photo of a receipt at lunch and send it to your agent. It reads the receipt: "£47.30 at Dishoom, categorised as Dining Out. You've spent £185 of your £250 dining budget this month. Want me to log it?" Over time, it builds a picture of your spending that you can query — "How much did I spend on subscriptions last quarter?" — and get an instant answer.

**Installation:**

```bash
openclaw skill install finance-tracker
```

No external APIs required for basic manual tracking. Optional: configure open banking credentials for automatic transaction import.

**Difficulty:** ⭐⭐ (Easy)

**Pros:**
- Works immediately with zero configuration for manual expense logging
- Receipt photo parsing via vision models
- Customisable categories and budget thresholds
- CSV import for bank statements
- All data stays local in your workspace

**Cons:**
- Open banking integration is region-dependent (UK and EU best supported)
- Not a replacement for proper accounting software for businesses
- Currency conversion relies on cached exchange rates (updates daily)

---

### 5. NotebookLM Bridge

**What it does:** Prepares, exports, and syncs content from your OpenClaw workspace to Google NotebookLM for AI-powered research, Audio Overviews, mind maps, and slide generation. It bridges the gap between your agent's local knowledge and NotebookLM's powerful research tools.

**Real use case:** You're preparing a presentation on curtain wall facade systems. You tell your agent: "Send all my BIM research notes to NotebookLM and generate an Audio Overview." It collects your scattered markdown files, cleans and formats them as NotebookLM-compatible sources, syncs them to Google Drive, and optionally triggers Audio Overview generation — giving you a podcast-style summary of your own research that you can listen to while commuting.

**Installation:**

```bash
openclaw skill install notebooklm
```

Requires Google Drive API access (can share credentials with the Google Workspace skill) and optionally browser automation for direct NotebookLM interaction.

**Difficulty:** ⭐⭐⭐ (Moderate)

**Pros:**
- Turns scattered workspace files into structured research notebooks
- Audio Overview generation is genuinely transformative for review
- Supports markdown, PDFs, and plain text source formats
- Smart deduplication — won't re-upload unchanged files

**Cons:**
- NotebookLM has no public API, so some features rely on browser automation
- Google Drive sync adds a dependency layer
- Audio Overviews can take several minutes to generate (NotebookLM limitation)

---

### 6. Server Monitor

**What it does:** Monitors remote servers and services via SSH, HTTP health checks, and system metrics. Your agent can check server status, disk usage, CPU load, running processes, SSL certificate expiry, and uptime — then alert you when something looks wrong.

**Real use case:** It's 2am and your VPS hosting a client project runs out of disk space. Your agent's heartbeat check catches it, clears the log rotation backlog via SSH, and sends you a WhatsApp message: "Your server at 185.x.x.x hit 95% disk usage. I cleared 2.3GB of old logs and it's back to 67%. The root cause is your app logging at DEBUG level in production — want me to switch it to WARN and restart the service?" You wake up to a solved problem instead of an angry client.

**Installation:**

```bash
openclaw skill install server-monitor
```

Requires SSH key access to your servers. Configure monitored hosts in the skill's `config.yaml`. No agent installation on the remote servers needed.

**Difficulty:** ⭐⭐⭐ (Moderate — SSH key management is the main complexity)

**Pros:**
- Agentless monitoring — nothing to install on remote servers
- Proactive alerting through heartbeat integration
- Can take corrective action, not just report problems
- SSL certificate expiry warnings save you from embarrassing outages

**Cons:**
- SSH access means your OpenClaw machine is a high-value target — secure it
- Not a replacement for proper monitoring stacks (Prometheus/Grafana) at scale
- Network latency can make health checks noisy if your connection is unstable

---

### 7. Calendar Intelligence

**What it does:** Goes beyond basic calendar CRUD to provide intelligent scheduling. It analyses your meeting patterns, protects focus time, suggests optimal meeting slots, handles timezone conversions, and manages scheduling conflicts proactively.

**Real use case:** Someone emails you asking to meet next week. Your agent analyses your calendar and replies (with your approval): "Rich is available Tuesday 10–11am or Thursday 2–3pm GMT. Tuesday morning is better — he has a 90-minute focus block after, so the context switch cost is lower." It's not just finding empty slots. It's finding *good* slots based on how you actually work.

**Installation:**

```bash
openclaw skill install calendar-intel
```

Works with Google Calendar (pairs with Google Workspace skill) or CalDAV-compatible calendars. Can operate standalone or as an enhancement to the Google Workspace skill.

**Difficulty:** ⭐⭐ (Easy, if you already have calendar API access)

**Pros:**
- Focus time protection is the killer feature — it actually works
- Timezone handling is bulletproof (stores everything in UTC, displays in context)
- Meeting prep briefs before important calendar events
- Learns your scheduling preferences over time

**Cons:**
- Requires 2–3 weeks of calendar data to generate meaningful pattern analysis
- "Optimal slot" suggestions can feel opinionated if your work style is irregular
- Only useful if you actually use a digital calendar consistently

---

### 8. Research Agent

**What it does:** Turns your agent into a thorough web researcher. Given a topic, it performs multi-step research — searching, reading, cross-referencing, and synthesising — then delivers a structured report with sources. It's the difference between "search the web for X" and "research X thoroughly and tell me what matters."

**Real use case:** You're evaluating a new JavaScript framework for a project. Instead of spending 2 hours reading blog posts and GitHub issues, you ask your agent: "Research Svelte 5 vs React 19 for a BIM web application. Focus on 3D rendering performance, bundle size, and developer experience. I need a recommendation by tomorrow." Two hours later, your agent delivers a structured comparison with benchmarks, community sentiment, and a clear recommendation with reasoning.

**Installation:**

```bash
openclaw skill install research-agent
```

Uses your agent's existing web search and fetch capabilities. No additional API keys required. Optionally configure preferred sources or blocked domains.

**Difficulty:** ⭐ (Easy)

**Pros:**
- Zero configuration — works out of the box with built-in web tools
- Source attribution on every claim (no hallucinated citations)
- Configurable depth: quick scan, standard research, or deep dive
- Outputs in clean markdown, ready to use

**Cons:**
- Deep research can consume significant API tokens (multiple model calls)
- Paywalled content behind logins is inaccessible
- Research quality is bounded by what's publicly available on the web
- Can take 30–60 minutes for comprehensive deep-dive reports

---

### 9. Sonos & Media Control

**What it does:** Controls Sonos speakers and media playback throughout your home. Play music, adjust volume, group speakers, set alarms, and manage queues — all through natural language messages to your agent.

**Real use case:** You're cooking dinner and your hands are covered in flour. You shout to no one in particular — but you've got your WhatsApp open on the counter. You voice-note your agent: "Play some jazz in the kitchen, not too loud." Your agent sends the command to your Sonos kitchen speaker, sets the volume to 30%, and queues up a jazz playlist. Later: "Move the music to the living room" — and it groups the speakers seamlessly.

**Installation:**

```bash
openclaw skill install sonos-control
```

Requires Sonos speakers on the same network as your OpenClaw machine. The skill auto-discovers speakers via SSDP. Optionally, configure speaker nicknames in the skill config.

**Difficulty:** ⭐⭐ (Easy)

**Pros:**
- Automatic speaker discovery — no IP addresses to configure manually
- Natural language volume control ("a bit louder", "quiet background level")
- Speaker grouping and room-to-room transfer
- TTS playback — your agent can *speak* through your speakers

**Cons:**
- Requires network-level access to Sonos (some corporate/guest networks block this)
- Spotify/Apple Music integration depends on what's linked to your Sonos account
- Occasional 2–3 second delay between command and playback start

---

### 10. ByteRover Context Tree

**What it does:** Manages project-level knowledge using a persistent context tree. It gives your agent a long-term memory for codebases and projects — storing patterns, conventions, decisions, and insights that survive across sessions. Think of it as a project wiki that your agent maintains and queries automatically.

**Real use case:** You're working on a complex codebase with specific patterns — maybe JWT auth with 24-hour expiry, a particular folder structure convention, or a decision to use Zustand over Redux and the reasoning behind it. Without ByteRover, your agent might re-discover these things every session. With it, your agent queries the context tree first: "How is auth implemented?" — and gets an instant, accurate answer based on what was previously curated.

**Installation:**

```bash
openclaw skill install byterover
```

Requires a ByteRover account (free tier available at [byterover.dev](https://byterover.dev)). Set `BRV_API_KEY` in your environment.

**Difficulty:** ⭐⭐ (Easy)

**Pros:**
- Eliminates the "cold start" problem — your agent remembers project context across sessions
- Two clean operations: `query` (retrieve) and `curate` (store)
- Works across multiple projects with isolated context trees
- Reduces redundant API calls by caching institutional knowledge

**Cons:**
- Requires discipline to curate — garbage in, garbage out
- Free tier has storage limits that active projects can hit
- Context can become stale if not periodically reviewed and pruned

---

## Quick Comparison Table

| Skill | Difficulty | Setup Time | API Keys Needed | Best For |
|-------|-----------|------------|-----------------|----------|
| Home Assistant Bridge | ⭐⭐ | 10 min | HA Token | Smart home owners |
| Google Workspace | ⭐⭐⭐ | 20 min | Google OAuth2 | Email/calendar power users |
| Git & GitHub Ops | ⭐ | 3 min | GitHub PAT | Developers |
| Finance Tracker | ⭐⭐ | 5 min | None (optional) | Everyone |
| NotebookLM Bridge | ⭐⭐⭐ | 15 min | Google Drive API | Researchers, students |
| Server Monitor | ⭐⭐⭐ | 15 min | SSH keys | Devops, freelance devs |
| Calendar Intelligence | ⭐⭐ | 5 min | Calendar API | Busy professionals |
| Research Agent | ⭐ | 2 min | None | Everyone |
| Sonos & Media Control | ⭐⭐ | 5 min | None | Sonos owners |
| ByteRover Context Tree | ⭐⭐ | 5 min | ByteRover API key | Developers |

---

## How to Choose Your First Skills

Don't install all ten at once. Skills add context to your agent's system prompt, and too many skills means more token usage and slower responses.

**Start with two or three** that match your daily workflow:

- **If you're a developer:** Git & GitHub Ops + ByteRover Context Tree + Research Agent
- **If you work from home:** Home Assistant Bridge + Sonos & Media Control + Calendar Intelligence
- **If you manage a business:** Google Workspace + Finance Tracker + Calendar Intelligence
- **If you're a student or researcher:** Research Agent + NotebookLM Bridge + Google Workspace

You can always add more later. The beauty of OpenClaw's skill system is that installation and removal are instant — there's nothing to compile, no dependencies to untangle. Drop the folder in, take the folder out.

---

## Building Your Own Skills

Found a gap in the ecosystem? The best OpenClaw skills in 2026 started as someone's personal hack. Writing a skill is straightforward:

1. Create a folder in `skills/`
2. Write a `SKILL.md` with YAML frontmatter (`name`, `description`)
3. Document when the agent should use it (trigger conditions)
4. Document how the agent should use it (procedures, commands, examples)
5. Test it in conversation

The [OpenClaw skill authoring guide](https://openclaw.dev/docs/skills/authoring) covers the full spec, but the barrier to entry is low: if you can write clear instructions that a human could follow, you can write a skill.

Share what you build on ClawHub. The community is small enough that good skills get noticed fast.

---

## Final Thoughts

The best OpenClaw skills in 2026 aren't the flashiest — they're the ones that quietly save you 20 minutes a day, every day. A well-configured agent with three solid skills will outperform one stuffed with fifteen mediocre ones.

Install thoughtfully. Configure properly. Let your agent learn your patterns. That's where the magic is.

---

*Looking for help setting up OpenClaw or configuring skills? Check out our [complete setup guide](/blog/setup-guide) or browse the [ClawHub skill registry](https://openclaw.dev/skills).*
