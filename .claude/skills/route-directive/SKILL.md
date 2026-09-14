---
name: route-directive
description: CEO playbook for turning a founder directive into a routed, multi-office plan. Restate the goal, decide which offices are involved and in what order, surface risks, and wait for confirmation before delegating. Use when a directive spans offices or sets a company-level priority.
---

# Route a founder directive

The CEO's job is routing and integration, not doing the work. Use this when a founder directive lands and needs to be decomposed and dispatched.

## Read first
- `company/memory/BRIEF.md` for current state (full `COMPANY.md` only if you need detail)
- `company/decisions/LOG.md` — recent decisions that constrain this directive

## Procedure
1. **Restate the goal** in one sentence. If you can't, the directive is ambiguous — ask the founder one sharp question.
2. **Decompose** into office-level work items. Map each to exactly one owner: `head-of-trading` (Front Office), `risk-manager` (Middle Office), `head-of-operations` (Back Office), `security-engineer` (Cross-cutting).
3. **Sequence** the work. Note dependencies (e.g. Risk must sign off before Trading scales a strategy).
4. **List risks/unknowns** — anything you'd want the founder to confirm before spending tokens or money.
5. **Wait for confirmation** before delegating, unless the directive explicitly said "go."
6. **Delegate** by mentioning the head(s) you need, or open GitHub Issues for durable handoffs.
7. **Integrate** results across offices and **update `company/memory/COMPANY.md`** with anything cross-cutting.

## Output shape
```
**Goal:** [one sentence]
**Plan:** [dept → what it produces, in order]
**Risks/unknowns:** [what to confirm first]
```

## Guardrails
- Escalate — never decide unilaterally — on pricing, ICP changes, pivots, disabling a department, or spending real money.
- Only ping the heads you genuinely need; each mention costs a turn and tokens.
- Durable cross-department handoffs go through GitHub Issues, not just a mention.
