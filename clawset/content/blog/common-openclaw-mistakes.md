# 10 Common OpenClaw Setup Mistakes (And How to Fix Them)

**SEO Meta:**
- Title: 10 Common OpenClaw Setup Mistakes to Avoid | Troubleshooting Guide
- Description: Learn the most common OpenClaw mistakes that break security or functionality. Real examples, solutions, and prevention tips from 50+ installations.
- Keywords: openclaw mistakes, openclaw problems, openclaw troubleshooting, openclaw not working, openclaw security issues

---

I've audited 50+ OpenClaw installations. The same mistakes keep appearing.

Most are invisible — your agent "works" but has security holes. Others break functionality in confusing ways.

This guide covers the **10 most common mistakes** I see, how to fix them, and how to avoid them.

---

## Mistake #1: Using `dmPolicy: "allow-all"`

### What It Looks Like

```json
{
  "channels": {
    "telegram": {
      "dmPolicy": "allow-all"  // ❌ BAD
    }
  }
}
```

### Why It's Dangerous

**Anyone can control your agent.**

If they have your Telegram bot username, they can DM it commands. Your API keys, your files, your accounts — all accessible.

### Real Example

Developer set `allow-all` for "easier testing." Forgot to change it. Random person found the bot, asked it to tweet. Bot tweeted confidential product launch details. Client found out. Developer fired.

### The Fix

```json
{
  "channels": {
    "telegram": {
      "dmPolicy": "allowlist",
      "allowFrom": [123456789]  // ✅ GOOD - your numeric user ID
    }
  }
}
```

**How to get your ID:**
1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It replies with your ID (numeric)
3. Add that to `allowFrom`

### Prevention

**Never use `allow-all` in production.** Ever. Not even "just for testing."

If you need to test with multiple users, use `allowlist` with multiple IDs:

```json
{
  "allowFrom": [123456789, 987654321, 555555555]
}
```

---

## Mistake #2: Committing API Keys to Git

### What It Looks Like

```bash
git add .openclaw/
git commit -m "backup config"
git push origin main
```

### Why It's Dangerous

Even if you delete the commit later, **keys are in git history forever.**

Bots scan GitHub for exposed API keys. Within hours of committing, your keys are harvested and used.

### Real Example

Developer committed `.openclaw/` to public repo. Didn't notice for 3 weeks. Bot found keys, racked up $2,400 in Claude API charges. Anthropic flagged account for abuse.

### The Fix

**If you already committed keys:**

```bash
# 1. Add .openclaw/ to .gitignore
echo ".openclaw/" >> .gitignore

# 2. Remove from git (keeps local copy)
git rm -r --cached .openclaw/

# 3. Commit the removal
git commit -m "Remove API keys from git"

# 4. IMMEDIATELY rotate all API keys
# - Anthropic: console.anthropic.com → Settings → API Keys
# - OpenAI: platform.openai.com → API keys
# - etc.
```

**If public repo:** Git history rewrite won't help (people have clones). **Rotate keys immediately.**

### Prevention

**Before first commit:**

```bash
echo ".openclaw/" >> .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Ignore sensitive files"
```

Then commit other files.

---

## Mistake #3: `exec.security: "full"` + `ask: "off"`

### What It Looks Like

```json
{
  "agents": {
    "defaults": {
      "exec": {
        "security": "full",  // ❌ Agent can run ANY command
        "ask": "off"          // ❌ Without asking
      }
    }
  }
}
```

### Why It's Dangerous

Agent can run **any command** without confirmation. Deletions, system changes, network requests — all unvetted.

### Real Example

Solo founder gave agent full exec access. Agent "helped" by cleaning old Docker containers. Accidentally deleted production database container. No backups (was "temporary testing setup"). 3 months of customer data gone.

### The Fix

**Option 1: Allowlist (Recommended)**

```json
{
  "exec": {
    "security": "allowlist",
    "ask": "on-miss",  // Asks before running unlisted commands
    "allowlist": [
      "git", "npm", "ls", "cat", "grep", "pwd", "cd"
    ]
  }
}
```

**Option 2: Keep Full, Add Confirmation**

```json
{
  "exec": {
    "security": "full",
    "ask": "always"  // ✅ At least asks before running
  }
}
```

### Prevention

Start with `deny` or `allowlist`. Only upgrade to `full` after you understand the risks.

**Ask yourself:** "If the model hallucinated `rm -rf /`, would that be okay?"

If answer is no → don't use `full` with `ask: "off"`.

---

## Mistake #4: Public Gateway Without Auth

### What It Looks Like

