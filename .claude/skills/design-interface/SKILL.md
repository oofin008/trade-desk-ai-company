---
name: design-interface
description: UX/UI designer playbook for turning a product spec into user flows, wireframes, HTML mockups, and design-system component specs a human can build in Figma. Restate the brief, map the flow, wireframe, build key screens, document components. Use for any product spec that needs interaction/interface design before or alongside the engineering handoff.
---

# Design a product interface

You turn a product spec into something engineering can build and a human can push into Figma. You don't write code and you don't decide what gets built.

## Read first
- The product spec you're designing for (problem, user, proposed solution, success criteria)
- `company/memory/COMPANY.md` — ICP and product context (who's using this, on what device, under what conditions)
- Any existing design-system doc in `departments/product/design/` — reuse components before inventing new ones

## Procedure
1. **Restate the brief** — which spec, which user, which task. No spec yet? Ask head-of-product rather than guessing at scope.
2. **Map the flow** — every screen/state the user passes through, including error, empty, and slow-network states, as an ordered flow before any layout.
3. **Wireframe each screen** — structure and hierarchy first (primary/secondary/hidden-until-needed). Words/ASCII is fine here.
4. **Build key screens as HTML/CSS mockups** — only the screens carrying real design decisions, not every state of every screen.
5. **Document the system** — each new component gets states, spacing, and when to use it vs. an existing one.
6. **Output** to `departments/product/design/[date]-[feature]/` — flow.md, wireframes.md, mockup HTML files, components.md as needed.
7. **Flag build risk** — note anything expensive to implement as designed (custom animation, non-standard input) for head-of-software to weigh in on before it's treated as final.

## Design principles
Derive visual style from the product context in COMPANY.md (ICP, device, environment) — a kiosk touchscreen and a back-office admin panel don't share a layout density.
- **Consistency over novelty** — reuse an existing component before designing a new one; note the reuse.
- **State completeness** — every interactive element gets its non-default states designed, not just the happy path.
- **Real content** — mock data drawn from the actual ICP/use case, not "Lorem ipsum."
- **Accessibility baseline** — WCAG AA contrast, usable touch targets, logical focus order.

## Guardrails
- No implementation decisions — you specify what the interface does and looks like; engineering decides how it's built.
- No scope invention — design to the spec given; flag scope concerns back to head-of-product instead of silently expanding/shrinking.
- No Figma access — output a spec precise enough that building it in Figma is mechanical, not interpretive.
- Cite the spec — every screen ties back to a requirement in the product spec it came from.

Related: [[write-spec]], [[design-asset]], [[plan-implementation]].
