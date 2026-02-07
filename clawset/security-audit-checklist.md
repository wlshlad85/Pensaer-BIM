# OpenClaw Security Audit Checklist

**Version:** 1.0  
**Last Updated:** 2026-02-03  
**Purpose:** Comprehensive security assessment for OpenClaw installations

---

## How to Use This Checklist

**During Manual Setup Sessions:**
- Walk through each section with customer
- Check items as configured
- Document any "⚠️ RISKY" findings
- Prioritize fixes based on customer use case

**As Standalone Audit Service:**
- Customer sends their `openclaw.json` (with API keys redacted)
- Review config against checklist
- Generate report: ✅ Safe / ⚠️ Warning / 🚨 Critical
- Deliver prioritized fix list

**For Wizard Development:**
- Each ✅ item becomes a wizard validation step
- Each ⚠️ triggers a warning prompt
- Each 🚨 blocks progress until fixed

---

## 1. Authentication & API Keys

### ☑️ API Keys
- [ ] API keys stored in config (not environment variables)
- [ ] API keys never committed to git (`.openclaw/` in `.gitignore`)
- [ ] Unused provider keys removed from config
- [ ] API keys have appropriate scopes (not "full account access")
- [ ] Rotation plan exists for long-lived keys

**🚨 CRITICAL:** If API keys in git history → immediate key rotation required

**✅ SAFE PATTERN:**
```json
"auth": {
  "profiles": {
    "anthropic:default": {
      "provider": "anthropic",
      "mode": "token"
    }
  }
}
```

