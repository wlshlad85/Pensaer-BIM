# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Clawhatch is a stateless SaaS wizard that helps non-developers set up OpenClaw (an open-source personal AI assistant). It generates configuration files and install scripts entirely client-side — no database, no server-side state.

## Active App Location

The main application lives in `app/clawhatch-build/`. All dev/build/test commands run from that directory. The `site/` directory is a legacy landing page and should not be modified.

## Commands

All commands assume working directory is `app/clawhatch-build/`:

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build (must pass before committing)
npm run lint         # ESLint (via next lint)
npx tsc --noEmit     # TypeScript check (must pass before committing)

# Unit tests (Vitest)
npx vitest run                              # All unit tests
npx vitest run tests/unit/personality-scoring.test.ts  # Single test file

# E2E tests (Playwright)
npx playwright test                         # All e2e tests
npx playwright test --grep="@smoke"         # Smoke tests only
npx playwright test e2e/wizard-flow.spec.ts # Single spec file
```

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`, no tailwind.config — uses CSS)
- **Vitest 4** (unit, `tests/unit/`) + **Playwright** (e2e, `e2e/`)
- **Zod** for validation, **Recharts** for radar charts
- **Stripe** + **Lemon Squeezy** for payments, **Resend** for email

## Architecture

### Stateless by Design
Everything is generated client-side and downloaded directly — configs, install scripts, SOUL.md files. No database, no ORM, no persistent server state. React hooks + URL params for wizard state.

### Key Modules (in `src/lib/`)
- `personality-scoring.ts` + `constants.ts` — 8-dimension scoring engine with weighted Euclidean distance matching against 10 archetypes. The scoring matrices in `constants.ts` are sacred — do not modify values without explicit instruction.
- `config-generator.ts` — Generates `openclaw.json` from wizard answers
- `script-generator.ts` — Generates OS-specific install scripts (Windows/Mac/Linux), handles 23 error codes (ERR-001 to ERR-023)
- `soul-generator.ts` — Creates SOUL.md from personality results
- `risk-report.ts` — Setup risk assessment
- `lemonsqueezy.ts` / `stripe.ts` — HMAC-SHA256 webhook verification
- `emails.ts` — Resend transactional email templates
- `validation.ts` — Zod schemas for all inputs

### Routes
- `/` — Landing page
- `/setup/step/[n]` — 11-step wizard (dynamic route, steps 1-11)
- `/quiz` — Personality quiz
- `/guide` — DIY setup guide
- `/intake` — Paid service intake form
- `/report/[configId]` — Setup report
- `/ref/[code]` — Referral landing page
- `/api/webhooks/stripe` and `/api/webhooks/lemonsqueezy` — Payment webhooks
- `/api/generate-script`, `/api/intake`, `/api/checkout/stripe`, `/api/subscribe` — API routes

### Components (in `src/components/`)
- `landing/` — Landing page sections (Hero, Pricing, FAQ, etc.)
- `wizard/` — Wizard step components (StepOS, StepChannels, StepAPIKey, StepGenerate, etc.)
- `quiz/` — Quiz UI (QuestionCard, RadarChart, ResultsScreen, AdjustmentSlider)
- `shared/` — Navigation, Footer
- `setup/` — SafeSkills, RiskReport

## Styling

Dark theme only. Brand colors defined as CSS custom properties in `src/app/globals.css`:
- `--color-neon-pink: #ff2d87`, `--color-cyan: #00e5ff`, `--color-purple: #b44dff`, `--color-yellow: #ffe135`
- Background: `--color-dark-bg: #0a0a0f`, Cards: `--color-card-bg: #12121a`

Fonts: Orbitron (headings), Inter (body), JetBrains Mono (code) — loaded via Google Fonts in `layout.tsx`.

## Constraints

- **No databases or ORMs** — stateless architecture only
- **No shadcn/ui** — build components with Tailwind directly
- **No `any` types, no `console.log`** in committed code
- **`npm run build` and `npx tsc --noEmit` must pass** before every commit
- Scoring matrices in `constants.ts` are immutable unless explicitly instructed to change
- Dark theme only — never add a light mode

## Claude Code Hooks

The app has hooks in `app/clawhatch-build/.claude/hooks/`:
- **post-response.sh** — Runs `tsc --noEmit` + `next lint` after every response. Exit 2 on failure triggers auto-fix loop.
- **post-commit.sh** — Runs `vitest run` + `playwright test --grep="@smoke"` after commits. Exit 2 on failure triggers auto-fix loop.

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json). Use `@/lib/...`, `@/components/...`, etc.

## Environment Variables

Payment and email integrations require env vars (Stripe keys, Lemon Squeezy keys, Resend API key). No `.env.example` exists — check `src/lib/stripe.ts`, `src/lib/lemonsqueezy.ts`, and `src/lib/emails.ts` for required variable names.
