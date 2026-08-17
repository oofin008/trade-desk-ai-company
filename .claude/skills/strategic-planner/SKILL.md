---
name: strategic-planner
description: Marketing strategic-planning playbook. Turn company OKRs and positioning into a quarter's marketing strategy — goals, target segments, channel and budget allocation, and a sequenced campaign roadmap. Produces a plan draft for founder approval, not committed spend. Use for quarterly/launch-cycle marketing planning.
---

# Marketing strategic planner

Translate company strategy into a marketing plan: where to play, how to win, what to spend, in what order. A planning artifact for the founder — it proposes spend, it does not commit it.

## Read first
- `company/memory/COMPANY.md` — OKRs, ICP, positioning, brand voice
- `company/BUDGET.md` — current spend status (required before proposing any spend)
- `company/decisions/LOG.md` — recent strategic decisions that constrain the plan
- `departments/marketing/CLAUDE.md` — channels and what the department owns
- Past recaps in `departments/marketing/recaps/` — what worked last cycle

## Procedure
1. **Anchor to OKRs.** Restate the company objective(s) marketing serves this cycle, and the marketing-owned metric for each (signups, qualified leads, awareness). No metric → ask the founder before planning.
2. **Pick segments.** Within the ICP, which segment(s) this cycle and why (evidence from research/COMPANY.md).
3. **Set the positioning angle.** The one message per segment. Cross-check against [[competitive-positioning]].
4. **Allocate channels & budget.** Map effort and proposed spend across the department's channels. Flag every line that needs the human to set up an account or release budget. Stay within `BUDGET.md`; if the plan needs more, say so explicitly and stop short of assuming it.
5. **Sequence a roadmap.** Campaigns in order across the window, with dependencies (e.g. Software ships → Marketing announces). Each campaign names the metric it moves and links to [[plan-campaign]] for execution.
6. **Define measurement.** What you'll review mid-cycle and at the end (ties to [[analyze-data]]).
7. **Save** to `departments/marketing/plans/[date]-strategy-[period].md` and tag the founder for approval.

## Output shape
```
**Period:** [e.g. Q3 2026]
**Objective(s) served:** [OKR → marketing metric]
**Target segment(s):** [+ why]
**Positioning angle:** [one line per segment]
**Channel & budget allocation:** [channel → effort, proposed spend, needs-human?]
**Campaign roadmap:** [ordered list, each with metric + dependency]
**Measurement plan:** [mid + end checkpoints]
**Open decisions for founder:** [budget releases, accounts, trade-offs]
```

## Guardrails
- Draft, don't commit — proposed budget is not approved budget. Read `BUDGET.md`; never assume spend.
- Brand strategy and ICP changes belong to CEO/founder — surface them, don't decide them.
- Every claim and target traces to COMPANY.md or research.
- Log any strategy that changes how the department operates to `company/decisions/LOG.md` once approved.

Related: [[plan-campaign]], [[content-calendar]], [[competitive-positioning]], [[growth-experiments]], [[analyze-data]].