```json
{
  "gateway": {
    "mode": "public",
    "bind": "0.0.0.0",
    "auth": {
      "mode": "off"  // ❌ NO AUTHENTICATION
    }
  }
}
```

### Why It's Dangerous

Your gateway API is exposed to the internet without authentication. **Anyone on your network (or the internet, if port-forwarded) can control your agent.**

### Real Example

User wanted remote access, Googled "openclaw remote," found a Stack Overflow answer suggesting `mode: "public"` with `bind: "0.0.0.0"`. Deployed to VPS. Port 18789 open. Bot indexed by Shodan. Script kiddie found it, used it to mine cryptocurrency.

### The Fix

**Never do this:**
```json
{
  "mode": "public",
  "auth": { "mode": "off" }
}
```

**If you need local access only:**
```json
{
  "gateway": {
    "mode": "local",
    "bind": "loopback"
  }
}
```

**If you need remote access:**
```json
{
  "gateway": {
    "mode": "local",
    "tailscale": {
      "mode": "auto"
    }
  }
}
```

Use Tailscale for secure private networking. Never open gateway to public internet.

### Prevention

**Default config is safe.** Don't change `mode` or `bind` unless you understand networking and security implications.

---

## Mistake #5: Not Setting API Spending Limits

### What It Looks Like

Creating API key with no usage limits or billing alerts.

### Why It's Dangerous

If key is compromised (or agent goes rogue), your bill can spiral before you notice.

### Real Example

Developer's Anthropic key leaked in git history. Bill hit $5,000 before billing alert triggered (set to $10,000). Took 2 weeks to get refund from Anthropic.

### The Fix

