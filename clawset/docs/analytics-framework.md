# Clawhatch — Month 1 Analytics Review Framework

> Review date: End of Week 4 after launch
> Owner: Rich
> Goal: Data-driven decisions on what's working, what's not, and where to double down

---

## 1. Analytics Export Checklist

Pull all data on the same day for consistency. Export as CSV where possible.

### Twitter/X (@clawhatch)
- [ ] Profile analytics → Impressions, profile visits, follower count
- [ ] Tweet-level data → Impressions, engagements, link clicks, retweets, replies per tweet
- [ ] Follower growth curve (daily)
- [ ] Top 5 tweets by engagement rate
- [ ] DM enquiries count
- **Where:** Twitter Analytics → Export data (28-day window)

### YouTube
- [ ] Channel analytics → Views, watch time, subscribers gained/lost
- [ ] Traffic sources breakdown (search, suggested, external, browse)
- [ ] Audience retention curves for each video
- [ ] Click-through rate on thumbnails
- [ ] Top search terms driving discovery
- [ ] End screen / card click rates
- **Where:** YouTube Studio → Analytics → Advanced Mode → Export

### Reddit
- [ ] Posts made (subreddit, title, upvotes, comments, link clicks)
- [ ] Comment karma earned
- [ ] Profile visits (if available)
- [ ] Referral traffic to site (from website analytics)
- **Where:** Manual log + cross-reference with website UTM data

### Website (clawhatch.com)
- [ ] Total sessions, unique visitors, pageviews
- [ ] Traffic by source/medium (organic, social, direct, referral)
- [ ] Landing page performance (bounce rate, time on page)
- [ ] Conversion funnel: visit → pricing page → Lemon Squeezy click-through
- [ ] Geographic breakdown
- [ ] Device breakdown (mobile vs desktop)
- [ ] Page load speed (Core Web Vitals)
- **Where:** Plausible / Umami / Google Analytics → Export

### Lemon Squeezy
- [ ] Total revenue
- [ ] Number of orders
- [ ] Unique customers
- [ ] Revenue by product/variant
- [ ] Refund count and rate
- [ ] Discount code usage (if any)
- [ ] Traffic source (referrer data)
- **Where:** Lemon Squeezy Dashboard → Orders → Export

---

## 2. Metrics Dashboard Template

### Summary Block

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Total / Avg | Target |
|---|---|---|---|---|---|---|
| **Revenue** | £ | £ | £ | £ | £ | £500 |
| **Orders** | | | | | | 25 |
| **Website visitors** | | | | | | 2,000 |
| **Conversion rate** | % | % | % | % | % | 1.5% |
| **Twitter followers** | | | | | Δ | +200 |
| **Twitter impressions** | | | | | | 50k |
| **YouTube views** | | | | | | 5,000 |
| **YouTube subs** | | | | | Δ | +100 |
| **Reddit upvotes** | | | | | | — |
| **Email signups** | | | | | | 100 |

### Channel Health Scorecard

| Channel | Traffic Sent | Conversions | Revenue | Cost (time hrs) | Score |
|---|---|---|---|---|---|
| Twitter | | | £ | h | |
| YouTube | | | £ | h | |
| Reddit | | | £ | h | |
| Organic/SEO | | | £ | h | |
| Direct | | | £ | — | |

**Score formula:** `(Revenue / Hours Spent)` → £/hr equivalent. Rank channels by this.

### Trend Flags
- 📈 **Growing:** metric increased >20% week-over-week for 2+ weeks
- 📉 **Declining:** metric decreased >20% week-over-week for 2+ weeks
- ➡️ **Flat:** within ±10%
- 🔥 **Breakout:** single week spike >3× average

---

## 3. ROI Calculation Per Channel

### Method
Since Clawhatch is bootstrapped, cost = your time. Track hours per channel weekly.

```
Channel ROI = (Revenue Attributed - Direct Costs) / Hours Invested

Effective Hourly Rate = Revenue Attributed / Hours Invested
```

### Attribution Model
Use **last-click UTM** as primary, with awareness credit as secondary:

| Channel | Attribution | How to Track |
|---|---|---|
| Twitter | UTM `source=twitter` on all links | Direct click-through |
| YouTube | UTM `source=youtube` + description links | Direct click-through |
| Reddit | UTM `source=reddit` on all links | Direct click-through |
| Organic | `source=google` / no UTM, organic medium | Search Console |
| Direct | No referrer, direct type-in | Baseline brand awareness |

