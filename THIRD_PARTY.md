# Third-Party Materials

## Shipped In The Website

| Material | Source | Version | Licence |
| --- | --- | --- | --- |
| Kufam Variable, Latin WOFF2 | https://fontsource.org/fonts/kufam | 5.3.0 | [SIL OFL-1.1](public/licenses/kufam.txt) |
| Commissioner Variable, Latin WOFF2 | https://fontsource.org/fonts/commissioner | 5.3.0 | [SIL OFL-1.1](public/licenses/commissioner.txt) |
| Lucide Astro icons | https://lucide.dev/guide/astro/ | 1.46.0 | [ISC and Feather-derived MIT notices](public/licenses/lucide.txt) |
| Three.js, loaded on demand for the handheld | https://threejs.org/ | 0.186.0 | [MIT](public/licenses/three.txt) |

The asset-preparation script copies these full licence and attribution notices from the exact installed packages into the deployed `licenses/` directory. Fonts are self-hosted; there are no font-provider requests from the browser. Utendo is not part of the production build.

SPS logos and CAD images were supplied for this project. They are not relicensed by the third-party licence declarations above. Original files are retained in [design/reference](design/reference). The avatar inspiration image is reference-only and is not included in the website build. No member photographs have been scraped or published.

## Console Comparison

The user authorised publication of Signal, Playroom and Cartridge Club for feedback on 2026-09-16. Their compiled build reuses the licensed Kufam/Commissioner fonts and Three.js above, plus Lucide browser icons 1.46.0 (ISC and included Feather-derived MIT notices) and Matter.js 0.20.0 (MIT) for the Brick Break browser demo. This demo is not an SPS game release. Full notices are copied unchanged from the installed packages to the comparison's `/licenses/` directory. The experimental packages have their own npm lockfile; the original Astro dependency graph is unchanged.

The three concepts use original interface layouts and synthesized Web Audio themes, not PlayStation, Wii or Xbox artwork, sounds, code or branding. The comparison thumbnails are screenshots of these SPS prototypes. Cartridges and their insertion are interface metaphors, not modifications to the supplied CAD or evidence of a working cartridge connector. The two lower pill buttons use separate black material groups without changing source geometry. The approved portraits have theme-specific CSS backgrounds; no new likeness generation occurred.

Only the named static build assets were promoted from local storage. Unapproved source photos, the constitution/deck, generation records, review files and Utendo remain excluded. The original site is preserved separately while the team compares designs.

## Approved Portraits

The five AI-generated Mii-style stills in [public/images/team](public/images/team) were supplied by the user, who confirmed member approval on 2026-09-15. They are used as stylised member portraits, not official Nintendo artwork or a claim of affiliation. The originals are copied unchanged. The user subsequently requested square headshots; documented crop rectangles produce unchanged-pixel PNG intermediates and Astro generates responsive WebP derivatives. Generation credit and approval metadata are retained in records, not repeated on each member. The user reports built-in AI generation followed by Sharp sizing/conversion; source photos, prompts and generation records remain private. No additional media-generation API was used for integration, and no videos have been supplied or approved. These images are not relicensed under the dependency licences above.

Saifullah's replacement front-facing headshot was separately supplied and explicitly approved on 2026-09-15. The transparent 640x640 [current headshot](public/images/team/saifullah-asad-front-headshot-ai.webp) is copied unchanged and used in full-square framing. His prior approved original is retained; the other four portraits are unchanged. The new full-body candidate and generation records remain local. This integration did not regenerate the image or broaden approval to other media.

## Local-Only Materials

The supplied constitution and info-night presentation are retained unchanged in ignored `.local/club-documents/` as factual references. The presentation includes third-party game cover art and template material; none of its embedded images, presenter notes or raw files are shipped. Pong, Tomb of the Mask and Brick Breaker are mentioned only as user-reported prototype demo titles, without importing game art/code or claiming original SPS releases.

The user supplied Utendo Regular and Bold TTFs and five portrait references. The [current author listing](https://www.dafont.com/utendo.font) identifies LyonsType and specifies [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), despite [wfonts](https://www.wfonts.com/font/utendo) describing the family as 100% Free. Unmodified fonts are used in local noncommercial review with author/source/licence attribution. They remain ignored and excluded from production until licence suitability is confirmed.

The prior procedural character concepts and rendering scripts are retired. Their private files have not been published. Approval for the five stills does not include the source photos, generation logs, rejected outputs, future revisions or optional clips; those remain local until separately approved.

## Repository-Only Skills

| Skill | Pinned source commit | Licence and provenance |
| --- | --- | --- |
| Anthropic frontend-design | `34040c9c568585f6929bedeaad110ad08f079624` | [Source](.github/skills/frontend-design/SOURCE.md), [Apache-2.0](.github/skills/frontend-design/LICENSE.txt) |
| Vercel web-design-guidelines | `063bee94c3f4df8453406c830b0a7df0f2860278` | [Source and MIT declaration](.github/skills/web-design-guidelines/SOURCE.md), [unmodified upstream README](.github/skills/web-design-guidelines/UPSTREAM-README.md) |

Both upstream directories and their referenced resources were inspected before installation on 2026-09-15. Files were downloaded from immutable commit URLs, and tests verify their Git blob hashes. Vercel declares MIT in its README but supplies no standalone licence file at the pinned revision; that declaration is preserved without inventing a copyright notice. The external Web Interface Guidelines resource was read from its upstream URL as required by that skill; it is not deployed with the website.

## Design Reference

[Analogue Pocket](https://www.analogue.co/pocket) was studied for image-led product storytelling and pacing. No Analogue images, copy, code, product specifications, or logos are used by this site.