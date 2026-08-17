# Company Memory

This is the source of truth for everything the company knows about itself, its customers, and its market. Every agent reads this on every invocation. Keep it concise — link to detailed docs rather than inlining them.

**Last updated:** 2026-08-07
**Maintained by:** CEO orchestrator (with input from all department heads)

---

## Company
- **Name:** SSTR Solutions
- **One-line pitch:** Customers scan a table QR code (or a global/restaurant QR code), browse the menu, place an order, pay, and receive a queue number — confirmed orders push straight to a Kitchen Display System (KDS).
- **Stage:** Validating
- **Founder:** Boss Thann — sole human, accessible via Discord.

## Product
- **What it is:** A QR-code ordering and queue-management system for restaurants. Customers scan a QR code (table-level or store-level), browse the menu, order, pay, and get a guaranteed unique queue number. Confirmed orders are pushed live to a Kitchen Display System (KDS) for the kitchen to fulfill.
- **Status:** Nothing built yet — building from scratch. This quarter's focus is architecture/infra design before implementation.
- **Repo:** none yet (local path: `/Users/oofin008/Dev/PERSONAL/qr-order-system`)

### Key features (shipped / planned)
- QR-code ordering (table QR or global/store QR) — no app install, works in any phone browser
- Payment orchestration at time of order
- Queue number management — unique, sequential, daily reset, guaranteed-correct per store
- Live push of confirmed orders to Kitchen Display System (KDS)

### Key technical constraints
- Microservices, event-driven architecture (Kafka as the event bus)
- Partitioned by store
- Must work on any phone browser — no app install required
- Polyglot services (Go and Node — chosen per-service, "fit for purpose")
- Kubernetes for container orchestration
- No single company-wide test framework mandate — idiomatic default per language (Go's built-in `testing` package for Go services; Jest/Vitest for Node services)

## ICP (Ideal Customer Profile)
- **Who:** Restaurant owners — both QSR chains and independent restaurants.
- **Pain we solve:** Long queues, high order-taking labor cost (cashiers/waiters), and order accuracy errors from manual order-taking.
- **What they use today:** Manual labor — cashiers and waiters taking orders by hand. No QR/digital ordering system in place.
- **Where they hang out:** TBD — research pending. Founder does not yet know which communities/channels reach restaurant owners; this needs a `research-brief` from Product/Researcher once the company is live.

## Positioning
- **Category:** QR ordering & queue management for restaurants.
- **Against:**
  - FoodStory — QR ordering app, but dine-in only (no queue management).
  - QueQ — queue management app, but can't take orders or payment.
  - Manual order-taking (cashiers/waiters) — highest labor cost, most error-prone.
- **Unique angle:** SSTR is the only one that combines ordering + payment + queue management in a single system, across dine-in and takeout use cases — reducing labor cost long-term instead of just digitizing one piece of the workflow.

## Brand voice (for Marketing)
- **Tone:** Practical and direct.
- **Never say:** "revolutionize", "seamless", "AI-powered" — generic clichés with no evidence.
- **Always say:** Concrete claims — labor cost reduction, queue number accuracy/guarantee, no-app-install / any-phone-browser.

## Current OKRs
- **Objective:** Ship an MVP.
- **KR1:** Architecture and infra design finalized and documented (event-driven microservices, Kafka event bus, store-partitioned, K8s).
- **KR2:** Core order → payment → queue number → KDS flow working end-to-end in a test/staging environment.
- **KR3:** MVP demoable and ready to bring to a first pilot restaurant conversation.

## Known customers / pipeline
- None yet. Sales keeps detail in `departments/sales/PIPELINE.md`.

## GTM model
- Direct outreach — founder-led sales to land the first restaurants (both QSR chains and independent restaurants).

## Pricing / licensing model
- Not fully decided. Under consideration: per-store subscription, or a transaction/payment fee cut. Revisit once pilot economics are clearer.

## Open questions
- Which channels/communities actually reach restaurant-owner ICP (research pending — see ICP "where they hang out").
- Per-store subscription vs. transaction fee pricing — which model to commit to.
- Which services go in Go vs. Node — to be decided per-service as build starts.

---

## Recent learnings (append-only, dated)
Format: `YYYY-MM-DD [dept]: what we learned, why it matters`

- 2026-08-07 [system]: Company scaffolded via /scaffold-company.
