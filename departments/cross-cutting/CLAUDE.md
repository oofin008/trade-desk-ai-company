# Cross-cutting

> ⚠️ Fill in the custody and entity setup below via **`/scaffold-company`** or by editing directly.

## What this office owns
- Security: custody architecture (cold/hot split, multisig, HSMs), key management, withdrawal
  controls, access control, incident response
- Legal: entity structure, jurisdiction/licensing strategy, counterparty/venue/prime-broker
  agreements, regulatory classification

## What it does NOT own
- Risk limits (Middle Office owns this — Cross-cutting secures the keys, Risk sizes the exposure)
- Day-to-day fund movement (Back Office executes transfers under the custody controls this office designs)
- Actual private keys, seed phrases, or credentials — this office designs architecture and
  process; real key material is founder/hardware-device territory only

## Why these two are paired
Security and Legal are grouped because both are "existential to crypto specifically" — a single
custody failure or an unlicensed activity can end the firm outright — and both report
conceptually to the founder/board rather than any single desk, same as Risk.

## Setup
- **Custody model:** <cold/hot split, multisig threshold, HSM usage, or "TBD">
- **Withdrawal controls:** <allowlists, approval thresholds, or "TBD">
- **Entity structure:** <jurisdiction, entity type, or "TBD">
- **Licensing status:** <list per jurisdiction, or "TBD">

## Where things live
- `security/` — custody architecture, key-ceremony procedure (not key material), incident
  postmortems from `security-engineer`
- `legal/` — draft agreements, entity-structuring memos, classification memos from `legal-counsel`
- Active issues: GitHub Issues, label `dept:cross-cutting`

## Conventions
- No single-signer path to funds, ever — every withdrawal-control design requires multi-party approval.
- Legal drafts are never final — every output is marked as a draft pending human/outside-counsel review.
- Security is never optional, even lean. Don't defer hardening on anything touching real capital.

## Acceptance criteria template (use in every issue)
```
**Goal:** [one sentence]
**Scope:** [custody component / jurisdiction / agreement in question]
**Acceptance criteria:**
- [ ] [observable output — e.g. documented architecture, draft agreement, incident runbook]
**Out of scope:** [explicit non-goals]
**Related:** [links to prior security/legal notes, related issues]
```
