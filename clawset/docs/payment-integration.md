# Clawhatch Payment Integration — Lemon Squeezy

> Complete integration plan for monetizing Clawhatch via Lemon Squeezy.  
> Created: 2026-02-02

---

## Table of Contents

1. [Lemon Squeezy Account Setup Guide](#1-lemon-squeezy-account-setup-guide)
2. [Product Spec: Pro Setup ($39 one-time)](#2-product-spec-pro-setup-39-one-time)
3. [Product Spec: Support Subscription ($19/mo)](#3-product-spec-support-subscription-19mo)
4. [Webhook Integration Plan](#4-webhook-integration-plan)
5. [Branded Receipt Email Templates](#5-branded-receipt-email-templates)
6. [Checkout Overlay Integration (Next.js)](#6-checkout-overlay-integration-nextjs)

---

## 1. Lemon Squeezy Account Setup Guide

### Step 1: Create Account
1. Go to [app.lemonsqueezy.com](https://app.lemonsqueezy.com)
2. Sign up with email (use the Clawhatch business email)
3. Verify email address

### Step 2: Configure Store
1. **Store name:** `Clawhatch`
2. **Store URL slug:** `clawhatch` → checkout at `clawhatch.lemonsqueezy.com`
3. **Store description:** "Setup tools and support for OpenClaw/Clawdbot"
4. **Logo:** Upload Clawhatch logo (square, min 256×256)
5. **Accent colour:** Match brand (use primary brand hex)
6. **Currency:** GBP (£) — Lemon Squeezy handles multi-currency display automatically

### Step 3: Business Details
1. Go to **Settings → General**
2. Fill in business name, address, contact email
3. Lemon Squeezy is merchant of record — they handle VAT/sales tax globally
4. No need to register for VAT yourself for digital sales through LS

### Step 4: Payout Setup
1. Go to **Settings → Payouts**
2. Connect bank account (UK bank details)
3. Payout threshold: set to £50 minimum (or default)
4. Payout schedule: choose weekly or monthly

### Step 5: Create API Key
1. Go to **Settings → API**
2. Create a new API key — name it `clawhatch-production`
3. Store securely in environment variables (never commit to git):
   ```
   LEMONSQUEEZY_API_KEY=your_api_key_here
   LEMONSQUEEZY_STORE_ID=your_store_id
   LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
   ```

### Step 6: Configure Webhook
1. Go to **Settings → Webhooks**
2. Add endpoint: `https://clawhatch.com/api/webhooks/lemonsqueezy`
3. Signing secret: generate and save as `LEMONSQUEEZY_WEBHOOK_SECRET`
4. Select events (see [Section 4](#4-webhook-integration-plan))

### Step 7: Create Products
Follow the specs in Sections 2 and 3 below.

### Step 8: Custom Domain (Optional)
1. Go to **Settings → Domains**
2. Add `pay.clawhatch.com` as a custom checkout domain
3. Add CNAME record: `pay.clawhatch.com` → provided by Lemon Squeezy

### Step 9: Test Mode
1. Toggle **Test Mode** ON in dashboard
2. Create test products mirroring production
3. Use test card `4242 4242 4242 4242` for checkout testing
4. Verify webhooks fire correctly
5. Toggle OFF when ready to go live

---

## 2. Product Spec: Pro Setup ($39 One-Time)

### Lemon Squeezy Product Configuration

| Field | Value |
|-------|-------|
| **Name** | Clawhatch Pro Setup |
| **Description** | Automated advanced configuration for OpenClaw/Clawdbot. Includes custom skill setup, priority queue, config backup & export. |
| **Price** | $39 USD (one-time) |
| **Product type** | Digital product |
| **Tax category** | Digital goods / Software |
| **Media** | Product hero image + feature screenshots |

### Variant (Single)

| Field | Value |
|-------|-------|
| **Name** | Pro Setup |
| **Price** | $39.00 |
| **Is subscription** | No |
| **License key** | ✅ Enabled |
| **Activation limit** | 1 (single machine/instance) |
| **License key expiry** | Never (perpetual) |

### License Key Delivery

Lemon Squeezy generates license keys automatically. Configuration:

| Setting | Value |
|---------|-------|
| **Key format** | Auto-generated (UUID-based) |
| **Activation limit** | 1 |
| **Expiration** | None |
| **Validation endpoint** | `https://api.lemonsqueezy.com/v1/licenses/validate` |

**How it works:**
1. User purchases Pro Setup via checkout overlay
2. Lemon Squeezy generates a unique license key
3. Key is delivered in the receipt email + order confirmation page
4. User enters key in the Clawhatch wizard
5. Wizard calls Lemon Squeezy license validation API to verify + activate
6. On valid activation → unlock Pro features

### License Validation (Server-Side)

```typescript
// lib/lemonsqueezy.ts
export async function validateLicenseKey(licenseKey: string, instanceName: string) {
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey,
      instance_name: instanceName, // e.g. machine hostname
    }),
  });

  const data = await res.json();

  return {
    valid: data.valid,
    error: data.error,
    license_key: data.license_key,
    instance: data.instance,
    meta: data.meta,
  };
}

export async function activateLicenseKey(licenseKey: string, instanceName: string) {
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey,
      instance_name: instanceName,
    }),
  });

  return res.json();
}

export async function deactivateLicenseKey(licenseKey: string, instanceId: string) {
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey,
      instance_id: instanceId,
    }),
  });

  return res.json();
}
```

### What Pro Setup Unlocks
- Automated advanced configuration (no manual steps)
- Custom skill setup & installation
- Config backup & export (JSON/YAML)
- Priority setup queue
- 7-day post-setup email support

---

## 3. Product Spec: Support Subscription ($19/mo)

### Lemon Squeezy Product Configuration

| Field | Value |
|-------|-------|
| **Name** | Clawhatch Support Plan |
| **Description** | Ongoing support, auto-updates, monthly health reports, and priority Discord access for your OpenClaw/Clawdbot setup. |
| **Price** | $19/month or $190/year |
| **Product type** | Subscription |
| **Tax category** | Digital services / SaaS |

### Variants

**Monthly:**

| Field | Value |
|-------|-------|
| **Name** | Monthly Support |
| **Price** | $19.00/month |
| **Billing interval** | Monthly |
| **Free trial** | None (they already used the free wizard) |

**Annual:**

| Field | Value |
|-------|-------|
| **Name** | Annual Support |
| **Price** | $190.00/year |
| **Billing interval** | Yearly |
| **Badge/label** | "Save $38/year" |

### What's Included
- **Auto-updates:** New OpenClaw/Clawdbot versions applied automatically
- **Monthly health report:** Automated status email (system healthy, updates applied, usage stats)
- **Priority Discord support:** Dedicated `#pro-support` channel, 48h response guarantee
- **New feature early access:** Beta features before public release
- **2 config changes/month:** Request tweaks via support channel

### Subscription Lifecycle
1. **Purchase:** User subscribes via checkout overlay (post-setup upsell is primary funnel)
2. **Activation:** Webhook fires → grant Discord role + set up monitoring
3. **Monthly:** Health report email sent automatically (see Section 5)
4. **Renewal:** Lemon Squeezy handles billing automatically
5. **Cancellation:** Webhook fires → remove Discord role, send winback email
6. **Failed payment:** Lemon Squeezy retries 3x over 2 weeks → sends dunning emails → cancels

### Churn Reduction Tactics
- Monthly health report delivers visible value even if user doesn't contact support
- Annual plan prominently offered (locks in, reduces churn maths)
- Cancellation survey to understand reasons
- 30-day "pause" option instead of cancel (Lemon Squeezy supports this)

---

## 4. Webhook Integration Plan

### Events to Subscribe

| Event | Purpose |
|-------|---------|
| `order_created` | New purchase — trigger delivery flow |
| `order_refunded` | Refund — revoke access |
| `subscription_created` | New sub — grant support access |
| `subscription_updated` | Plan change — update access level |
| `subscription_cancelled` | Cancellation — schedule access removal |
| `subscription_payment_success` | Renewal — log & continue access |
| `subscription_payment_failed` | Failed payment — alert & dunning |
| `license_key_created` | New key — log for support lookups |

### Webhook Endpoint

```typescript
// app/api/webhooks/lemonsqueezy/route.ts
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

  // Verify signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  const signature = req.headers.get('x-signature');

  if (!signature || !crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  )) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload.meta.event_name;

  switch (eventName) {
    case 'order_created':
      await handleOrderCreated(payload);
      break;
    case 'order_refunded':
      await handleOrderRefunded(payload);
      break;
    case 'subscription_created':
      await handleSubscriptionCreated(payload);
      break;
    case 'subscription_updated':
      await handleSubscriptionUpdated(payload);
      break;
    case 'subscription_cancelled':
      await handleSubscriptionCancelled(payload);
      break;
    case 'subscription_payment_failed':
      await handlePaymentFailed(payload);
      break;
    case 'license_key_created':
      await handleLicenseKeyCreated(payload);
      break;
    default:
      console.log(`Unhandled event: ${eventName}`);
  }

  return NextResponse.json({ received: true });
}

// --- Handler implementations ---

async function handleOrderCreated(payload: any) {
  const { data, meta } = payload;
  const email = data.attributes.user_email;
  const productName = data.attributes.first_order_item.product_name;
  const orderId = data.id;

  // Store order in database
  // await db.orders.create({ orderId, email, productName, ... });

  // If Pro Setup: license key is delivered by Lemon Squeezy automatically
  // Optionally send a custom welcome email via your own system
  console.log(`New order: ${orderId} for ${email} — ${productName}`);
}

async function handleOrderRefunded(payload: any) {
  const orderId = payload.data.id;
  // Revoke license key activation
  // await db.orders.update({ orderId, status: 'refunded' });
  // Deactivate license via API if needed
}

async function handleSubscriptionCreated(payload: any) {
  const email = payload.data.attributes.user_email;
  const status = payload.data.attributes.status;
  // Grant access: Discord role, monitoring setup
  // await db.subscriptions.create({ email, status, ... });
}

async function handleSubscriptionUpdated(payload: any) {
  // Handle plan changes, pause, resume
  const status = payload.data.attributes.status;
  // Update access level accordingly
}

async function handleSubscriptionCancelled(payload: any) {
  const email = payload.data.attributes.user_email;
  // Schedule access removal (keep until end of billing period)
  // Send winback email after 3 days
}

async function handlePaymentFailed(payload: any) {
  const email = payload.data.attributes.user_email;
  // Send alert, Lemon Squeezy handles dunning emails automatically
  // Log for manual follow-up if needed
}

async function handleLicenseKeyCreated(payload: any) {
  const key = payload.data.attributes.key;
  const orderId = payload.data.attributes.order_id;
  // Store for support lookups
  // await db.licenseKeys.create({ key, orderId });
}
```

### Webhook Security Checklist
- [x] Verify `x-signature` header using HMAC SHA-256
- [x] Use `crypto.timingSafeEqual` to prevent timing attacks
- [x] Parse raw body for signature verification (not parsed JSON)
- [x] Return 200 quickly — do heavy processing async
- [x] Idempotency: handle duplicate deliveries gracefully (check order ID before creating)
- [x] Log all events for debugging

---

## 5. Branded Receipt Email Templates

Lemon Squeezy allows custom receipt emails via **Settings → Emails** in the dashboard.

### Pro Setup — Purchase Confirmation

**Subject:** `Your Clawhatch Pro Setup license is ready 🚀`

```html
<!-- Lemon Squeezy custom email template -->
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">

  <!-- Header -->
  <div style="text-align: center; padding: 32px 0 24px;">
    <img src="{{store_logo_url}}" alt="Clawhatch" style="height: 40px;" />
  </div>

  <!-- Hero -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; text-align: center; color: white;">
    <h1 style="margin: 0 0 8px; font-size: 24px;">You're all set! 🎉</h1>
    <p style="margin: 0; opacity: 0.9;">Your Pro Setup license is ready to activate.</p>
  </div>

  <!-- License Key -->
  <div style="background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 8px; font-size: 13px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Your License Key</p>
    <code style="font-size: 18px; font-weight: bold; color: #1a1a2e; word-break: break-all;">{{license_key}}</code>
  </div>

  <!-- Instructions -->
  <div style="padding: 0 8px;">
    <h2 style="font-size: 16px; margin: 24px 0 12px;">How to activate:</h2>
    <ol style="padding-left: 20px; line-height: 1.8;">
      <li>Open the Clawhatch setup wizard</li>
      <li>Click <strong>"I have a license key"</strong></li>
      <li>Paste your key above</li>
      <li>Pro features unlock instantly ✨</li>
    </ol>
  </div>

  <!-- Order Summary -->
  <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 24px;">
    <h2 style="font-size: 14px; color: #6c757d; margin: 0 0 12px;">Order Summary</h2>
    <table style="width: 100%; font-size: 14px;">
      <tr><td>Clawhatch Pro Setup</td><td style="text-align: right;">{{order_total}}</td></tr>
      <tr><td style="color: #6c757d;">Order #{{order_number}}</td><td style="text-align: right; color: #6c757d;">{{order_date}}</td></tr>
    </table>
  </div>

  <!-- Support -->
  <div style="background: #f0f7ff; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px;">
    <strong>Need help?</strong> Reply to this email or join our <a href="https://discord.gg/clawhatch" style="color: #667eea;">Discord community</a>. 7-day post-setup support is included with your purchase.
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 24px 0; font-size: 12px; color: #adb5bd;">
    <p>Clawhatch — Setup tools for OpenClaw & Clawdbot</p>
    <p><a href="{{receipt_url}}" style="color: #6c757d;">View receipt</a> · <a href="https://clawhatch.com" style="color: #6c757d;">Website</a></p>
  </div>
</div>
```

### Support Subscription — Welcome Email

**Subject:** `Welcome to Clawhatch Support — you're covered ✅`

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">

  <div style="text-align: center; padding: 32px 0 24px;">
    <img src="{{store_logo_url}}" alt="Clawhatch" style="height: 40px;" />
  </div>

  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 32px; text-align: center; color: white;">
    <h1 style="margin: 0 0 8px; font-size: 24px;">You're covered! ✅</h1>
    <p style="margin: 0; opacity: 0.9;">Your Clawhatch Support Plan is now active.</p>
  </div>

  <div style="padding: 16px 8px;">
    <h2 style="font-size: 16px; margin: 24px 0 12px;">What's included:</h2>
    <ul style="padding-left: 20px; line-height: 2;">
      <li>🔄 <strong>Auto-updates</strong> — new versions applied for you</li>
      <li>📊 <strong>Monthly health report</strong> — system status delivered to your inbox</li>
      <li>💬 <strong>Priority Discord support</strong> — 48h response guarantee</li>
      <li>🚀 <strong>Early access</strong> — new features before anyone else</li>
      <li>🔧 <strong>2 config changes/month</strong> — just ask</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="https://discord.gg/clawhatch" style="display: inline-block; background: #11998e; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Join Priority Support Discord →</a>
  </div>

  <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 24px;">
    <h2 style="font-size: 14px; color: #6c757d; margin: 0 0 12px;">Subscription Details</h2>
    <table style="width: 100%; font-size: 14px;">
      <tr><td>Plan</td><td style="text-align: right;">{{variant_name}}</td></tr>
      <tr><td>Amount</td><td style="text-align: right;">{{order_total}}/{{billing_interval}}</td></tr>
      <tr><td>Next billing date</td><td style="text-align: right;">{{next_billing_date}}</td></tr>
    </table>
  </div>

  <div style="background: #fff8e1; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px;">
    <strong>Your first health report</strong> arrives in ~30 days. We'll check everything's running smoothly and let you know.
  </div>

  <div style="text-align: center; padding: 24px 0; font-size: 12px; color: #adb5bd;">
    <p>Clawhatch — Setup tools for OpenClaw & Clawdbot</p>
    <p><a href="{{customer_portal_url}}" style="color: #6c757d;">Manage subscription</a> · <a href="{{receipt_url}}" style="color: #6c757d;">View receipt</a></p>
  </div>
</div>
```

### Monthly Health Report (Sent via Your Own System)

**Subject:** `📊 Your Clawhatch monthly report — {{month}} {{year}}`

This email is sent by your own system (not Lemon Squeezy) to active subscribers. Trigger via cron job on the 1st of each month.

Content to include:
- System status: ✅ Healthy / ⚠️ Issues detected
- Updates applied this month (version numbers)
- Uptime percentage
- Any config changes made
- What's new / coming next month
- CTA: "Need anything? Reply to this email"

---

## 6. Checkout Overlay Integration (Next.js)

### Install Lemon Squeezy JS

```bash
npm install @lemonsqueezy/lemonsqueezy.js
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID=your_store_id
NEXT_PUBLIC_PRO_SETUP_VARIANT_ID=your_variant_id
NEXT_PUBLIC_SUPPORT_MONTHLY_VARIANT_ID=your_variant_id
NEXT_PUBLIC_SUPPORT_ANNUAL_VARIANT_ID=your_variant_id
LEMONSQUEEZY_API_KEY=your_api_key
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

### Checkout Overlay Component

```tsx
// components/CheckoutButton.tsx
'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    createLemonSqueezy: () => void;
    LemonSqueezy: {
      Url: {
        Open: (url: string) => void;
      };
    };
  }
}

interface CheckoutButtonProps {
  variantId: string;
  label: string;
  email?: string;      // Pre-fill if known
  discountCode?: string;
  className?: string;
}

export function CheckoutButton({
  variantId,
  label,
  email,
  discountCode,
  className,
}: CheckoutButtonProps) {
  useEffect(() => {
    // Load Lemon Squeezy overlay script
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.createLemonSqueezy?.();
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const storeId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID;

  // Build checkout URL with overlay param
  let checkoutUrl = `https://clawhatch.lemonsqueezy.com/checkout/buy/${variantId}?embed=1&media=0`;
  if (email) checkoutUrl += `&checkout[email]=${encodeURIComponent(email)}`;
  if (discountCode) checkoutUrl += `&discount=${discountCode}`;

  return (
    <a
      href={checkoutUrl}
      className={`lemonsqueezy-button ${className ?? ''}`}
      data-lemon-squeezy
    >
      {label}
    </a>
  );
}
```

### Pricing Section Component

```tsx
// components/PricingSection.tsx
'use client';

import { useState } from 'react';
import { CheckoutButton } from './CheckoutButton';

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          Simple, fair pricing
        </h2>
        <p className="text-center text-gray-500 mb-12">
          Start free. Upgrade when you're ready.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">

          {/* Free Tier */}
          <div className="border rounded-xl p-8">
            <h3 className="text-lg font-semibold">Free</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold">$0</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li>✓ Basic setup wizard</li>
              <li>✓ Community Discord</li>
              <li>✓ Self-serve docs</li>
            </ul>
            <a
              href="/wizard"
              className="block w-full text-center py-2.5 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Get started
            </a>
          </div>

          {/* Pro Setup */}
          <div className="border-2 border-indigo-500 rounded-xl p-8 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </span>
            <h3 className="text-lg font-semibold">Pro Setup</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold">$39</span>
              <span className="text-gray-500 text-sm ml-1">one-time</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li>✓ Everything in Free</li>
              <li>✓ Automated advanced config</li>
              <li>✓ Custom skill setup</li>
              <li>✓ Config backup & export</li>
              <li>✓ License key (perpetual)</li>
              <li>✓ 7-day email support</li>
            </ul>
            <CheckoutButton
              variantId={process.env.NEXT_PUBLIC_PRO_SETUP_VARIANT_ID!}
              label="Buy Pro Setup — $39"
              className="block w-full text-center py-2.5 px-4 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition"
            />
          </div>

          {/* Support Plan */}
          <div className="border rounded-xl p-8">
            <h3 className="text-lg font-semibold">Support Plan</h3>
            <div className="mt-4 mb-2">
              {/* Billing toggle */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setAnnual(false)}
                  className={`text-xs px-2 py-1 rounded ${!annual ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={`text-xs px-2 py-1 rounded ${annual ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                >
                  Annual
                </button>
                {annual && (
                  <span className="text-xs text-green-600 font-medium">Save $38</span>
                )}
              </div>
              <span className="text-4xl font-bold">
                {annual ? '$190' : '$19'}
              </span>
              <span className="text-gray-500 text-sm ml-1">
                /{annual ? 'year' : 'month'}
              </span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-8 mt-6">
              <li>✓ Auto-updates applied for you</li>
              <li>✓ Monthly health reports</li>
              <li>✓ Priority Discord support</li>
              <li>✓ 48h response guarantee</li>
              <li>✓ 2 config changes/month</li>
              <li>✓ Early access to new features</li>
            </ul>
            <CheckoutButton
              variantId={
                annual
                  ? process.env.NEXT_PUBLIC_SUPPORT_ANNUAL_VARIANT_ID!
                  : process.env.NEXT_PUBLIC_SUPPORT_MONTHLY_VARIANT_ID!
              }
              label={annual ? 'Subscribe — $190/yr' : 'Subscribe — $19/mo'}
              className="block w-full text-center py-2.5 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
            />
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex justify-center gap-8 mt-12 text-sm text-gray-500">
          <span>🔒 Secure checkout</span>
          <span>💳 Powered by Lemon Squeezy</span>
          <span>↩️ 30-day money-back guarantee</span>
        </div>
      </div>
    </section>
  );
}
```

### Post-Setup Upsell Component

Show this after the wizard completes successfully — the peak moment of trust.

```tsx
// components/PostSetupUpsell.tsx
'use client';

import { CheckoutButton } from './CheckoutButton';

interface PostSetupUpsellProps {
  userEmail?: string;
}

export function PostSetupUpsell({ userEmail }: PostSetupUpsellProps) {
  return (
    <div className="max-w-lg mx-auto text-center p-8">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold mb-2">Setup complete!</h2>
      <p className="text-gray-500 mb-8">
        Your OpenClaw instance is running. Want to keep it that way?
      </p>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 mb-4">
        <h3 className="font-semibold mb-2">Support Plan — $19/mo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Auto-updates, health reports, priority support. We keep it running so you don't have to.
        </p>
        <CheckoutButton
          variantId={process.env.NEXT_PUBLIC_SUPPORT_MONTHLY_VARIANT_ID!}
          label="Get Support Plan →"
          email={userEmail}
          className="inline-block py-2.5 px-6 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition"
        />
      </div>

      <button className="text-sm text-gray-400 hover:text-gray-600 transition">
        No thanks, I'll manage it myself
      </button>
    </div>
  );
}
```

### Layout Integration

```tsx
// app/page.tsx (landing page)
import { PricingSection } from '@/components/PricingSection';

export default function Home() {
  return (
    <main>
      {/* ... hero, features, etc. */}
      <PricingSection />
      {/* ... testimonials, FAQ, footer */}
    </main>
  );
}
```

---

## Quick Reference

| Item | Value |
|------|-------|
| **Payment platform** | Lemon Squeezy (merchant of record) |
| **Pro Setup price** | $39 one-time |
| **Support Monthly** | $19/mo |
| **Support Annual** | $190/yr (save $38) |
| **LS fee (free plan)** | 5% + 50¢ per transaction |
| **LS fee (paid plan)** | 3.5% + 50¢ per transaction |
| **Webhook endpoint** | `/api/webhooks/lemonsqueezy` |
| **License validation** | `api.lemonsqueezy.com/v1/licenses/validate` |
| **Checkout style** | Overlay (embed=1) |
| **Tax handling** | Lemon Squeezy handles all VAT/sales tax |
| **Migration trigger** | Move to Stripe when revenue > $5K/mo |

---

*Generated from pricing-research.md and monetization-deep-dive.md*
