# Schulich Press Start

The first static website for SPS, a University of Calgary engineering design club developing a custom gaming handheld and original games.

Public website: **https://schulichpressstart.ca**, the Cartridge Club concept with a Teams view, deployed to Cloudflare from `main` (noindex until launch). Feedback site: **https://schulich-press-start.vercel.app** presents four console concepts: Signal, Playroom, Cartridge Club and [Pocket OS](https://schulich-press-start.vercel.app/pocket/). The original six-page site is preserved at **https://schulich-press-start-classic.vercel.app**. Both are accessible without sign-in, with indexing disabled.

The console source is included in Git at [.local/console-lab](.local/console-lab), alongside the original Astro application. A narrow [.gitignore](.gitignore) allowlist tracks the console code, its npm lockfile, two model stills and four public preview images. Other local files, including source photos, approval records, credentials, dependencies, test captures and deployment output, remain ignored. Vercel receives only the audited static build. See [deployment instructions](docs/deployment.md) for the two build paths and alias-safe update commands. Do not run an ordinary Vercel production deploy, which could move both domains.

## Console Development

From a fresh checkout, use Node 24 and run:

```sh
npm ci
npm ci --prefix .local/console-lab
npm run assets
npm run dev --prefix .local/console-lab
```

The four-concept comparison runs at `http://127.0.0.1:4323/`. To validate its production output, run `node .local/console-lab/build.mjs` followed by `node .local/console-lab/verify-publish.mjs`. The public website build is `node .local/console-lab/build.mjs --site` followed by `node .local/console-lab/verify-site.mjs`. See the [console guide](.local/console-lab/README.md) for local variants and detailed checks. These commands do not deploy anything.

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

- Content tests cover real roster integrity, lead ordering, cross-references, academic years, consent, draft publication, safe configuration, source-image pixel preservation, square headshot crop bounds and exact crop pixels, licences and vendored skill hashes.
- Playwright covers all six content pages with Chromium desktop/tablet/phone and WebKit phone, including axe WCAG checks, touch, keyboard, focus return, no JavaScript, reduced motion, CSP, local-only page assets, footer social links, 404s, internal links and anchors. Join stays on site until an Apply button is activated; both application links are tested without JavaScript too.
- Headshot tests check responsive framing and a browser-only 20-member growth fixture. Homepage engineering disclosures are tested with keyboard and without JavaScript.
- Club-content checks distinguish working prototypes, demonstration games, future chip integration, the June goal and pending school/funding approval. The public email action is also checked at 320 pixels, and private source documents must return 404.
- Model tests verify source-geometry byte equality, on-demand loading, nonblank and fully framed canvas pixels, keyboard rotation, material switching, finite/reduced motion, failure fallback and private-review exclusion. Deployment tests verify static Vercel settings, security-header parity and private upload exclusions.
- Extra layout checks cover 320x568, 375x667, 1280x720 and 1920x1080. Three browser-independent tests run only on desktop; the other nine project instances are intentionally skipped.
- Screenshots and accessibility JSON are attached to the ignored Playwright HTML report. `npx playwright show-report` opens it locally. Automated accessibility checks supplement, not replace, assistive-technology and real-device testing.

See the [verification report](docs/verification.md) for executed results, inspected viewports and testing limits.

For a production preview outside the test runner:

```sh
npm run build
npm run preview -- --port 4322
```

## Pages And Content

Home, Handheld, Team, Journal, Join and Support are prerendered HTML. Join presents division information and direct application buttons instead of automatically leaving the site. There is no client framework, tracking, form backend, remote font request or initial heavy media. A small menu script and member-disclosure enhancement add keyboard/focus behaviour; native navigation, disclosures and application links work without JavaScript.

- [Club data](src/data/club.ts) contains the verified roster, divisions, memberships, journal entries, games and configurable links.
- [Content schema](src/data/model.ts) validates records during the build. [Content model](design/content-model.md) describes source and publication rules.
- [Design brief](design/brief.md), [asset inventory](design/asset-inventory.md) and [third-party notices](THIRD_PARTY.md) explain visual decisions and permissions.
- Missing or unconfirmed facts belong in `.local/content-checklist.md`. That directory is ignored and never deployed. A Git repository is not a private content store.

### Club Context

