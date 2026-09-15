# Website Verification

Verified locally on 2026-09-15 on macOS with Node 24.19.0 and npm 11.1.0, including the visual revamp, private photo-based character concepts and the actual handheld model. The local concept review is at `http://127.0.0.1:4321/`; production-safe output without unapproved portraits or Utendo is at `http://127.0.0.1:4322/`. See [README](../README.md) for restart commands and approval boundaries.

## Executed Gates

| Check | Result |
| --- | --- |
| `npm ci` | Clean lockfile install passed; npm reported zero known dependency vulnerabilities |
| `npm run check` | Zero errors, warnings or hints |
| `npm run test:unit` | 11 passed |
| `npm run build` | Six requested pages, a 404 page, robots and static assets generated |
| `npm run test:e2e` | 55 passed; 9 intentionally skipped duplicate browser-independent cases |
| Documentation and CI checks | Local links resolve; workflow YAML parses; all actions pinned; read-only permissions and no deployment step |

Browser projects: Chromium at 1440x900, 768x1024 and 390x844; WebKit at 390x844. Additional layout checks at 320x568, 375x667, 1280x720 and 1920x1080.

## Behavior And Accessibility

- All six pages returned successfully and had one main heading, local assets with reserved image dimensions, no clipped text or horizontal overflow, and no runtime/CSP errors in the test suite.
- Automated axe scans passed on every route in all four projects and on the open menu and member details. These checks include available WCAG 2 A/AA, 2.1 A/AA and 2.2 AA rules.
- Keyboard checks exercised the skip link, Enter/Space disclosure activation, Tab/Shift-Tab through and out of profiles, Escape with focus restoration, and menu navigation. WebKit on macOS uses native Option-Tab link traversal.
- Touch selection, direct member links, reduced motion and navigation/profile details with JavaScript disabled passed.
- Internal page links, image links and fragments resolve. Missing pages return 404. No invented application URL or email form is rendered; approved supplied LinkedIn links provide the initial contact fallback.
- Content tests reject broken member references, duplicate memberships, unconfirmed archive years, unapproved profiles/avatars, unsafe URLs and unapproved published logs. Draft and future-dated logs are filtered. The initial build has no journal articles or archive years.
- Image tests verify unchanged RGB pixels in CAD derivatives. Upstream skill hashes and distributed font/icon licences match the inspected sources.
- The actual handheld's complete glTF/bin export is repackaged without changing binary geometry. Tests validate all 5,850 vertices and reject incomplete geometry. The initial invalid standalone GLB is not used.
- The 3D viewer is checked in all four browser projects for on-demand downloads, nonblank alpha pixels, full model framing, keyboard rotation, concept/source materials, reduced motion, failure fallback and Escape focus restoration. Model controls and the launch button occupy rows outside the artwork/canvas, with overlap assertions.
- Private character and Utendo review assets never appear in production output. An explicit build with `SPS_REVIEW=1` was also checked to confirm the development-only boundary. The production review-asset URL returns 404.

## Visual Inspection

Opened Home, Handheld, Team, Journal, Join and Support at phone, tablet and desktop sizes using Playwright browser tools. Full-page screenshots were inspected for typography, spacing, crop, readable contrast, controls and overflow. The local review was inspected with Utendo and all five private character concepts, including the selected waving pose. Actual 3D screenshots and canvas-pixel checks covered desktop, tablet and phone framing. Also inspected the compact-phone hero, expanded mobile menu and keyboard-selected member.

Corrections made during verification include responsive grid sizing, short-viewport pacing, separating the model from its controls, correcting SolidWorks front-axis orientation, preventing poster intrinsic dimensions from covering controls, CSP-compatible script output, WebKit focus traversal and cancellation of an active character animation when reduced motion is enabled. All affected checks were rerun successfully.

Screenshots are kept in the ignored `.local/` directory. The ignored Playwright report includes route screenshots, accessibility results and retained traces on failure. No screenshots, private checklist, browser logs or test fixtures are deployed.

## Delivery Boundaries

The GLB is 198,416 bytes. The Three.js viewer chunk is approximately 637 KB before transfer compression and is dynamically fetched only after activation; Vite reports its over-500-KB chunk warning. This is an acknowledged optional media cost, not initial-page JavaScript. The shared menu is about 1 KB, and the viewer bootstrap is about 4 KB. Production fonts are two Latin variable WOFF2 files totalling approximately 73 KB. Character portraits are prerendered images, not live 3D scenes. These are local output measurements, not field performance scores.

No real-device, screen-reader user study or field Core Web Vitals measurement was performed. Cloudflare deployment, actual Cloudflare response headers, remote GitHub CI execution and external profile availability behind sign-in were not tested; no service was authorised for publication. The CI commands themselves were executed locally. Photo-grounded character concepts were generated only for local review, at the user's request, and still require each member's approval. No LinkedIn photos were scraped.

The missing facts, asset requests and approval items remain in the ignored private content checklist. The site stays unindexed until a separately authorised release. See [deployment documentation](deployment.md) and [asset provenance](../design/asset-inventory.md).