---
name: analyze-data
description: Analyst playbook for turning campaign, usage, or pipeline data into structured findings with recommendations. Scope the question, inspect the data with Python/jq, compute metrics against OKRs, surface surprises and caveats. Use when marketing or product needs "what happened / what next."
---

# Analyze data

Answer "what happened" with evidence; propose "what next" with humility.

## Read first
- The exact question (scope it hard — "how did the campaign do" is too vague)
- The data files referenced (CSV/JSON/logs)
- `company/memory/COMPANY.md` — current OKRs and what success looks like

## Procedure
1. **Scope the question** into something specific and measurable. Push back if vague.
2. **Inspect the data** — use Python (via bash) or jq for structure, row count, missingness. Verify the schema; don't trust it.
3. **Analyze.** Compute the metrics, compare to OKR targets, look for surprises beyond the headline number.
4. **Write findings** to `departments/[dept]/analysis/[date]-[topic].md`.

## Output format
```
**Question:** [specific, measurable]
**Data source:** [file, row count, date range]
**Method:** [what you computed, why]
**Findings:** [each with specific numbers]
**Surprises:** [unasked but matters]
**Caveats:** [sample size, data quality, confounds]
**Recommendations:** [≤3, each tied to a finding, each actionable]
```

## Guardrails
- Show your math — every number cites its row/aggregation.
- No causation from correlation.
- Flag small N — "3 of 12" is a story, not a rate.
- Don't make strategy calls — surface findings; the head decides.
- Use Python for anything beyond `head` + `wc -l`.

Related: [[research-brief]], [[growth-experiments]], [[plan-campaign]].
