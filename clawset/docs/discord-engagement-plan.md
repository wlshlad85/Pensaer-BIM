# Discord Community Engagement Plan — Clawhatch

> Help first, sell never. Be the person everyone tags when someone asks "how do I set up OpenClaw?"

---

## 1. Priority Discord Servers

### Tier A — Must Join (Week 1)
| Server | Why | Channel Focus |
|--------|-----|---------------|
| **OpenClaw Official** | Our exact audience. People actively setting up or stuck. | #help, #setup, #general, #showcase |
| **Anthropic / Claude** | Claude users exploring agent setups, many will try OpenClaw | #projects, #help, #general |
| **r/selfhosted Discord** | Self-hosters love running their own AI agents | #ai, #general, #help |

### Tier B — Join by Week 2
| Server | Why | Channel Focus |
|--------|-----|---------------|
| **AI Tinkerers** | Builders experimenting with agent frameworks | #projects, #help |
| **Indie Hackers / Buildspace** | Founders who'd use or recommend setup tools | #launches, #feedback |
| **Home Assistant** | Smart-home crowd overlaps with self-hosted AI | #off-topic, #automation |
| **LangChain / AI Agent communities** | Adjacent interest in autonomous agents | #general, #showcase |

### Tier C — Monitor / Occasional
- **DevOps / Homelab** servers — post when relevant threads appear
- **Node.js / JavaScript** servers — OpenClaw is Node-based, help with Node issues too
- **Privacy-focused communities** — self-hosted AI = privacy win

---

## 2. Introduction Message Templates

### For OpenClaw Official
> Hey all 👋 I'm Rich — been running OpenClaw for a while and got deep into optimising setups (security hardening, config tuning, multi-channel etc). Happy to help anyone stuck on setup or config. Just tag me!

### For AI / Anthropic Communities
> Hey! 👋 I'm building tools around Claude-based agents — specifically helping people get personal AI assistants running on their own hardware. Happy to chat about agent architectures, config patterns, or self-hosted AI in general.

### For Selfhosted / Homelab Servers
> Hey everyone 👋 I self-host a Claude-based AI assistant (OpenClaw) and have been automating the setup process. If anyone's curious about running their own AI agent locally — happy to share what I've learned.

### Rules for Intros
- **No links** in your intro message. Ever.
- Don't mention Clawhatch by name until someone asks
- Read the server rules and #introductions channel first
- Lurk for 24h before posting if the server has active moderation

---

## 3. Helpful Reply Templates

Use these as starting points — always personalise to the specific question.

### "How do I install OpenClaw?"
> The quickest path:
> 1. Make sure you have Node 18+ (`node -v`)
> 2. Clone the repo and run `npm install`
> 3. Copy `.env.example` to `.env` and add your Anthropic API key
> 4. Run `npx openclaw` and follow the prompts
>
> The bit most people get stuck on is the API key format — make sure it starts with `sk-ant-`. What OS are you on? Happy to help with specifics.

### "It's not connecting to WhatsApp/Discord/Telegram"
> Usually one of three things:
> 1. **WhatsApp**: QR code expired — restart and scan within 30 seconds
> 2. **Discord**: Bot token vs user token confusion — you need a bot token from the Developer Portal
> 3. **Telegram**: BotFather token needs to be exact, no spaces
>
> Which platform are you connecting? I can walk you through it.

