# Software Department

## Stack
- **Language:** Go and Node — polyglot, chosen per-service based on what fits best.
- **Framework:** Per-service, fit-for-purpose (no company-wide mandate). Event bus: Kafka.
- **Repo:** none yet (local: `/Users/oofin008/Dev/PERSONAL/qr-order-system`)
- **Test framework:** Idiomatic default per language — Go's built-in `testing` package for Go services, Jest/Vitest for Node services. No single company-wide mandate.
- **Other key tools:** Kubernetes (container orchestration), Kafka (event bus), microservices architecture partitioned by store.

## Canonical engineering standard
- If you maintain a "how we build software here" doc (coding conventions, architecture,
  Definition of Done), point to it here and treat it as authoritative. The conventions below
  are the default starting point until you have one.

## Conventions
- Branch naming: `feat/SHORT-DESC`, `fix/SHORT-DESC`
- Cut feature branches from the integration branch (`develop`), not from `main`.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- One PR per feature/fix. Small PRs preferred.
- Tests required for every change. New code without tests = not done.
- No direct commits to `main`. Always via PR. Nothing merges to `main` without founder approval.

## CI / CD
- CI runs on every PR. Must be green to merge.
- Deployment is **human-only**. Agents never deploy.
- TBD — deployment target not yet decided. Likely Kubernetes-based given the confirmed infra stack; to be finalized as part of this quarter's architecture/infra design work.

## Where things live
- No source tree yet — repo and service layout to be established as architecture/infra design lands (current OKR).
- Expect a per-service directory layout once services are scaffolded (microservices, partitioned by store).
- Active issues: GitHub Issues, label `dept:software`

## Acceptance criteria template (use in every issue)
```
**Goal:** [one sentence]
**User story:** As a [role], I want [capability] so that [outcome].
**Acceptance criteria:**
- [ ] [observable behavior]
- [ ] [observable behavior]
- [ ] Tests added covering the above
**Out of scope:** [explicit non-goals]
**Related:** [links to product spec, related issues]
```
