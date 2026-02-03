# Clawhatch Social Proof Package Plan

> Companion to `testimonial-plan.md`. This covers production specs for turning raw testimonials into polished social proof assets.

---

## 1. Video Testimonial Editing Spec

### Format
- **Length:** 30–60 seconds (hard max 60s for Twitter/TikTok compatibility)
- **Aspect ratio:** 9:16 (vertical, primary) + 16:9 (horizontal, for landing page embed)
- **Resolution:** 1080×1920 (vertical) / 1920×1080 (horizontal)
- **Frame rate:** 30fps
- **Export:** MP4 H.264, AAC audio

### Structure (3-act, ~45s target)

| Segment | Duration | Content |
|---------|----------|---------|
| **Hook** | 0–8s | Name, one-line context ("I'm a [role] who wanted [use case]") + pain statement |
| **Journey** | 8–35s | What was hard → what Clawhatch did → the "wow" moment |
| **Result** | 35–50s | What's working now, specific outcome ("my WhatsApp bot handles my invoices") |
| **CTA overlay** | 50–55s | "clawhatch.com — Free setup wizard" (text overlay, not spoken) |

### Recording Requirements
- **Screen share recording** of the actual setup session (OBS or Zoom recording)
- **Webcam clip** of testimonial delivery (even phone selfie-video is fine)
- Ask client to record in a quiet room, good lighting, phone at eye level
- If they're awkward on camera: **audio-only testimonial over B-roll of the setup** works great

### Edit Style
- Clean cut, no fancy transitions
- Subtle background music (royalty-free lo-fi, -20dB under voice)
- **Captions burned in** (white text, black outline, bottom-third) — 80% of social video is watched muted
- Clawhatch logo watermark bottom-right corner (semi-transparent)
- Name + handle lower-third at 0:02

### B-Roll Library (capture during sessions)
- Terminal scrolling during setup
- QR code scan moment
- First WhatsApp message received from bot
- Dashboard/config screen
- Client's reaction (if on Zoom)

### Tools
- **Edit:** CapCut (free, handles captions automatically) or DaVinci Resolve
- **Captions:** CapCut auto-captions → manual review for accuracy
- **Thumbnails:** Canva (client face + quote snippet + Clawhatch branding)

---

## 2. Written Case Study Template

### Filename Convention
`case-study-[first-name]-[use-case].md`

### Template

```markdown
# Case Study: [First Name] — [One-line use case]

> "[Pull quote — their best single sentence]"
> — [Name], [Role/Context]

## The Problem

**Who:** [First name], [brief context — e.g. "freelance designer who wanted a WhatsApp assistant for client comms"]

**What they tried:** [What they attempted before — e.g. "Followed the docs, got stuck at WhatsApp auth, spent 3 hours debugging Node versions"]

**The wall:** [Specific blocker — e.g. "QR code kept expiring, gateway wouldn't persist sessions across restarts"]

**How they felt:** [Frustration point — e.g. "Was about to give up and go back to doing everything manually"]

## The Solution

**How we connected:** [Channel — Reddit DM / Discord / Twitter]

**Setup session:** [Duration, format — e.g. "40-minute screen share via Discord"]

**What we did:**
1. [Step 1 — e.g. "Diagnosed Node version mismatch, upgraded to v20"]
2. [Step 2 — e.g. "Configured WhatsApp bridge with persistent session storage"]
3. [Step 3 — e.g. "Set up custom SOUL.md for their business tone"]
4. [Step 4 — e.g. "Installed invoice-reminder skill from ClawHub"]

**Their reaction:** [Quote from the session — e.g. "Wait, it just... works? That's it?"]

## The Result

**Before → After:**
- ❌ [Before metric] → ✅ [After metric]
- ❌ [Before metric] → ✅ [After metric]
- ❌ [Before metric] → ✅ [After metric]

**Time saved:** [e.g. "3 hours of failed setup → 40 minutes to fully working"]

**Ongoing impact:** [What they're using it for now — e.g. "Bot handles 15+ client messages/day, auto-schedules follow-ups"]

**In their words:**
> "[Longer testimonial quote, 2-3 sentences]"

---

*Setup completed via Clawhatch [Tier]. [Date].*
```

### Writing Guidelines
- **Specificity wins.** "Saved 3 hours" beats "saved time." "Node 18 → Node 20 fix" beats "fixed technical issues."
- Keep it under 400 words
- Write in third person except for direct quotes
- Include real metrics where possible (messages/day, time saved, setup duration)

---

## 3. Before/After Screenshot Comparison Specs

### What to Capture

| Before | After |
|--------|-------|
| Error message in terminal | Clean `openclaw health` ✅ output |
| Stuck QR code / failed auth | WhatsApp connected, first bot message |
| Messy/missing config file | Clean `openclaw.json` with all fields populated |
| Empty/default SOUL.md | Personalised SOUL.md with their name + use case |
| GitHub issue / Reddit help post | Their testimonial reply on same thread |

