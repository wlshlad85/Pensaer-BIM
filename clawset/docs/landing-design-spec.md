# Clawhatch Landing Page — Design Specification
> v1.0 | 2026-02-02 | Neon dark theme, mobile-first

---

## Global Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0A0F` | Page background |
| `--bg-surface` | `#111118` | Card/section backgrounds |
| `--bg-elevated` | `#1C1C27` | Elevated panels, hover states |
| `--border` | `#2D2D3A` | Subtle borders |
| `--border-glow` | `rgba(124, 58, 237, 0.3)` | Glowing borders on focus/hover |
| `--text` | `#E5E5EA` | Primary text |
| `--text-muted` | `#71717A` | Secondary/caption text |
| `--text-bright` | `#FFFFFF` | Headlines, emphasis |
| `--neon-pink` | `#FF3B8B` | Primary CTA, highlights |
| `--neon-cyan` | `#00E5FF` | Accents, links, step indicators |
| `--neon-purple` | `#7C3AED` | Gradients, secondary accent |
| `--lobster-red` | `#EF4444` | Brand anchor, alerts |
| `--success` | `#10B981` | Checkmarks, positive states |
| `--warning` | `#F59E0B` | Badges, alerts |
| `--gradient-hero` | `linear-gradient(135deg, #7C3AED 0%, #FF3B8B 50%, #00E5FF 100%)` | Hero gradient |
| `--gradient-cta` | `linear-gradient(135deg, #FF3B8B 0%, #7C3AED 100%)` | Button gradient |
| `--gradient-glow` | `radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)` | Section top glow |

### Typography

| Role | Font | Weight | Size (mobile → desktop) |
|------|------|--------|------------------------|
| Hero headline | Space Grotesk | 700 | 36px → 64px (`2.25rem` → `4rem`) |
| Section headline | Space Grotesk | 700 | 28px → 48px (`1.75rem` → `3rem`) |
| Sub-headline | Inter | 500 | 18px → 24px (`1.125rem` → `1.5rem`) |
| Body | Inter | 400 | 16px (`1rem`) |
| Caption / label | Inter | 500 | 14px (`0.875rem`) |
| Code / mono | JetBrains Mono | 400 | 14px (`0.875rem`) |
| Button | Inter | 600 | 16px (`1rem`) |

**Line heights:** Headlines `1.1`, Sub-headlines `1.4`, Body `1.6`.
**Letter spacing:** Headlines `-0.02em`, Body `0`, Caps labels `0.08em`.

### Spacing Scale

```
--space-xs:  4px    (0.25rem)
--space-sm:  8px    (0.5rem)
--space-md:  16px   (1rem)
--space-lg:  24px   (1.5rem)
--space-xl:  32px   (2rem)
--space-2xl: 48px   (3rem)
--space-3xl: 64px   (4rem)
--space-4xl: 96px   (6rem)
--space-5xl: 128px  (8rem)
```

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Small chips, badges |
| `--radius-md` | `10px` | Buttons, inputs |
| `--radius-lg` | `16px` | Cards, panels |
| `--radius-xl` | `24px` | Feature cards, pricing cards |

### Shadows & Glows

```css
--shadow-card:     0 4px 24px rgba(0,0,0,0.4);
--shadow-elevated: 0 8px 40px rgba(0,0,0,0.6);
--glow-pink:       0 0 20px rgba(255,59,139,0.3), 0 0 60px rgba(255,59,139,0.1);
--glow-cyan:       0 0 20px rgba(0,229,255,0.3), 0 0 60px rgba(0,229,255,0.1);
--glow-purple:     0 0 20px rgba(124,58,237,0.3), 0 0 60px rgba(124,58,237,0.1);
```

### Animations

```css
/* Shared easing */
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Standard transition */
--transition-fast: 150ms var(--ease-out);
--transition-base: 250ms var(--ease-out);
--transition-slow: 400ms var(--ease-out);
```

### Breakpoints

| Name | Value | Target |
|------|-------|--------|
| `sm` | `640px` | Large phones |
| `md` | `768px` | Tablets |
| `lg` | `1024px` | Small laptops |
| `xl` | `1280px` | Desktops |

