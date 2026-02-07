# Case Study Template - [Customer Name/Company]

*Fill this out after each successful manual setup session. Use for social proof on website, blog, testimonials.*

---

## Header Image
`[Photo of customer or their logo - get permission first]`

---

## Quick Facts

**Industry:** [e.g., Software Development, Consulting, E-commerce, Personal Use]  
**Company Size:** [e.g., Solo founder, 5-person team, 50+ employees]  
**Use Case:** [e.g., Customer support automation, Personal assistant, Dev team workflows]  
**Setup Duration:** [e.g., 45 minutes]  
**Channels Configured:** [e.g., Telegram + Discord + WhatsApp]  
**Outcome:** [e.g., Saved 10 hours/week, Eliminated security risk, Increased productivity]

---

## The Challenge

### What They Needed

*1-2 paragraphs describing their situation before Clawhatch.*

**Example:**
"Alex was a solo founder building a SaaS product. He wanted to use OpenClaw to automate customer support and internal workflows, but every time he tried to set it up himself, he hit roadblocks. After 8 hours spread across three weekends, he had a 'working' setup — but wasn't confident it was secure.

His biggest concerns: He was handling customer data (GDPR compliance required), didn't understand exec permissions, and wasn't sure if his channel allowlists were properly locked down. The docs were technically correct but assumed security knowledge he didn't have."

### Pain Points

*Bullet list of specific problems they faced:*

