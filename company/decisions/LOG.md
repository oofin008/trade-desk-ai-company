# Company Decisions Log

Append-only. Never edit or delete past entries. Each entry is a decision that changes how the company operates.

**Format:**
```
## YYYY-MM-DD — [Title]
**Decided by:** [agent or human]
**Context:** [why this came up]
**Decision:** [what was decided]
**Implications:** [what changes as a result]
```

---

## 2026-08-07 — Company founded
**Decided by:** Human founder (Boss Thann)
**Context:** Bootstrapping SSTR Solutions — a QR-code ordering + payment + queue-management system for restaurants (KDS integration) — as an AI-operated company with 4 departments (Software, Product, Marketing, Sales) run via Claude Code, steered by one founder over Discord. Currently at validating stage with nothing built yet.
**Decision:**
- Operating model: draft-don't-ship by default — agents produce drafts/plans/PRs, founder approves anything that ships, sends, deploys, or spends money.
- First thing to validate: architecture/infra design for the core order → payment → queue number → KDS flow, before broader feature build-out. This quarter's objective is "ship an MVP."
- Engineering: microservices, event-driven (Kafka), partitioned by store, polyglot (Go/Node chosen per-service), Kubernetes for orchestration, browser-only client (no app install).
- Integration branch: `develop` — feature branches are cut from `develop`, never from `main`. Nothing merges to `main` without founder approval.
- Model tiers: department heads and CEO on Sonnet by default; no Opus escalation unless a genuinely ambiguous strategic call justifies it (see root CLAUDE.md).
- Budget: $0/month discretionary spend across all departments for now (pre-MVP, pre-revenue).
**Implications:** Software starts with architecture/infra design work, not feature code. Marketing and Sales hold off on real spend/outreach volume until ICP channel research lands and the MVP is closer to demoable. Any spend recommendation must check `company/BUDGET.md` first — currently all departments are at $0.

---

## 2026-08-16 — MVP service architecture finalized, repo scaffold kicked off
**Decided by:** head-of-software
**Context:** CEO directive to stand up the repo and kick off the MVP build (order→payment→queue→KDS, end-to-end in test). Founder's 2026-08-07 infra constraints (microservices, Kafka, store-partitioned, Go/Node polyglot, K8s) needed translating into concrete service boundaries, data stores, and a repo layout. Full architecture note: `company/decisions/notes/2026-08-16-mvp-service-architecture.md`.
**Decision:**
- Repo: `qr-order-system` (new private GitHub repo, `oofin008/sstr-qr-order-system`), monorepo layout, `main`/`develop` branch model per existing conventions.
- 5 services: `order-service` (Node/TS), `payment-service` (Node/TS, mock payment provider for MVP), `queue-service` (Go, Postgres-atomic-counter for guaranteed unique/sequential/daily-reset queue numbers), `kds-service` (Node/TS, WebSocket push), `web-client` (React, customer + KDS display views).
- Local/test broker: Redpanda (Kafka-API-compatible) via docker-compose, not full Kafka — lighter for one-store MVP, same wire protocol.
- Shared Postgres instance, per-service schema, for MVP (not one DB cluster per service).
- CI workflows and Kubernetes manifests explicitly **deferred** — root `CLAUDE.md` requires human approval before agents touch CI/deploy config; will ask founder to green-light a minimal CI workflow as a fast follow.
- Payment gateway vendor selection explicitly **not decided** — MVP uses a `PaymentProvider` interface + mock implementation; real vendor choice is a founder call (fees, compliance, PromptPay support) before any pilot goes live with real money.
**Implications:** `departments/software/CLAUDE.md` and `company/memory/COMPANY.md` updated with repo location and the concrete constraints above. 7 implementation tasks broken out and dispatched to `dev` via GitHub Issues in the new repo, QA gate applies before any PR.
