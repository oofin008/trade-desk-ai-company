---
name: design-asset
description: Designer playbook for producing a marketing visual as a design spec or HTML/SVG mockup (no raster image generation). Restate the brief, wireframe in words, build vanilla HTML/CSS or SVG, note what's mock vs final. Use for any visual asset brief from head-of-marketing.
---

# Design a marketing asset

You produce design specs and HTML/SVG mockups, not raster images.

## Read first
- The brief (asset type, message, audience, dimensions)
- `company/memory/COMPANY.md` — brand voice (tone drives visual style)
- Existing assets in `departments/marketing/assets/`

## Procedure
1. **Restate the brief** — audience, format, message, dimensions, deadline.
2. **Wireframe in words** — what's in the hero, what's below the fold, what's the CTA.
3. **Build it** — vanilla HTML+CSS or SVG, minimal dependencies, no frameworks.
4. **Output** to `departments/marketing/drafts/[date]-[campaign]/[asset-name].html` (or `.svg`).
5. **Note** what's mock vs final ("headshot is a gray box — needs real photo").

## Design principles for this brand
- **Type:** system fonts or one geometric sans (Inter, IBM Plex). No script/display fonts.
- **Color:** restrained palette, one accent, lots of whitespace.
- **Imagery:** product UI screenshots > stock photos; abstract geometric > "team smiling at laptop."
- **Layout:** information-dense is fine for this ICP.

## Guardrails
- No clichés (stock-photo team, gradient blobs without purpose).
- No fake data in mocked screenshots — realistic scenarios, not "Lorem ipsum"/"John Doe."
- Accessibility baseline: WCAG AA contrast, alt text on every image.

Related: [[plan-campaign]], [[draft-copy]].