The user's latest description, constitution and info-night deck inform Home, Handheld and Support. SPS has two working prototypes in different form factors; the next focus is a Game Boy-inspired handheld with a June completion goal. The collaboration with Schulich on a Chip concerns student-designed computer chips for a future 2027-2028 iteration, not the present prototypes. On the Astro pages June stays a goal without a calendar year or sales promise. The 2026-2027 kickoff deck sets the Gen 1 goal as built, manufactured and on sale by June 2027; the public website's Teams view shows that as a goal (`yearPlan` in club settings).

School of Engineering approval is pending while the club completes its constitution and confirms a faculty advisor. An application to the Schulich Student Activities Fund is a next step after approval, not an award already secured. The supplied documents remain unchanged in ignored `.local/club-documents/`; only reviewed facts enter the public pages. See [content sources and boundaries](design/content-model.md). The presentation's September 25 application deadline is explicitly marked as a placeholder in its notes and is not published.

### Members And Academic Years

Only the five supplied members are included. Their user-supplied AI-generated portraits are member-approved, as confirmed by the user on 2026-09-15, and stored in [public/images/team](public/images/team). Saifullah uses the separately approved 640x640 front-facing headshot. Jonart uses the supplied 640x640 goatee headshot requested for all current sites on 2026-09-16. Both retain their full square framing. Abdul, Yassin and Mujtaba retain 320x320 crops at x=160, y=32 from their 640x768 originals. All prior originals are unchanged. Home and Team use Astro's 120/160/240/320-pixel variants; all four console concepts and the local background studies use the same shared PNG headshots. Grids wrap as divisions grow. Generation credits stay in metadata and records rather than being repeated on each person.

For future members, keep the initials fallback until permission is obtained, then add an approved static avatar with original dimensions, alt text, credit, `approved: true` and an optional square in-bounds crop. Optional biographies/interests still require `profileApproved: true`. Keep approval evidence privately; the current record is `.local/portrait-approvals.md`. Approval covers the exact current stills, including Jonart's and Saifullah's revisions, not further likeness changes or videos. Deployment must be within the user's separately authorised scope. A crop cannot change the direction of a face; new generated revisions require their own member approval.

### Local Character And Utendo Review

The procedural character prototypes and their renderer are retired. The five approved images were generated separately and supplied by the user; this integration did not generate new media or use a paid API. Originals, intermediate images, review sheets and generation logs remain in ignored `.local/`. No videos were supplied. Photo-specific prompts and an image-to-video brief are in `.local/portrait-generation-brief.md` for future separately approved work.

```sh
SPS_REVIEW=1 npm run dev -- --port 4321
```

For future drafts, use `.local/review/portraits/<member-id>-ai.webp`, with optional `<member-id>-ai.mp4` clips. Approved public portraits take precedence over local drafts; use a separate review sheet when revising an already-approved likeness. Old procedural filenames are not served. Matching local videos appear inside member details with native controls, no autoplay and `preload="none"`; they pause when the disclosure closes, the tab is hidden, or reduced motion is enabled. These review assets are development-only and never enter production output, even with `SPS_REVIEW=1`. Promote only explicitly approved finals, never the private folder.

Utendo Regular/Bold also remain in local review with attribution. The author's current licence is CC BY-NC-SA 4.0, not the unrestricted licence suggested by the third-party listing. Confirm its suitability before production; the build continues to use the unrestricted OFL fallbacks. See [asset evidence](design/asset-inventory.md).

### Interactive Handheld

Home offers Press start and Handheld offers Explore in 3D using the supplied SolidWorks glTF/bin export. The geometry is packed into GLB during `npm run assets` without modification. Source files and conversion history are in [model provenance](design/reference/handheld/SOURCE.md).

The poster is immediate; the renderer and model load only after activation. A 4.4-second replayable camera tour moves from an angled overview to a control close-up and back. Overview, Controls and Profile presets animate to useful viewpoints. Rotate with dragging or arrow buttons/keys; Home resets and Escape closes. Stop and other controls interrupt motion, and offscreen or hidden viewers stop rendering. Reduced motion makes view changes instant.

The power button toggles an explicitly illustrative SPS screen, not real firmware. CAD inspection shows translucent copies of the model surfaces and their actual edges, not invented internals. The shell starts purple (`#7543b9`); the eyedropper swatch opens the browser's native colour picker for any RGB colour. Changes apply live to the shell and rear panel, producing a solid matching back in concept mode. The orange controls and screen retain their own materials. The purple preset resets the shell colour, and the source swatch restores untouched CAD materials. A custom colour survives closing and reopening 3D on the same page; selecting it exits inspection. Failed WebGL/model loading keeps the static purple poster and a retry action.

