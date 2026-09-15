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

No constitution, club policy documents, member-approved portraits, club photographs, or game screenshots were supplied. Five photo references and Utendo Regular/Bold were subsequently supplied for local review; see the review boundary below. The request is the factual source for the initial roster and mission. Do not scrape photographs from LinkedIn. Production portrait slots remain labelled initials until approval. Game art uses a labelled development placeholder, not another game's imagery.

## Derived Assets

Astro should produce responsive WebP assets at build time without upscaling originals. Any additional image processing must be reproducible, preserve originals, and record crop/background-only operations here. Do not tint the prototype to imply a finished shell colour. Keep reference-only files outside `public/` and imports so they are not deployed.

## Implemented Decisions

- Primary header/footer lockup: `sps_b.png`, which is white artwork intended for dark surfaces despite its filename. `sps_w.png` is dark artwork for light surfaces. The standalone signature is the supplied white play mark. All are trimmed of exterior margins, resized without enlargement, and never redrawn or recoloured.
- Board swatch centres sampled at y=100: companion purple `#5d48ad` (x=1160), SPS purple `#784ac3` (1270), white `#ffffff` (1375), yellow `#f8ca5b` (1480), orange `#ffa053` (1585). Added interface tokens: deep purple `#241533`, warm white `#fbf9f5`, dark readable bronze `#8d4b20`.
- Self-hosted Kufam Variable for display and Commissioner Variable for body copy, both named on the brand board and distributed under OFL-1.1 by Fontsource. Latin WOFF2 subsets only. Utendo remains unused without authorisation.
- `scripts/prepare-assets.mjs` creates deterministic derivatives. CAD background removal is an exact-RGB flood fill starting at the exterior corner; no subject RGB values change. Original source sizes and all controls are preserved.
- Original hero derivative: `prototype1-2.png` is cropped to x=115, y=24, width=260, height=472 after background removal. This retains the enclosure and controls while removing outer margins and nearly all the ground reflection. It is retained for provenance; the redesigned hero uses the actual model render described below.
- Source resolutions are 408x508 (front), 487x610 (angled), and 851x921 (detail); larger transparent CAD exports are needed for sharper large-screen imagery.

## Actual Handheld Model

- The user supplied and identified the [SolidWorks/glTF export](reference/handheld/SOURCE.md) as the SPS handheld. The native part and glTF/bin originals are preserved unchanged in that directory.
- The first standalone GLB was incomplete. The subsequent glTF plus its 194,736-byte binary is valid. [Model packaging](../scripts/model-assets.mjs) creates a self-contained 198,416-byte GLB without changing geometry bytes. Tests check byte equality and all 5,850 source vertices.
- The viewer normalises model coordinates and applies lighting and presentation materials only. Purple shell/orange controls are explicitly labelled a colour concept; source CAD materials remain selectable. It does not show fictional internal parts or an invented exploded assembly.
- [Hero poster](../src/assets/handheld-concept.webp) is rendered from this exact model using [the local renderer](../scripts/render-model.mjs). It is a 618x1034 transparent WebP. Responsive derivatives are generated by Astro. The original grey CAD images remain on Handheld for comparison.
- Three.js is dynamically imported only after Explore in 3D. No model or renderer download occurs on initial page load. Rendering stops after the finite entrance animation or interaction; there is no perpetual background render loop.

The latest presentation adds a full-width product stage, finite camera tour, Overview/Controls/Profile views, and translucent CAD-edge inspection. An SPS boot texture is applied to a duplicate of the existing display surface, with its own UV coordinates; original positions, indices and normals are unchanged. Screen imagery is labelled illustrative and hidden with source-material or CAD-inspection mode. No internal electronics or assembly sequence is invented.

## Private Character And Font Review

- Five photos were provided directly in chat, identified by the user as Abdul, Jonart, Yassin, Mujtaba and Saif in that order. No photos were scraped or placed in the public site.
- The procedural character prototypes were rejected and retired from the preview. Their rendering scripts were removed; old outputs remain untouched in ignored `.local/` storage and are no longer served. Do not make more procedural character models or relabel those outputs as AI-generated.
- Replacement slots accept genuinely generated `<member-id>-ai.webp` images and optional silent `<member-id>-ai.mp4` clips. No generation service is connected here, so no new images or videos have been claimed as produced. A private photo-specific brief is in `.local/portrait-generation-brief.md`. Native video controls appear only when both actual assets exist; videos never autoplay.
- The user explicitly chose local concepts pending each member's approval. `SPS_REVIEW=1` enables them only in the development server through loopback-only asset middleware. Production output excludes them even if that flag is set. Approval must be recorded before adding any portrait to public member data.
- Utendo Regular and Bold were found in the user-specified Downloads folder. [wfonts](https://www.wfonts.com/font/utendo) labels the family 100% Free, but [the author's current listing](https://www.dafont.com/utendo.font) specifies [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The local preview uses unmodified TTF files with attribution; they are neither committed nor included in production pending confirmation of licence suitability. Production retains OFL Kufam and Commissioner.