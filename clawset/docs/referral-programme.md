# Clawhatch Referral Programme

> **Give £25, Get £25** — Grow Clawhatch through word of mouth.  
> Created: 2026-02-09

---

## Table of Contents

1. [Programme Overview](#1-programme-overview)
2. [Referral Mechanics](#2-referral-mechanics)
3. [Referral Code & Link System](#3-referral-code--link-system)
4. [Tracking System](#4-tracking-system)
5. [Email Templates](#5-email-templates)
6. [Landing Page Spec](#6-landing-page-spec)
7. [Post-Setup CTA Integration](#7-post-setup-cta-integration)
8. [Terms and Conditions](#8-terms-and-conditions)

---

## 1. Programme Overview

### Why Referrals

From the monetization research:
- User referral programmes reduce CAC significantly
- 10–20% of paid users typically refer at least 1 person
- Dropbox's referral programme was the single biggest growth driver in their history
- Developer audiences trust peer recommendations over ads

### The Offer

> **Give a friend £25 off their Pro Setup. Get £25 off your next purchase or subscription.**

Both parties benefit — the referrer gets store credit, the referee gets a discount on Pro Setup (£39 → £14) or Support Subscription (first month free + £6 credit). This is deliberately generous because:

1. **CAC for dev tools is high** — a £25 referral cost is cheaper than paid acquisition
2. **Referred users convert at 3–5× higher rates** than organic traffic
3. **Referred users have 16% higher LTV** on average (Wharton School study)
4. **£25 feels substantial** — it's not a token gesture, it's a real incentive

### Economics

| Metric | Value |
|--------|-------|
| Pro Setup price | £39 |
| Referral discount (referee) | £25 off |
| Referral credit (referrer) | £25 store credit |
| Net revenue per referred Pro Setup | £14 (minus payment processing) |
| Break-even | Referee converts to Support Plan within 1 month |
| Expected referral rate | 10–15% of paid users refer someone |
| Expected referred conversion | 40–60% (warm leads) |

At 500 users/month with 8% Pro conversion (40 buyers), if 15% refer (6 referrals/month) and 50% convert: **3 new paying customers/month at near-zero acquisition cost**, feeding the subscription flywheel.

---

## 2. Referral Mechanics

### How It Works — Referrer Flow

```
1. User completes Pro Setup or is an active Support subscriber
2. "Share Clawhatch" CTA appears on success screen + dashboard
3. User copies unique referral link or code
4. Shares via email, social, DM, word of mouth
5. Friend signs up and purchases using the link/code
6. Referrer receives £25 store credit (email notification)
7. Credit auto-applies to next purchase or subscription renewal
```

### How It Works — Referee Flow

```
1. Clicks referral link → lands on referral landing page
2. Sees personalised message: "[Friend's name] thinks you'd love Clawhatch"
3. Browses page → clicks "Get Started"
4. Referral discount auto-applied at checkout (visible as line item)
5. Completes Pro Setup at £14 (instead of £39)
6. Post-setup: encouraged to join referral programme themselves
```

### Reward Structure

| Action | Referrer Gets | Referee Gets |
|--------|--------------|--------------|
| Referee buys Pro Setup (£39) | £25 store credit | £25 off (pays £14) |
| Referee buys Support Plan (£19/mo) | £25 store credit | £25 off first payment (free month + £6 credit towards month 2) |
| Referee buys Priority Support (£49/mo) | £25 store credit | £25 off first payment (pays £24) |
| Referee buys Mastery Course (£49) | £25 store credit | £25 off (pays £24) |

### Store Credit Rules

- Credits are **non-transferable** and **non-cashable**
- Credits apply automatically to the next Lemon Squeezy purchase/renewal
- Credits **do not expire** (builds goodwill, avoids complaints)
- Maximum **£250 in accumulated credits** per account (10 referrals)
- Credits stack — refer 3 people, get £75 credit
- If credit exceeds purchase price, remainder carries forward

### Eligibility

- **Who can refer:** Any user who has completed a purchase (Pro Setup, Support, Course)
- **Who can be referred:** New users only (no existing Lemon Squeezy customer email match)
- **Self-referral:** Not permitted (same email, same payment method, same IP flagged)
- **Limit:** 10 successful referrals per user (£250 cap)

---

## 3. Referral Code & Link System

### Referral Code Format

```
CLAW-{USERNAME}-{4CHAR}
```

Examples:
- `CLAW-RICHD-7K2M`
- `CLAW-SARAH-PX9N`
- `CLAW-DEVMAX-4FTL`

**Rules:**
- `{USERNAME}` = first 5 chars of display name (uppercase, alphanumeric only), padded if shorter
- `{4CHAR}` = random alphanumeric suffix for uniqueness
- Always prefixed with `CLAW-` for brand recognition
- Case-insensitive input (normalise to uppercase on lookup)

### Referral Link Format

```
https://clawhatch.com/ref/{code}
```

Examples:
- `https://clawhatch.com/ref/CLAW-RICHD-7K2M`
- Short version: `clwh.at/CLAW-RICHD-7K2M` (if short domain acquired)

### Technical Implementation

#### Code Generation (on first purchase)

```typescript
// Generate referral code after successful purchase
function generateReferralCode(user: User): string {
  const nameSlug = user.displayName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase()
    .padEnd(5, 'X');
  
  const suffix = crypto.randomBytes(2)
    .toString('hex')
    .substring(0, 4)
    .toUpperCase();
  
  return `CLAW-${nameSlug}-${suffix}`;
}
```

#### Database Schema

```sql
-- Referral codes table
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  code VARCHAR(20) UNIQUE NOT NULL,        -- e.g. CLAW-RICHD-7K2M
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_user_code UNIQUE (user_id)
);

-- Referral events table
CREATE TABLE referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code_id UUID NOT NULL REFERENCES referral_codes(id),
  referee_email VARCHAR(255) NOT NULL,
  referee_user_id UUID REFERENCES users(id),  -- populated on signup
  status VARCHAR(20) DEFAULT 'pending',        -- pending | qualified | credited | expired
  landing_page_visit_at TIMESTAMPTZ,
  signup_at TIMESTAMPTZ,
  purchase_at TIMESTAMPTZ,
  purchase_product VARCHAR(50),                -- pro_setup | support | priority | course
  purchase_amount_pence INTEGER,
  discount_applied_pence INTEGER DEFAULT 2500, -- £25
  credit_issued_pence INTEGER DEFAULT 0,
  credit_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_referee UNIQUE (referee_email)
);

-- Referrer credit balance (materialised from events)
CREATE TABLE referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  balance_pence INTEGER DEFAULT 0,
  total_earned_pence INTEGER DEFAULT 0,
  total_spent_pence INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_credit UNIQUE (user_id)
);
```

#### Lemon Squeezy Integration

Lemon Squeezy supports discount codes natively:

1. **Create a discount in LS** for each referral code (via API)
2. **Webhook on purchase:** `order_created` → check if discount code is a referral → credit referrer
3. **Alternatively:** Use LS checkout overlay with `discount` param pre-filled from referral link

```typescript
// Create LS discount code for referral
async function createReferralDiscount(code: string): Promise<void> {
  await lemonsqueezy.createDiscount({
    name: `Referral: ${code}`,
    code: code,
    amount: 2500,           // £25.00 in pence
    amount_type: 'fixed',
    is_limited_to_products: false,  // applies to any product
    max_redemptions: 10,    // matches referral cap
    starts_at: new Date().toISOString(),
  });
}

// Webhook handler for purchase with referral code
async function handleReferralPurchase(order: LemonSqueezyOrder): Promise<void> {
  const discountCode = order.discount_code;
  if (!discountCode?.startsWith('CLAW-')) return;
  
  const referralCode = await db.referralCodes.findByCode(discountCode);
  if (!referralCode) return;
  
  // Record the referral event
  await db.referralEvents.update({
    referrer_code_id: referralCode.id,
    referee_email: order.user_email,
    status: 'qualified',
    purchase_at: new Date(),
    purchase_product: order.product_name,
    purchase_amount_pence: order.total,
    discount_applied_pence: 2500,
  });
  
  // Credit the referrer
  await db.referralCredits.increment(referralCode.user_id, 2500);
  await db.referralEvents.update({ status: 'credited', credit_issued_pence: 2500 });
  
  // Send notification emails
  await sendReferrerRewardEmail(referralCode.user_id, order.user_email);
  await sendRefereeWelcomeEmail(order.user_email, referralCode.user_id);
}
```

---

## 4. Tracking System

### Referral Funnel Metrics

```
Link Click → Landing Page Visit → Signup → Purchase → Referrer Credited
```

Track at each stage:

| Stage | How Tracked | Storage |
|-------|------------|---------|
| **Link click** | Redirect via `/ref/{code}` → set `ref` cookie (30-day) + log | `referral_clicks` table + analytics |
| **Landing visit** | Page view with `ref` param in URL | Analytics (Plausible/Umami) |
| **Signup** | Registration with `ref` cookie present | `referral_events.signup_at` |
| **Purchase** | Lemon Squeezy webhook with discount code | `referral_events.purchase_at` |
| **Credit issued** | Automated after purchase confirmation | `referral_credits` table |

### Attribution Rules

1. **Cookie-based:** 30-day attribution window from first click
2. **Code-based:** If user manually enters referral code at checkout, overrides cookie
3. **Last-click wins:** If user clicks multiple referral links, most recent referrer gets credit
4. **Deduplication:** One referral credit per unique referee email, ever

### Fraud Prevention

| Signal | Action |
|--------|--------|
| Same IP for referrer + referee | Flag for manual review |
| Same payment method | Auto-reject, no credit issued |
| Same email domain (non-public) | Flag for review |
| Referral + immediate cancellation/refund | Claw back credit |
| >3 referrals from same IP range | Flag for review |
| Disposable email domain on referee | Block referral discount |

### Dashboard (Referrer View)

Each paying user sees in their account:

```
┌─────────────────────────────────────────────┐
│  🦞 Your Referrals                          │
│                                              │
│  Your code: CLAW-RICHD-7K2M     [Copy]      │
│  Your link: clawhatch.com/ref/...  [Copy]    │
│                                              │
│  ┌────────┬────────┬─────────┬───────────┐  │
│  │ Clicks │ Signups│Purchases│  Earned   │  │
│  │   14   │   5    │    2    │   £50     │  │
│  └────────┴────────┴─────────┴───────────┘  │
│                                              │
│  Credit balance: £50.00                      │
│  (Auto-applied to your next purchase)        │
│                                              │
│  Recent referrals:                           │
│  ✅ s***h@gmail.com — Pro Setup — £25 earned │
│  ✅ d***x@hey.com — Support Plan — £25 earned│
│  ⏳ j***n@pm.me — Signed up, awaiting purchase│
│                                              │
│  [Share on Twitter]  [Share on LinkedIn]      │
│  [Copy Invite Email]                         │
└─────────────────────────────────────────────┘
```

### Admin Dashboard

```
Referral Programme Stats (last 30 days)
───────────────────────────────────────
Total referral link clicks:     342
Unique visitors from referrals: 287
Signups from referrals:          89 (31% of visitors)
Purchases from referrals:        41 (46% of signups)
Credits issued:              £1,025
Net revenue from referrals:    £551 (after discounts)
Top referrers:
  1. CLAW-RICHD-7K2M — 8 referrals (£200 earned)
  2. CLAW-SARAH-PX9N — 5 referrals (£125 earned)
  3. CLAW-DEVMX-4FTL — 4 referrals (£100 earned)
```

---

## 5. Email Templates

### 5a. Invitation Email (Referrer → Friend)

**Trigger:** User clicks "Email a Friend" from referral dashboard  
**From:** `referrals@clawhatch.com` (or user's own email client via mailto link)  
**Subject options (A/B test):**
- A: `I set up my own AI assistant — thought you'd want one too`
- B: `£25 off your own AI assistant (from me)`

```
Hey {friend_name},

I recently set up OpenClaw using Clawhatch — it's a setup wizard that 
gets you a personal AI assistant running on your own machine in about 
15 minutes. No cloud dependency, your data stays yours.

I've been using mine for {use_case — e.g. "writing, research, and 
managing my calendar"} and it's genuinely useful.

I've got a referral link that gives you £25 off:

  → {referral_link}

That brings the Pro Setup down to £14 (normally £39). It handles all 
the fiddly configuration — API keys, memory system, personality setup, 
the lot.

Worth a look if you've been curious about running your own AI.

{referrer_name}

---
This invite was sent via Clawhatch's referral programme. 
You won't receive further emails unless you sign up.
```

**Alternative: Mailto Link (preferred — no email infrastructure needed)**

```
mailto:?subject=£25 off your own AI assistant&body=Hey,%0A%0AI set up 
my own AI assistant using Clawhatch and thought you'd be interested.
%0A%0AHere's £25 off: {referral_link}%0A%0A{referrer_name}
```

### 5b. Reward Notification — Referrer

**Trigger:** Referee completes a qualifying purchase  
**From:** `hello@clawhatch.com`  
**Subject:** `🦞 You earned £25! Your friend just joined Clawhatch`

```
Hi {referrer_name},

Great news — someone you referred just signed up for Clawhatch!

  Referred: {referee_masked_email}  (e.g. s***h@gmail.com)
  They purchased: {product_name}
  You earned: £25 store credit

Your credit balance: £{total_balance}

This will be automatically applied to your next purchase or 
subscription renewal. No action needed.

┌─────────────────────────────────┐
│  Your referral stats            │
│  Referred: {count} people       │
│  Total earned: £{total_earned}  │
│  Remaining referrals: {remaining} of 10  │
└─────────────────────────────────┘

Keep sharing your link to earn more:
{referral_link}

[Share on Twitter →]  [Copy Link →]

Cheers,
The Clawhatch Team

---
You're receiving this because you're in the Clawhatch referral programme.
Manage preferences: {preferences_link}
```

### 5c. Welcome Email — Referee (post-purchase)

**Trigger:** Referee completes purchase via referral link  
**From:** `hello@clawhatch.com`  
**Subject:** `Welcome to Clawhatch — {referrer_first_name} sent you 🦞`

```
Hi {referee_name},

Welcome! {referrer_first_name} clearly has good taste — and so do you.

Your {product_name} is ready. Here's what happens next:

  1. {setup_instructions_or_link}
  2. Check the welcome guide: clawhatch.com/welcome
  3. Join the community: discord.gg/clawhatch

You saved £25 thanks to {referrer_first_name}'s referral. Want to 
pay it forward?

Share your own referral link and give friends £25 off too — 
you'll get £25 credit for each one.

[Get Your Referral Link →]

If you need any help getting set up, reply to this email or 
check our troubleshooting guide.

Cheers,
The Clawhatch Team
```

### 5d. Referral Nudge (7 days post-purchase, if not yet referred anyone)

**Trigger:** 7 days after purchase, user hasn't shared referral link  
**From:** `hello@clawhatch.com`  
**Subject:** `Know someone who'd love their own AI assistant?`

```
Hi {user_name},

You've been using your OpenClaw setup for a week now. Hope it's 
going well!

Quick reminder — you've got a referral link that gives friends 
£25 off Clawhatch. And you get £25 credit for each person who 
signs up.

Your link: {referral_link}
Your code: {referral_code}

Just forward this to someone who'd benefit, or share the link 
wherever you hang out.

[Copy Link]  [Share on Twitter]  [Email a Friend]

Cheers,
The Clawhatch Team

---
Too many emails? Manage preferences: {preferences_link}
```

---

## 6. Landing Page Spec

### URL
```
clawhatch.com/ref/{referral_code}
```

### Page Structure

```
┌──────────────────────────────────────────────────┐
│  [Clawhatch logo]                    [Get Started]│
├──────────────────────────────────────────────────┤
│                                                    │
│  {referrer_name} thinks you'd love Clawhatch 🦞   │
│                                                    │
│  Get your own AI assistant — running on your       │
│  machine, under your control, in 15 minutes.       │
│                                                    │
│  ┌──────────────────────────────────┐              │
│  │  🎁 £25 OFF                      │              │
│  │  Your friend's referral saves    │              │
│  │  you £25 on any Clawhatch plan   │              │
│  │                                  │              │
│  │  [Get Started for £14 →]         │              │
│  │  (normally £39)                  │              │
│  └──────────────────────────────────┘              │
│                                                    │
├──────────────────────────────────────────────────┤
│  What is Clawhatch?                                │
│                                                    │
│  A setup wizard for OpenClaw — the open-source     │
│  AI assistant framework. We handle:                │
│                                                    │
│  ✅ API key configuration                          │
│  ✅ Memory system setup                            │
│  ✅ Personality & preferences                      │
│  ✅ Skills installation                            │
│  ✅ Chat platform integration                      │
│                                                    │
│  So you don't have to spend hours reading docs     │
│  and debugging YAML files.                         │
│                                                    │
├──────────────────────────────────────────────────┤
│  How it works                                      │
│                                                    │
│  1️⃣ Run the wizard (5 min)                         │
│  2️⃣ Choose your AI provider (Anthropic/OpenAI)     │
│  3️⃣ Customise your assistant                       │
│  4️⃣ Start chatting                                 │
│                                                    │
├──────────────────────────────────────────────────┤
│  Social proof section                              │
│                                                    │
│  "{testimonial}" — @user                           │
│  "{testimonial}" — @user                           │
│  "{testimonial}" — @user                           │
│                                                    │
│  Trusted by {count} users                          │
│                                                    │
├──────────────────────────────────────────────────┤
│  Pricing (with referral discount applied)          │
│                                                    │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Free    │  │ Pro Setup ⭐  │  │  Support   │  │
│  │  £0      │  │ £14 (was £39)│  │  £19/mo    │  │
│  │  Basic   │  │ Full auto    │  │  + ongoing  │  │
│  │  wizard  │  │ setup        │  │  updates   │  │
│  │          │  │              │  │            │  │
│  │ [Start]  │  │ [Buy Now →]  │  │ [Subscribe]│  │
│  └──────────┘  └──────────────┘  └────────────┘  │
│                                                    │
│  💰 30-day money-back guarantee                    │
│                                                    │
├──────────────────────────────────────────────────┤
│  Footer: FAQ | Privacy | Terms | Contact           │
└──────────────────────────────────────────────────┘
```

### Technical Notes

- **Personalisation:** Fetch referrer's display name from DB via code lookup
- **Fallback:** If code is invalid, show generic landing page without discount
- **Cookie:** Set `ref={code}` cookie (30 days) on page load
- **Checkout:** Pre-fill Lemon Squeezy discount code in checkout overlay
- **Analytics:** Track `ref_landing` event with code, source (UTM params)
- **OG tags:** Custom social preview — "{Referrer} invited you to Clawhatch — £25 off"
- **Mobile-first:** All layouts responsive, CTA buttons full-width on mobile

---

## 7. Post-Setup CTA Integration

### Where to Show the Referral CTA

#### 7a. Setup Success Screen (Primary)

Immediately after the wizard completes — this is the **peak moment of trust** (per monetization research: peak-end rule).

```
┌──────────────────────────────────────┐
│                                        │
│  🎉 Your AI assistant is live!        │
│                                        │
│  [Start Chatting →]                   │
│                                        │
│  ─────────────────────────────        │
│                                        │
│  🦞 Love Clawhatch? Share it.         │
│                                        │
│  Give a friend £25 off. Get £25       │
│  credit for yourself.                  │
│                                        │
│  Your link: [clawhatch.com/ref/...]   │
│                                        │
│  [Copy Link]  [Share]  [Email Friend] │
│                                        │
└──────────────────────────────────────┘
```

**Design notes:**
- Appears below the primary CTA (Start Chatting), never above
- Soft presentation — not a modal or popup
- Dismissible, doesn't return if dismissed
- Only shown to **paid** users (Pro Setup buyers)

#### 7b. Welcome Email (Secondary)

Include referral section in the existing welcome email (see Welcome Pack doc). Add after setup instructions:

```
─────────────────────────

Know someone who'd love this?

Share your referral link and you both get £25:
{referral_link}
```

#### 7c. Dashboard/Account Page (Persistent)

If Clawhatch has a user dashboard (account.clawhatch.com):

```
Sidebar or card:
┌─────────────────────┐
│ 🦞 Refer & Earn     │
│ Share Clawhatch,     │
│ get £25 each time    │
│ [View Your Link →]   │
└─────────────────────┘
```

#### 7d. 7-Day Follow-Up Email

The nudge email from section 5d. Timed for when the user has experienced value but referral is still fresh.

#### 7e. Support Plan Confirmation

After subscribing to the Support or Priority plan:

```
Thanks for subscribing! 

By the way — your referral link gives friends £25 off 
and earns you £25 credit towards your subscription.

{referral_link}
```

### CTA Priority Order

1. **Setup success screen** — highest conversion moment
2. **Welcome email** — catches those who miss the screen
3. **7-day nudge email** — re-engages after they've used the product
4. **Account dashboard** — always available
5. **Subscription confirmation** — secondary touchpoint

### What NOT to Do

- ❌ Don't show referral CTA during setup (disrupts flow)
- ❌ Don't show to free-tier users (they haven't committed)
- ❌ Don't use modals or popups (developer audience hates them)
- ❌ Don't send more than 2 referral-related emails total
- ❌ Don't gate any feature behind "refer a friend"

---

## 8. Terms and Conditions

### Clawhatch Referral Programme — Terms & Conditions

*Last updated: February 2026*

**1. Programme Overview**

1.1. The Clawhatch Referral Programme ("Programme") allows eligible users ("Referrers") to invite others ("Referees") to purchase Clawhatch products and services. Both parties receive rewards as described below.

1.2. The Programme is operated by Clawhatch ("we", "us", "our").

**2. Eligibility**

2.1. To participate as a Referrer, you must have an active Clawhatch account with at least one completed purchase (Pro Setup, Support Plan, Priority Support, or Mastery Course).

2.2. Referees must be new to Clawhatch — defined as having no prior purchases associated with their email address.

2.3. You may not refer yourself. Referrals where the Referrer and Referee share the same email address, payment method, household, or IP address may be disqualified.

2.4. You must be 18 years of age or older to participate.

**3. Rewards**

3.1. **Referee Reward:** £25 discount applied to their first qualifying purchase via the Referrer's unique referral link or code.

3.2. **Referrer Reward:** £25 store credit, issued after the Referee completes a qualifying purchase and the refund period (30 days) has elapsed without a refund request.

3.3. Store credit is applied automatically to the Referrer's next purchase or subscription renewal.

3.4. Store credit is non-transferable, non-refundable, and cannot be exchanged for cash.

3.5. If a Referee's purchase is refunded, the corresponding Referrer credit will be revoked.

**4. Limits**

4.1. Each Referrer may earn rewards for a maximum of 10 successful referrals (£250 total credit).

4.2. Each Referee may only use one referral code/link. Referral discounts cannot be combined with other promotional offers unless explicitly stated.

4.3. We reserve the right to adjust reward amounts, limits, or eligibility criteria at any time with reasonable notice.

**5. Prohibited Conduct**

5.1. The following activities are prohibited and may result in disqualification from the Programme, forfeiture of credits, and/or account suspension:

  a) Self-referral or creating multiple accounts to exploit the Programme  
  b) Posting referral links as paid advertisements (PPC, sponsored posts) without our written consent  
  c) Posting referral links on coupon/deal aggregator sites  
  d) Spamming referral links in forums, comment sections, or social media in a way that violates those platforms' terms  
  e) Using misleading claims about Clawhatch to encourage referral signups  
  f) Any form of fraud, abuse, or manipulation of the Programme  

5.2. We reserve the right to investigate suspicious activity and withhold or revoke rewards at our discretion.

**6. Referral Link Usage**

6.1. You may share your referral link via personal email, social media, blog posts, messaging apps, and word of mouth.

6.2. You may not misrepresent yourself as an employee or official representative of Clawhatch.

6.3. You must disclose that your link is a referral link where required by applicable law or platform rules (e.g., FTC guidelines, ASA rules).

**7. Privacy**

7.1. We collect the Referee's email address and associate it with your referral code for tracking purposes. This data is processed in accordance with our Privacy Policy.

7.2. Referrers can see masked email addresses (e.g., s***h@gmail.com) of their Referees in the referral dashboard. Full email addresses are never shared.

**8. Modifications and Termination**

8.1. We may modify, suspend, or terminate the Programme at any time. Existing earned credits will be honoured for 12 months following any termination.

8.2. We will provide at least 14 days' notice of material changes via email to active participants.

**9. Liability**

9.1. The Programme is provided "as is." We are not liable for any technical issues, delays in credit issuance, or errors in tracking, though we will make reasonable efforts to resolve disputes.

9.2. Our total liability under the Programme shall not exceed the value of credits at issue.

**10. Governing Law**

10.1. These terms are governed by the laws of England and Wales.

10.2. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.

**11. Contact**

For questions about the Programme, contact: referrals@clawhatch.com

---

## Implementation Timeline

| Phase | When | What |
|-------|------|------|
| **Phase 1** | Month 2–3 (post-launch) | Referral code generation, basic tracking, manual credit application |
| **Phase 2** | Month 3–4 | Lemon Squeezy discount code automation, referral landing page, email templates |
| **Phase 3** | Month 4–5 | Referrer dashboard, automated credit system, fraud detection |
| **Phase 4** | Month 6+ | Social sharing tools, leaderboard, potential tier upgrades for top referrers |

### Dependencies

- Lemon Squeezy store live with products configured (see `payment-integration.md`)
- User accounts / email collection in place
- Transactional email provider (Resend recommended — see monetization research)
- Database (Supabase recommended) for referral tracking tables

---

*This programme aligns with the monetization playbook's Month 4–6 rollout recommendation. Expected impact: 10–15% of paid users refer at least one person, reducing effective CAC by 20–30% and feeding the subscription flywheel.*
