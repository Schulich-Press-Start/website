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

## Local-Only Materials

The user supplied Utendo Regular and Bold TTFs and five portrait references. The [current author listing](https://www.dafont.com/utendo.font) identifies LyonsType and specifies [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), despite [wfonts](https://www.wfonts.com/font/utendo) describing the family as 100% Free. Unmodified fonts are used in local noncommercial review with author/source/licence attribution. They remain ignored and excluded from production until licence suitability is confirmed.

The prior procedural character concepts and rendering scripts are retired. Their private files have not been published. Future portraits must be genuinely generated from the supplied references, with each member's approval before publication; there are currently no newly generated portraits or clips. Mii-style is an aesthetic reference, not official Nintendo artwork or a claim of affiliation.

## Repository-Only Skills

| Skill | Pinned source commit | Licence and provenance |
| --- | --- | --- |
| Anthropic frontend-design | `34040c9c568585f6929bedeaad110ad08f079624` | [Source](.github/skills/frontend-design/SOURCE.md), [Apache-2.0](.github/skills/frontend-design/LICENSE.txt) |
| Vercel web-design-guidelines | `063bee94c3f4df8453406c830b0a7df0f2860278` | [Source and MIT declaration](.github/skills/web-design-guidelines/SOURCE.md), [unmodified upstream README](.github/skills/web-design-guidelines/UPSTREAM-README.md) |

Both upstream directories and their referenced resources were inspected before installation on 2026-09-15. Files were downloaded from immutable commit URLs, and tests verify their Git blob hashes. Vercel declares MIT in its README but supplies no standalone licence file at the pinned revision; that declaration is preserved without inventing a copyright notice. The external Web Interface Guidelines resource was read from its upstream URL as required by that skill; it is not deployed with the website.

## Design Reference

[Analogue Pocket](https://www.analogue.co/pocket) was studied for image-led product storytelling and pacing. No Analogue images, copy, code, product specifications, or logos are used by this site.