# Schulich Press Start: Design Brief

## Purpose

A first working, static website for a multidisciplinary University of Calgary engineering design club developing custom gaming handhelds, electronics, enclosures, embedded software, and original games. Help visitors understand the project, meet the current team, join a division, or support the work.

## Direction

An independent handheld hardware studio with a student-team personality. The second direction is a playful hardware lab: oversized product typography, an unframed product stage, deliberate purple/orange colour blocking, game-board checker details, and a character-selection team presentation. Preserve the actual SPS prototype and supplied logo. Utendo Regular and Bold are available for local review; the author's current CC BY-NC-SA 4.0 statement conflicts with the third-party 100% Free listing, so production keeps the unrestricted fallback until suitability is confirmed.

The [Analogue Pocket reference](https://www.analogue.co/pocket) informs the pacing: product first, large images, then focused engineering stories and details. Do not reuse its copy, images, specifications, or composition. SPS is a club and a developing prototype, not a shop.

## Composition

Home opens on an unframed product stage with oversized Press Start typography, the supplied handheld in front, club context and native links. A short user-triggered product response adds playfulness without implying device functionality. Keep the next section visible. Continue through editorial-scale engineering, original-game development and team sections with distinct rhythms rather than repeated two-column blocks. Maintain all six routes and their factual content boundaries.

Team uses generous portrait spaces, names and roles outside the artwork, native disclosures and a short selection animation. President stays separate and leads stay first. Five photos were supplied in roster order for Mii-inspired character concepts. The user explicitly chose local review pending each member's approval; personal character configurations and rendered images stay in ignored local storage, served only by an opt-in development review. They must never enter production output or Git.

## Product Integrity

Preserve the supplied rectangular screen, cross D-pad, four round action buttons, and two lower pill buttons. Allow image optimisation and documented background-only removal; never redraw or invent hardware. Grey shells are what the supplied renders show. Purple shells and orange/bronze controls are proposed colour concepts, not manufacturing commitments. Zephyr is the proposed embedded platform, subject to hardware selection; do not claim a custom kernel.

## Interaction And Delivery

- Astro, strict TypeScript, static output, custom CSS tokens, npm and one committed lockfile. Add no React unless a real component needs it.
- Native links, scrolling, details/summary, and a progressively enhanced mobile menu. All essential content works without JavaScript.
- Static portrait assets with short user-triggered bounce/wave poses. No perpetual animation, scroll hijacking, custom cursors or repetitive reveals. Selection remains meaningful with reduced motion enabled.
- Responsive optimised imagery with dimensions and an eager, high-priority hero. No heavy media or 3D at initial load.
- Six routes: Home, Handheld, Team, Journal, Join, Support. Journal must not imply unapproved posts are published.

## First Validation

Hypothesis: these supplied renders and a native disclosure-based roster can establish the site without fabricated visuals or a client framework. First validate documentation asset links, then build Home and Team, inspect them at phone/tablet/desktop sizes, and test no-JavaScript content, keyboard disclosure behaviour, navigation, and overflow before extending the routes.

See [asset inventory](asset-inventory.md) and [content model](content-model.md). Missing private facts are tracked only in the ignored `.local/content-checklist.md`, never in generated pages.