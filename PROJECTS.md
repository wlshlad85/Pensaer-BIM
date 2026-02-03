# PROJECTS.md - Mission Dashboard

*Last updated: 2026-02-03 04:57 GMT*

## Active Missions

### 🎯 PRIORITY 1: Clawhatch Launch (Week 1)
**Goal:** First paying customer by Feb 21, 2026  
**This Week:** Customer discovery + content activation (ends Feb 7)  
**Status:** 🟡 Content ready, blocked on Stripe + Calendly setup  

| Task | Status | Blocker | Next Action |
|------|--------|---------|-------------|
| Stripe account | ❌ Not started | Rich needs to create | 15min at stripe.com/register |
| Calendly account | ❌ Not started | Rich needs to create | 20min at calendly.com |
| Reddit beta post | ✅ Ready | Needs Calendly link | Insert link, publish to r/OpenClaw |
| Reddit guide post | ✅ Ready | Needs Calendly link | Insert link, publish to r/OpenClaw |
| Fiverr gig | ✅ Ready | TBD - check if Calendly needed | Review + publish if unblocked |
| Landing page | ✅ Live | None | localhost:3000 working |
| Manual setup sessions | 📅 Waiting | Needs bookings | Execute 3-5 sessions, gather requirements |
| Twitter/X thread | 🔨 In progress | None | Draft → Rich approval → publish |
| Outreach email template | 🔨 In progress | None | Draft → Rich can send immediately |

**Revenue Model:**
- Pro £79 (list £149) - 47% founding discount
- Enterprise £149 (list £299) - 50% founding discount  
- Concierge £249 (list £499) - 50% founding discount
- Support £29/mo

**Key Files:**
- `clawset/IMPLEMENTATION.md` - Full execution plan (CLA-200 to CLA-312)
- `clawset/WEEK-1-PROGRESS.md` - Sprint tracker
- `clawset/app/` - Next.js site (localhost:3000)
- `clawset/content/` - Marketing content

---

### 🏗️ PRIORITY 2: Pensaer-BIM
**Goal:** Tramshed Tech pitch Friday Feb 7, secure £150K funding  
**Status:** 🟢 Platform solid, pitch prep needed  

| Area | Status | Next Action |
|------|--------|-------------|
| Platform code | ✅ 19 PRs shipped Feb 2 | ISO 19650 compliance features |
| ISO 19650 agents | 🔨 Running | Check outputs, verify functioning |
| pensaer.io website | ✅ Ready | Deploy to Vercel, update DNS |
| Pitch deck | 🟡 Needs polish | Review one-pager, update with ISO story |
| Demo prep | 🟡 Needs work | Record demo showing terminal→3D pipeline |
| Scaling lab | ✅ Complete | Use in pitch as "secret weapon" |

**Pitch Angle:**
- ISO 19650-compliant CDE platform (not just BIM tool)
- Developer-first, command-line native, AI-integrated
- Multi-threaded modern architecture vs legacy Revit
- Whole-life information management (operating costs 3-5x build costs)
- Scaling laws research = differentiator for investors

**Key Files:**
- `C:\Users\RICHARD\Pensaer-BIM\` - Main repo
- `C:\Users\RICHARD\drafts\pensaer-web\pensaer-web\` - Website source
- `pensaer_scaling_lab/` - Research differentiator
- `pitch/one-pager.html` - One-page pitch doc

---

### 🎤 PRIORITY 3: Eight Sparks
**Goal:** AI K-pop group music video  
**Status:** 🟡 200+ images generated, QC in progress  

| Task | Status | Next |
|------|--------|------|
| Member images | ✅ 200+ generated | QC cull mutations |
| Track | ✅ Recorded | 8SPRX.wav (2m05s) |
| FLUX pipeline | 🔨 Testing | Switch from SDXL for consistency |
| Choreography | ❌ Not started | After image QC |
| Video assembly | ❌ Not started | After choreography |

**Members:** SORA, JISOO, YUNA, HANA, MIRA, NARI, DASOM, YERI

**Location:** `D:\Dev\Projects\Eight-Sparks-Generator\`

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Active deadlines | 2 (both Feb 7) |
| Revenue | $0 (yet) |
| Monthly burn | ~$500 |
| Runway | 0 months (month-to-month) |
| Critical priority | Clawhatch revenue |

---

## Work Modes

**Continuous Work (Current):** Launch Clawhatch by Friday. Work autonomously, ship without asking.

**Autonomous Night Work:** Pick unblocked tasks from this dashboard, ship by morning.

**Blocked:** When blocked, create content/tooling that unblocks others or advances adjacent goals.

---

## Decision Framework

When choosing what to work on:
1. **Unblocked?** Can I complete it without waiting on Rich?
2. **Impact?** Does it unblock revenue or critical deadlines?
3. **Priority?** Clawhatch > Pensaer-BIM > Eight Sparks > Everything else
4. **Risk?** Code changes must definitely not break. Content needs approval before publishing.

---

*This dashboard is my autonomous work guide. Update after every major milestone.*
