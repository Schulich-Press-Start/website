# Content Model

## Sources And Publication

Initial verified sources: the user's 2026-09-15 project brief, five-person roster and supplied CAD/branding images. The constitution and other club materials are missing. Do not invent membership rules, meeting times, academic programmes, biographies, sponsors, specifications, achievements, dates, or application links.

Keep unknowns in the ignored `.local/content-checklist.md`. Repository documentation is not deployed, but is not inherently private if the Git repository is later made public. Never store secrets or private member contacts in tracked files.

## Records

- `Member`: stable ID, public name, approved public links, optional approved biography/interests, optional approved static avatar with source/permission metadata. No inferred demographics, education, or likenesses.
- `Division`: stable ID, display name, concise responsibility description, display order. Embedded Hardware, Embedded Software, Game Design, Mechanical, Business, Communications.
- `Role`: President, Lead, Member; co-founder is separate from division seniority.
- `Membership`: member ID, academic-year ID, division ID or presidency, role, co-founder status. Never overwrite past memberships when a year changes.
- `AcademicYear`: ID, display label, current/archive state. Keep the initial roster in a neutral current snapshot until its academic year is confirmed; do not infer tenure from today's date. Confirmed year records may be published at `/team/archive/<year>/`.
- `JournalEntry`: slug, title, summary, division tags, draft/published state, optional publication date, public author IDs, source references, and structured sections for question, work, evidence, next step. Publication requires a real date, sources and club approval. Start with zero published entries, not synthetic build logs.
- `Game`: stable ID, name and summary only when supplied, status, approved image and credits, optional playable URL. No demo game may masquerade as club work.
- `SiteSettings`: verified GitHub repository URL, recruitment state, optional HTTPS application URL, optional approved public contact, optional sponsor prospectus, optional production origin. Missing endpoints produce honest non-submitting states rather than dead links or fake forms.

Private visual review is not public content: the user supplied five photo references but requested member approval before publication. Procedural character prototypes are retired. Future AI-generated stills and optional silent videos live only in ignored `.local/` with `-ai.webp` and `-ai.mp4` filenames. A loopback-only opt-in development middleware can display them; the public `Member.avatar` schema and approval gate remain unchanged. No environment flag may enable these concepts in static output, and old procedural filenames are not served.

## Initial Roster

| Person | Leadership | Public link |
| --- | --- | --- |
| Abdul Waase Qureshi | President and Co-Founder | https://www.linkedin.com/in/abdulwq/ |
| Jonart Bajraktari | Embedded Hardware Lead and Co-Founder | https://www.linkedin.com/in/jonartb/ |
| Yassin Soliman | Embedded Software Lead | https://www.linkedin.com/in/yassinsoliman/ |
| Mujtaba Zia | Game Design Lead | https://www.linkedin.com/in/mujtaba-zia/ |
| Saifullah Asad | Mechanical Lead | https://www.linkedin.com/in/saifasad/ |

Business and Communications have no confirmed members in the supplied roster. Show divisions without inventing names. Keep President separate and sort leads before members within each division.

## Page Responsibilities

- Home: product-led introduction, engineering story, original-game development, actual team preview, Join and Support links.
- Handheld: source CAD views, observed controls, proposed Zephyr platform, current prototype/development state; no unverified technical specification table.
- Team: current roster grouped by division, presidency, native optional details, approved profiles, and archive-ready data.
- Journal: genuine published entries only, otherwise an honest empty state with an onward route to the prototype. Draft schemas and editorial guidance remain non-public.
- Join: responsibilities, proposed collaboration expectations (not constitutional requirements), actual recruiting status, configurable application destination.
- Support: ways to contribute resources, expertise or funding without invented packages, sponsor logos or tax claims; configurable approved contact.

## Validation

Validate unique IDs, cross-record references, safe URLs, leadership ordering, no duplicate memberships, one current roster, sequential academic-year IDs for confirmed archives, publication gates and approved avatars. Exercise missing-link states, native keyboard disclosures, mobile menu focus/Escape, no-JavaScript navigation, reduced motion, responsive overflow and automated WCAG accessibility checks.