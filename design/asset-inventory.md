# Asset Inventory

Inspected on 2026-09-15. Preserve all originals in `design/reference/`.

| Supplied asset | Observed content | Use |
| --- | --- | --- |
| [prototype1.png](reference/prototype1.png) | Front-facing CAD render, grey enclosure, dark rectangular display, cross D-pad, four round action controls, two lower pill controls | Geometry reference and front view |
| [prototype1-2.png](reference/prototype1-2.png) | Three-quarter CAD render with a ground reflection, grey shell and orange/bronze controls | Main product imagery; retain geometry and source colours |
| [prototype1-3.png](reference/prototype1-3.png) | Close-up of the same enclosure and controls | Engineering/detail imagery |
| [spsgeneral.png](reference/spsgeneral.png) | Brand board: two purples, white, yellow, orange; Utendo, Kufam, Commissioner named | Colour/typography reference, not a hero image |
| [sps_b.png](reference/sps_b.png) | Supplied black logo variant | Inspect crop and transparency before use on light surfaces |
| [sps_w.png](reference/sps_w.png) | Supplied white logo variant | Inspect crop and transparency before use on dark surfaces |
| [sps_signature_transparent.png](reference/sps_signature_transparent.png) | Supplied transparent signature artwork | Inspect before selecting primary lockup |
| [sps_alt_logo.png](reference/sps_alt_logo.png) | Purple patterned artwork with white play-symbol mark | Brand reference; do not substitute a hand-drawn logo |
| [mii-inspo.png](reference/mii-inspo.png) | Third-party fictional-character avatar inspiration | Private design reference only; not member portraits, not shipped |

## Missing Or Restricted

No constitution, club policy documents, Utendo font binaries/web licence, member-approved portraits, club photographs, or game screenshots were supplied. The request is the factual source for the initial roster and mission. Do not scrape photographs from LinkedIn. Missing portrait slots use initials, explicitly labelled as placeholders. Game art must use a labelled development placeholder, not another game's imagery.

## Derived Assets

Astro should produce responsive WebP assets at build time without upscaling originals. Any additional image processing must be reproducible, preserve originals, and record crop/background-only operations here. Do not tint the prototype to imply a finished shell colour. Keep reference-only files outside `public/` and imports so they are not deployed.

## Implemented Decisions

- Primary header/footer lockup: `sps_b.png`, which is white artwork intended for dark surfaces despite its filename. `sps_w.png` is dark artwork for light surfaces. The standalone signature is the supplied white play mark. All are trimmed of exterior margins, resized without enlargement, and never redrawn or recoloured.
- Board swatch centres sampled at y=100: companion purple `#5d48ad` (x=1160), SPS purple `#784ac3` (1270), white `#ffffff` (1375), yellow `#f8ca5b` (1480), orange `#ffa053` (1585). Added interface tokens: deep purple `#241533`, warm white `#fbf9f5`, dark readable bronze `#8d4b20`.
- Self-hosted Kufam Variable for display and Commissioner Variable for body copy, both named on the brand board and distributed under OFL-1.1 by Fontsource. Latin WOFF2 subsets only. Utendo remains unused without authorisation.
- `scripts/prepare-assets.mjs` creates deterministic derivatives. CAD background removal is an exact-RGB flood fill starting at the exterior corner; no subject RGB values change. Original source sizes and all controls are preserved.
- Hero: `prototype1-2.png` is cropped to x=115, y=24, width=260, height=472 after background removal. This retains the whole enclosure and controls while removing outer margins and nearly all the ground reflection. The uncropped source remains available for the Handheld gallery. No purple-shell render has been fabricated.
- Source resolutions are 408x508 (front), 487x610 (angled), and 851x921 (detail); larger transparent CAD exports are needed for sharper large-screen imagery.