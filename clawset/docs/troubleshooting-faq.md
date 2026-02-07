# OpenClaw Troubleshooting FAQ

Common issues clients hit after setup and how to fix them.

---

## WhatsApp

**Q: My assistant stopped responding on WhatsApp**
A: WhatsApp Web sessions can drop. Run:
```bash
openclaw channels login
```
Re-scan the QR code with your assistant's phone.

**Q: Messages are going to my personal WhatsApp, not the assistant**
A: You linked your personal number instead of the assistant's second number. Unlink and re-pair with the correct phone.

**Q: Group chat messages aren't getting responses**
A: By default, groups require @mention. Message with "@[assistant name]" or change config to `requireMention: false`.

---

## Gateway

**Q: "Gateway not running" when I try to chat**
A: Start it:
```bash
openclaw gateway start
# or manual:
openclaw gateway --port 18789
```

**Q: How do I restart everything?**
A: 
```bash
openclaw gateway restart
```

**Q: Dashboard shows blank page**
A: Open http://127.0.0.1:18789/ — if that doesn't work, the gateway isn't running.

---

## Model / Tokens

**Q: "Token limit exceeded" or very slow responses**
A: Your conversation is too long. Type `/compact` or `/new` to start fresh.

**Q: "Authentication failed"**
A: Your API key may have expired or hit its spending limit. Check at console.anthropic.com or platform.openai.com.

**Q: Responses seem dumb/shallow**
A: Try `/reasoning on` for deeper thinking. Or check you're on a capable model (`/status` shows current model).

---

## Memory

**Q: My assistant forgot something I told it yesterday**
A: Sessions reset daily by default. Important things should be saved to MEMORY.md. Tell your assistant "save this to your long-term memory" for important info.

**Q: How do I see what my assistant remembers?**
A: Check the workspace files:
```bash
cat ~/.openclaw/workspace/MEMORY.md
ls ~/.openclaw/workspace/memory/
```

---

## Skills

**Q: How do I add new abilities?**
A: Ask your assistant to install from ClawHub:
```
Install the [skill-name] skill from ClawHub
```
Or manually: `openclaw skill install [author/skill-name]`

---

## Updates

**Q: How do I update OpenClaw?**
A: 
```bash
npm update -g openclaw
openclaw gateway restart
```
Or ask your assistant: "update yourself"
