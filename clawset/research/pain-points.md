# OpenClaw / Clawdbot / MoltBot — Common Setup Problems & Pain Points

*Research date: 2026-02-02*
*Sources: docs.openclaw.ai (FAQ, Troubleshooting, Security, WhatsApp, Windows, Getting Started, Channel Troubleshooting), GitHub issues (openclaw/openclaw)*

---

## 1. Problem Catalogue

### Category A: Installation & First-Run Setup

#### A1. Onboarding stuck on "wake up my friend" / won't hatch
- **Problem:** The onboarding wizard hangs during the initial "hatching" phase and never progresses.
- **How common:** Dedicated FAQ entry — clearly a frequent first-run issue.
- **Fix:** FAQ provides specific steps (restart, check logs, ensure Node version). `openclaw doctor` can diagnose.
- **Wizard automation:** ✅ **Fully automatable** — wizard can pre-check Node version, network, and model auth before attempting hatch.

#### A2. Windows: "git not found" or "openclaw not recognized"
- **Problem:** PATH issues on Windows. Git/Node not in PATH after install, or PowerShell doesn't recognize `openclaw`.
- **How common:** Dedicated FAQ entry — very common for Windows users.
- **Fix:** Ensure Git + Node are installed and in PATH. Use WSL2 instead.
- **Wizard automation:** ✅ **Fully automatable** — wizard can check PATH, detect missing deps, offer to install them.

#### A3. Windows: WSL2 not installed or systemd not enabled
- **Problem:** OpenClaw on Windows requires WSL2 with systemd. Users skip enabling systemd or don't have WSL2 at all.
- **How common:** High — the Windows docs lead with this requirement; it's a gating prerequisite.
- **Fix:** `wsl --install`, enable systemd in `/etc/wsl.conf`, `wsl --shutdown` and restart.
- **Wizard automation:** ✅ **Fully automatable** — wizard can detect Windows, check WSL2 status, guide through setup.

#### A4. Node version too old / wrong runtime
- **Problem:** Node >=22 required. Many users have older Node. Bun is explicitly unsupported for WhatsApp/Telegram.
- **How common:** FAQ entry + troubleshooting mentions. Very common.
- **Fix:** Install Node 22+. Don't use Bun for WA/Telegram channels.
- **Wizard automation:** ✅ **Fully automatable** — detect Node version, block/warn on Bun.

#### A5. Installer stuck / no feedback
- **Problem:** Install script hangs with no progress indication.
- **How common:** Dedicated FAQ entry.
- **Fix:** Run with verbose flags, check network connectivity.
- **Wizard automation:** ✅ **Automatable** — always show progress, add timeouts with clear error messages.

#### A6. pnpm / build failures (from-source installs)
- **Problem:** Users building from source hit pnpm install or build errors.
- **How common:** Moderate — affects developer/hacker users.
- **Fix:** Ensure pnpm installed, correct Node version, run `pnpm ui:build` before `pnpm build`.
- **Wizard automation:** ⚠️ **Partially automatable** — wizard can detect and install pnpm, but build errors may be environment-specific.

---

### Category B: API Keys & Authentication

#### B1. "No API key found for provider 'anthropic'"
- **Problem:** Agent's auth store is empty or missing credentials. New agents don't inherit main agent's keys.
- **How common:** Very common — first item in troubleshooting page.
- **Fix:** Re-run onboarding, use `openclaw models auth setup-token`, or copy `auth-profiles.json`.
- **Wizard automation:** ✅ **Fully automatable** — wizard can verify auth before completing, copy keys to new agents.

#### B2. OAuth token refresh failed (Anthropic Claude subscription)
- **Problem:** Stored OAuth token expired, refresh failed. Subscription auth (no API key) is fragile.
- **How common:** Common enough for dedicated troubleshooting entry.
- **Fix:** Switch to setup-token: `openclaw models auth setup-token --provider anthropic`.
- **Wizard automation:** ⚠️ **Partially automatable** — wizard can recommend API keys over OAuth, detect expiry early, but token refresh is inherently fragile.

