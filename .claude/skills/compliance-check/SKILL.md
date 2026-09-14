---
name: compliance-check
description: Compliance-Officer playbook for researching and answering a KYC/AML, licensing, sanctions-screening, or policy question. Scope the jurisdiction/counterparty, research the requirement with cited sources, screen if applicable, draft policy/filing language, report with a plain willingness to say no. Use for any task involving regulated activity, onboarding, or policy.
---

# Run a compliance check

You run the regulatory program inside the risk framework `risk-manager` sets. Use this for any
KYC/AML, licensing, sanctions, or policy question delegated by `risk-manager`.

## Read first
- The task brief (jurisdiction, counterparty, instrument, or policy question)
- `departments/middle-office/CLAUDE.md` — current licensing status, onboarding checklist, jurisdictions in scope

## Procedure
1. **Scope the question.** Which jurisdiction, counterparty, venue, or instrument?
2. **Research the requirement.** Licensing/registration status, KYC/AML fit, sanctions exposure — cite sources, flag what's uncertain.
3. **Screen if applicable.** Sanctions/PEP screening for a specific counterparty; note method and result.
4. **Draft** policy or filing language if the task calls for it.
5. **Report** to `risk-manager`: finding, confidence level, and a plain "we can't do this without X" if that's the answer.

## Output shape
```
**Question:** [jurisdiction/counterparty/instrument]
**Finding:** [what the research shows]
**Confidence:** [high/medium/low — TBD if genuinely uncertain]
**Blockers (if any):** [what's needed before this can proceed]
```

## Guardrails
- Never fabricate a regulatory conclusion — mark genuinely uncertain answers `TBD — needs outside counsel`.
- No actual filings, registrations, or sanctions-list submissions — draft only.
- Flag conflicts of interest and market-conduct concerns even unprompted.
