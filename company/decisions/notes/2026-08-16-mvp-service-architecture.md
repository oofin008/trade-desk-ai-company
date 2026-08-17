# MVP Architecture Note — order→payment→queue→KDS

**Author:** head-of-software
**Date:** 2026-08-16
**Status:** Approved for build (kicks off `dept:software` MVP work)

## Context
Founder directive: stand up the product repo and ship an MVP of the core flow
(QR order → payment → queue number → KDS) end-to-end in a test environment,
demoable for a first pilot. No repo exists yet. The founder already locked in
top-level infra constraints on 2026-08-07 (`company/decisions/LOG.md`):
microservices, event-driven (Kafka), store-partitioned, polyglot (Go/Node per
service), Kubernetes, browser-only client. This note translates those
constraints into concrete service boundaries, event contracts, data stores,
and a repo layout — and makes the calls the founder left open.

## Options considered
- **Local/test broker:** full Confluent/Apache Kafka (JVM + Zookeeper/KRaft) vs.
  **Redpanda** (Kafka-API-compatible, single binary, no JVM). Chose Redpanda for
  local/test docker-compose — same producer/consumer API and semantics, far
  lighter for a one-store MVP running on a laptop. Production broker choice is
  revisited when we pick a real deploy target (K8s manifests, deferred below).
- **Data store per service:** fully isolated DB clusters per service vs. one
  shared Postgres instance with per-service schemas. Chose shared instance /
  separate schemas (no cross-schema FKs) for MVP — keeps service ownership
  boundaries intact without operating 3 separate DB clusters for a single
  pilot store. Revisit before multi-tenant scale.
- **Queue number generation:** Redis `INCR` vs. Postgres atomic
  `UPDATE ... RETURNING` on a per-store-per-day counter row. Chose Postgres —
  one fewer moving part, and correctness (no duplicate/skipped queue numbers)
  matters more than raw throughput at one-store scale. Concurrency proven via
  a parallel-goroutine test in `queue-service`.
- **KDS fan-out:** join two Kafka topics in `kds-service` vs. having
  `queue-service` emit one enriched event with everything KDS needs. Chose the
  enriched event (`queue.number.assigned` carries order items + queue number)
  — removes a stream-join from the riskiest realtime path.
- **Payment integration:** real gateway (Omise/2C2P/Stripe/PromptPay) vs. a
  `PaymentProvider` interface + mock implementation for MVP. Chose the
  abstraction + mock — selecting a real payment vendor is a spend/compliance
  decision for the founder, out of scope here. Flagged as a follow-up decision
  before any pilot goes live with real money.

## Recommendation — service boundaries
1. **order-service** (Node/TS, Postgres `order` schema) — menu, cart, order
   lifecycle (pending → confirmed/failed). Public REST API for the web client.
2. **payment-service** (Node/TS, Postgres `payment` schema) — payment
   orchestration behind a `PaymentProvider` interface; `MockProvider` for MVP.
3. **queue-service** (Go, Postgres `queue` schema) — atomic, unique,
   sequential, daily-reset queue numbers per store. Highest data-integrity
   risk in the system; isolated on purpose.
4. **kds-service** (Node/TS) — consumes the final event, pushes live to
   kitchen displays over WebSocket, store-scoped fan-out.
5. **web-client** (React/Vite) — QR landing → menu → checkout → live queue
   number (customer view) and a `/kds/:storeId` route (kitchen display view).
   One codebase for MVP to minimize scaffolding cost; split later if the KDS
   display needs a different deploy cadence.

## Event contract (Kafka, key = `store_id` for per-store ordering)
`orders.created` → payment-service
`payments.succeeded` / `payments.failed` → order-service
`orders.confirmed` → queue-service
`queue.number.assigned` (enriched: order + queue number) → kds-service **and** order-service (customer-facing status)

## Repo layout (monorepo)
```
qr-order-system/
  services/{order,payment,queue,kds}-service/
  clients/web-client/
  infra/docker-compose.yml      # Redpanda, Postgres — local/test only
  infra/k8s/                    # DEFERRED (see risks)
  tests/e2e/                    # full-flow integration test (KR2 proof)
  docs/architecture/            # this note, event schema
  .github/workflows/            # DEFERRED (see risks)
```
Branching: `main` (protected, founder-approved merges only) / `develop`
(integration branch, feature branches cut from here) — matches
`departments/software/CLAUDE.md` conventions already on file.

## Trade-offs
- Shared Postgres instance and no K8s yet = less "production-grade" than the
  target state, but matches team size (1 pilot store, no ops team) and avoids
  building infra for load we don't have. Explicitly a *staging* shape, not
  the final one.
- Mock payment provider means the demo proves the *flow*, not a real charge.
  Acceptable for "demoable for pilot conversation" — not acceptable for
  actually taking a live pilot's money. Call this out before pilot go-live.

## Risks / deferred
- **CI workflows and Kubernetes manifests are deferred.** Root `CLAUDE.md`
  requires explicit human approval before agents touch CI configs or
  deployment scripts. Repo ships with docker-compose-based local/test tooling
  only (no secrets, nothing deployed). Will ask founder to green-light a
  minimal lint+test GitHub Actions workflow as a fast follow.
- **Queue-service correctness under concurrency** is the single biggest
  technical risk (duplicate/skipped queue numbers = the core promise of the
  product). Dev task for this service explicitly requires a concurrency test,
  not just unit tests.
- **Payment vendor selection** is an open decision requiring founder input
  (fees, PromptPay/QR support for Thai market, compliance) — not blocking MVP
  demo, blocking real pilot revenue.