#### B3. Confusion between API keys, setup-tokens, OAuth, and subscription auth
- **Problem:** Users don't understand the difference between API key, Claude setup-token, Claude Code OAuth, Codex OAuth, and subscription auth. FAQ has ~8 entries on this topic alone.
- **How common:** Very high — the sheer number of FAQ entries indicates massive confusion.
- **Fix:** Documentation. The FAQ explains each method.
- **Wizard automation:** ✅ **Fully automatable** — wizard should present ONE recommended path per provider, hide complexity.

#### B4. "All models failed" / model failover confusion
- **Problem:** No working model credentials. Users don't understand failover chains.
- **How common:** Dedicated FAQ section.
- **Fix:** Run `openclaw models status`, ensure at least one provider has valid credentials.
- **Wizard automation:** ✅ **Fully automatable** — wizard can probe model connectivity before completing setup.

#### B5. HTTP 429 rate_limit_error from Anthropic
- **Problem:** Rate limiting when using subscription-based auth (shared pool).
- **How common:** FAQ entry — common for subscription users.
- **Fix:** Switch to API key for dedicated rate limits, or reduce request frequency.
- **Wizard automation:** ⚠️ **Partially** — wizard can warn about rate limits with subscription auth.

#### B6. Env vars disappear when running as service
- **Problem:** Gateway service runs with minimal PATH; doesn't load shell init. API keys set in .bashrc/.zshrc aren't available.
- **How common:** Dedicated FAQ entry + troubleshooting section. Very common.
- **Fix:** Put env vars in `~/.openclaw/.env` instead of shell config.
- **Wizard automation:** ✅ **Fully automatable** — wizard should write to `.env` file, never rely on shell env.

#### B7. COPILOT_GITHUB_TOKEN set but "Shell env: off"
- **Problem:** Service doesn't inherit shell environment.
- **How common:** Dedicated FAQ entry.
- **Fix:** Same as B6 — use `.env` file.
- **Wizard automation:** ✅ **Fully automatable** — same solution as B6.

---

### Category C: WhatsApp Connection Issues (Known Major Pain Point)

#### C1. WhatsApp not linked / QR login required
- **Problem:** WhatsApp shows "Not linked" after setup or after phone restarts. QR code must be rescanned.
- **How common:** Very high — dedicated troubleshooting section. WhatsApp uses Baileys (unofficial Web API), inherently fragile.
- **Fix:** `openclaw channels login` to rescan QR. Check `openclaw status --deep`.
- **Wizard automation:** ⚠️ **Partially** — wizard can guide through QR scan, but reconnection is inherently manual.

#### C2. WhatsApp disconnects randomly
- **Problem:** Session drops, reconnect fails, maxAttempts reached.
- **How common:** High — reconnect behavior has dedicated config section with backoff policy.
- **Fix:** Restart gateway, check logs for disconnect reason, may need re-link.
- **Wizard automation:** ⚠️ **Partially** — wizard can set aggressive reconnect defaults, but can't prevent Baileys disconnects.

#### C3. WhatsApp number sourcing confusion
- **Problem:** Users try VoIP/virtual numbers (TextNow, Google Voice) which WhatsApp blocks.
- **How common:** Moderate — docs explicitly warn against this.
- **Fix:** Use real mobile number (eSIM, prepaid SIM). Dedicated number recommended.
- **Wizard automation:** ⚠️ **Partially** — wizard can warn about number requirements, but can't verify number validity.

#### C4. Personal vs dedicated number confusion
- **Problem:** Users don't understand selfChatMode, accidentally spam contacts, or can't get replies working.
- **How common:** High — multiple FAQ entries, detailed docs section.
- **Fix:** Use dedicated number (recommended) or enable `selfChatMode` with correct config.
- **Wizard automation:** ✅ **Fully automatable** — wizard asks "personal or dedicated?" and configures accordingly.

#### C5. WhatsApp group messages not triggering
- **Problem:** Bot doesn't respond in groups. Mention required by default, JID not in allowlist.
- **How common:** FAQ entry: "Why doesn't OpenClaw reply in a group?"
- **Fix:** Add group to allowlist, configure mentionPatterns, set activation mode.
- **Wizard automation:** ✅ **Fully automatable** — wizard can list groups and let user select which to enable.

