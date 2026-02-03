# Week 3 Reddit Engagement Escalation Plan — Clawhatch

*Sub: r/ClaudeAI | Goal: become "the setup person"*

---

## 1. Thread Prioritization

### Tier 1 — Drop everything and answer (within 1h)
- **Unanswered setup/config questions** — posts with 0 comments about installation, API keys, WhatsApp, gateway, Windows/WSL issues
- **"Why won't my bot reply?"** threads — these map directly to pain points E2 (pairing), B1/B3 (auth), C1 (WhatsApp disconnect)
- **First-timer "just installed" posts** — highest leverage; they're forming opinions right now

### Tier 2 — High visibility, answer same day
- **Posts with 5+ upvotes** about setup frustrations (even if answered — add a better answer)
- **"What's the best way to…"** architecture questions (multi-agent, channel config, security)
- **Comparison threads** (OpenClaw vs alternatives) — position Clawhatch as the missing UX layer

### Tier 3 — Opportunistic
- **Weekly discussion threads** — drop tips and one-liners
- **Showcase/demo threads** — comment with genuine interest + subtle "how'd you handle the setup?" angle
- **Feature request threads** — if the request is something Clawhatch solves, mention it

### What to ignore
- Pure prompt-engineering discussions (off-topic)
- Drama/rant posts (don't get dragged in)
- Posts already well-answered by others

---

## 2. How to Naturally Reference Blog Posts

### The golden rule: **Answer first, link second**

Never lead with a link. The structure is:

```
[Solve the problem in 3-5 sentences]

[Optional: "I wrote up the full walkthrough here: <link>" OR
"There's a deeper dive on this: <link>"]
```

### Templates by pain point

**Auth confusion (B1/B3):**
> The quickest fix: run `openclaw models auth setup-token --provider anthropic`. That bypasses the OAuth/subscription mess entirely. If you're hitting "no API key found," it's almost always because the gateway service doesn't inherit your shell env — put keys in `~/.openclaw/.env` instead.
>
> I documented the full auth flow with all the gotchas here: [link to blog post]

**WhatsApp issues (C1/C2/C4):**
> WhatsApp via Baileys is the most fragile channel. Two things to check: 1) run `openclaw status --deep` to see if your session is actually linked, 2) if you're using a personal number, make sure `selfChatMode` is configured right — dedicated number is way less headache.
>
> Wrote up the common WhatsApp failure modes: [link]

**Windows/WSL (A2/A3):**
> Classic Windows PATH issue. Make sure Git and Node are in your system PATH (not just user PATH), and if you're on WSL2, check that systemd is enabled in `/etc/wsl.conf`. The `openclaw doctor` command catches most of this.
>
> Full Windows setup guide with screenshots: [link]

**"Gateway won't start" (D1/D2):**
> 90% of the time this is `gateway.mode` not being set. Run `openclaw config set gateway.mode local` and try again. If that's not it, `openclaw doctor --fix` will catch config validation errors.

**First-timer "no reply" (E2):**
> OpenClaw uses DM pairing by default (security feature). Your first message triggers a pairing code — you need to approve it with `openclaw pairing approve <channel> <code>`. After that it works normally. This trips up literally everyone.

### When NOT to link
- If the answer is 1-2 sentences, don't pad it with a link
- If someone's frustrated, solve the problem first — come back and link in a follow-up comment
- Never link the same post twice in one thread

---

## 3. When to Share Own Content vs Purely Help

### Share own content when:
- **You've written a guide that directly solves the question** — not tangentially related, *directly*
- **Multiple people ask the same thing in a week** — "I kept seeing this question so I wrote it up"
- **Someone asks for resources** — they're literally requesting links
- **Your post adds context beyond what a comment can** — walkthroughs with screenshots, config examples, architecture diagrams

### Purely help when:
- **The fix is quick** — one command, one config change, one explanation
- **You're building reputation** — early weeks should be 80% pure help, 20% content sharing
- **The thread is someone else's showcase** — don't hijack with your stuff
- **You've already shared a link in the same thread**

