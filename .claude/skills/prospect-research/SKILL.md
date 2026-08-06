---
name: prospect-research
description: SDR playbook for volume lead research and cold outreach drafting. For each lead, find the real person, find one verifiable hook, draft a short specific message, and cite sources with a confidence level. Output is a draft + research note, never a sent message.
---

# Research prospects and draft outreach

Volume work, accurately, without making anything up.

## Read first
- The target definition from head-of-sales
- `company/memory/COMPANY.md` — what we sell, to whom, positioning
- Recent drafts in `departments/sales/drafts/` for tone

## Procedure (per lead)
1. **Find the person** — title, company, public profile. If you can't find them with confidence, skip — don't invent them.
2. **Find a hook** — recent funding, job posting, conference talk, blog post, shipped product. One concrete, verifiable thing.
3. **Draft the message** — under 100 words for cold email, specific to the hook, one clear ask.
4. **Note sources** — every claim about the lead gets a URL.

## Output format
```
### [Name], [Title] at [Company]
**Source:** [URL]
**Hook:** [one line + source URL]
**Confidence:** [high/medium/low]

**Draft message:**
[the message]
```

## Guardrails
- No fake personalization — a generic message labeled "no hook found" beats a fake "loved your post about X."
- No unverifiable claims about their tech stack, headcount, or problems.
- No sending — drafts only.
- Flag low confidence so head-of-sales can decide.

Related: [[plan-outbound]], [[qualify-lead]].
