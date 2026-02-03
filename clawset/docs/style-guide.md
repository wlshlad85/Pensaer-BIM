# Clawhatch Brand Style Guide

**Version:** 1.0  
**Last Updated:** 2025-06-15  
**Tagline:** "Hatch your OpenClaw setup"

---

## 1. Brand Overview

Clawhatch is a developer-focused setup wizard for the OpenClaw ecosystem. The brand communicates **creation, energy, and approachability** — it's a tool that makes hard things easy, built by people who actually use it.

**Brand personality:** The friend who's genuinely good at dev tooling and loves helping you get set up. No gatekeeping, no jargon for jargon's sake, no "just read the docs." Direct, warm, technically sharp.

---

## 2. Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Neon Pink** | `#ff2d87` | 255, 45, 135 | Primary accent, CTAs, interactive elements, links |
| **Cyan** | `#00e5ff` | 0, 229, 255 | Secondary accent, highlights, code syntax, success states |
| **Purple** | `#b44dff` | 180, 77, 255 | Tertiary accent, gradients, badges, tags |
| **Yellow** | `#ffe135` | 255, 225, 53 | Warnings, callouts, star ratings, emphasis |

### Gradients

| Name | Definition | Usage |
|------|-----------|-------|
| **Hatch Gradient** | `linear-gradient(135deg, #ff2d87, #b44dff)` | Hero sections, primary buttons, brand moments |
| **Cyber Gradient** | `linear-gradient(135deg, #00e5ff, #b44dff)` | Secondary CTAs, card highlights |
| **Sunrise Gradient** | `linear-gradient(135deg, #ff2d87, #ffe135)` | Energy moments, announcements, celebrations |

### Neutrals & Backgrounds

| Name | Hex | Usage |
|------|-----|-------|
| **Void** | `#0a0a0f` | Primary background (dark mode default) |
| **Charcoal** | `#14141f` | Card/panel backgrounds, elevated surfaces |
| **Slate** | `#1e1e2e` | Secondary surfaces, code blocks |
| **Mist** | `#a0a0b8` | Secondary text, captions, metadata |
| **Cloud** | `#e0e0ec` | Primary text on dark backgrounds |
| **White** | `#f5f5ff` | Headings, emphasis text on dark backgrounds |

### Light Mode (Optional/Secondary)

| Name | Hex | Usage |
|------|-----|-------|
| **Paper** | `#fafafe` | Primary background |
| **Soft Grey** | `#f0f0f6` | Card backgrounds |
| **Ink** | `#1a1a2e` | Primary text |
| **Dim** | `#6b6b80` | Secondary text |

### Usage Rules

- **Dark mode is the default.** Clawhatch is a dev tool — respect the terminal.
- Never place neon colors on white backgrounds without reducing opacity or using a darker variant.
- Primary colors are for **accents only** — never use neon pink or cyan as a background fill.
- Ensure **WCAG AA contrast** (4.5:1 minimum) for all text. Use Cloud (`#e0e0ec`) or White (`#f5f5ff`) for body text on Void/Charcoal.
- Yellow (`#ffe135`) on dark backgrounds: use sparingly, it screams.

---

## 3. Typography

### Fonts

| Role | Font | Weight | Fallback |
|------|------|--------|----------|
| **Headings** | Orbitron | 700 (Bold), 600 (Semi-Bold) | `'Orbitron', 'Exo 2', sans-serif` |
| **Body** | Inter | 400 (Regular), 500 (Medium), 600 (Semi-Bold) | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| **Code** | JetBrains Mono | 400, 500 | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace` |

### Type Scale

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| H1 | Orbitron | 48px / 3rem | 700 | 1.1 | -0.02em |
| H2 | Orbitron | 36px / 2.25rem | 700 | 1.15 | -0.01em |
| H3 | Orbitron | 24px / 1.5rem | 600 | 1.2 | 0 |
| H4 | Inter | 20px / 1.25rem | 600 | 1.3 | 0 |
| Body | Inter | 16px / 1rem | 400 | 1.6 | 0 |
| Body Small | Inter | 14px / 0.875rem | 400 | 1.5 | 0.01em |
| Caption | Inter | 12px / 0.75rem | 500 | 1.4 | 0.02em |
| Code Inline | JetBrains Mono | 14px / 0.875rem | 400 | 1.5 | 0 |
| Code Block | JetBrains Mono | 14px / 0.875rem | 400 | 1.7 | 0 |

### Typography Rules

- **Orbitron is for headings and brand moments only.** Never use it for body text — it's too geometric for readability at small sizes.
- Body text in Inter should never go below 14px.
- Use Inter Semi-Bold (600) for emphasis within body text, not Bold (700).
- Code snippets always use JetBrains Mono with a Slate (`#1e1e2e`) background pill.
- Orbitron headings can be ALL-CAPS for short labels (2-3 words max). Mixed case for longer headings.

---

## 4. Tone of Voice

### Core Personality