### "Is this safe? What about my API key?"
> Good question — security matters here. Quick wins:
> - Your API key stays local (never sent anywhere except Anthropic's API)
> - Run `openclaw security audit` to check your config
> - Don't expose your port to the internet without auth
> - Set rate limits to avoid surprise bills
>
> I wrote up a full security checklist if you want it — happy to share.

### "How much does it cost to run?"
> The main cost is the Anthropic API. Rough numbers:
> - Light use (few messages/day): ~$5-15/month
> - Moderate (assistant handles tasks daily): ~$20-50/month
> - Heavy (always-on with heartbeats + cron): ~$50-100/month
>
> Biggest cost driver is the model — Opus costs ~10x more than Haiku. Most people start with Sonnet for a good balance.

### "Can you just set it up for me?"
> *[This is where Clawhatch enters naturally]*
> Yeah actually — I built a setup wizard that handles most of the config automatically. Free tier does the basics. Want me to send you the link?

### "What's SOUL.md / MEMORY.md / how do I customise the personality?"
> SOUL.md is where you define your assistant's personality — tone, rules, preferences. Think of it as their character sheet.
> MEMORY.md is long-term memory that persists between sessions.
>
> Start simple — write 3-5 bullet points about how you want it to behave. You can always add more later. Want to see an example?

---

## 4. Engagement Guidelines

### The Golden Rules
1. **Help first, always.** Give complete, useful answers. Don't hold back knowledge to upsell.
2. **Mention Clawhatch only when asked.** If someone says "can you do this for me?" or "is there a tool for this?" — that's your cue. Otherwise, just help.
3. **Be a regular, not a marketer.** Post helpful things unrelated to Clawhatch. React to messages. Join conversations about AI in general.
4. **Never DM first with a pitch.** If someone DMs asking for help, help them. If it naturally leads to Clawhatch, mention it casually.
5. **Credit others.** If someone else gives a good answer, react with 👍 or add to it. Don't compete.

### What TO Do
- Answer questions thoroughly (even if it means they don't need Clawhatch)
- Share config snippets, troubleshooting tips, and security advice freely
- Post interesting findings, benchmarks, or tips as standalone messages
- React to messages with relevant emoji — stay visible without being noisy
- Ask genuine questions about other people's setups

### What NOT To Do
- Drop links to clawhatch.com unprompted
- Copy-paste the same reply in multiple servers
- Reply to every single message in a channel (looks bot-like)
- Argue with people about approaches — suggest, don't insist
- Badmouth Clawhatch-the-competitor or any other service

### Handling the Clawhatch (Competitor) Overlap
The competitor is also called Clawhatch (or similar). If someone mentions their service:
- Don't trash-talk. Say something neutral: "Yeah they do Zoom-based setups. Different approach."
- If asked directly how you're different: "We focus on automation — free config wizard, async setup, no Zoom scheduling needed."
- Let the work speak. Help more, help better.

---

## 5. Weekly Engagement Schedule

### Daily (15-20 min)
- Check **OpenClaw Official** #help — answer 1-2 questions
- Scan **Anthropic** server for setup-related threads
- React to interesting posts across all Tier A servers

### Monday — "Help Day"
- Deep-dive into OpenClaw #help and #setup
- Answer backlogged questions from the weekend
- Post a quick tip or "did you know?" in OpenClaw general

### Tuesday — "Content Seeding"
- Share a useful snippet or config example in 1-2 servers
- Could be: security tip, cost-saving trick, config pattern
- Cross-reference with blog content (link to blog if genuinely helpful)

### Wednesday — "Expand Day"
- Spend 20 min in Tier B/C servers
- Answer questions, engage in threads
- Look for new relevant servers to join

### Thursday — "Relationship Day"
- Engage with other helpers/contributors (not just help-seekers)
- Comment on showcase posts, ask questions about others' projects
- DM follow-ups with people you helped earlier in the week (only if they had unresolved issues)

### Friday — "Review & Plan"
- Check: how many people did we help this week?
- Note: any recurring questions → add to FAQ / troubleshooting doc
- Note: anyone who seemed like a good Clawhatch customer? (Don't pitch — just note for awareness)
- Update this doc if any servers became more/less relevant

### Weekend — Light Touch
- Quick scan of OpenClaw #help only
- Answer anything urgent
- Otherwise, rest

---

## Tracking

### Weekly Metrics (track in `memory/` notes)
- Questions answered: ___
- Servers active in: ___
- People who asked about Clawhatch organically: ___
- Leads (asked for link / signed up): ___
- New connections made: ___

### Monthly Review
- Which servers are highest-value?
- What questions keep recurring? → Product/content ideas
- Is engagement growing or stagnant?
- Any community members who could become advocates?

---

## Quick Reference: Server Invite Links
*(Fill in as you join)*
- OpenClaw Official: `[link]`
- Anthropic: `[link]`
- r/selfhosted: `[link]`
- AI Tinkerers: `[link]`
- Indie Hackers: `[link]`

---

*Last updated: 2025-07-14*
*Review monthly and adjust based on what's working.*