### ROI Table

| Channel | Revenue | Hours | £/hr | Conversion Rate | Verdict |
|---|---|---|---|---|---|
| Twitter | £ | h | £ | % | |
| YouTube | £ | h | £ | % | |
| Reddit | £ | h | £ | % | |
| SEO/Blog | £ | h | £ | % | |
| **Total** | **£** | **h** | **£** | **%** | |

### Benchmark Thresholds
- **🟢 Good:** £20+/hr effective rate, or >2% conversion from channel
- **🟡 Watch:** £5-20/hr, or 0.5-2% conversion — needs optimisation
- **🔴 Cut:** <£5/hr after 3+ weeks, or <0.5% conversion with 100+ clicks

---

## 4. Decision Framework: Kill, Keep, or 2×

### Decision Matrix

For each channel/activity, plot on two axes:

```
                    HIGH EFFORT
                        │
         KILL 🔴        │        OPTIMISE 🟡
      (stop doing)      │    (reduce effort or
                        │     automate first)
    ────────────────────┼────────────────────
                        │
       TEST MORE 🟡     │        DOUBLE DOWN 🟢
     (low cost to       │      (this is working,
      keep exploring)   │        scale it up)
                        │
                    LOW EFFORT
         LOW RETURN ◄───┼───► HIGH RETURN
```

### Kill Criteria (stop within 48hrs)
- [ ] Channel drove <10 website visits in 4 weeks despite consistent posting
- [ ] Zero conversions with 200+ clicks (funnel is broken for this audience)
- [ ] Takes >5 hrs/week and produces <£10 revenue
- [ ] Audience engagement declining 3 weeks straight
- [ ] Content feels forced / off-brand for the channel

### 2× Criteria (increase investment immediately)
- [ ] Channel converts at >2% with meaningful traffic (50+ clicks)
- [ ] £/hr rate is >£20 and volume hasn't been maxed
- [ ] Engagement rate is top-of-channel (>5% Twitter, >8% YouTube CTR)
- [ ] Audience is asking questions / requesting more (demand signal)
- [ ] One post went viral — pattern can be replicated

### Keep & Optimise Criteria
- [ ] Shows promise but conversion rate is <1% — fix the landing page or CTA
- [ ] Good engagement but no clicks — add better CTAs
- [ ] Traffic is decent but bounces — fix page relevance or speed

### Month 1 Review Actions Template

| Activity | Result | Hours | Decision | Next Action |
|---|---|---|---|---|
| Twitter threads | | h | 🟢🟡🔴 | |
| Twitter replies/engagement | | h | 🟢🟡🔴 | |
| YouTube tutorials | | h | 🟢🟡🔴 | |
| YouTube shorts | | h | 🟢🟡🔴 | |
| Reddit posts | | h | 🟢🟡🔴 | |
| Reddit comments | | h | 🟢🟡🔴 | |
| Blog/SEO content | | h | 🟢🟡🔴 | |
| Cold outreach/DMs | | h | 🟢🟡🔴 | |

---

## 5. UTM Tracking Setup Guide

### UTM Parameter Standard

All outbound links from marketing channels must use this format:

```
https://clawhatch.com/?utm_source=SOURCE&utm_medium=MEDIUM&utm_campaign=CAMPAIGN&utm_content=CONTENT
```

### Parameter Definitions

| Parameter | Purpose | Examples |
|---|---|---|
| `utm_source` | Platform | `twitter`, `youtube`, `reddit`, `newsletter` |
| `utm_medium` | Channel type | `social`, `video`, `forum`, `email` |
| `utm_campaign` | Campaign name | `launch-week`, `tutorial-series`, `black-friday` |
| `utm_content` | Specific variant | `bio-link`, `thread-cta`, `video-desc`, `pinned-comment` |

### Ready-Made Links

**Twitter:**
```
Bio link:
https://clawhatch.com/?utm_source=twitter&utm_medium=social&utm_campaign=organic&utm_content=bio

Tweet CTA:
https://clawhatch.com/?utm_source=twitter&utm_medium=social&utm_campaign=organic&utm_content=tweet

Thread CTA:
https://clawhatch.com/?utm_source=twitter&utm_medium=social&utm_campaign=organic&utm_content=thread
```

