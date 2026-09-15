# Schulich Press Start: Design Brief

## Purpose

A first working, static website for a multidisciplinary University of Calgary engineering design club developing custom gaming handhelds, electronics, enclosures, embedded software, and original games. Help visitors understand the project, meet the current team, join a division, or support the work.

## Direction

An independent handheld hardware studio with a student-team personality. Use the actual SPS prototype as the main visual, a confident geometric sans-serif, a deep-purple product canvas, warm-white reading surfaces, SPS purple, and restrained orange/bronze accents. Extract final brand colours from the supplied board. Utendo is not cleared for web use; use a self-hosted SIL Open Font License fallback until authorised files and licence evidence arrive.

The [Analogue Pocket reference](https://www.analogue.co/pocket) informs the pacing: product first, large images, then focused engineering stories and details. Do not reuse its copy, images, specifications, or composition. SPS is a club and a developing prototype, not a shop.

## Composition

Home opens on a single unframed product canvas: the full club name and supplied logo, a clearly visible handheld, short mission copy, and links to the prototype and team. Keep the beginning of the following section in view. Follow with a handheld introduction, an engineering narrative, original-game development, a real-team preview, and recruitment/support links. Alternate open layouts and full-width colour bands; no generic feature-card grid.

Team uses a restrained character-selection vocabulary: consistent portrait spaces, visible names and roles, touch-sized native disclosures, a clear focus/selection outline, and optional approved profile information. The President is separate; division leads come first. Until member-approved portraits exist, use clearly labelled initials placeholders, not invented likenesses or the inspiration-image characters.

## Product Integrity

Preserve the supplied rectangular screen, cross D-pad, four round action buttons, and two lower pill buttons. Allow image optimisation and documented background-only removal; never redraw or invent hardware. Grey shells are what the supplied renders show. Purple shells and orange/bronze controls are proposed colour concepts, not manufacturing commitments. Zephyr is the proposed embedded platform, subject to hardware selection; do not claim a custom kernel.

## Interaction And Delivery

- Astro, strict TypeScript, static output, custom CSS tokens, npm and one committed lockfile. Add no React unless a real component needs it.
- Native links, scrolling, details/summary, and a progressively enhanced mobile menu. All essential content works without JavaScript.
- Static portraits; no automatic avatar loops, scroll hijacking, custom cursors, or repetitive reveals. Respect reduced motion.
- Responsive optimised imagery with dimensions and an eager, high-priority hero. No heavy media or 3D at initial load.
- Six routes: Home, Handheld, Team, Journal, Join, Support. Journal must not imply unapproved posts are published.

## First Validation

Hypothesis: these supplied renders and a native disclosure-based roster can establish the site without fabricated visuals or a client framework. First validate documentation asset links, then build Home and Team, inspect them at phone/tablet/desktop sizes, and test no-JavaScript content, keyboard disclosure behaviour, navigation, and overflow before extending the routes.

See [asset inventory](asset-inventory.md) and [content model](content-model.md). Missing private facts are tracked only in the ignored `.local/content-checklist.md`, never in generated pages.