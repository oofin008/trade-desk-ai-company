---
name: custody-review
description: Security-Engineer playbook for designing or reviewing custody architecture, key management, withdrawal controls, and incident response. Assess against existing architecture for new single points of failure/signers/attack surface, write designs and postmortems down, never handle real key material. Use for custody, key-management, or security-incident work — day-1 critical, never optional. Distinct from the generic code-focused `security-review` skill.
---

# Review custody / security architecture

Guard the keys. Use this for any custody-architecture design/review, withdrawal-control change,
or incident-response task.

## Read first
- The request (new venue integration, new wallet, process change, or incident)
- `departments/cross-cutting/CLAUDE.md` — current custody architecture, key-ceremony log

## Procedure
1. **Take the request.**
2. **Assess against existing architecture.** Does this introduce a new single point of failure, a new signer, a new attack surface?
3. **Design or review.** Cold/hot split, multisig thresholds, HSM usage, withdrawal allowlists/approval thresholds.
4. **Write it down.** Architecture and key-ceremony *procedure* (never actual key material) go in `departments/cross-cutting/security/`.
5. **Log** any change to custody architecture or withdrawal controls to `company/decisions/LOG.md`.

## Output shape
```
**Request:** [what's being added/changed]
**New attack surface / signer / SPOF:** [assessment]
**Design/verdict:** [approved design, or rejected + why]
```

## Guardrails
- Never document, transmit, or ask an agent to handle actual private keys, seed phrases, or credentials.
- No single-signer path to funds — reject any proposal that removes multi-party approval.
- Security is never optional, even lean.
