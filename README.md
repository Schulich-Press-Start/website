# Schulich Press Start

The first static website for SPS, a University of Calgary engineering design club developing a custom gaming handheld and original games.

## Local Development

Use Node 24 LTS and npm. The original machine had Node 23, which current Astro does not support; `.nvmrc` selects the supported major for version managers.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open the local URL printed by Astro, normally `http://127.0.0.1:4321/`. For another port, use `npm run dev -- --port 4322`. Do not stop an unrelated server to reclaim a port. Astro 7 can launch a background server; `npx astro dev status`, `npx astro dev logs` and `npx astro dev stop` manage it.

The asset command runs automatically before development, checking and building. It derives web assets from the preserved source artwork and copies third-party licence notices. See [asset inventory](design/asset-inventory.md).

## Checks

```sh
npx playwright install chromium webkit
npm run check
npm run test:unit
npm run build
npm run test:e2e
```

`test:e2e` uses the existing production build, starts a local preview on port 4173, and stops it when finished. Set `PLAYWRIGHT_PORT=4174` when that port is occupied. It never reuses an unknown server. Run `npm run build` after source edits and before browser tests.

- Content tests cover real roster integrity, lead ordering, cross-references, academic years, consent, draft publication, safe configuration, source-image pixel preservation, licences and vendored skill hashes.
- Playwright covers the six pages with Chromium desktop/tablet/phone and WebKit phone, including axe WCAG checks, touch, keyboard, focus return, no JavaScript, reduced motion, CSP, local-only requests, 404s, internal links and anchors.
- Model tests verify source-geometry byte equality, on-demand loading, nonblank and fully framed canvas pixels, keyboard rotation, material switching, finite/reduced motion, failure fallback and private-review exclusion.
- Extra layout checks cover 320x568, 375x667, 1280x720 and 1920x1080. Three browser-independent tests run only on desktop; the other nine project instances are intentionally skipped.
- Screenshots and accessibility JSON are attached to the ignored Playwright HTML report. `npx playwright show-report` opens it locally. Automated accessibility checks supplement, not replace, assistive-technology and real-device testing.

See the [verification report](docs/verification.md) for executed results, inspected viewports and testing limits.

For a production preview outside the test runner:

```sh
npm run build
npm run preview -- --port 4322
```

## Pages And Content

Home, Handheld, Team, Journal, Join and Support are prerendered HTML. There is no client framework, tracking, form backend, remote font request or initial heavy media. A small menu script and member-disclosure enhancement add keyboard/focus behaviour; native navigation and disclosures still work without JavaScript.

- [Club data](src/data/club.ts) contains the verified roster, divisions, memberships, journal entries, games and configurable links.
- [Content schema](src/data/model.ts) validates records during the build. [Content model](design/content-model.md) describes source and publication rules.
- [Design brief](design/brief.md), [asset inventory](design/asset-inventory.md) and [third-party notices](THIRD_PARTY.md) explain visual decisions and permissions.
- Missing or unconfirmed facts belong in `.local/content-checklist.md`. That directory is ignored and never deployed. A Git repository is not a private content store.

### Members And Academic Years

Only the five supplied members are included. Initials marked "Portrait pending" are not invented likenesses. Add an approved static avatar under `public/images/team/` and fill in its dimensions, alt text, credit and `approved: true` only after member permission. Optional biographies/interests require `profileApproved: true`. Keep approval evidence privately; publish only approved credits and public links.

### Local Character And Utendo Review

The procedural character prototypes and their renderer have been retired. The preview accepts genuinely AI-generated Mii-style images with optional matching silent MP4s instead. No image/video generation service is available in this coding session, so new media has not been generated. Photo-specific prompts and an image-to-video brief are in the ignored `.local/portrait-generation-brief.md`.

```sh
SPS_REVIEW=1 npm run dev -- --port 4321
```