#### C6. Image + mention only doesn't work
- **Problem:** Sending image with only @mention (no text) — WhatsApp doesn't include mention metadata.
- **How common:** Known issue, documented workaround.
- **Fix:** Add text with the mention: "@openclaw check this" + image.
- **Wizard automation:** ❌ **Not automatable** — WhatsApp platform limitation. Can only document.

#### C7. WhatsApp creds.json corruption
- **Problem:** Credentials file corrupts, requires re-login.
- **How common:** Moderate — backup mechanism exists (creds.json.bak).
- **Fix:** Backup is auto-restored on corruption. Worst case: `openclaw channels logout` then re-login.
- **Wizard automation:** ✅ **Already automated** — backup/restore is built in.

---

### Category D: Gateway Configuration & Startup

#### D1. "Gateway start blocked: set gateway.mode=local"
- **Problem:** Config exists but `gateway.mode` unset. Gateway refuses to start.
- **How common:** Dedicated troubleshooting entry — common after partial setup.
- **Fix:** Run `openclaw configure` or `openclaw config set gateway.mode local`.
- **Wizard automation:** ✅ **Fully automatable** — wizard must always set gateway.mode.

#### D2. "Gateway won't start — configuration invalid"
- **Problem:** Config has unknown keys, malformed values, invalid types. Gateway refuses to start.
- **How common:** Common — dedicated section. Config format is strict.
- **Fix:** `openclaw doctor --fix`.
- **Wizard automation:** ✅ **Fully automatable** — wizard validates config before writing.

#### D3. Port 18789 already in use
- **Problem:** Another process (or previous gateway instance) already using the port.
- **How common:** Moderate — dedicated troubleshooting entry.
- **Fix:** `openclaw gateway status` to identify, stop conflicting process or change port.
- **Wizard automation:** ✅ **Fully automatable** — wizard can detect port conflict and offer alternatives.

#### D4. Service installed but nothing running
- **Problem:** Service appears "loaded" but process exits immediately.
- **How common:** Dedicated troubleshooting entry with extensive diagnostics.
- **Fix:** Check `openclaw gateway status`, `openclaw doctor`, review logs.
- **Wizard automation:** ⚠️ **Partially** — wizard can verify service actually started after install.

#### D5. Config mismatch between CLI and service
- **Problem:** Editing one config while service runs another (different profile/state dir).
- **How common:** Moderate — affects multi-profile setups.
- **Fix:** `openclaw gateway install --force` from correct profile.
- **Wizard automation:** ✅ **Fully automatable** — wizard should ensure CLI and service use same config.

#### D6. config.apply wiped my config
- **Problem:** User accidentally overwrites config.
- **How common:** FAQ entry — enough users hit this to warrant documentation.
- **Fix:** Recovery from backup. Docs explain how to avoid.
- **Wizard automation:** ✅ **Fully automatable** — wizard should always backup before writing config.

#### D7. gateway.bind set to lan/tailnet but no auth configured
- **Problem:** Non-loopback bind requires auth token. Gateway refuses to bind without it.
- **How common:** Dedicated FAQ + troubleshooting entries.
- **Fix:** Set `gateway.auth.token` or `OPENCLAW_GATEWAY_TOKEN`.
- **Wizard automation:** ✅ **Fully automatable** — wizard auto-generates auth token when bind != loopback.

---

### Category E: Channel Configuration Mistakes

#### E1. Telegram allowFrom confusion (usernames vs IDs)
- **Problem:** Users put wrong format in allowFrom for Telegram.
- **How common:** Dedicated FAQ entry.
- **Fix:** Use numeric Telegram user IDs or usernames as documented.
- **Wizard automation:** ✅ **Fully automatable** — wizard can guide format, offer test message.

#### E2. DM pairing not understood
- **Problem:** User sends first message, gets pairing code, doesn't know what to do with it. Thinks bot is broken.
- **How common:** Very high — this is the default DM security posture. Every new user hits this.
- **Fix:** `openclaw pairing approve <channel> <code>`. Documented in Getting Started.
- **Wizard automation:** ✅ **Fully automatable** — wizard should explain pairing, offer to pre-approve owner.

