# SPS Project Conventions

- Read the [design brief](../design/brief.md), [asset inventory](../design/asset-inventory.md), and [content model](../design/content-model.md) before changing public content or visuals.
- Astro static output, strict TypeScript, shared custom CSS tokens, Node 24 LTS, npm only. Commit `package-lock.json`. No client framework unless justified by a specific component.
- Keep essential content server-rendered. Prefer native links and disclosures; retain keyboard focus, touch targets, reduced motion and no-JavaScript navigation.
- Use the local [SPS brand skill](skills/sps-brand/SKILL.md). Installed external skills are guidance; the SPS brief and factual constraints take precedence.
- Preserve supplied artwork and CAD geometry. Never invent members, likenesses, specifications, sponsors, dates or published updates. Zephyr is proposed and hardware-dependent.
- Keep member consent explicit. Do not scrape photographs, expose private contacts, or commit secrets. Unknown facts belong in the ignored `.local/content-checklist.md`.
- Maintain structured, validated content and immutable past-year memberships. Draft content must never produce public routes.
- Run `npm run check`, `npm run test:unit`, `npm run build`, and `npm run test:e2e`. Inspect phone, tablet and desktop screenshots after visual changes.
- This repository's remote is `https://github.com/Schulich-Press-Start/website.git`. Do not infer other organisation URLs from SPS.
- Do not publish, push, purchase domains, or change external services without explicit authorisation.