Place generated images in `.local/review/portraits/<member-id>-ai.webp`, with optional `<member-id>-ai.mp4` clips. Old procedural filenames are not served. Matching videos appear inside member details with native controls, no autoplay and `preload="none"`; they pause when the disclosure closes, the tab is hidden, or reduced motion is enabled. Without an image, the initials placeholder stays visible. These assets are development-only, through a loopback-only route, and never enter production output, even with `SPS_REVIEW=1`. Do not move them to `public/` until member consent is recorded.

Utendo Regular/Bold also remain in local review with attribution. The author's current licence is CC BY-NC-SA 4.0, not the unrestricted licence suggested by the third-party listing. Confirm its suitability before production; the build continues to use the unrestricted OFL fallbacks. See [asset evidence](design/asset-inventory.md).

### Interactive Handheld

Home and Handheld offer Explore in 3D using the supplied SolidWorks glTF/bin export. The geometry is packed into GLB during `npm run assets` without modification. Source files and conversion history are in [model provenance](design/reference/handheld/SOURCE.md).

The poster is immediate; the renderer and model load only after activation. A 4.4-second replayable camera tour moves from an angled overview to a control close-up and back. Overview, Controls and Profile presets animate to useful viewpoints. Rotate with dragging or arrow buttons/keys; Home resets and Escape closes. Stop and other controls interrupt motion, and offscreen or hidden viewers stop rendering. Reduced motion makes view changes instant.

The power button toggles an explicitly illustrative SPS screen, not real firmware. CAD inspection shows translucent copies of the model surfaces and their actual edges, not invented internals. Colour swatches retain the original CAD materials or the purple/orange concept. Failed WebGL/model loading keeps the static poster and a retry action.

To regenerate the tracked model poster after a deliberate presentation change, start the local site and run `node scripts/render-model.mjs`. This uses the actual model, never a hand-drawn approximation. Three.js is a substantial optional chunk (over 600 KB uncompressed) and triggers Vite's size warning; browser tests ensure it is not fetched at initial load.

The initial roster is labelled "current" with `academicYear: null` because tenure has not been confirmed. Once confirmed, assign its consecutive-year ID. When a year ends, retain its membership rows, change that roster to `archived`, and create a new current roster and new membership rows. Never edit archived membership roles or divisions to reflect current appointments. The archive route generator emits only confirmed archived years. There are no fabricated historical teams.

### Build Journal And Games

There are zero published build logs and zero supplied games. No demo records are included in site data. Test fixtures are confined to tests and never imported into pages.

A journal entry needs a unique slug, title, summary, division IDs, author IDs, source references and structured sections. Keep `status: 'draft'` until approved. Published entries require `approvedForPublication: true` and an ISO publication date. Draft and future-dated entries are excluded both from the index and from `getStaticPaths()`, including local development. Date-based publication requires a new static build; there is no scheduler.

Game records must have approved names, summaries, credits and links. Use only original approved artwork, and keep the labelled development placeholder until those assets arrive.

### Applications And Contact

Edit `site` in [club data](src/data/club.ts). `recruitmentStatus` accepts `recruiting`, `paused` or `closed`; an approved `applicationUrl` produces an Apply link only while recruiting. No URL means no fake submit button. An approved `publicContact` may contain a public email or HTTPS URL. Until provided, Join and Support link to the supplied public LinkedIn profile of President Abdul Waase Qureshi. `sponsorProspectusUrl` is optional. No private email or deadline is assumed.

`productionOrigin` is deliberately unset and `indexable` is false. The site sends noindex metadata and disallow-all robots until a separately authorised release configures both. No domain or Cloudflare project is inferred.

## Deployment And Customisations

See [Cloudflare Pages deployment](docs/deployment.md). CI checks and builds only; it has no deployment step or external-service secrets.

Repository-scoped skills are in [.github/skills](.github/skills): the original SPS brand skill and the two requested pinned upstream skills. Source URLs, commits and licence details are recorded next to each. Upstream files are unmodified. Existing browser tools were available, so no workspace MCP configuration was needed or overwritten.