**🚨 UNSAFE PATTERN:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..." # In .bashrc
```
*(Environment vars work but aren't persisted safely in OpenClaw config)*

---

## 2. Gateway Security

### ☑️ Gateway Mode & Binding
- [ ] Gateway mode set to `local` (not `public` unless intentional)
- [ ] Bind address is `loopback` (not `0.0.0.0`)
- [ ] Auth mode is `token` (not `off`)
- [ ] Gateway token is strong (32+ chars random)
- [ ] Tailscale properly configured if using remote access

**🚨 CRITICAL:** `mode: "public"` + `bind: "0.0.0.0"` + `auth: "off"` = anyone on internet can control your agent

**✅ SAFE PATTERN:**
```json
"gateway": {
  "port": 18789,
  "mode": "local",
  "bind": "loopback",
  "auth": {
    "mode": "token",
    "token": "<32-char-random-string>"
  }
}
```

**⚠️ WARNING PATTERN:**
```json
"gateway": {
  "mode": "public",  // ⚠️ Only if you need remote access
  "bind": "0.0.0.0", // ⚠️ Exposes to network
  "auth": {
    "mode": "off"    // 🚨 NEVER do this
  }
}
```

---

## 3. Channel Security

### ☑️ WhatsApp
- [ ] `dmPolicy` is `allowlist` (not `allow-all`)
- [ ] `allowFrom` contains ONLY your number
- [ ] `groupPolicy` is `disabled` or `allowlist` (not `allow-all`)
- [ ] `selfChatMode` understood (enables "Notes to Self" functionality)
- [ ] `mediaMaxMb` set to reasonable limit (50 or less)

**🚨 CRITICAL:** `dmPolicy: "allow-all"` = anyone with your number can control your agent

**✅ SAFE PATTERN:**
```json
"whatsapp": {
  "dmPolicy": "allowlist",
  "allowFrom": ["+447405601066"],
  "groupPolicy": "disabled",
  "selfChatMode": true,
  "mediaMaxMb": 50
}
```

### ☑️ Telegram
- [ ] `dmPolicy` is `allowlist`
- [ ] `allowFrom` contains your numeric user ID (not username)
- [ ] `groupPolicy` restrictive or disabled
- [ ] Bot token kept private (never shared publicly)

**⚠️ WARNING:** Telegram usernames can be changed. Always use numeric ID in allowlist.

### ☑️ Discord
- [ ] Bot permissions scoped minimally (not Administrator)
- [ ] Server/channel allowlists configured
- [ ] Bot not in public servers unless intentional
- [ ] Intents properly scoped (not "all")

### ☑️ Signal
- [ ] `dmPolicy` is `allowlist`
- [ ] Only trusted numbers in allowFrom
- [ ] Group chats explicitly allowed (not default-open)

---

## 4. Tool & Execution Security

### ☑️ Exec Tool
- [ ] `exec.security` is NOT `full` (unless you understand the risk)
- [ ] `exec.ask` is NOT `off` (agent should confirm destructive commands)
- [ ] `exec.allowlist` configured if using `allowlist` security mode
- [ ] Workspace directory is NOT root (`/` or `C:\`)
- [ ] Elevated permissions justified and documented

**🚨 CRITICAL:** `exec: { security: "full", ask: "off" }` = agent can run ANY command without asking

**✅ SAFE PATTERN (Default User):**
```json
"agents": {
  "defaults": {
    "workspace": "/home/user/projects",
    "exec": {
      "security": "allowlist",  // or "deny"
      "ask": "on-miss",         // Confirm unknown commands
      "allowlist": [
        "git", "npm", "node", "ls", "cat"  // Explicitly safe commands
      ]
    }
  }
}
```

**⚠️ ELEVATED PATTERN (Power User):**
```json
"agents": {
  "defaults": {
    "exec": {
      "security": "full",     // ⚠️ Agent can run anything
      "ask": "off"            // 🚨 Without confirmation
    }
  }
}
```
*Only if you trust the model 100% and understand blast radius*

### ☑️ File Access
- [ ] Workspace directory is scoped (not system root)
- [ ] Sensitive directories outside workspace (e.g., `~/.ssh`, `~/.aws`)
- [ ] Agent doesn't have write access to critical system paths
- [ ] `.gitignore` in workspace excludes `.openclaw/` and `.env`

### ☑️ Browser Tool
- [ ] Browser profile isolated (not your main Chrome profile)
- [ ] Browser extensions reviewed (nothing malicious)
- [ ] Login sessions managed (agent can't access your bank account)

---

## 5. Channel-Specific Risks

### ☑️ WhatsApp-Specific
- [ ] Understand unofficial API (Baileys) = can break
- [ ] Have backup communication method (Telegram, webchat)
- [ ] Not using for critical/time-sensitive automation
- [ ] Reconnect settings configured (`debounceMs`, `reconnect`)

### ☑️ Discord-Specific
- [ ] Agent not posting in public servers without monitoring
- [ ] Webhook URLs kept private
- [ ] Rate limits understood (to avoid API bans)

### ☑️ Telegram-Specific
- [ ] Bot token never shared in public channels
- [ ] Understand bot vs user-bot differences (bots can't initiate DMs)

---

## 6. Memory & Data Privacy

### ☑️ Memory Files
- [ ] `MEMORY.md` doesn't contain secrets (API keys, passwords, tokens)
- [ ] Daily memory files (`memory/YYYY-MM-DD.md`) cleaned periodically
- [ ] Sensitive customer data NOT stored in memory (use separate secure storage)
- [ ] Memory files excluded from public repos (if workspace is git-tracked)

### ☑️ Session Transcripts
- [ ] Session history retention period defined
- [ ] Sensitive conversations not logged permanently
- [ ] Session memory cleared when sharing workspace

---

## 7. Network & Remote Access

### ☑️ Tailscale (if used)
- [ ] Tailscale ACLs restrict access to your devices only
- [ ] `resetOnExit` configured appropriately
- [ ] Exit nodes understood (traffic routing)

### ☑️ VPS/Cloud Deployments
- [ ] Firewall configured (only necessary ports open)
- [ ] SSH key-based auth (password auth disabled)
- [ ] Fail2ban or similar brute-force protection
- [ ] Regular security updates applied
- [ ] Backups automated and tested

---

## 8. Multi-User & Team Setups

### ☑️ Shared Agents
- [ ] Each user has separate allowlist entry
- [ ] User-specific workspaces if needed
- [ ] Audit logging enabled
- [ ] Clear ownership of agent actions

### ☑️ Company/Work Use
- [ ] Company data segregated from personal
- [ ] Compliance requirements met (GDPR, SOC2, etc.)
- [ ] API keys owned by company (not personal accounts)
- [ ] Offboarding process defined (revoke access when employee leaves)

---

## 9. Operational Security

### ☑️ Updates & Maintenance
- [ ] OpenClaw updated regularly (`openclaw update`)
- [ ] Update notifications enabled
- [ ] Breaking changes reviewed before updating
- [ ] Rollback plan exists (backup config before updates)

### ☑️ Monitoring
- [ ] Error logs reviewed periodically
- [ ] Unexpected behavior investigated
- [ ] Resource usage monitored (CPU, memory, disk)

### ☑️ Incident Response
- [ ] Plan for "agent went rogue" scenario (how to stop it)
- [ ] Emergency kill switch known (`openclaw stop`)
- [ ] Contact for support/help identified

---

## 10. Integration Security

### ☑️ Skills & Plugins
- [ ] Only trusted skills installed
- [ ] Skills reviewed before enabling
- [ ] Unused skills disabled
- [ ] Skill permissions scoped minimally

### ☑️ External Services
- [ ] OAuth scopes reviewed (not "full account access")
- [ ] Service-specific API keys rotated periodically
- [ ] Webhook secrets kept private
- [ ] Third-party integrations documented

---

## Scoring System

**For each section:**
- All ✅ = **SAFE** (green)
- 1-2 ⚠️ = **WARNING** (yellow, fix recommended)
- Any 🚨 = **CRITICAL** (red, fix immediately)

**Overall Security Score:**
```
Total checks: [X]
Passed: [Y]
Warnings: [Z]
Critical: [C]

