# Deployment

## Live Feedback Site

The user authorised Vercel deployment for club feedback on 2026-09-15, made the console concepts the main feedback experience on 2026-09-16, and subsequently authorised adding Pocket OS. The four-concept comparison is live at **https://schulich-press-start.vercel.app** in the `schulich-press-start` project under `yassins-projects-11732a5e`.

| Destination | URL |
| --- | --- |
| Comparison launcher | https://schulich-press-start.vercel.app/ |
| Signal | https://schulich-press-start.vercel.app/signal/ |
| Playroom | https://schulich-press-start.vercel.app/playroom/ |
| Cartridge Club | https://schulich-press-start.vercel.app/cartridge/ |
| Pocket OS | https://schulich-press-start.vercel.app/pocket/ |
| Preserved original website | https://schulich-press-start-classic.vercel.app/ |

- [Project dashboard](https://vercel.com/yassins-projects-11732a5e/schulich-press-start)
- [Live comparison deployment](https://vercel.com/yassins-projects-11732a5e/schulich-press-start/BZ1iQHJdvTaq81YTsDjqL26eQgwB)
- [Current classic deployment](https://vercel.com/yassins-projects-11732a5e/schulich-press-start/8qCh6xBjVXjYcUvbZQrGUt1by341)

Both domains are accessible without a Vercel account. They use Vercel's production environment for stable shareable addresses but remain unindexed: robots disallows crawling, pages have noindex metadata and responses carry `X-Robots-Tag: noindex, nofollow`. Noindex is not access control; anyone with the URL can open these sites. The latest authorised update publishes the Brick Break rename and revised interface copy, and makes the purple Cartridge design the default with its white gridded base and fading 3D background. The original six-page site and its approved Jonart portrait update remain unchanged. Earlier deployments are retained.

Only generated `.vercel.app` addresses were configured; no purchased domain, plan upgrade or automatic Git integration was added. No commit or Git push was made. The comparison was uploaded as audited compiled output, not as the workspace or private prototype directory.

The inspected remote is `https://github.com/Schulich-Press-Start/website.git`. Do not infer a different organisation name from SPS. Do not replace the remote.

## Console Comparison

The four concepts' source and required public build inputs are tracked at `.local/console-lab/` through an explicit Git allowlist. Existing paths are retained so the development and deployment commands remain compatible. All other local files stay ignored. The public build is separate from the original Astro build. Run from the repository root with Node 24 after installing the root dependencies:

```sh
npm ci --prefix .local/console-lab
npm run assets
node .local/console-lab/build.mjs
node .local/console-lab/verify-publish.mjs
```

The build command uses Vite to compile six explicit HTML entry points: the launcher, four concepts and a 404 page. An explicit media allowlist supplies only approved logo/headshot derivatives, the actual model, local concept stills, two licensed fonts and dependency licence notices. Four menu screenshots are converted to small WebP previews. A minimal `club.json` contains public names, roles, division descriptions, application URL and role email, not approval records or source-photo metadata.

Cartridge's public thumbnail uses the compiled page without development swatches. After a visual update, use `publish-screenshots/built-cartridge-chromium-desktop.png` from the compiled verification as `screenshots/cartridge-chromium-desktop.png` before the final build. Keep other test and variant screenshots out of the upload.

The build replaces local navigation with the preserved original site's HTTPS address. It disables environment-file loading and source maps, rejects localhost/private-path references, verifies model byte equality and writes a hashed artifact manifest. No raw reference photographs, documents, generation logs, Utendo font, test screenshots beyond the four approved menu previews, dev-server code or credentials are published.

Output is `.local/console-lab/publish/.vercel/output/`, using Vercel Build Output API v3. Its configuration applies the existing security headers and noindex to all responses, immutable caching to hashed `/assets/` bundles, explicit concept routes and a custom 404. `/original/` and old `/handheld/`, `/team/`, `/journal/`, `/join/`, `/support/` bookmarks redirect to the equivalent original-site destination. The archived Join page still uses deliberate Apply buttons, not an automatic form redirect.

The latest audited comparison upload contained 44 static files plus routing configuration, 2,418,551 bytes total. Every uploaded path, size and hash was checked against the final artifact. Sixteen compiled-browser scenarios passed locally under CSP and against Vercel: all concepts in desktop/tablet/phone Chromium and phone WebKit. Checks include Brick Break titles and accessible labels, exact Jonart PNG bytes, no Cartridge startup stripe, static-first purple styling, and real canvas pixels for the white base and distance-faded grid. Source prototype tests passed 24 scenarios, with another seven each for the purple and local white-grid views. The original site's required check, 14 unit tests, build and 83 browser tests passed, with nine intentional skips. It was not redeployed in this update.

The classic source upload was separately audited: 75 entries, including one directory entry, totalling 3,592,174 bytes. File hashes and the approved portrait allowlist were checked; private inputs were excluded. When processing a Vercel dry-run manifest, validate directory paths but do not read directory entries as files. Both updates used `--skip-domain`, followed by explicit assignments of the classic and main aliases respectively.

Cartridge Club retains the headline-spacing and startup-stripe fixes. Purple `#784ac3`, the white logo, white gridded platform and antialiased horizon plane are now public defaults. Purple styles are linked in HTML so the initial page and no-JavaScript fallback do not flash pink; Three.js still loads only after Press start. White-grid and pink overrides remain development-only at `?finish=white-grid` and `?finish=pink`. The separate local stylesheet, swatches and query links are excluded from production, and query parameters cannot override the live purple design. All four concepts remain in the comparison and settings switcher.

### Publishing The Comparison

**Always use `--skip-domain`.** Both the main and classic domains belong to the same Vercel project. An ordinary `--prod` deploy, `vercel promote` or `vercel rollback` could move both domains and overwrite the original site's archive alias. Stage the deployment, then assign only the intended address:

```sh
vercel link --yes --scope yassins-projects-11732a5e --project schulich-press-start --cwd .local/console-lab/publish
vercel deploy --prebuilt --prod --skip-domain --dry --json --scope yassins-projects-11732a5e --project schulich-press-start --cwd .local/console-lab/publish
vercel deploy --prebuilt --prod --skip-domain --yes --scope yassins-projects-11732a5e --project schulich-press-start --cwd .local/console-lab/publish
vercel alias set <new-deployment-host> schulich-press-start.vercel.app --scope yassins-projects-11732a5e
SPS_CONSOLE_ORIGIN=https://schulich-press-start.vercel.app node .local/console-lab/verify-publish.mjs
```

Compare the dry-run file list to `publish-manifest.json`: every uploaded path must be inside `.vercel/output/`. CLI-created `.env.local` and project-link metadata must remain excluded. A `.vercel.app` alias can initially return Vercel SSO until it is registered as a project domain and the configuration has propagated; verify anonymous access rather than assuming alias assignment is enough. Do not disable account-wide protection to work around it.

The main alias currently points to `schulich-press-start-8d6qwq1dw-yassins-projects-11732a5e.vercel.app`. The classic alias remains on `schulich-press-start-m6mkcko32-yassins-projects-11732a5e.vercel.app`. Only the main alias was assigned for this update. Classic Home and Join responses returned anonymous HTTP 200 with identical SHA-256 hashes before and after the switch. No protection settings were changed.

Prior comparisons `Gop8DS4Gn4dJxmeNy1HmKr3bxCBZ` and `7WnYoqRearxmzd2Dz4GEEquVQBcz` remain available, as do classic `2X1axHe2CuF92qBKjghjGu6ovQrK` and the earlier three-concept deployment `DqcTX7jrHbYeNdMJiGY1GyBXNYit`. To restore a prior experience after approval, reassign only the intended alias; do not delete the retained versions.

The user authorised a GitHub checkpoint of the current work on 2026-09-25. The checkpoint includes only the reviewed console source and required public inputs from `.local/console-lab/`, not the private folder as a whole. Cached dependencies, Vercel credentials and output, unselected screenshots, approval records, photographs and generation logs remain excluded. GitHub CI builds and checks both applications but does not deploy them; the live aliases still require the explicit workflow above.

## Original Astro Settings

[vercel.json](../vercel.json) owns the preserved Astro site's build settings. It is not the current console comparison's build entry point:

| Setting | Value |
| --- | --- |
| Framework | Astro, static output; no adapter or functions |
| Node.js | 24.x, confirmed on the project |
| Install | `npm ci` |
| Build | `npm run check && npm run test:unit && npm run build` |
| Output | `dist` |
| Trailing slashes | Enabled, matching Astro |
| Build logs/source listing | Not public (`public: false`) |
| Indexing | Disabled for this feedback site |

Images and the GLB are prepared during the build. No SSR conversion, database, analytics integration or Vercel image service is required. Join is a normal static page with direct Apply to SPS links to the form. It has no meta refresh, HTTP redirect or client-side automatic navigation; no Vercel redirect rule should be added for `/join/`.

Vercel does not apply Cloudflare's `_headers` file. The equivalent self-only CSP, no-sniff, frame, referrer and permissions policies are in [vercel.json](../vercel.json), together with immutable caching for hashed Astro assets. A unit test checks parity with the existing header file.

## Original Site Updates

Only run these when deliberately updating the original site. Use Node 24 and a browser login when the CLI session expires; never put tokens or passwords in chat or tracked files. Stage without moving domains, then assign only the classic alias:

```sh
vercel login
vercel link --yes --scope yassins-projects-11732a5e --project schulich-press-start
vercel deploy --dry --json
npm run check
npm run test:unit
npm run build
npm run test:e2e
vercel deploy --prod --skip-domain --yes --logs --scope yassins-projects-11732a5e --project schulich-press-start
vercel alias set <new-original-deployment-host> schulich-press-start-classic.vercel.app --scope yassins-projects-11732a5e
```

Review the dry-run upload list before deploying. [.vercelignore](../.vercelignore) excludes `.local`, environment/authentication files, editor/MCP configuration, browser logs, test reports, documentation and unnecessary reference assets. Required source images, the glTF/bin model and the vendored files used by unit tests remain available to the remote build. Generated assets are recreated there rather than uploaded.

Vercel linking creates ignored `.vercel` metadata and may create `.env.local` with an OIDC token. Both are excluded from uploads; never read their secret values into logs or commit them. `public: false` protects Vercel's source/log listing, not access to the rendered website.

The initial manifest contained 74 files, about 3.4 MB, with no private paths. Vercel's remote `npm ci`, typecheck, 14 unit tests and static build passed. The latest Join-page change passed 14 unit tests and 83 browser tests locally, with nine intentional duplicate skips. See [verification](verification.md) for live checks.

Future deployments and changes to indexing, access controls, domains, plans or automatic Git integration need to remain within the user's authorised scope. A fully indexed release would require both approved `site.productionOrigin`/`site.indexable` settings and deliberate removal of the Vercel noindex header. The CLI was upgraded to 59.18.0 and automatic CLI updates enabled at the user's request.

## Cloudflare Alternative

Cloudflare Pages remains an optional static host. No Cloudflare project or domain has been configured. The settings below are retained for a separately authorised migration, not used by the current Vercel site.

### Before Release

1. Resolve the private content checklist: member permissions, confirmed academic year, approved application/contact destinations, policy copy and any desired game/journal content.
2. Review the six public routes, all link destinations, mobile navigation and static placeholders. Do not publish unknown facts to make pages appear complete.
3. Set the separately approved HTTPS `productionOrigin` and `indexable: true` in [club settings](../src/data/club.ts) only for an authorised release. The default is noindex and disallow-all robots. These settings do not provide access control; use Cloudflare Access for private review deployments if needed.
4. Run `npm ci`, `npm run check`, `npm run test:unit`, `npm run build` and `npm run test:e2e` on Node 24. Review screenshots. A static build contains only approved published journal routes and confirmed archived team years.

### Pages Settings

After authorisation, create a Pages project through the Cloudflare dashboard and connect only the intended repository. Choose the project name explicitly; no `pages.dev` name or custom domain is assumed here.

| Setting | Value |
| --- | --- |
| Framework | Astro / static |
| Repository | `Schulich-Press-Start/website` |
| Production branch | `main`, subject to release approval |
| Root directory | Repository root |
| Build command | `npm ci && npm run check && npm run test:unit && npm run build` |
| Build output | `dist` |
| Build image | v3 |
| `NODE_VERSION` | `24` |
| `SKIP_DEPENDENCY_INSTALL` | `1` |

`.nvmrc` also specifies Node 24. Pages does not use `package.json` engines as its runtime selector, so keep the explicit version setting. Use npm only, with the committed lockfile. Do not omit dev dependencies: the type checker, asset preparation and unit tests use them.

No Cloudflare adapter, Pages Functions, worker bindings, database, runtime token or Wrangler configuration is needed for this static output. Images are optimised during the Node build. Do not switch to SSR merely to deploy this site.

### Security And Caching

[public/_headers](../public/_headers) supplies a self-only script CSP, clickjacking protection, no-sniff, referrer and permissions policies. Hashed Astro assets receive long-lived immutable caching. Small client scripts are emitted as external files to comply with CSP. Browser tests inject the same CSP into the local production preview; Astro's local preview does not itself implement Pages `_headers` semantics.

Styles permit inline declarations used by generated assets. There are no forms, embeds, analytics or third-party browser requests. If introducing any of those, review CSP and privacy requirements deliberately instead of loosening the policy globally. Do not place secrets in site data, public assets, client environment variables, tracked approval notes or build logs.

Preview builds should remain unindexed. Use Pages preview settings and/or separate build configuration to retain noindex if production indexing is later enabled. The current build-time setting applies to all outputs; do not assume the code automatically distinguishes Cloudflare preview and production.

### CI And Release

[CI workflow](../.github/workflows/ci.yml) installs the npm lockfile, type-checks, validates content/assets, builds, installs Chromium/WebKit and runs the browser suite. It uploads the test report for seven days and needs only repository read permission. The actions are pinned to the inspected stable v6 commit SHAs. The workflow does not deploy.

If Git-based Pages automatic deployments are later enabled, pushes may deploy before GitHub checks finish. Use branch protection and an explicitly agreed release process; don't assume the CI workflow gates Cloudflare. A project administrator must configure these external controls after authorisation.

After a Cloudflare deployment, verify actual HTTP headers, 404 status, generated asset URLs, fonts, mobile navigation and the production origin. Roll back using a previously approved Pages deployment if needed. No Cloudflare deployment or rollback has been exercised; the Vercel deployment was verified separately.

## Official References

Checked on 2026-09-15 and 2026-09-16:

- [Astro installation and supported Node versions](https://docs.astro.build/en/install-and-setup/)
- [Astro static build and preview](https://docs.astro.build/en/develop-and-build/)
- [Astro on Vercel](https://vercel.com/docs/frameworks/frontend/astro)
- [Vercel project configuration](https://vercel.com/docs/project-configuration)
- [Vercel upload exclusions](https://vercel.com/docs/deployments/vercel-ignore)
- [Vercel Build Output API configuration](https://vercel.com/docs/build-output-api/configuration)
- [Vercel prebuilt deployment](https://vercel.com/docs/cli/deploy#prebuilt)
- [Vercel alias assignment](https://vercel.com/docs/cli/alias)
- [Cloudflare Pages Astro guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Pages build image and runtime overrides](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Pages custom headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)

The documentation helper's authenticated endpoint was unavailable; the official documentation pages were fetched directly. Versions were checked against the npm registry: Astro 7.3.2; TypeScript 6.0.3 because `@astrojs/check` 0.9.10 supports TypeScript 5/6, not the then-current TypeScript 7 major; Playwright 1.63.0; `@lucide/astro` 1.46.0 supports Astro 7. Full resolved versions are in the lockfile.