# 🦞 Welcome to OpenClaw — Your AI Assistant is Live!

Congrats — you're set up. Here's everything you need to know.

---

## Quick Commands (send these in chat)

| Command | What it does |
|---------|-------------|
| `/new` or `/reset` | Start a fresh conversation |
| `/compact` | Compress conversation history (saves tokens) |
| `/status` | See model, usage, session info |
| `/reasoning on` | Enable deep thinking mode |
| `/reasoning off` | Disable deep thinking |

## Your First 24 Hours

1. **Say hello** — just message naturally. Your assistant already knows your name and preferences from setup.
2. **Try a task** — ask it to write an email, summarize something, or look something up.
3. **Test memory** — tell it something ("remember that I prefer dark mode") then start a new session with `/new` and ask if it remembers. It should — that's the memory system working.
4. **Explore skills** — ask "what skills do you have?" or check [ClawHub](https://clawhub.com) for installable skills.

## How Memory Works

Your assistant has three layers of memory:
- **Session** — the current conversation (cleared on `/new`)
- **Daily notes** — `memory/YYYY-MM-DD.md` files (raw logs)
- **Long-term** — `MEMORY.md` (curated important stuff)

It wakes up fresh each session but reads its memory files first. If you want it to remember something permanently, say "save this to memory."

## Heartbeats (Proactive Mode)

Your assistant checks in periodically (default: every 30 min). It can:
- Check your email/calendar
- Monitor for important updates
- Do background work you've asked for

To disable: tell it "disable heartbeats" or set `heartbeat.every: "0m"` in config.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| WhatsApp disconnected | Run `openclaw channels login` to re-scan QR |
| No response | Check `openclaw status` — gateway might need restart |
| Slow responses | Model might be overloaded — try `/compact` to reduce context |
| "Token limit" errors | Start fresh with `/new` |
| Assistant forgot something | It may have compacted — important stuff should be in MEMORY.md |

## Getting Help

- **Docs**: https://docs.openclaw.ai
- **Discord**: https://discord.gg/clawd (Friends of the Crustacean 🦞)
- **Your setup technician**: Rich (richard@pensaer.io)

---

*Enjoy your new AI assistant! The more you use it, the better it gets at understanding how you work.*
