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

The constitution and 2026-2027 info-night deck were supplied on 2026-09-15 and read for factual context. No approved workshop/team photographs or original-game screenshots have been supplied for website publication. Approved AI-generated member portraits are listed below. Source photos, generation records and Utendo Regular/Bold remain restricted to local storage. Do not scrape photographs from LinkedIn. Game art uses a labelled development placeholder, not another game's imagery.

## Club Documents

- `Schulich Press Start Constitution 26-27.docx`: 40,713 bytes, retained unchanged in ignored `.local/club-documents/`. The objectives and division responsibilities support the end-to-end development scope. The user reports that constitution completion and faculty-advisor confirmation are still part of the school-approval process; do not treat the document as proof of approval or registration.
- `SPS Info Night 2026-2027.pptx`: 35,166,051 bytes, retained unchanged in the same private directory. Slides 9-12 describe technical work; slide 18 supplies the public club email and Instagram handle. Slide 19's notes mark the September 25 deadline as a placeholder. The deck's images, third-party game covers, presenter notes and template remnants are not imported into the website.
- Both files were found in the user's Downloads folder, converted to text for review and copied byte-for-byte. Source hashes and outstanding confirmations are in the private checklist. Neither raw file has a public route or download link.
- The two working prototypes, named demonstration games, June goal, Schulich on a Chip collaboration and pending school/SSAF steps come from the user's accompanying description. No physical prototype or game execution was independently tested during website work.

## Approved Member Portraits

| Member | Approved final |
| --- | --- |
| Abdul Waase Qureshi | [abdul-waase-qureshi-ai.webp](../public/images/team/abdul-waase-qureshi-ai.webp) |
| Jonart Bajraktari | [jonart-bajraktari-goatee-headshot-ai.webp](../public/images/team/jonart-bajraktari-goatee-headshot-ai.webp) |
| Yassin Soliman | [yassin-soliman-ai.webp](../public/images/team/yassin-soliman-ai.webp) |
| Mujtaba Zia | [mujtaba-zia-ai.webp](../public/images/team/mujtaba-zia-ai.webp) |
| Saifullah Asad | [saifullah-asad-front-headshot-ai.webp](../public/images/team/saifullah-asad-front-headshot-ai.webp) |

The original five finals are transparent 640x768 WebPs copied byte-for-byte from the user-specified local outputs and retained unchanged. The user reports built-in AI image generation followed by Sharp sizing/conversion and confirmed member approval. Saifullah's separately generated front-facing 640x640 headshot was supplied and explicitly approved on 2026-09-15. On 2026-09-16 the user reported Jonart's request to show his new goatee and instructed using his supplied replacement across the current sites. His prepared 640x640 goatee headshot is now the active source. Both replacement headshots were copied byte-for-byte; approval evidence is recorded privately in `.local/portrait-approvals.md`. No image generation, retouching or external API call was made to integrate these revisions.

At the user's request, the shared avatar component displays square headshots. Abdul, Yassin and Mujtaba retain crops at x=160, y=32, width=320, height=320. Jonart's and Saifullah's prepared headshots use the entire image: x=0, y=0, width=640, height=640. These rectangles are stored in validated member metadata. Asset preparation extracts PNG intermediates without resizing or changing source pixels; tests compare decoded RGBA pixels exactly. Astro creates 120/160/240/320-pixel responsive WebP variants and reserves the correct square dimensions. The 640-pixel fallbacks are also optimised; no second face crop is applied. All console concepts and the local Cartridge background studies use these same generated PNG headshots, including the portrait on Pocket OS's illustrative LCD.

Names and roles remain visible. AI-generation credit and approval records are retained in data and documentation, not repeated on each member. These are stylised illustrations with approximate likeness; clothing is not factual biography. The revised Jonart and Saifullah headshots replace their prior illustrations in the UI. Their prior approved originals remain unchanged; full-body candidates, photographs and generation records remain local. No videos have been supplied or approved.

## Derived Assets

Astro should produce responsive WebP assets at build time without upscaling originals. Any additional image processing must be reproducible, preserve originals, and record crop/background-only operations here. Do not tint the prototype to imply a finished shell colour. Keep reference-only files outside `public/` and imports so they are not deployed.

## Implemented Decisions