#### E3. Heartbeat messages confusing users
- **Problem:** Users wonder why they get messages every 30 minutes.
- **How common:** FAQ entry.
- **Fix:** Configure or disable heartbeat in config.
- **Wizard automation:** ✅ **Fully automatable** — wizard can explain and configure heartbeat settings.

#### E4. Group JID discovery for WhatsApp
- **Problem:** Users don't know how to find WhatsApp group JIDs for allowlists.
- **How common:** FAQ entry.
- **Fix:** Use `openclaw` CLI commands to list groups.
- **Wizard automation:** ✅ **Fully automatable** — wizard can list groups after WhatsApp login.

#### E5. Discord bot token setup errors
- **Problem:** Wrong permissions, missing intents, token format errors.
- **How common:** Moderate — Discord setup has many steps.
- **Fix:** Follow Discord channel docs carefully.
- **Wizard automation:** ⚠️ **Partially** — wizard can validate token, but Discord bot creation is manual on Discord's site.

#### E6. Telegram IPv6/DNS issues on VPS
- **Problem:** `api.telegram.org` resolves to IPv6 first, VPS lacks IPv6 egress.
- **How common:** Channel troubleshooting page lists this.
- **Fix:** Force IPv4 or enable IPv6.
- **Wizard automation:** ⚠️ **Partially** — wizard can detect IPv6 issues and suggest fix.

---

### Category F: Security Misconfiguration Risks

#### F1. Running with dmPolicy: "open" + tools enabled
- **Problem:** Anyone can message the bot, which has shell access. Prompt injection → arbitrary code execution.
- **How common:** Security audit flags this. Risk is severe.
- **Fix:** Use `pairing` or `allowlist` dmPolicy. Run `openclaw security audit --fix`.
- **Wizard automation:** ✅ **Fully automatable** — wizard should NEVER default to open. Already defaults to pairing.

#### F2. Exposed gateway on LAN/internet without auth
- **Problem:** Gateway bound to 0.0.0.0 or public IP without authentication token.
- **How common:** Security audit flags this. Troubleshooting has dedicated entries.
- **Fix:** Set `gateway.auth.token`, use Tailscale, or keep loopback-only.
- **Wizard automation:** ✅ **Fully automatable** — wizard auto-generates token for non-loopback binds.

#### F3. Control UI over HTTP (no device identity)
- **Problem:** Dashboard on HTTP can't generate device identity (WebCrypto blocked). Insecure fallback needed.
- **How common:** Dedicated troubleshooting + security entries.
- **Fix:** Use HTTPS via Tailscale Serve, or access on 127.0.0.1.
- **Wizard automation:** ⚠️ **Partially** — wizard can warn and recommend HTTPS setup.

#### F4. groupPolicy: "open" allowing any group to trigger bot
- **Problem:** Bot responds in any group it's added to, expanding attack surface.
- **How common:** Security audit flags and auto-fixes this.
- **Fix:** `openclaw security audit --fix` tightens to allowlist.
- **Wizard automation:** ✅ **Fully automatable** — default to allowlist.

#### F5. Session logs readable on disk
- **Problem:** `~/.openclaw/agents/<agentId>/sessions/*.jsonl` readable by any process with filesystem access.
- **How common:** Documented security consideration.
- **Fix:** Lock permissions on `~/.openclaw` (audit --fix does this). Run agents under separate OS users for isolation.
- **Wizard automation:** ✅ **Fully automatable** — wizard can set correct permissions.

#### F6. Plugins from untrusted sources
- **Problem:** Plugins run in-process. npm install can execute arbitrary code during lifecycle scripts.
- **How common:** Security docs warn about this.
- **Fix:** Use `plugins.allow` allowlists, pin versions, inspect code.
- **Wizard automation:** ⚠️ **Partially** — wizard can set up allowlist, but plugin trust is a human decision.

#### F7. Sensitive data in logs (redaction off)
- **Problem:** `logging.redactSensitive` turned off, leaking tokens/messages to log files.
- **How common:** Security audit catches this.
- **Fix:** `openclaw security audit --fix` turns it back on.
- **Wizard automation:** ✅ **Fully automatable** — never turn off redaction by default.

---

### Category G: Post-Setup Learning Curve