**For Anthropic:**
1. Go to [console.anthropic.com/settings/api-keys](https://console.anthropic.com/settings/api-keys)
2. Edit key → Set monthly spending limit (e.g., $100)
3. Go to Billing → Set billing alert (e.g., $50)

**For OpenAI:**
1. [platform.openai.com/account/limits](https://platform.openai.com/account/limits)
2. Set usage limits
3. Enable email notifications

### Prevention

**Set limits BEFORE using keys in production.**

Recommended limits for personal use:
- Testing: $10/month
- Light use: $50/month
- Regular use: $100-200/month
- Work/heavy use: Custom limit + daily alerts

---

## Mistake #6: Using Usernames Instead of User IDs

### What It Looks Like

```json
{
  "telegram": {
    "allowFrom": ["@johndoe"]  // ❌ Username
  }
}
```

### Why It's Dangerous

Telegram/Discord usernames can be changed. Attacker changes username to yours, gains access.

### The Fix

```json
{
  "telegram": {
    "allowFrom": [123456789]  // ✅ Numeric ID (permanent)
  }
}
```

**Get your Telegram ID:**
- Message [@userinfobot](https://t.me/userinfobot)

**Get your Discord ID:**
- Enable Developer Mode in Settings
- Right-click your name → Copy ID

### Prevention

**Always use numeric IDs in allowlists.** Never rely on usernames.

---

## Mistake #7: Workspace Set to System Root

### What It Looks Like

```json
{
  "agents": {
    "defaults": {
      "workspace": "/"  // ❌ Root directory (Linux/Mac)
      // or "C:\\" // ❌ Root drive (Windows)
    }
  }
}
```

### Why It's Dangerous

Agent's file operations (`read`, `write`, `edit`) can access entire filesystem. Accidental `write` to `/etc/hosts` or deletion of system files = broken system.

### The Fix

```json
{
  "agents": {
    "defaults": {
      "workspace": "/home/user/openclaw-workspace"  // ✅ Scoped
    }
  }
}
```

### Prevention

**Always scope workspace to a dedicated directory.** If agent needs access to other folders, use symlinks:

```bash
ln -s ~/projects ~/openclaw-workspace/projects
ln -s ~/Documents ~/openclaw-workspace/docs
```

---

## Mistake #8: Ignoring Update Notifications

### What It Looks Like

OpenClaw: "Update available (security patches included)"  
You: *Closes notification, continues working*

### Why It's Dangerous

Security vulnerabilities get patched regularly. Running outdated versions = exploitable.

### Real Example

OpenClaw 2024.11.5 had gateway auth bypass vulnerability. Fixed in 2024.11.6. User ignored update for 6 weeks. Exploit published. User's agent compromised.

### The Fix

```bash
openclaw update
```

**Check current version:**
```bash
openclaw --version
```

**Check for updates:**
```bash
openclaw doctor
```

### Prevention

**Update monthly** (or when notified). Security patches are non-negotiable.

If you're scared of breaking changes, read the changelog before updating. But don't delay security patches.

---

## Mistake #9: No Backups of `.openclaw/` Folder

### What It Looks Like

`.openclaw/` folder contains:
- Config
- API keys
- Channel sessions (WhatsApp, Telegram, etc.)
- Memory files

You never back it up.

### Why It's Dangerous

**Lose this folder = lose everything.**

Relink WhatsApp (painful), reconfigure everything, lose memory, regenerate keys.

### The Fix

**Backup `.openclaw/` securely:**

```bash
# Encrypt and back up
tar -czf openclaw-backup.tar.gz ~/.openclaw
gpg --symmetric openclaw-backup.tar.gz
mv openclaw-backup.tar.gz.gpg ~/Dropbox/secure-backups/
rm openclaw-backup.tar.gz
```

**Or use password manager:**
- 1Password: Store as Secure Note
- Bitwarden: Store in encrypted note
- Not Dropbox/Google Drive unencrypted

### Prevention

**Monthly backup.** Set calendar reminder.

---

## Mistake #10: Over-Trusting the Model

### What It Looks Like

"Claude is smart. It won't do anything dangerous. I don't need safety nets."

### Why It's Dangerous

LLMs are probabilistic. They:
- Hallucinate commands
- Misinterpret instructions
- Make logical errors
- Don't understand consequences

**Example:** User asked agent to "clean up old test files." Agent interpreted broadly, deleted production configs with "test" in the name.

### The Fix

**Defense in depth:**
- Allowlists (limit what can be run)
- Confirmation prompts (`ask: "always"` for destructive operations)
- Workspace scoping (limit file access)
- Regular backups (safety net)

**Never rely on model judgment alone.**

### Prevention

Treat your agent like a smart junior developer:
- Give clear, specific instructions
- Review important actions before executing
- Don't give carte blanche permissions
- Assume mistakes will happen

---

## Bonus: Quick Audit Checklist

Run through this to catch most mistakes:

### ☑️ 30-Second Security Check
```bash
# 1. Check gateway config
cat ~/.openclaw/openclaw.json | grep -A 5 "gateway"
# Should see: mode: "local", auth: "token"

# 2. Check channel policies
cat ~/.openclaw/openclaw.json | grep "Policy"
# Should see: "allowlist" (not "allow-all")

# 3. Check exec security
cat ~/.openclaw/openclaw.json | grep -A 3 "exec"
# Should see: "allowlist" or "deny" (not "full" + "off")

# 4. Check for API keys in git
git log --all --source --full-history -S "sk-ant-"
# Should return nothing
```

### ☑️ If Any Check Fails
- Mistake #1-4 = 🚨 Fix immediately
- Mistake #5-7 = ⚠️ Fix this week
- Mistake #8-10 = 📌 Fix soon

---

## When You Need Help

Some mistakes are fixable with a guide. Others need expert eyes.

**Get professional help if:**
- [ ] You've had a security incident (leaked keys, unauthorized access)
- [ ] Using OpenClaw for work/clients
- [ ] Unsure if your config is safe
- [ ] Hit issues you can't Google your way out of

**Cost of professional audit/setup:** £79-249  
**Cost of a security breach:** $$$$ + stress + reputation damage

Prevention is cheaper than recovery.

---

## Summary

**The 10 mistakes:**
1. `dmPolicy: "allow-all"` → Use `allowlist`
2. API keys in git → `.gitignore` + rotate
3. Unsafe exec permissions → Use `allowlist` + `ask: "on-miss"`
4. Public gateway without auth → Use Tailscale for remote access
5. No spending limits → Set before production use
6. Usernames in allowlists → Use numeric IDs
7. Workspace = root directory → Scope to dedicated folder
8. Ignoring updates → Update monthly
9. No backups → Backup `.openclaw/` encrypted
10. Over-trusting model → Defense in depth

**Quick fixes take 5-15 minutes each. Do them now.**

**Questions?** Drop a comment or [reach out](https://clawhatch.com/contact).

**Want an expert audit?** [Book a security session](https://clawhatch.com/manual-setup) and we'll catch issues you didn't know existed.

---

## Further Reading

- [How to Set Up OpenClaw Securely (Complete Guide)](#)
- [OpenClaw Security Audit Checklist (Download)](#)
- [DIY vs Professional Setup: Which Should You Choose?](#)

---

**About the Author**

I've debugged, audited, and fixed 50+ OpenClaw installations. These 10 mistakes account for 90% of issues I see. Most are preventable with proper setup from day one — that's why I built [Clawhatch](https://clawhatch.com).

*Last updated: February 3, 2026*