To regenerate the tracked overview and control-detail images after a deliberate presentation change, start the local site and run `node scripts/render-model.mjs`. This uses the actual model, never a hand-drawn approximation. The homepage pairs the lit overview with a dark product stage and the close-up with native engineering disclosures; both images remain labelled concepts. Three.js is a substantial optional chunk (over 600 KB uncompressed) and triggers Vite's size warning; browser tests ensure it is not fetched at initial load.

The initial roster is labelled "current" with `academicYear: null` because tenure has not been confirmed. Once confirmed, assign its consecutive-year ID. When a year ends, retain its membership rows, change that roster to `archived`, and create a new current roster and new membership rows. Never edit archived membership roles or divisions to reflect current appointments. The archive route generator emits only confirmed archived years. There are no fabricated historical teams.

### Build Journal And Games

There are zero published build logs and zero approved original-game catalogue records. The user reports prototype demos of Pong, Tomb of the Mask and Brick Breaker; these names appear as demonstration examples, not as original SPS releases or imported playable games. Test fixtures are confined to tests and never imported into pages.

A journal entry needs a unique slug, title, summary, division IDs, author IDs, source references and structured sections. Keep `status: 'draft'` until approved. Published entries require `approvedForPublication: true` and an ISO publication date. Draft and future-dated entries are excluded both from the index and from `getStaticPaths()`, including local development. Date-based publication requires a new static build; there is no scheduler.

Game records must have approved names, summaries, credits and links. Use only original approved artwork, and keep the labelled development placeholder until those assets arrive.

### Applications And Contact

Edit `site` in [club data](src/data/club.ts). `recruitmentStatus` accepts `recruiting`, `paused` or `closed`. `/join/` always renders the branded Join page, division information and recruitment status. While recruiting with a configured `applicationUrl`, Apply to SPS buttons at the top and bottom link directly to the respondent form. There is no redirect document, meta refresh or automatic navigation. Paused/closed recruitment or a missing form hides the application links and retains the contact fallback. The form opens in the same tab only after activation.

The user supplied [SPS Linktree](https://linktr.ee/sps_ucalgary) on 2026-09-15. Its SPS Team Applications entry points at a Google Forms editor URL; the website uses its [respondent URL](https://docs.google.com/forms/d/1ivE8y-b9iFOp2NKrjTDpZ3uFLKTWS5FnDwUbDX5yA6g/viewform) without editor/account query parameters. Google currently requests sign-in, so form contents and response acceptance have not been verified. No application was submitted and no external service was changed. Linktree's own entry should be updated by its owner to the respondent link. The footer includes the verified [Instagram](https://www.instagram.com/sps_ucalgary) and Linktree destinations through validated `instagramUrl` and `linktreeUrl` settings.

The info-night deck's Stay connected slide supplies `schulichpressstart@gmail.com`, now configured as the approved public club contact. The Email SPS action uses that `mailto:` destination, with the full address in its accessible name and tooltip so the button fits narrow screens. No email was sent or delivery tested. If `publicContact` is removed in future, the existing fallback uses the supplied public LinkedIn profile of President Abdul Waase Qureshi. `sponsorProspectusUrl` remains optional; no private email or application deadline is inferred.

`productionOrigin` is `https://schulichpressstart.ca` and `indexable` is false. Every build sends noindex metadata, disallow-all robots and an `X-Robots-Tag` header. Indexing is disabled, not access to the public URL. Flipping `indexable` is the one-line launch switch; see [deployment](docs/deployment.md#indexing-switch).

## Deployment And Customisations

See [deployment](docs/deployment.md). The public website deploys to Cloudflare from CI after every check passes, with previews for pull requests. The Vercel feedback sites are still uploaded by hand through the CLI. Local Vercel metadata and authentication files remain ignored and excluded from uploads.

Repository-scoped skills are in [.github/skills](.github/skills): the original SPS brand skill and the two requested pinned upstream skills. Source URLs, commits and licence details are recorded next to each. Upstream files are unmodified. Existing browser tools were available, so no workspace MCP configuration was needed or overwritten.