#### G1. Memory keeps forgetting things
- **Problem:** Users expect persistent memory but sessions reset. Don't understand MEMORY.md / session lifecycle.
- **How common:** Dedicated FAQ entries on memory.
- **Fix:** Configure session persistence, use MEMORY.md files, set `session.reset` properly.
- **Wizard automation:** ⚠️ **Partially** — wizard can set sensible defaults, but memory model needs user understanding.

#### G2. "Context too large" / context truncation mid-task
- **Problem:** Long conversations exceed model context window.
- **How common:** FAQ entries for both error and truncation.
- **Fix:** Send `/new` to reset, configure `session.historyLimit`, use compaction.
- **Wizard automation:** ⚠️ **Partially** — wizard can set reasonable history limits.

#### G3. Model switching confusion (aliases, defaults, per-task models)
- **Problem:** Users don't understand model aliases, how to switch models, or how to use different models for different tasks.
- **How common:** ~10+ FAQ entries on models alone — very common confusion point.
- **Fix:** Documentation. Use `openclaw models list`, configure aliases.
- **Wizard automation:** ⚠️ **Partially** — wizard can set sensible defaults and aliases, but model management is ongoing.

#### G4. Cron/reminders not firing
- **Problem:** Scheduled tasks don't execute.
- **How common:** FAQ entry.
- **Fix:** Check service is running, cron config correct, timezone set.
- **Wizard automation:** ⚠️ **Partially** — wizard can verify cron prerequisites.

#### G5. Skills not working on Linux (macOS-only skills)
- **Problem:** Users on Linux try macOS-only skills.
- **How common:** FAQ entry.
- **Fix:** Pair a macOS node, or use Linux-compatible alternatives.
- **Wizard automation:** ✅ **Fully automatable** — wizard can filter skills by platform.

#### G6. Sandbox vs host workspace confusion
- **Problem:** `pwd` shows sandbox path when user expected host workspace. Group sessions get sandboxed.
- **How common:** Dedicated troubleshooting entry.
- **Fix:** Configure `sandbox.mode` per agent, set `workspaceAccess`.
- **Wizard automation:** ⚠️ **Partially** — wizard can explain and set initial sandbox config.

#### G7. High memory usage over time
- **Problem:** Gateway accumulates conversation history in memory.
- **How common:** Dedicated troubleshooting entry.
- **Fix:** Set `session.historyLimit`, restart periodically.
- **Wizard automation:** ✅ **Fully automatable** — wizard sets reasonable history limits.

#### G8. Multi-agent routing complexity
- **Problem:** Users want multiple agents with different models/purposes but config is complex.
- **How common:** Multiple FAQ entries on multi-agent setups.
- **Fix:** Documentation. Use `agents.list[]` with bindings.
- **Wizard automation:** ⚠️ **Partially** — wizard can offer templates for common multi-agent patterns.

---

### Category H: Platform-Specific Issues

#### H1. Windows: WSL2 networking (port forwarding required for LAN access)
- **Problem:** WSL2 has its own virtual network. External machines can't reach services inside WSL.
- **How common:** Documented with PowerShell portproxy scripts.
- **Fix:** Use `netsh interface portproxy` to forward ports. WSL IP changes on restart.
- **Wizard automation:** ⚠️ **Partially** — wizard can detect WSL and set up portproxy, but IP changes need scheduled task.

#### H2. macOS: permission issues (Accessibility, Full Disk Access, etc.)
- **Problem:** macOS skills need various system permissions.
- **How common:** Dedicated macOS permissions page.
- **Fix:** Grant permissions in System Preferences.
- **Wizard automation:** ⚠️ **Partially** — wizard can detect missing permissions and guide user, but macOS requires manual approval.

#### H3. Linux VPS: headless browser issues
- **Problem:** Browser control requires display server or headless mode.
- **How common:** Dedicated browser troubleshooting page for Linux.
- **Fix:** Install dependencies, use headless mode.
- **Wizard automation:** ✅ **Fully automatable** — wizard can detect headless environment and configure accordingly.

#### H4. Raspberry Pi: ARM compatibility, performance
- **Problem:** Some dependencies may not work on ARM. Performance is limited.
- **How common:** Dedicated FAQ entries (2 entries).
- **Fix:** Use compatible Node version, expect slower performance.
- **Wizard automation:** ⚠️ **Partially** — wizard can detect ARM and warn about limitations.