**Mobile-first:** All base styles target `<640px`. Use `min-width` media queries to scale up.

### Layout

```css
--max-width:    1200px;
--content-pad:  16px;  /* mobile */
--content-pad-md: 32px; /* tablet */
--content-pad-lg: 64px; /* desktop */
```

---

## Section 1: Hero

### Layout
- Full viewport height: `min-height: 100vh`
- Centered flex column: `display: flex; flex-direction: column; align-items: center; justify-content: center;`
- Text-align center
- Padding: `var(--space-3xl) var(--content-pad)`

### Background
```css
background: var(--bg-primary);
```
Overlay a large radial glow at top-center:
```css
.hero::before {
  content: '';
  position: absolute;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 600px;
  background: radial-gradient(
    ellipse at center,
    rgba(124,58,237,0.2) 0%,
    rgba(255,59,139,0.08) 40%,
    transparent 70%
  );
  filter: blur(80px);
  pointer-events: none;
}
```
Optional: animated floating particles (subtle, `opacity: 0.3`, 2–4px circles in cyan/pink/purple, CSS `@keyframes float` drifting vertically over 8–15s, randomised).

### Content

**Badge** (above headline):
```
┌─────────────────────────────┐
│  🦞 Open Source • Free DIY  │
└─────────────────────────────┘
```
- `display: inline-flex; align-items: center; gap: 8px;`
- `font: 500 14px/1 Inter; text-transform: uppercase; letter-spacing: 0.08em;`
- `color: var(--neon-cyan); background: rgba(0,229,255,0.08);`
- `border: 1px solid rgba(0,229,255,0.2); border-radius: 999px;`
- `padding: 8px 16px; margin-bottom: 24px;`

**Headline:**
```
Setup OpenClaw in 10 Minutes
```
- `font: 700 36px/1.1 'Space Grotesk'; color: var(--text-bright);`
- Desktop: `font-size: 64px;`
- Key phrase "10 Minutes" rendered with gradient text:
```css
.gradient-text {
  background: var(--gradient-hero);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**Sub-headline:**
```
Your AI assistant, configured and running. Go from zero to Clawdbot — free DIY, guided setup, or we do it all.
```
- `font: 400 16px/1.6 Inter; color: var(--text-muted);`
- Desktop: `font-size: 20px;`
- `max-width: 600px; margin: 16px auto 40px;`

**CTA Group:**
- Two buttons side by side (stacked on mobile `< 640px`)
- Gap: `16px`

**Primary CTA — "Get Started Free":**
```css
.cta-primary {
  display: inline-flex; align-items: center; gap: 8px;
  font: 600 16px/1 Inter; color: #fff;
  background: var(--gradient-cta);
  border: none; border-radius: var(--radius-md);
  padding: 16px 32px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform var(--transition-fast), box-shadow var(--transition-base);
}
.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--glow-pink);
}
```
**Animated shimmer on CTA:**
```css
.cta-primary::after {
  content: '';
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.1) 50%,
    transparent 100%
  );
  animation: shimmer 3s ease-in-out infinite;
}
@keyframes shimmer {
  0%   { transform: translateX(-100%) rotate(15deg); }
  100% { transform: translateX(100%) rotate(15deg); }
}
```
- Append a right arrow icon `→` that slides 4px right on hover: `transition: transform 200ms;`

**Secondary CTA — "See Pricing":**
```css
.cta-secondary {
  font: 600 16px/1 Inter; color: var(--text);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 32px;
  cursor: pointer;
  transition: border-color var(--transition-base), color var(--transition-base);
}
.cta-secondary:hover {
  border-color: var(--neon-purple);
  color: var(--text-bright);
}
```

**Scroll indicator:**
- Centered below CTAs, `margin-top: 48px`
- Animated bouncing chevron `↓`, `opacity: 0.4`, `animation: bounce 2s infinite`
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(8px); }
}
```

---

## Section 2: How It Works

