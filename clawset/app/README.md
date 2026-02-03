# 🦞 Clawhatch

**The automated setup wizard for OpenClaw & Clawdbot.**

Clawhatch is a web-based guided wizard that walks users through setting up their own AI assistant powered by Clawdbot. It handles API key configuration, channel setup, model selection, feature toggles, and deployment — all from a beautiful dark-themed UI.

## Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** components
- **Inter** + **JetBrains Mono** fonts

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with hero, pricing tiers, and footer |
| `/wizard` | 11-step setup wizard |
| `/troubleshooting` | FAQ and troubleshooting accordion |

## Brand Colors

| Role | Color | Hex |
|---|---|---|
| Background | Near black | `#050505` |
| Surface | Dark surface | `#0c0c10` |
| Primary | Lobster Red | `#EF4444` |
| Secondary | Twilight Purple | `#7C3AED` |
| Tertiary | Electric Teal | `#14B8A6` |
| Text | Light gray | `#e5e5ee` |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout (dark theme)
│   ├── globals.css           # Brand colors & CSS vars
│   ├── wizard/page.tsx       # Setup wizard
│   └── troubleshooting/page.tsx  # FAQ
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── PricingTiers.tsx
│   │   └── Footer.tsx
│   └── wizard/
│       ├── StepIndicator.tsx
│       └── WizardShell.tsx
└── lib/
    └── utils.ts              # shadcn utility (cn)
```

## Note

This project lives inside the `clawd` workspace. No separate git repo needed.