### Week 3 target ratio: **70% pure help / 30% content-linked answers**
- Week 1-2 should have been ~90/10
- Week 4+: can shift to 60/40 as reputation builds
- Never go below 50/50 — you stop being "helpful person" and become "that blog guy"

### Content to have ready for Week 3
1. **"The 5 setup mistakes everyone makes"** — maps to top 5 pain points (E2, B3, B1, C1, A4)
2. **"WhatsApp channel: honest setup guide"** — acknowledges Baileys fragility, gives real fixes
3. **"Windows setup without tears"** — WSL2 + systemd + PATH in one walkthrough
4. **"Security audit in 60 seconds"** — `openclaw security audit --fix` walkthrough

---

## 4. Metrics to Track

### Weekly (track in `clawset/metrics/reddit-w3.csv`)

| Metric | Target | How to measure |
|--------|--------|----------------|
| Comments posted | 15-20 | Count manually |
| Threads answered first (before anyone else) | 5+ | Track timestamps |
| Upvotes on comments | 30+ total | Check profile |
| "Thanks" / positive replies | 5+ | Count direct replies |
| Blog post click-throughs | Track via UTM params | `?utm_source=reddit&utm_medium=comment&utm_campaign=w3` |
| Own posts submitted | 1-2 max | Don't over-post |
| Username mentions by others | 1+ | Search `u/clawhatch` in sub |

### Leading indicators (good signs)
- Someone replies "this fixed it" to your comment
- You get tagged in a thread you didn't start
- A mod pins or highlights your answer
- Your comment becomes the top reply

### Lagging indicators (check monthly)
- Karma growth rate in r/ClaudeAI
- Profile visit trend
- Blog traffic from Reddit referrals
- People recognizing your username in new threads

---

## 5. The "Setup Person" Playbook

### Identity to project
- **Knowledgeable but not arrogant** — "this trips up everyone" not "you should have read the docs"
- **Empathetic to setup pain** — you *know* the auth flow is confusing, the WhatsApp channel is fragile, Windows is rough
- **Practical** — always give the fix, not just the explanation
- **Consistent** — same voice, same quality, every time

### Week 3 specific actions
1. **Answer 3+ unanswered threads per day** (Mon-Fri)
2. **Post 1 original guide** (mid-week, best engagement day: Tuesday or Wednesday)
3. **Reply to every "thanks"** with a brief follow-up ("glad it worked — if WhatsApp disconnects again, check X")
4. **Compile a FAQ comment** you can adapt and repost — saves time, builds consistency
5. **Start recognizing regulars** — reply to other helpful users, build relationships with the community

### Escalation from Week 2
- Week 2: Lurk + selective answers → Week 3: **Active answerer, first responder**
- Week 2: No self-promotion → Week 3: **Selective blog links when genuinely helpful**
- Week 2: React to threads → Week 3: **Create 1-2 threads (guides, not promotion)**

### What "recognized as the setup person" looks like
- Someone tags you in a setup thread you haven't seen yet
- A comment like "ask u/clawhatch, they know this stuff"
- Mod adds you to a wiki or resource list
- Your guides get linked by other users

---

## Quick Reference: Pain Point → Answer Cheat Sheet

| User says... | Pain point | Quick fix |
|---|---|---|
| "No reply to my messages" | E2 (pairing) | Approve pairing code: `openclaw pairing approve` |
| "No API key found" | B1 | `openclaw models auth setup-token --provider anthropic` |
| "Which auth method?" | B3 | API key in `~/.openclaw/.env` — simplest, most reliable |
| "WhatsApp disconnects" | C1/C2 | `openclaw status --deep`, re-login if needed, set reconnect policy |
| "Gateway won't start" | D1/D2 | `openclaw config set gateway.mode local` + `openclaw doctor --fix` |
| "git not found" (Windows) | A2 | Check system PATH, or use WSL2 |
| "Bot ignores groups" | C5 | Add group JID to allowlist, configure mentionPatterns |
| "Rate limited" | B5 | Switch from subscription auth to API key |
| "Memory resets" | G1 | Configure `session.reset`, use MEMORY.md files |
| "Context too large" | G2 | `/new` to reset, set `session.historyLimit` |