### Layout
- `padding: var(--space-4xl) var(--content-pad);`
- `max-width: var(--max-width); margin: 0 auto;`
- Background: `var(--bg-primary)` with subtle top glow `var(--gradient-glow)`

### Section Header
```
How It Works
```
- Centered, `font: 700 28px/1.1 'Space Grotesk'; color: var(--text-bright);`
- Desktop: `font-size: 48px;`
- Sub-text: `"Three steps. That's it."` — `font: 400 16px/1.6 Inter; color: var(--text-muted); margin-top: 12px;`

### Steps Container
- Mobile: vertical stack, `gap: 32px; margin-top: 48px;`
- Desktop (`≥1024px`): 3-column grid, `grid-template-columns: repeat(3, 1fr); gap: 32px;`

### Step Card

```
 ┌──────────────────────────┐
 │  ① (neon step number)    │
 │                          │
 │  [Icon]                  │
 │                          │
 │  Step Title              │
 │  Description text here   │
 │  that wraps nicely.      │
 └──────────────────────────┘
```

```css
.step-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 32px;
  text-align: center;
  position: relative;
  transition: border-color var(--transition-base), transform var(--transition-base);
}
.step-card:hover {
  border-color: var(--border-glow);
  transform: translateY(-4px);
}
```

**Step number:**
- `font: 700 14px/1 'JetBrains Mono'; color: var(--neon-cyan);`
- `background: rgba(0,229,255,0.08); border-radius: 999px; padding: 6px 14px;`
- `display: inline-block; margin-bottom: 20px;`

**Icon:** 48×48px, line-style, `stroke: var(--neon-pink); stroke-width: 1.5px;`

**Step title:** `font: 600 20px/1.2 Inter; color: var(--text-bright); margin: 16px 0 8px;`

**Step description:** `font: 400 16px/1.6 Inter; color: var(--text-muted);`

### The Three Steps

| # | Title | Description | Icon |
|---|-------|-------------|------|
| 01 | Choose Your Path | Pick DIY (free guide), Guided Setup, or Done-For-You. No wrong choice. | Fork/path icon |
| 02 | We Configure Everything | OpenClaw, Clawdbot, skills, memory — tailored to your setup. | Terminal/gear icon |
| 03 | You're Live | Your AI assistant is running. Start chatting in under 10 minutes. | Rocket/check icon |

### Connecting Line (desktop only)
- Between cards, a horizontal dashed line at `top: 50%` of step number:
```css
@media (min-width: 1024px) {
  .steps-connector {
    position: absolute;
    top: 55px; /* aligned to step number */
    left: calc(33.33% + 16px);
    width: calc(33.33% - 32px);
    border-top: 2px dashed var(--border);
  }
}
```

### Entrance Animation
- Cards fade in + slide up on scroll into viewport
- `opacity: 0; transform: translateY(24px);` → `opacity: 1; transform: translateY(0);`
- Duration: `600ms`, easing: `var(--ease-out)`
- Stagger: each card delayed `150ms` from previous
- Trigger: IntersectionObserver at `threshold: 0.2`

---

## Section 3: Feature Comparison (Manual vs Clawhatch)

### Layout
- `padding: var(--space-4xl) var(--content-pad);`
- `background: var(--bg-surface);`

### Section Header
```
Why Not Just DIY Everything?
```
- Same headline style as Section 2
- Sub-text: `"You can. But here's what Clawhatch saves you."`

### Comparison Table

**Desktop (`≥768px`):** 3-column table
**Mobile:** stacked cards (one per row/feature)

```css
.comparison-table {
  max-width: 800px;
  margin: 48px auto 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
```

**Table header row:**
```css
.comparison-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  background: var(--bg-elevated);
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
}
.comparison-header span {
  font: 600 14px/1 Inter;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}
/* Clawhatch column header in neon */
.comparison-header .clawhatch {
  color: var(--neon-pink);
}
```

**Table rows:**
```css
.comparison-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  align-items: center;
}
.comparison-row:last-child { border-bottom: none; }
.comparison-row:hover { background: rgba(124,58,237,0.04); }
```

