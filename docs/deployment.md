# Cloudflare Pages Deployment

## Authorisation Boundary

This repository is prepared for static Cloudflare Pages hosting. Nothing has been published, pushed, purchased or configured in an external service. Connecting Git integration or selecting Save and Deploy publishes a site and requires separate authorisation.

The inspected remote is `https://github.com/Schulich-Press-Start/website.git`. Do not infer a different organisation name from SPS. Do not replace the remote.

## Before Release

1. Resolve the private content checklist: member permissions, confirmed academic year, approved application/contact destinations, policy copy and any desired game/journal content.
2. Review the six public routes, all link destinations, mobile navigation and static placeholders. Do not publish unknown facts to make pages appear complete.
3. Set the separately approved HTTPS `productionOrigin` and `indexable: true` in [club settings](../src/data/club.ts) only for an authorised release. The default is noindex and disallow-all robots. These settings do not provide access control; use Cloudflare Access for private review deployments if needed.
4. Run `npm ci`, `npm run check`, `npm run test:unit`, `npm run build` and `npm run test:e2e` on Node 24. Review screenshots. A static build contains only approved published journal routes and confirmed archived team years.

## Pages Settings

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

## Security And Caching

[public/_headers](../public/_headers) supplies a self-only script CSP, clickjacking protection, no-sniff, referrer and permissions policies. Hashed Astro assets receive long-lived immutable caching. Small client scripts are emitted as external files to comply with CSP. Browser tests inject the same CSP into the local production preview; Astro's local preview does not itself implement Pages `_headers` semantics.

Styles permit inline declarations used by generated assets. There are no forms, embeds, analytics or third-party browser requests. If introducing any of those, review CSP and privacy requirements deliberately instead of loosening the policy globally. Do not place secrets in site data, public assets, client environment variables, tracked approval notes or build logs.

Preview builds should remain unindexed. Use Pages preview settings and/or separate build configuration to retain noindex if production indexing is later enabled. The current build-time setting applies to all outputs; do not assume the code automatically distinguishes Cloudflare preview and production.

## CI And Release

[CI workflow](../.github/workflows/ci.yml) installs the npm lockfile, type-checks, validates content/assets, builds, installs Chromium/WebKit and runs the browser suite. It uploads the test report for seven days and needs only repository read permission. The actions are pinned to the inspected stable v6 commit SHAs. The workflow does not deploy.

If Git-based Pages automatic deployments are later enabled, pushes may deploy before GitHub checks finish. Use branch protection and an explicitly agreed release process; don't assume the CI workflow gates Cloudflare. A project administrator must configure these external controls after authorisation.

After deployment, verify actual HTTP headers, 404 status, generated asset URLs, fonts, mobile navigation and the production origin. Roll back using a previously approved Pages deployment if needed. No remote deployment or rollback was exercised for this local-only implementation.

## Official References

Checked on 2026-09-15:

- [Astro installation and supported Node versions](https://docs.astro.build/en/install-and-setup/)
- [Astro static build and preview](https://docs.astro.build/en/develop-and-build/)
- [Cloudflare Pages Astro guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Pages build image and runtime overrides](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Pages custom headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)

The documentation helper's authenticated endpoint was unavailable; the official documentation pages were fetched directly. Versions were checked against the npm registry: Astro 7.3.2; TypeScript 6.0.3 because `@astrojs/check` 0.9.10 supports TypeScript 5/6, not the then-current TypeScript 7 major; Playwright 1.63.0; `@lucide/astro` 1.46.0 supports Astro 7. Full resolved versions are in the lockfile.