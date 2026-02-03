# CrustaceanOps Setup Runbook (also works for Clawhatch freelancing)

Step-by-step guide for every client setup. Follow this exactly.

---

## Phase 1: Intake (2 min)

1. Confirm client received and completed pre-flight checklist
2. Ask:
   - "What's your OS?" (Mac/Linux/Windows+WSL2)
   - "Which channels do you want?" (WhatsApp/Telegram/Discord)
   - "Do you have your API key ready?"
   - "What do you want to call your assistant?"
   - "What's the main thing you want it to help with?"

## Phase 2: Install (3 min)

```bash
# Verify Node
node --version  # Must be ≥22

# Install OpenClaw
npm install -g openclaw@latest

# Verify
openclaw --version
```

**If Windows:** Ensure they're inside WSL2 terminal, not PowerShell.

## Phase 3: Onboard (10 min)

```bash
openclaw onboard --install-daemon
```

Walk through each wizard prompt:
1. **Gateway**: Local (default)
2. **Auth**: API key (paste Anthropic key) or OAuth
3. **Channels**: Select what client wants
4. **WhatsApp**: Scan QR with second phone
5. **Telegram**: Paste bot token
6. **Discord**: Paste bot token + guild ID
7. **Daemon**: Yes, install as service

## Phase 4: Configure (5 min)

1. Select appropriate template:
   - `solo-founder.jsonc` — entrepreneurs
   - `developer.jsonc` — software engineers
   - `business-user.jsonc` — non-technical
2. Copy template to `~/.openclaw/openclaw.json`
3. Replace placeholders (phone numbers, tokens, keys)
4. Apply: `openclaw gateway restart`

## Phase 5: Personalize (5 min)

Edit workspace files:
- `IDENTITY.md` — assistant name, personality, emoji
- `USER.md` — client's name, timezone, preferences
- `SOUL.md` — tone, boundaries, behavior rules

Walk client through what each file does.

## Phase 6: Verify (3 min)

```bash
# Health check
openclaw status
openclaw health

# Security audit
openclaw security audit --deep

# Test message
# Have client send a message from their phone
# Verify response comes back
```

## Phase 7: Handoff (5 min)

1. Send welcome pack (docs/welcome-pack.md)
2. Demo key commands: /new, /reset, /status, /compact
3. Show how to access dashboard: http://127.0.0.1:18789/
4. Explain memory system briefly
5. Set expectations: "It gets better as it learns about you"
6. Give your contact for follow-up questions

## Phase 8: Post-Setup (24h later)

- Send a quick check-in message
- Ask if everything's working
- Offer to help with first skill install if relevant

---

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| `npm ERR! node version` | `nvm install 22 && nvm use 22` |
| WhatsApp QR won't scan | Kill gateway, clear session: `rm -rf ~/.openclaw/sessions/whatsapp*` |
| Gateway won't start | Check port 18789 not in use: `lsof -i :18789` |
| "EACCES permission" | Don't use `sudo`; fix npm perms or use nvm |
| Windows: "not recognized" | Must be inside WSL2, not PowerShell |
| Telegram bot no response | Check allowlist + pairing: `openclaw pairing list telegram` |
| Discord bot offline | Check bot token + intents enabled in Dev Portal |
| "Rate limit" errors | Model provider throttling — wait or switch provider |
| WhatsApp drops after hours | Known issue — `openclaw channels login` to re-link |

---

## Time Target: 30 minutes total

If you're going over 30 min, the issue is almost always:
1. Client didn't do pre-flight (Node not installed, no API key)
2. Windows without WSL2
3. WhatsApp linking issues

Prevent these with the pre-flight checklist.