| Feature | Manual | Clawhatch |
|---------|--------|-----------|
| Time to setup | 2–6 hours | ~10 minutes |
| Configuration errors | Common | Pre-tested |
| Skill installation | Copy-paste, debug | One click |
| Memory & personality | Read docs, manual edit | Guided wizard |
| Updates | Git pull, pray | Managed |
| Support when stuck | GitHub issues, hope | Priority human help |

**Manual column values:** `color: var(--text-muted);` with a subtle `✕` or `⚠` icon in `var(--warning)`
**Clawhatch column values:** `color: var(--success);` with `✓` icon

**Mobile (`<768px`):** Each row becomes a stacked card:
```css
@media (max-width: 767px) {
  .comparison-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 20px 24px;
  }
}
```

---

## Section 4: Pricing Table

### Layout
- `padding: var(--space-4xl) var(--content-pad);`
- `background: var(--bg-primary);` with `var(--gradient-glow)` top glow

### Section Header
```
Simple Pricing. No Surprises.
```
- Sub-text: `"Start free. Upgrade when you're ready."`

### Cards Container
- Mobile: vertical stack, `gap: 24px; margin-top: 48px;`
- Desktop (`≥1024px`): 3-column grid, `gap: 24px;`
- Center the grid: `max-width: 960px; margin: 48px auto 0;`

### Pricing Card (base)
```css
.pricing-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 32px;
  display: flex;
  flex-direction: column;
}
```

### Tier 1: DIY (Free)

```
 ┌──────────────────────────────┐
 │  🔧 DIY                     │
 │                              │
 │  Free                        │
 │  forever                     │
 │                              │
 │  ✓ Full setup guide          │
 │  ✓ Community Discord         │
 │  ✓ Template configs          │
 │  ✓ Video walkthrough         │
 │  ✕ No live support           │
 │  ✕ No managed updates        │
 │                              │
 │  ┌──────────────────────┐    │
 │  │   Start Free  →      │    │
 │  └──────────────────────┘    │
 └──────────────────────────────┘
```

- Tier label: `font: 600 14px Inter; text-transform: uppercase; letter-spacing: 0.08em; color: var(--neon-cyan);`
- Price: `font: 700 48px/1 'Space Grotesk'; color: var(--text-bright);`
- Period: `font: 400 16px Inter; color: var(--text-muted);`
- Feature list: `font: 400 15px/2 Inter; color: var(--text);`
  - ✓ items: `color: var(--text);` with checkmark in `var(--success)`
  - ✕ items: `color: var(--text-muted); text-decoration: line-through; opacity: 0.5;`
- Button: ghost style (same as `.cta-secondary`)

### Tier 2: Pro Setup ($39) — **FEATURED**

```
 ┌──────────────────────────────┐  ← gradient border
 │  ⚡ MOST POPULAR             │  ← badge
 │  Pro Setup                   │
 │                              │
 │  $39                         │
 │  one-time                    │
 │                              │
 │  ✓ Everything in DIY         │
 │  ✓ Pre-configured templates  │
 │  ✓ Guided setup wizard       │
 │  ✓ 7 days email support      │
 │  ✓ Tested & validated config │
 │                              │
 │  ┌──────────────────────┐    │
 │  │   Get Pro Setup  →   │    │  ← gradient CTA
 │  └──────────────────────┘    │
 └──────────────────────────────┘
```

```css
.pricing-card--featured {
  border: 2px solid transparent;
  background-image:
    linear-gradient(var(--bg-surface), var(--bg-surface)),
    var(--gradient-cta);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  transform: scale(1.03);
  box-shadow: var(--glow-pink);
}
```

**"Most Popular" badge:**
```css
.popular-badge {
  font: 600 12px/1 Inter;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #fff;
  background: var(--gradient-cta);
  border-radius: 999px;
  padding: 6px 14px;
  display: inline-block;
  margin-bottom: 16px;
}
```

- Button: primary gradient CTA (same as hero `.cta-primary`)

### Tier 3: Support ($19/mo)