**Friendly expert.** We know our stuff, and we genuinely want to help. No condescension, no filler, no corporate speak.

### Voice Principles

| Principle | What it means | Example ✅ | Not this ❌ |
|-----------|--------------|------------|-------------|
| **Direct** | Get to the point. Respect people's time. | "Run `clawhatch init` to get started." | "To begin your journey with Clawhatch, you may wish to consider running the initialization command..." |
| **Honest** | If something's broken or limited, say so. | "Hot reload doesn't work on Windows yet. We're on it." | "We're excited to announce that hot reload functionality is coming soon to additional platforms!" |
| **Warm** | Be a person, not a brand. | "Nice — you're all set up. Go build something." | "Setup complete. Please refer to the documentation for next steps." |
| **Technical but accessible** | Don't dumb it down, but don't gatekeep. | "This uses WebSockets under the hood — here's why that matters for your use case." | "This leverages bidirectional full-duplex communication channels over a single TCP connection." |
| **No BS** | Skip the hype. Let the work speak. | "It's a CLI that sets up your project. It does it fast." | "Revolutionary AI-powered next-generation developer experience platform." |

### Writing Guidelines

- **Contractions are good.** "You'll" not "You will." "It's" not "It is."
- **Active voice.** "Clawhatch creates your config" not "Your config is created by Clawhatch."
- **Second person.** Talk to the user: "you" not "the user" or "one."
- **Short paragraphs.** 2-3 sentences max. Devs scan, they don't read novels.
- **Sentence case for headings.** "Getting started" not "Getting Started" (except H1/brand moments).
- **Oxford comma.** Always.
- **Emoji:** Use sparingly in social/docs. One per heading max. Never in error messages or CLI output.

### Vocabulary

| Use ✅ | Avoid ❌ |
|--------|---------|
| Set up, bootstrap, scaffold | Onboard, leverage, utilize |
| Fast, quick | Blazing fast, lightning speed |
| Bug, issue | Challenge, opportunity |
| We messed up | We apologize for any inconvenience |
| Check out | Explore our comprehensive |
| Works with | Seamlessly integrates with |

---

## 5. Logo & Visual Identity

### Logo Concept

The Clawhatch logo combines a **stylised claw mark** with a **cracking egg/hatch motif** — creation emerging with energy. The claw marks use the Hatch Gradient (pink → purple).

### Logo Variants

| Variant | Usage |
|---------|-------|
| **Full lockup** (icon + wordmark) | Website header, documentation, README |
| **Icon only** | Favicon, app icon, social profile pic, small spaces |
| **Wordmark only** | Inline mentions, footer |

### Clear Space

Maintain a minimum clear space equal to the height of the "h" in the wordmark on all sides.

### Logo Don'ts

- Don't rotate or skew the logo
- Don't change the gradient colours
- Don't place on busy/patterned backgrounds without a backing shape
- Don't add drop shadows or outer glows
- Don't stretch or distort proportions

---

## 6. Visual Language

### Illustration Style

- **Geometric and clean** — flat shapes, sharp edges, no hand-drawn or organic styles
- **Neon-on-dark aesthetic** — illustrations sit on dark backgrounds with glowing accents
- **Minimal detail** — communicate the concept, don't over-render
- **Glow effects** — subtle CSS/SVG glows on primary colours to reinforce the neon identity

### Iconography

- **Style:** Outlined, 2px stroke, rounded caps
- **Size:** 24px base grid, scale in multiples of 8
- **Colour:** Cloud (`#e0e0ec`) default, primary colours for active/interactive states
- **Source:** Lucide or Phosphor icon sets for consistency

### Photography

- Generally avoid stock photography. If needed:
  - Dark, moody, tech-oriented
  - Screens showing real code (never fake terminal screenshots)
  - Developer workspace vibes, not "person pointing at whiteboard"

### Code Blocks

- Background: Slate (`#1e1e2e`)
- Border: 1px solid `#2a2a3e`
- Border-radius: 8px
- Syntax highlighting: Use primary palette colours
  - Strings: Neon Pink
  - Keywords: Purple
  - Functions: Cyan
  - Numbers/constants: Yellow
  - Comments: Mist (`#a0a0b8`)

### Motion & Animation

- **Duration:** 150-300ms for UI transitions
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material ease)
- **Philosophy:** Motion should feel snappy, not floaty. Dev tools should feel fast.
- Subtle glow pulse on hover states (0.5s ease-in-out loop)

---

## 7. Social Media Templates

### Profile Picture

- **Format:** 400×400px (exports at 1x and 2x)
- **Content:** Clawhatch icon (claw + hatch mark) on Void (`#0a0a0f`) background
- **Border:** None — the icon should breathe
- **Variants:** Standard (static), Animated (subtle glow pulse for platforms that support it)

### Banner / Header

