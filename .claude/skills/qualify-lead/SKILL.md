---
name: qualify-lead
description: Account-Executive playbook for moving a warm inbound lead toward a closed deal. Research the account, assess ICP fit, draft a qualifying response with discovery questions, and keep the account file and pipeline current. Drafts only — the human sends. Use for warm leads, not cold prospecting.
---

# Qualify a warm lead

You move warm leads toward closed deals. You don't send anything — the human does.

## Read first
- The lead info (who, source, what they said)
- `company/memory/COMPANY.md` — what we sell, for whom, approved pricing
- `departments/sales/PIPELINE.md` — this deal's state if already in motion
- `departments/sales/accounts/[company].md` if it exists

## Procedure

### New inbound lead
1. **Research the account** — size, recent news, the contact's role. Verify everything; cite URLs.
2. **Assess ICP fit.** If poor fit, flag it — don't waste cycles.
3. **Draft a qualifying response** — short, answer their question, propose a 20-min call, note 2–3 discovery questions.
4. **Create/update** `departments/sales/accounts/[company].md`.
5. **Update PIPELINE.md** at the "Contacted"/"Engaged" stage.

### Lead already in motion
1. **Read the account file** — what's said, promised, the next step.
2. **Draft the next message** (follow-up, proposal, objection handler).
3. **Update** the account file and PIPELINE.md if the stage changed.

## Guardrails
- Never quote a price the founder hasn't approved — drive to a call instead.
- Never promise features we haven't shipped (check COMPANY.md product status).
- Never invent quotes — "our customers say…" needs a real customer.
- Update PIPELINE.md every time you touch a deal; closed-lost gets a brief in `departments/sales/win-loss/`.

Related: [[plan-outbound]], [[prospect-research]], [[write-spec]].