```
 ┌──────────────────────────────┐
 │  🛡️ Ongoing Support          │
 │                              │
 │  $19                         │
 │  /month                      │
 │                              │
 │  ✓ Priority support (24h)    │
 │  ✓ Monthly health checks     │
 │  ✓ Managed updates           │
 │  ✓ 2 config changes/month    │
 │  ✓ 10% off future services   │
 │                              │
 │  ┌──────────────────────┐    │
 │  │  Subscribe  →        │    │
 │  └──────────────────────┘    │
 └──────────────────────────────┘
```

- Button: outlined style with purple accent border on hover
- Small note below button: `"Cancel anytime"` — `font: 400 13px Inter; color: var(--text-muted);`

### Card hover (all tiers):
```css
.pricing-card:hover {
  border-color: var(--border-glow);
  transform: translateY(-4px);
  transition: all var(--transition-base);
}
.pricing-card--featured:hover {
  transform: scale(1.03) translateY(-4px);
}
```

---

## Section 5: Social Proof

### Layout
- `padding: var(--space-4xl) var(--content-pad);`
- `background: var(--bg-surface);`

### Section Header
```
Loved by Builders
```
- Sub-text: `"Real people, real setups."`

### Testimonial Cards
- Mobile: single column, `gap: 24px;`
- Desktop (`≥1024px`): 3-column masonry-style grid (use CSS columns or equal grid)

**Testimonial Card:**
```css
.testimonial {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
}
```

**Content structure:**
```
 ┌─────────────────────────────┐
 │  ★★★★★                     │
 │                             │
 │  "Quote text here that      │
 │  wraps nicely across        │
 │  multiple lines."           │
 │                             │
 │  ○ Name                     │
 │    @handle • Role           │
 └─────────────────────────────┘
```

- Stars: `color: var(--warning);` (amber)
- Quote: `font: 400 15px/1.6 Inter; color: var(--text); font-style: italic;`
- Avatar: `40px` circle, `border: 2px solid var(--border);`
- Name: `font: 600 14px Inter; color: var(--text-bright);`
- Handle/role: `font: 400 13px Inter; color: var(--text-muted);`

### Placeholder testimonials (3 minimum):

1. **"Had my Clawdbot running in 8 minutes flat. The guided setup caught two config mistakes I would've missed."** — Dev, indie hacker
2. **"I tried the DIY route first and got stuck. The Pro setup was worth every penny — saved me a whole afternoon."** — Creator, small biz
3. **"We use Clawhatch to onboard all our team's AI assistants. The $39 setup is a no-brainer."** — Eng lead, startup

### Stats Bar (optional, below testimonials)
- Horizontal flex, centered, `gap: 48px; margin-top: 48px;`
- Mobile: 2×2 grid

| Stat | Value |
|------|-------|
| Setups completed | `500+` |
| Avg setup time | `< 10 min` |
| Satisfaction | `4.9/5` |
| Support response | `< 24h` |

```css
.stat-value {
  font: 700 36px/1 'Space Grotesk';
  background: var(--gradient-hero);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-label {
  font: 400 14px/1 Inter;
  color: var(--text-muted);
  margin-top: 4px;
}
```

---

## Section 6: FAQ

### Layout
- `padding: var(--space-4xl) var(--content-pad);`
- `background: var(--bg-primary);`
- `max-width: 720px; margin: 0 auto;`

### Section Header
```
Frequently Asked Questions
```

### Accordion Component

```css
.faq-item {
  border-bottom: 1px solid var(--border);
  padding: 24px 0;
}
.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font: 500 16px/1.4 Inter;
  color: var(--text-bright);
}
.faq-question:hover { color: var(--neon-cyan); }
.faq-chevron {
  transition: transform var(--transition-base);
  color: var(--text-muted);
}
.faq-item.open .faq-chevron { transform: rotate(180deg); }
.faq-answer {
  font: 400 15px/1.6 Inter;
  color: var(--text-muted);
  max-height: 0;
  overflow: hidden;
  transition: max-height 300ms var(--ease-out), padding 300ms var(--ease-out);
}
.faq-item.open .faq-answer {
  max-height: 300px;
  padding-top: 12px;
}
```