- Primary header/footer lockup: `sps_b.png`, which is white artwork intended for dark surfaces despite its filename. `sps_w.png` is dark artwork for light surfaces. The standalone signature is the supplied white play mark. All are trimmed of exterior margins, resized without enlargement, and never redrawn or recoloured.
- Board swatch centres sampled at y=100: companion purple `#5d48ad` (x=1160), SPS purple `#784ac3` (1270), white `#ffffff` (1375), yellow `#f8ca5b` (1480), orange `#ffa053` (1585). Added interface tokens: deep purple `#241533`, warm white `#fbf9f5`, dark readable bronze `#8d4b20`.
- Self-hosted Kufam Variable for display and Commissioner Variable for body copy, both named on the brand board and distributed under OFL-1.1 by Fontsource. Latin WOFF2 subsets only. Utendo remains unused without authorisation.
- `scripts/prepare-assets.mjs` creates deterministic derivatives. CAD background removal is an exact-RGB flood fill starting at the exterior corner; no subject RGB values change. Original source sizes and all controls are preserved.
- Original hero derivative: `prototype1-2.png` is cropped to x=115, y=24, width=260, height=472 after background removal. This retains the enclosure and controls while removing outer margins and nearly all the ground reflection. It is retained for provenance; the redesigned hero uses the actual model render described below.
- Source screenshot resolutions are 408x508 (front), 487x610 (angled), and 851x921 (detail). The homepage now uses sharper renders from the complete supplied 3D model rather than enlarging those screenshots.

## Actual Handheld Model

- The user supplied and identified the [SolidWorks/glTF export](reference/handheld/SOURCE.md) as the SPS handheld. The native part and glTF/bin originals are preserved unchanged in that directory.
- The first standalone GLB was incomplete. The subsequent glTF plus its 194,736-byte binary is valid. [Model packaging](../scripts/model-assets.mjs) creates a self-contained 198,416-byte GLB without changing geometry bytes. Tests check byte equality and all 5,850 source vertices.
- The viewer normalises model coordinates and applies lighting and presentation materials only. The shell starts purple (`#7543b9`) and a native colour picker allows any RGB colour. Both `mattealuminum` and the rear `defaultplastic` panel use the same concept finish, removing the dark rear square without changing geometry. Orange `glossyrubber` controls and the LCD remain independent. The purple preset resets the colour; source CAD materials remain selectable and unchanged. All custom colours are labelled concepts, not approved manufacturing specifications. It does not show fictional internal parts or an invented exploded assembly.
- [Hero poster](../src/assets/handheld-concept.webp) and [controls close-up](../src/assets/handheld-controls.webp) are rendered from this exact model using [the local renderer](../scripts/render-model.mjs). They are 602x1025 and 849x1066 transparent WebPs respectively. The renderer uses the Overview and Controls camera presets with reduced motion, captures both before writing assets, and rejects blank images. Astro generates responsive derivatives. The original grey CAD images remain on Handheld for comparison.
- Three.js is dynamically imported only after Press start on Home or Explore in 3D on Handheld. No model or renderer download occurs on initial page load. Rendering stops after the finite entrance animation or interaction; there is no perpetual background render loop.

The overview and control stills were regenerated after the matching rear-material change. Custom colour changes are client-local and persist only while the page remains open; closing and reopening the 3D view retains the chosen colour, while the static poster stays purple. No colour-picker library or additional media dependency was added.

The latest homepage uses a dark unframed product stage, a lit overview with the illustrative screen, an orange activation action and a control close-up beside native engineering disclosures. The finite camera tour, Overview/Controls/Profile views and translucent CAD-edge inspection remain available. An SPS boot texture is applied to a duplicate of the existing display surface, with its own UV coordinates; original positions, indices and normals are unchanged. Screen imagery is labelled illustrative and hidden with source-material or CAD-inspection mode. No internal electronics or assembly sequence is invented.

## Private Character And Font Review

- Five photos were provided directly in chat, identified by the user as Abdul, Jonart, Yassin, Mujtaba and Saif in that order. No photos were scraped or placed in the public site.
- The procedural character prototypes were rejected and retired from the preview. Their rendering scripts were removed; old outputs remain untouched in ignored `.local/` storage and are no longer served. Do not make more procedural character models or relabel those outputs as AI-generated.
- Review slots accept genuinely generated `<member-id>-ai.webp` images and optional silent `<member-id>-ai.mp4` clips. The approved stills above now use public member data; future drafts and clips remain local until separately approved. A private photo-specific brief is in `.local/portrait-generation-brief.md`. Native video controls appear only when both actual local assets exist; videos never autoplay.
- `SPS_REVIEW=1` enables unapproved concepts only in the development server through loopback-only middleware. The private folder is never imported into production. Only the five explicitly approved finals were copied to public storage; source photos, review sheets, intermediate outputs, prompts and generation logs remain ignored. Production portraits do not depend on review mode or those private files.
- Utendo Regular and Bold were found in the user-specified Downloads folder. [wfonts](https://www.wfonts.com/font/utendo) labels the family 100% Free, but [the author's current listing](https://www.dafont.com/utendo.font) specifies [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The local preview uses unmodified TTF files with attribution; they are neither committed nor included in production pending confirmation of licence suitability. Production retains OFL Kufam and Commissioner.