### Screenshot Specs
- **Resolution:** 1920×1080 minimum (retina-ready)
- **Format:** PNG (no lossy compression on text)
- **Crop:** Tight around relevant content, no excess desktop/taskbar
- **Redaction:** Blur/block API keys, email addresses, phone numbers, IP addresses
- **Annotation:** None on the raw screenshots — annotations added in the comparison layout

### Comparison Layout
- **Side-by-side:** Before (left) + After (right), separated by a thin vertical divider
- **Labels:** Red "BEFORE" tag top-left, Green "AFTER" tag top-right
- **Arrow/timeline:** Optional subtle arrow or "→" between panels
- **Caption below:** One-line context ("From 3 hours of errors to working in 40 minutes")
- **Canvas size:** 1200×630 (OG image compatible for link previews)
- **Background:** Clawhatch brand colour (#0a0a0a or dark slate)
- **Border radius:** 8px on screenshot frames
- **Tool:** Canva template or Figma component

### Naming Convention
`before-after-[name]-[what].png`
e.g. `before-after-sarah-terminal-errors.png`

---

## 4. "Wall of Love" Landing Page Section

### Placement
Below the pricing section, above the FAQ. Section ID: `#testimonials`

### Layout

```
┌─────────────────────────────────────────────────────┐
│           "Don't take our word for it"              │
│       Real people. Real setups. Real results.       │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ 🎥 Video │  │ ⭐⭐⭐⭐⭐│  │ 🎥 Video │         │
│  │ Testimonial│ │ "Quote   │  │ Testimonial│        │
│  │ (embed)  │  │  here..." │  │ (embed)  │         │
│  │          │  │ — Name    │  │          │         │
│  │ Name     │  │ @handle   │  │ Name     │         │
│  │ Use case │  │ Use case  │  │ Use case │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ ⭐⭐⭐⭐⭐│  │ Before/  │  │ ⭐⭐⭐⭐⭐│         │
│  │ "Quote   │  │ After    │  │ Tweet    │         │
│  │  here..." │  │ Screenshot│ │ embed    │         │
│  │ — Name    │  │          │  │          │         │
│  │ @handle   │  │ Caption  │  │          │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│         [ Read full case studies → ]                │
└─────────────────────────────────────────────────────┘
```

### Card Types (mix for visual variety)

1. **Video card** — Thumbnail with play button overlay, name + one-line below. Clicking opens lightbox with embedded video.
2. **Quote card** — Star rating, 1–2 sentence quote, name, handle, avatar (or initial), use-case tag (e.g. "WhatsApp Bot", "Business Assistant").
3. **Before/After card** — Side-by-side screenshot thumbnail. Click to expand.
4. **Tweet embed** — Native Twitter embed card (or styled to look like one if we want consistent design).

### Implementation (Next.js + Tailwind + shadcn/ui)

```tsx
// Masonry-style grid with mixed card sizes
<section id="testimonials" className="py-20 bg-zinc-950">
  <div className="max-w-6xl mx-auto px-6">
    <h2 className="text-3xl font-bold text-center text-white mb-2">
      Don't take our word for it
    </h2>
    <p className="text-zinc-400 text-center mb-12">
      Real people. Real setups. Real results.
    </p>
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
      {testimonials.map((t) => (
        <TestimonialCard key={t.id} {...t} />
      ))}
    </div>
  </div>
</section>
```

### Data Shape

```ts
type Testimonial = {
  id: string;
  type: 'video' | 'quote' | 'before-after' | 'tweet';
  name: string;
  handle?: string;       // @twitter
  avatar?: string;       // URL or initials
  role?: string;         // "Freelance Designer"
  useCase: string;       // "WhatsApp Bot"
  quote: string;         // 1-2 sentences
  rating?: number;       // 1-5
  videoUrl?: string;     // YouTube/uploaded
  beforeImg?: string;
  afterImg?: string;
  tweetUrl?: string;
  date: string;
};
```

### Animation
- Cards fade-in on scroll (Framer Motion `whileInView`)
- Stagger: 100ms between cards
- No auto-scroll carousel — static masonry is more trustworthy

---

## 5. Twitter Posts (Per Testimonial)

### Post Template A: Story format (best for engagement)

**Testimonial 1 — The Stuck Non-Dev**
```
[Name] spent 3 hours trying to set up OpenClaw.

Kept hitting Node version errors. QR code expired 6 times. Almost gave up.

I jumped on a call. 40 minutes later:
✅ WhatsApp bot running
✅ Custom personality configured  
✅ Auto-replies handling client messages

This is why I'm building @clawhatch — nobody should suffer through setup.

[before/after screenshot]
```

**Testimonial 2 — The Business User**
```
"I just wanted a WhatsApp assistant for my [business type]. I didn't want to learn what a gateway is."

[Name] filled out a 5-minute form. We set everything up async — no Zoom, no scheduling.

24 hours later: fully working bot, customised for their workflow.

Their words: "[pull quote]"

Building this into a self-service tool at @clawhatch.

[screenshot of working bot]
```

**Testimonial 3 — The Community Member**
```
Found [Name] in the OpenClaw Discord, stuck on [specific problem].

Offered a free setup session. Here's what happened:

Before:
❌ [problem 1]
❌ [problem 2]
❌ [problem 3]

After (40 min later):
✅ [result 1]
✅ [result 2]
✅ [result 3]

"[their quote]"

3 free setups done. Every single person went from stuck → running in under an hour.

Launching the automated version soon → clawhatch.com
```

### Post Template B: Quote-forward (quick wins)

```
"[Testimonial quote — 1-2 sentences max]"

— [Name], who went from [before state] to [after state] in [time]

This is what @clawhatch does. [link]
```

### Posting Strategy
- Space posts 2–3 days apart
- Post between 14:00–17:00 UTC (peak dev Twitter)
- Quote-tweet each other for a thread effect
- Pin the best-performing one
- Reply to each with "Full case study: [link]"

---

## 6. Reddit Post

### Subreddit Targets
- r/SideProject (primary)
- r/OpenClaw (if exists / relevant)
- r/selfhosted
- r/Entrepreneur (maybe, tone-dependent)

### Title
**Here's what happened when I helped 3 people set up OpenClaw for free**

### Body

```markdown
I've been using OpenClaw (open-source AI assistant framework) for a while and noticed the same thing keeps happening: people install it, hit a wall during setup, and either give up or spend hours debugging.

So I decided to do an experiment. I found 3 people who were stuck — one on Reddit, one on Discord, one on Twitter — and offered to set them up for free via screen share. No catch, just wanted to see the common pain points.

Here's what happened:

---

**Person 1: [First name] — [Role/Context]**

**Problem:** [Specific issue — e.g. "Couldn't get WhatsApp auth working. QR code kept expiring because their Node version was too old, but the error message didn't say that."]

**Fix:** [What we did — e.g. "Upgraded Node, configured persistent sessions, set up their custom personality."]

**Time:** [e.g. "35 minutes from broken to fully working"]

**Their take:** "[Direct quote]"

---

**Person 2: [First name] — [Role/Context]**

**Problem:** [Specific issue]

**Fix:** [What we did]

**Time:** [Duration]

**Their take:** "[Direct quote]"

---

**Person 3: [First name] — [Role/Context]**

**Problem:** [Specific issue]

**Fix:** [What we did]

**Time:** [Duration]

**Their take:** "[Direct quote]"

---

## What I learned

The setup problems aren't hard — they're just confusing. The three biggest blockers were:

1. **[Pattern 1]** — e.g. "Wrong Node version with unhelpful error messages"
2. **[Pattern 2]** — e.g. "WhatsApp auth flow is fragile and underdocumented"
3. **[Pattern 3]** — e.g. "Config file has 20+ fields but you only need 5 for a basic setup"

None of these are "read the docs" problems. The docs assume you already know what you're doing.

## What I'm building

I'm turning this into an automated setup wizard that handles the common cases without needing a human. Think: detect your OS, check your Node version, generate your config, connect WhatsApp — all guided, all with real error messages.

It's called [Clawhatch](https://clawhatch.com) and it's not ready yet, but if you want early access, I'll drop the link when it launches.

**If you're stuck on setup right now**, DM me. I might do another round of free sessions.

---

*Happy to answer questions about the setup process or common gotchas in the comments.*
```

### Posting Guidelines
- **Do NOT lead with the product.** Lead with the story. Product is the last 20%.
- Write it like a dev blog post, not a sales pitch
- Reply to every comment within 2 hours
- If asked "is this an ad?" — be honest: "I'm building a product based on this, yeah. But the free setups were genuinely free and I'm happy to help anyone stuck."
- Cross-post to r/selfhosted 24h later with a slightly different title: "I set up OpenClaw for 3 non-technical users — here are the gotchas nobody warns you about"

---

## Asset Checklist

Before publishing any social proof, ensure:

- [ ] Client signed off on their quote/video being public
- [ ] All API keys, emails, phone numbers, IPs redacted from screenshots
- [ ] Video captions reviewed for accuracy
- [ ] Case study reviewed by client for factual accuracy
- [ ] Before/after screenshots are genuine (same session, not staged)
- [ ] Twitter handle and Reddit username confirmed correct
- [ ] All links working (landing page, case study pages)

---

## Timeline

| When | What |
|------|------|
| During setup sessions | Record screen, capture screenshots, note quotes |
| Within 24h of session | Send testimonial request (written + optional video) |
| Within 48h | Draft case study, create before/after images |
| Within 72h | Edit video (if provided), create Twitter post |
| Week after all 3 done | Publish Reddit post |
| Landing page ready | Add Wall of Love section with all assets |

---

*This plan produces 15+ social proof assets from just 3 free setup sessions. Each session generates: 1 video (optional), 1 case study, 2-3 before/after screenshots, 1 Twitter post, and feeds into the Reddit mega-post.*