### FAQ Content

| Question | Answer |
|----------|--------|
| **What is OpenClaw / Clawdbot?** | OpenClaw is an open-source AI assistant framework. Clawdbot is the assistant it powers — it lives on your machine, connects to your apps, and helps you get things done. |
| **Is the DIY option really free?** | Yes. The guide, templates, and community Discord are 100% free. We make money when people want the faster, easier path. |
| **What does the $39 Pro Setup include?** | Pre-configured templates, a guided setup wizard, validated config files, and 7 days of email support if anything goes sideways. |
| **Do I need to be technical?** | For DIY, some comfort with terminal/command line helps. The Pro Setup and Support tiers are designed to minimise technical friction. |
| **Can I cancel the $19/mo support?** | Anytime. No contracts, no cancellation fees. Your setup keeps working — you just lose priority support and managed updates. |
| **What if I get stuck during free setup?** | The community Discord is active and helpful. For faster guaranteed help, upgrade to Pro Setup or Support. |

---

## Section 7: Final CTA

### Layout
- `padding: var(--space-5xl) var(--content-pad);`
- `text-align: center;`
- `position: relative; overflow: hidden;`

### Background
```css
.final-cta-section {
  background: var(--bg-primary);
  position: relative;
}
.final-cta-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(255,59,139,0.08) 0%,
    rgba(124,58,237,0.06) 40%,
    transparent 70%
  );
  filter: blur(60px);
}
```

### Content

**Headline:**
```
Open Your Clawhatch
```
- `font: 700 32px/1.1 'Space Grotesk'; color: var(--text-bright);`
- Desktop: `font-size: 56px;`
- "Clawhatch" in gradient text (same as hero)

**Sub-text:**
```
Your AI assistant is 10 minutes away. Start free, upgrade anytime.
```
- `font: 400 18px/1.5 Inter; color: var(--text-muted);`
- `max-width: 500px; margin: 16px auto 40px;`

**CTA Button:** Same as hero primary CTA (gradient, shimmer animation)

**Trust line beneath CTA:**
```
🔒 No credit card required • Free tier forever • Cancel anytime
```
- `font: 400 13px Inter; color: var(--text-muted); margin-top: 16px;`

---

## Footer

### Layout
- `padding: 48px var(--content-pad);`
- `border-top: 1px solid var(--border);`
- `background: var(--bg-primary);`

### Content
- Left: Clawhatch logo + `© 2026 Clawhatch` — `font: 400 14px Inter; color: var(--text-muted);`
- Right: Links `Privacy · Terms · Discord · GitHub`
  - `font: 400 14px Inter; color: var(--text-muted); gap: 24px;`
  - Hover: `color: var(--text-bright);`
- Mobile: stacked center-aligned

---

## Global Animation Patterns

### Scroll Reveal
All sections use a fade-up entrance:
```css
[data-animate] {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 600ms var(--ease-out), transform 600ms var(--ease-out);
}
[data-animate].visible {
  opacity: 1;
  transform: translateY(0);
}
```
Trigger via IntersectionObserver at `threshold: 0.15`.

### Hover Micro-interactions
- Buttons: `translateY(-2px)` + glow shadow
- Cards: `translateY(-4px)` + border glow
- Links: color transition + subtle underline slide-in

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Notes

- **Framework:** Build with Next.js (App Router) + Tailwind CSS, or static HTML/CSS
- **Fonts:** Load via `next/font` or Google Fonts — Space Grotesk, Inter, JetBrains Mono
- **Icons:** Lucide React (line icons, consistent with OpenClaw ecosystem)
- **Animation lib:** Framer Motion for scroll reveals and spring physics (optional — CSS-only fallbacks provided above)
- **Confetti:** `canvas-confetti` for celebration moments on CTA click
- **Payment:** Lemon Squeezy checkout links for Pro Setup and Support tiers
- **Analytics:** Plausible or Vercel Analytics (privacy-first)
- **Performance targets:** Lighthouse 95+ on all metrics, < 200KB initial bundle