Score: (Y / X) * 100 = [%]%

90-100% = Excellent
70-89% = Good (address warnings)
50-69% = Fair (significant risk)
<50% = Poor (immediate action required)
```

---

## Common High-Risk Configs (Auto-Fail Audit)

🚨 **Instant Fail Patterns:**

1. **Open Gateway:**
```json
"gateway": { "mode": "public", "auth": { "mode": "off" } }
```

2. **Unrestricted Exec:**
```json
"exec": { "security": "full", "ask": "off" }
```

3. **Open DM Policy:**
```json
"whatsapp": { "dmPolicy": "allow-all" }
```

4. **API Keys in Git:**
```bash
git log --all --source --full-history -S "sk-ant-"
```

If ANY of these exist → 🚨 CRITICAL, must fix before proceeding.

---

## Audit Report Template

```markdown
# OpenClaw Security Audit Report

**Date:** [DATE]
**Auditor:** [NAME]
**Customer:** [NAME/COMPANY]
**Installation:** [PLATFORM] - [USE CASE]

## Executive Summary
- **Overall Score:** [X]%
- **Critical Issues:** [C]
- **Warnings:** [W]
- **Safe Checks:** [S]

## Critical Issues (Fix Immediately)
1. [Description] - [Section] - [Fix]
2. ...

## Warnings (Fix Soon)
1. [Description] - [Section] - [Recommendation]
2. ...

## Recommendations
- [Priority 1 action item]
- [Priority 2 action item]
- ...

## Sign-Off
Reviewed by: [NAME]
Date: [DATE]
Next review: [DATE + 3 months]
```

---

## Wizard Integration Notes

**Each checklist item → wizard step:**

### Example: Gateway Security (Step 4 of wizard)
```javascript
{
  step: "gateway_security",
  title: "Secure Your Gateway",
  checks: [
    {
      id: "gateway_mode",
      question: "How will you access OpenClaw?",
      options: [
        { value: "local", label: "Only on this computer", safe: true },
        { value: "tailscale", label: "Remote via Tailscale", safe: true },
        { value: "public", label: "Public internet", safe: false, warning: "Not recommended unless you understand the risks" }
      ],
      config: "gateway.mode"
    },
    {
      id: "gateway_auth",
      question: "Enable authentication?",
      options: [
        { value: "token", label: "Yes (recommended)", safe: true },
        { value: "off", label: "No", safe: false, critical: true, block: true }
      ],
      config: "gateway.auth.mode"
    }
  ]
}
```

**Validation:**
- ✅ Safe choice → proceed
- ⚠️ Warning choice → show explanation, require confirmation
- 🚨 Critical choice → block, show error, require safe alternative

---

*This checklist is the foundation for all Clawhatch security work.*
