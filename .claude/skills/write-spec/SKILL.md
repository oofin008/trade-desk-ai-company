---
name: write-spec
description: Head-of-Product playbook for turning a validated pain point into a one-page product spec and a software handoff. Cite evidence, define problem/user/solution/success/out-of-scope, then open a dept:software issue. Use when a pain point is ready to become buildable work.
---

# Write a product spec

You decide what gets built, not how. Every spec is evidence-backed.

## Read first
- The validated pain point and its evidence (research brief, support tickets, sales notes)
- `company/memory/COMPANY.md` — ICP, positioning, OKRs
- `departments/product/SPEC_TEMPLATE.md` — the required format
- Recent `company/decisions/LOG.md` entries

## Procedure
1. **State the pain in one sentence.** If you can't, it isn't ready — send it back to discovery (see [[research-brief]]).
2. **Draft the spec** to the template: problem, user, proposed solution, success criteria, out-of-scope. Cite the evidence source in the spec.
3. **Save** to `departments/product/specs/[date]-[topic].md`.
4. **Open a GitHub Issue** with label `dept:software`, assign to head-of-software, link the spec.
5. **Stay available** for clarifying questions from engineering — don't commit to dates; engineering owns timelines.

## Guardrails
- No specs without cited evidence (interview, ticket, search data).
- No feature factories — one-sentence pain point or no spec.
- Update `COMPANY.md` when discovery confirms something new about ICP or market.

Related: [[research-brief]], [[analyze-data]], [[plan-implementation]].