**YouTube:**
```
Video description:
https://clawhatch.com/?utm_source=youtube&utm_medium=video&utm_campaign=organic&utm_content=description

Pinned comment:
https://clawhatch.com/?utm_source=youtube&utm_medium=video&utm_campaign=organic&utm_content=pinned-comment

End card:
https://clawhatch.com/?utm_source=youtube&utm_medium=video&utm_campaign=organic&utm_content=endcard
```

**Reddit:**
```
Post link:
https://clawhatch.com/?utm_source=reddit&utm_medium=forum&utm_campaign=organic&utm_content=post

Comment link:
https://clawhatch.com/?utm_source=reddit&utm_medium=forum&utm_campaign=organic&utm_content=comment
```

**Newsletter/Email:**
```
https://clawhatch.com/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest&utm_content=cta-button
```

### Naming Rules
1. **Always lowercase**, no spaces (use hyphens)
2. **Never change** a UTM scheme mid-campaign — breaks comparison
3. **Log every new UTM** in a tracking spreadsheet
4. For A/B tests, use `utm_content` to differentiate variants: `cta-v1`, `cta-v2`

### Short Links
Use a link shortener (e.g., dub.co, short.io) for clean social posts. Map each short link to the full UTM URL. Keep a master list:

| Short Link | Full URL | Channel | Notes |
|---|---|---|---|
| | `clawhatch.com/?utm_source=twitter...` | Twitter bio | |
| | `clawhatch.com/?utm_source=youtube...` | YT description | |

---

## 6. A/B Testing Plan — Landing Page

### Test 1: Headline
- **Hypothesis:** A benefit-driven headline converts better than a feature-driven one
- **Control (A):** Current headline
- **Variant (B):** Benefit-focused alternative (e.g., "Ship your AI product this weekend" vs "AI project templates and tools")
- **Metric:** Click-through to pricing / CTA button click rate
- **Traffic split:** 50/50
- **Minimum sample:** 200 unique visitors per variant
- **Duration:** ~2 weeks or until significance reached

### Test 2: CTA Button Copy
- **Hypothesis:** Specific CTA outperforms generic
- **Control (A):** "Get Started"
- **Variant (B):** "Download the Kit — £29" (price anchoring + specificity)
- **Metric:** Button click rate → Lemon Squeezy checkout initiated
- **Traffic split:** 50/50
- **Minimum sample:** 150 visitors per variant
- **Duration:** ~2 weeks

### Test 3: Social Proof Placement
- **Hypothesis:** Showing testimonials/stats above the fold increases conversion
- **Control (A):** Social proof below fold
- **Variant (B):** "Join 50+ builders" or testimonial quote immediately under headline
- **Metric:** Scroll depth + CTA click rate
- **Minimum sample:** 200 visitors per variant

### Test 4: Pricing Page Layout
- **Hypothesis:** Single clear price converts better than tiered options (at this stage)
- **Control (A):** Current layout
- **Variant (B):** Single product, single price, one big CTA
- **Metric:** Checkout initiation rate

### Testing Rules
1. **One test at a time** — don't stack variables
2. **Run for full weeks** — avoid day-of-week bias
3. **Statistical significance** — use a calculator (abtestguide.com), aim for 95% confidence
4. **Document everything:**

| Test # | Element | Start | End | Visitors A | Visitors B | Conv A | Conv B | Winner | Lift |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Headline | | | | | % | % | | % |
| 2 | CTA copy | | | | | % | % | | % |
| 3 | Social proof | | | | | % | % | | % |
| 4 | Pricing layout | | | | | % | % | | % |

### Tools
- **Simple:** Manually swap content weekly, compare analytics periods
- **Better:** Vercel Edge Config + middleware for server-side split
- **Best:** PostHog / Google Optimize (sunset, but alternatives: VWO free tier, Growthbook)

---

## Review Cadence

| When | What |
|---|---|
| **Weekly** (15 min) | Glance at dashboard numbers, note anomalies |
| **Bi-weekly** (30 min) | Pull channel metrics, update ROI table |
| **Month 1 Review** (2 hrs) | Full export, fill every table above, make kill/2× decisions |
| **Ongoing** | One A/B test running at all times on the landing page |

---

*Framework created for Clawhatch Month 1 launch analytics. Fill in targets based on pre-launch baseline if available, otherwise use the defaults above as starting points and adjust after Week 2.*