- **X/Twitter:** 1500×500px
- **GitHub:** 1280×640px
- **Content layout:**
  - Left third: Clawhatch full lockup (icon + wordmark)
  - Centre: Tagline in Inter Semi-Bold, Cloud colour
  - Right third: Subtle geometric pattern using primary colours at 10-15% opacity
- **Background:** Void with a soft radial gradient (Charcoal centre, fading to Void edges)

### Post Formats

#### Announcement Post
```
┌─────────────────────────────────┐
│  [Void background]              │
│                                 │
│  🔥 CLAWHATCH v0.X             │  ← Orbitron Bold, White, ALL-CAPS
│                                 │
│  Feature headline goes here     │  ← Inter Semi-Bold, 24px, Cloud
│  in two lines maximum.          │
│                                 │
│  ┌─────────────────────────┐    │
│  │  code example or        │    │  ← JetBrains Mono on Slate bg
│  │  terminal screenshot     │    │
│  └─────────────────────────┘    │
│                                 │
│  clawhatch.dev                  │  ← Inter Regular, Mist
│  ─── gradient bar ───           │  ← Hatch Gradient, 3px
└─────────────────────────────────┘
```
- **Size:** 1200×675px (16:9) or 1080×1080px (1:1)

#### Tip / Quick Win Post
```
┌─────────────────────────────────┐
│  [Void background]              │
│                                 │
│  💡 DID YOU KNOW?               │  ← Orbitron Semi-Bold, Yellow
│                                 │
│  The tip content in plain       │  ← Inter Regular, Cloud
│  English, 2-3 lines max.       │
│                                 │
│  $ clawhatch --flag             │  ← JetBrains Mono, Cyan
│                                 │
│  ─── gradient bar ───           │  ← Cyber Gradient, 3px
│  clawhatch.dev                  │
└─────────────────────────────────┘
```
- **Size:** 1080×1080px (1:1)

#### Thread / Carousel Opener
```
┌─────────────────────────────────┐
│  [Hatch Gradient background]    │
│                                 │
│  TOPIC TITLE                    │  ← Orbitron Bold, White
│  IN TWO LINES                   │
│                                 │
│  A thread 🧵                    │  ← Inter Medium, White 80%
│                                 │
└─────────────────────────────────┘
```
- **Size:** 1080×1080px (1:1)

### Social Copy Guidelines

- **X/Twitter:** Max 240 chars (leave room for links). Lead with the value, not the feature. End with a link or CTA.
- **GitHub README:** Start with a one-liner that explains what Clawhatch does. Show a terminal GIF within the first scroll.
- **Discord/Community:** Casual, emoji-friendly, use code blocks liberally.

### Hashtags

Primary: `#clawhatch` `#openclaw`  
Secondary: `#devtools` `#cli` `#oss`  
Never: `#coding` `#programmer` `#tech` (too generic, no signal)

---

## 8. Component Reference (CSS Custom Properties)

```css
:root {
  /* Primary */
  --ch-pink: #ff2d87;
  --ch-cyan: #00e5ff;
  --ch-purple: #b44dff;
  --ch-yellow: #ffe135;

  /* Gradients */
  --ch-gradient-hatch: linear-gradient(135deg, #ff2d87, #b44dff);
  --ch-gradient-cyber: linear-gradient(135deg, #00e5ff, #b44dff);
  --ch-gradient-sunrise: linear-gradient(135deg, #ff2d87, #ffe135);

  /* Neutrals (Dark) */
  --ch-void: #0a0a0f;
  --ch-charcoal: #14141f;
  --ch-slate: #1e1e2e;
  --ch-mist: #a0a0b8;
  --ch-cloud: #e0e0ec;
  --ch-white: #f5f5ff;

  /* Neutrals (Light) */
  --ch-paper: #fafafe;
  --ch-soft-grey: #f0f0f6;
  --ch-ink: #1a1a2e;
  --ch-dim: #6b6b80;

  /* Typography */
  --ch-font-heading: 'Orbitron', 'Exo 2', sans-serif;
  --ch-font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --ch-font-code: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* Motion */
  --ch-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --ch-duration-fast: 150ms;
  --ch-duration-normal: 250ms;
  --ch-duration-slow: 350ms;

  /* Spacing */
  --ch-space-unit: 8px;

  /* Radii */
  --ch-radius-sm: 4px;
  --ch-radius-md: 8px;
  --ch-radius-lg: 16px;
  --ch-radius-full: 9999px;
}
```

---

## 9. Quick Reference Card

| Element | Value |
|---------|-------|
| Primary accent | `#ff2d87` (Neon Pink) |
| Heading font | Orbitron Bold |
| Body font | Inter Regular |
| Code font | JetBrains Mono |
| Background | `#0a0a0f` (Void) |
| Text colour | `#e0e0ec` (Cloud) |
| Border radius | 8px default |
| Voice | Friendly expert, direct, no BS |
| Tagline | "Hatch your OpenClaw setup" |
| Domain | clawhatch.dev |

---

*This is a living document. Update it as the brand evolves.*
