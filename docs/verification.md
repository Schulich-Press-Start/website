# First-Version Verification

Verified locally on 2026-09-15 on macOS with Node 24.19.0 and npm 11.1.0. The production preview is available during this development session at `http://127.0.0.1:4322/`; start a new preview using the commands in [README](../README.md) after the session ends.

## Executed Gates

| Check | Result |
| --- | --- |
| `npm ci` | Clean lockfile install passed; npm reported zero known dependency vulnerabilities |
| `npm run check` | Zero errors, warnings or hints |
| `npm run test:unit` | 10 passed |
| `npm run build` | Six requested pages, a 404 page, robots and static assets generated |
| `npm run test:e2e` | 46 passed; 6 intentionally skipped duplicate browser-independent cases |
| Documentation and CI checks | 39 local links resolved; workflow YAML parsed; all actions pinned; read-only permissions and no deployment step |

Browser projects: Chromium at 1440x900, 768x1024 and 390x844; WebKit at 390x844. Additional layout checks at 320x568, 375x667, 1280x720 and 1920x1080.

## Behavior And Accessibility

- All six pages returned successfully and had one main heading, local assets with reserved image dimensions, no clipped text or horizontal overflow, and no runtime/CSP errors in the test suite.
- Automated axe scans passed on every route in all four projects and on the open menu and member details. These checks include available WCAG 2 A/AA, 2.1 A/AA and 2.2 AA rules.
- Keyboard checks exercised the skip link, Enter/Space disclosure activation, Tab/Shift-Tab through and out of profiles, Escape with focus restoration, and menu navigation. WebKit on macOS uses native Option-Tab link traversal.
- Touch selection, direct member links, reduced motion and navigation/profile details with JavaScript disabled passed.
- Internal page links, image links and fragments resolve. Missing pages return 404. No invented application URL or email form is rendered; approved supplied LinkedIn links provide the initial contact fallback.
- Content tests reject broken member references, duplicate memberships, unconfirmed archive years, unapproved profiles/avatars, unsafe URLs and unapproved published logs. Draft and future-dated logs are filtered. The initial build has no journal articles or archive years.
- Image tests verify unchanged RGB pixels in CAD derivatives. Upstream skill hashes and distributed font/icon licences match the inspected sources.

## Visual Inspection

Opened Home, Handheld, Team, Journal, Join and Support at phone, tablet and desktop sizes using Playwright browser tools. Full-page screenshots were inspected for typography, spacing, crop, readable contrast, controls and overflow. Also inspected the compact-phone hero, expanded mobile menu and keyboard-selected member.

Corrections made during verification: removed most of the CAD reflection from the hero using a documented source crop; adjusted short-viewport composition; prevented small script inlining so CSP does not block navigation; normalised member summary/profile keyboard focus on WebKit. All affected checks were rerun successfully.

Screenshots are kept in the ignored `.local/` directory. The ignored Playwright report includes route screenshots, accessibility results and retained traces on failure. No screenshots, private checklist, browser logs or test fixtures are deployed.

## Delivery Boundaries

The built directory is approximately 376 KiB on disk. Shared menu JavaScript is 944 bytes; the Team-only enhancement is 746 bytes, before transfer compression. The two Latin variable WOFF2 files total approximately 73 KB. These are local output measurements, not field performance scores.

No real-device, screen-reader user study or field Core Web Vitals measurement was performed. Cloudflare deployment, actual Cloudflare response headers, remote GitHub CI execution and external profile availability behind sign-in were not tested; no service was authorised for publication. The CI commands themselves were executed locally. No member likenesses were generated, and no LinkedIn photos were scraped.

The missing facts, asset requests and approval items remain in the ignored private content checklist. The site stays unindexed until a separately authorised release. See [deployment documentation](deployment.md) and [asset provenance](../design/asset-inventory.md).