---

## 2. Top 20 Problems a Setup Wizard Must Solve

Ranked by estimated frequency (combining FAQ mentions, troubleshooting entries, and structural analysis):

| Rank | Problem | Category | Can Be Fully Automated? |
|------|---------|----------|------------------------|
| **1** | DM pairing not understood — first message gets no reply | E2 | ✅ Yes — pre-approve owner, explain pairing during setup |
| **2** | API key / auth confusion (which method? where to put it?) | B3 | ✅ Yes — present ONE recommended path, hide complexity |
| **3** | "No API key found" — auth not configured or not inherited | B1 | ✅ Yes — verify auth works before completing setup |
| **4** | WhatsApp QR login + disconnection lifecycle | C1, C2 | ⚠️ Partial — guide QR scan, set aggressive reconnect, but Baileys is fragile |
| **5** | Node version wrong or missing | A4 | ✅ Yes — detect and block/fix |
| **6** | Windows: WSL2 not set up / systemd not enabled | A3 | ✅ Yes — detect and guide through setup |
| **7** | Gateway won't start (mode not set, config invalid) | D1, D2 | ✅ Yes — always write valid config with mode set |
| **8** | Env vars lost when running as service | B6 | ✅ Yes — write to .env file, not shell config |
| **9** | Onboarding hangs / "wake up my friend" stuck | A1 | ✅ Yes — pre-flight checks, timeouts, clear errors |
| **10** | WhatsApp personal vs dedicated number confusion | C4 | ✅ Yes — ask and configure correctly |
| **11** | Model switching / alias confusion | G3 | ⚠️ Partial — set good defaults, but ongoing management |
| **12** | Security: open DM policy with shell tools | F1 | ✅ Yes — never default to open, always pairing/allowlist |
| **13** | Gateway exposed without auth token | F2, D7 | ✅ Yes — auto-generate token for non-loopback |
| **14** | Port already in use | D3 | ✅ Yes — detect and offer alternative |
| **15** | WhatsApp group not responding (not in allowlist / mention required) | C5 | ✅ Yes — list groups, let user select |
| **16** | Memory/context confusion (forgetting, truncation) | G1, G2 | ⚠️ Partial — set good defaults, explain model |
| **17** | OAuth token expiry (Anthropic subscription) | B2 | ⚠️ Partial — recommend API keys over OAuth |
| **18** | Windows: "git not found" / "openclaw not recognized" | A2 | ✅ Yes — check PATH, detect missing deps |
| **19** | Channel-specific format errors (Telegram IDs, Discord intents) | E1, E5 | ⚠️ Partial — validate format, but external setup needed |
| **20** | Service installed but not actually running | D4 | ⚠️ Partial — verify after install, but root cause varies |

### Summary

| Automation Level | Count | Problems |
|-----------------|-------|----------|
| **✅ Fully automatable** | 12 | #1, #2, #3, #5, #6, #7, #8, #9, #10, #12, #13, #14 |
| **⚠️ Partially automatable** | 8 | #4, #11, #16, #17, #19, #20, #15¹, #18¹ |

¹ #15 and #18 are borderline fully automatable with good tooling.

### Key Insight for Wizard Design

**60% of the top 20 problems are fully automatable.** The remaining 40% can be significantly mitigated with:
- Better pre-flight checks (detect environment before starting)
- Guided flows with validation at each step
- Sensible defaults that prevent footguns
- Post-setup verification ("did everything actually work?")

The **single biggest win** is solving #1 + #2 + #3 together: a setup wizard that handles auth correctly AND explains the pairing model would eliminate the most common "it's broken / no reply" experience that kills first-run success.

The **second biggest win** is platform detection (#5, #6, #18): knowing whether the user is on Windows/Mac/Linux/WSL and adapting the flow accordingly prevents an entire class of environment errors.

**WhatsApp** (#4, #10, #15) remains the hardest channel to automate due to Baileys' unofficial nature and WhatsApp's anti-bot measures. The wizard should set expectations clearly and provide robust reconnection defaults.