- [ ] DIY setup took too long (how many hours?)
- [ ] Security confusion (which parts didn't make sense?)
- [ ] Channels not working (which ones? what errors?)
- [ ] Fear of making mistakes (what were they worried about?)
- [ ] Work use case = higher stakes (compliance, client data, etc.?)
- [ ] Tried tutorials but got stuck (where exactly?)

---

## The Solution

### What We Did

*1-2 paragraphs describing the Clawhatch setup process for them specifically.*

**Example:**
"We scheduled a 45-minute session. Before the call, Alex installed Node.js and created an Anthropic API key (10-minute prep work). During the session, we worked through the setup together on Alex's machine via screen share.

First, we configured a security-first baseline: gateway in local mode, allowlist-only channel policies, and exec permissions scoped to specific safe commands. Then we set up three channels (Telegram for personal use, Discord for dev team, WhatsApp for testing). We tested everything live, caught a typo in the Discord bot token, fixed it immediately, and verified all channels were responding correctly."

### Configuration Details

*Specific choices made during setup (sanitized, no sensitive info):*

**Gateway:**
- Mode: `local` (Alex works from home, doesn't need remote access)
- Auth: `token` (default strong token)

**Channels:**
- Telegram: Configured for Alex's personal automation (allowlist with his numeric ID)
- Discord: Connected to private dev server (allowlist for server ID)
- WhatsApp: Set up for testing (selfChatMode enabled)

**Exec Permissions:**
- Security: `allowlist`
- Allowed commands: `git`, `npm`, `ls`, `cat`, `grep` (enough for dev workflows)
- Ask mode: `on-miss` (confirms before running unlisted commands)

**Workspace:**
- Scoped to `/home/alex/openclaw-workspace`
- Symlinked project folders for access without giving root permissions

### Unique Challenges Solved

*Did this setup have any unusual requirements or tricky problems?*

**Example:**
"Alex needed to handle customer data, so we added extra documentation about GDPR compliance:
- Configured memory files to exclude customer PII
- Set aggressive log rotation
- Added notes about data retention policies
- Documented how to audit agent actions for compliance reports

We also set up a staging environment (separate config) so Alex could test new workflows safely before deploying to production."

---

## The Results

### Immediate Outcomes

*What happened right after setup?*

- ✅ Working OpenClaw agent in 45 minutes (vs. 8+ hours DIY)
- ✅ Security baseline tailored to work use case (GDPR-safe)
- ✅ Clear documentation Alex can reference
- ✅ Confidence to use it with customer data
- ✅ Three channels configured and tested

### Long-Term Impact

*Follow up 2-4 weeks later. What's the ongoing value?*

**Example:**
"Two weeks after setup, Alex reported:
- **10 hours/week saved** on customer support (agent handles tier-1 questions)
- **Zero security incidents** (vs. anxiety about DIY mistakes)
- **Team adoption:** Dev team now uses Discord channel for deployments
- **Expanded use:** Added GitHub integration himself using the patterns we set up"

### ROI Calculation

*Quantify the value if possible:*

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Setup time | 8+ hours (failed) | 45 min (working) | 90% faster |
| Security confidence | Low ("hope it's okay") | High (audited + documented) | Measurable peace of mind |
| Weekly time saved | 0 | 10 hours | £500/week value (at £50/hour) |
| Cost | £0 (but broken) | £149 (working) | ROI in 2 weeks |

---

## Customer Testimonial

### Quote

*Get 2-3 sentences from customer about their experience.*

**Example:**
> "I spent two weekends trying to set up OpenClaw myself and never felt confident it was secure. The Clawhatch session was worth every penny — 45 minutes and I walked away with a working, safe setup plus documentation I actually understand. Best £149 I've spent on my business this year."  
> — **Alex Thompson, Founder at [SaaS Company]**

### Video Testimonial (Optional)

*If customer agrees to record 30-60 second video:*

- [ ] Video file: `testimonials/[customer-name].mp4`
- [ ] Transcript: [paste here]
- [ ] Permission to use: ✅ / ❌

---

## Lessons Learned

### What Went Well

*What made this setup particularly smooth or successful?*

**Example:**
- Customer did pre-session prep (saved time)
- Clear use case identified upfront (knew what to configure)
- Customer asked good questions (showed engagement)
- Staging environment idea came from customer (smart approach)

### What We'd Do Differently

*Any improvements for future similar setups?*

**Example:**
- Could have documented GDPR considerations in a reusable checklist (now added to standard process)
- Should have tested WhatsApp connection more thoroughly (had to reconnect once)

### Reusable Patterns

*What from this setup can be templated for future customers?*

**Example:**
- "GDPR-compliant config" → now a template in `clawset/templates/gdpr-config.jsonc`
- Staging + production dual-config pattern → documented in setup guide
- Customer data exclusion rules → added to security audit checklist

---

## Where They Are Now

*Follow up 1-3 months later. Update this section:*

**[Date of follow-up]:**

*Brief update on:*
- Still using OpenClaw?
- Expanded use cases?
- Any issues encountered?
- Would they recommend Clawhatch to others?

---

## Usage Permissions

**Can we use this case study for:**
- [ ] Website (public)
- [ ] Blog post (public)
- [ ] Social media (public)
- [ ] Sales materials (private)

**Anonymization:**
- [ ] Use real name and company
- [ ] Use first name only (e.g., "Alex, founder at SaaS company")
- [ ] Fully anonymous (e.g., "Solo founder in software industry")

**Review:**
- [ ] Customer has reviewed and approved this case study
- [ ] Approval date: [DATE]
- [ ] Approved by: [NAME/EMAIL]

---

## Internal Notes

*Private notes, not for publication:*

**Customer satisfaction:** [1-10 rating]  
**Likelihood to refer:** [1-10 rating]  
**Follow-up needed?** [Yes/No - what specifically?]  
**Upsell opportunity?** [Support subscription? Ongoing consulting?]

**Red flags or concerns:** [Any issues during setup or after?]

**Best practices validated:** [What worked that we should keep doing?]

---

## Related Files

- Setup documentation: `[link to their specific docs]`
- Session notes: `[link to raw session notes]`
- Screenshots/recordings: `[if any]`
- Follow-up emails: `[thread link or file]`

---

*Template version: 1.0*  
*Last updated: February 3, 2026*
