---
name: sps-brand
description: "Use when designing, implementing, writing or reviewing Schulich Press Start pages, handheld imagery, team portraits, recruitment content or shared website styles."
---

# SPS Brand

## Read First

Read the [design brief](../../../design/brief.md), [asset inventory](../../../design/asset-inventory.md), and [content model](../../../design/content-model.md). They hold the visual decisions, source facts, permissions and content boundaries.

## Design

1. Begin with the real Game Boy-inspired SPS handheld and the supplied logo, not stock hardware or a generic product mockup.
2. Use a deep-purple product canvas, brand-board purples, warm white, and selective orange/bronze accents. Shared CSS variables own the palette and type scale.
3. Preserve logo geometry. Use the documented variant for the background; do not redraw, recolour or typeset an approximation.
4. Production uses licensed Kufam and Commissioner. Utendo Regular/Bold are local-review-only: the author's CC BY-NC-SA 4.0 terms contradict the third-party 100% Free listing. Confirm licence suitability before distributing them.
5. Give the product breathing room and use large truthful imagery. Alternate unframed story layouts and full-width bands. Avoid feature-card grids, gradient decoration, custom cursors, scroll hijacking and repeated reveals.
6. Preserve the prototype's rectangular screen, cross D-pad, four circular action buttons and two lower pill buttons. Purple shells and orange/bronze buttons are colour proposals, not final specifications.
7. Use photo-conditioned AI-generated Mii-style images, not handmade or procedural character models. Prior models are retired. Optional matching silent videos use native controls, never autoplay. Generated media remains in `.local/` pending member approval; production uses labelled initials. Never scrape LinkedIn photos or claim media was generated when it was not.
8. Use the supplied complete glTF/bin model for 3D. Preserve source geometry and validate packed binary equality. Load Three.js only after user activation, keep a responsive model-derived poster, and separate model controls from the viewing area. Colour-concept materials must stay labelled and source materials selectable.
9. Keep camera tours finite, replayable and interruptible. Close-up and profile views must work with keyboard/touch. Label boot graphics as an illustrative screen concept, not firmware, and show only actual surface geometry in CAD inspection. Stop rendering when hidden/offscreen; honour reduced motion.

## Content And Interaction

- The University of Calgary club develops electronics, mechanical enclosures, embedded software and original games. Zephyr is the proposed platform, subject to hardware selection; not a kernel written from scratch.
- Use verified names and roles. President separately; leads first within divisions. Keep unconfirmed academic years out of public labels.
- Public copy must not invent specifications, sponsors, achievements, member bios, deadlines or launch dates. Keep factual gaps in the private checklist.
- Names and roles remain visible. Use native disclosures for optional profile details with focus-visible selection, touch support and Escape-to-close enhancement. No motion is required to use the roster.
- Preserve native scrolling and navigation, reduced motion, accessible contrast and essential content without JavaScript.

## Verify

Run content tests, type checking, production build and browser tests. Inspect actual screenshots at phone, tablet and desktop sizes, including the mobile menu and selected member. Check geometry, full control visibility, text wrapping, contrast, focus and overflow. Never claim a browser check that was not run.