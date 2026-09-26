# Content Model

## Sources And Publication

Verified sources include the user's 2026-09-15 project descriptions, five-person roster, supplied CAD/branding images, the constitution and the 2026-2027 info-night presentation. Exact document copies are retained in ignored `.local/club-documents/` as references, not public downloads. Their receipt is not evidence that the constitution has been adopted, a faculty advisor confirmed or school approval granted. Do not invent membership rules, meeting times, academic programmes, biographies, sponsors, specifications, achievements, dates or application links.

Keep unknowns in the ignored `.local/content-checklist.md`. Repository documentation is not deployed, but is not inherently private if the Git repository is later made public. Never store secrets or private member contacts in tracked files.

## Confirmed Project Context

| Fact | Source | Public treatment |
| --- | --- | --- |
| Full handheld development: custom PCBs, embedded firmware, games and mechanical enclosures | User description; constitution objectives/divisions; presentation slides 3-12 | Learning and development scope, not final hardware specifications |
| Two working prototypes in different form factors, running games such as Pong, Tomb of the Mask and Brick Breaker | User description | Prototype demonstrations; do not list the titles as original SPS game releases |
| Game Boy-inspired next build, with completion targeted for June | User description | A goal, not a guaranteed release or sale; no calendar year inferred |
| Collaboration with Schulich on a Chip on student-designed chips for a 2027-2028 iteration | User description | Future integration, not hardware already in the current prototypes |
| Seeking Schulich School of Engineering approval by completing the constitution and confirming a faculty advisor | User description | Pending approval; no named or confirmed advisor |
| School approval would allow an application to the Schulich Student Activities Fund | User description | Planned application, not awarded funding or a sponsor commitment |
| Public club email: `schulichpressstart@gmail.com` | Presentation slide 18, Stay connected | Configured public contact; no delivery test or email sent |

Presentation slide 19's speaker notes explicitly mark the September 25 application deadline as a placeholder; do not publish it. The slides' broad "OS developed by students" wording is represented accurately as firmware, board support, drivers and hardware APIs around the proposed Zephyr RTOS platform, subject to hardware selection. Do not claim an SPS-written kernel. Do not turn roadmap sales language into a product launch promise. Draft governance, membership rules and detailed meeting commitments need confirmation before publication. Presenter/template notes are not roster entries, and document filenames alone do not establish membership tenure.

The user supplied [SPS Linktree](https://linktr.ee/sps_ucalgary) on 2026-09-15 as the source for applications and public social links. It links the SPS Team Applications Google Form and `https://www.instagram.com/sps_ucalgary`. The site uses the form's respondent `/viewform` URL rather than its editor link. Google sign-in prevents inspection of the form contents and response acceptance; do not infer deadlines or eligibility from the link alone.

## Records

- `Member`: stable ID, public name, approved public links, optional approved biography/interests, optional approved static avatar with source/permission metadata. No inferred demographics, education, or likenesses.
- `Division`: stable ID, display name, concise responsibility description, display order. Embedded Hardware, Embedded Software, Game Design, Mechanical, Business, Communications.
- `Role`: President, Lead, Member; co-founder is separate from division seniority.
- `Membership`: member ID, academic-year ID, division ID or presidency, role, co-founder status. Never overwrite past memberships when a year changes.
- `AcademicYear`: ID, display label, current/archive state. Keep the initial roster in a neutral current snapshot until its academic year is confirmed; do not infer tenure from today's date. Confirmed year records may be published at `/team/archive/<year>/`.
- `JournalEntry`: slug, title, summary, division tags, draft/published state, optional publication date, public author IDs, source references, and structured sections for question, work, evidence, next step. Publication requires a real date, sources and club approval. Start with zero published entries, not synthetic build logs.
- `Game`: stable ID, name and summary only when supplied, status, approved image and credits, optional playable URL. No demo game may masquerade as club work.
- `SiteSettings`: verified GitHub repository URL, optional HTTPS Instagram/Linktree URLs, recruitment state, optional HTTPS application URL, optional approved public contact, optional sponsor prospectus, optional production origin. Public social destinations share the credential-free HTTPS validation. Missing endpoints produce honest non-submitting states rather than dead links or fake forms.

Private visual review is not public content. The user confirmed member approval for the five supplied AI-generated stills on 2026-09-15 and separately confirmed approval for Saifullah's new front-facing headshot later that day. On 2026-09-16 the user reported Jonart's wish to show his new goatee and requested the supplied replacement headshot across all current sites. Only approved finals are copied into `public/images/team/` and referenced by validated `Member.avatar` records with `approved: true`, original dimensions, alt text and an AI-generation credit. The optional `crop` contains integer `left`, `top`, `width` and `height` values; it must be square and within the original image. Jonart's and Saifullah's current 640x640 sources use full-image crops; the other three keep their 320x320 crops. Asset preparation extracts unchanged-pixel PNG headshots for the console concepts and Astro's responsive WebPs. Credits remain metadata rather than repeated visible card copy. Approval evidence, source photos and generation records remain in ignored `.local/`. Future media retains the review-only boundary until separately approved. No environment flag may publish the private folder, and old procedural filenames are not served.

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

- Home: product-led introduction, two working prototypes and the next build goal, actual-model imagery, native engineering disclosures, demos distinguished from original-game development, approved team headshots and onward links.
- Handheld: source CAD views and observed controls, the two working prototypes, June build goal, future Schulich on a Chip collaboration and hardware-dependent Zephyr plan; no unverified technical specification table.
- Team: current roster grouped by division in wrapping headshot grids, separate presidency, native optional details, approved profiles, and archive-ready data.
- Journal: genuine published entries only, otherwise an honest empty state with an onward route to the prototype. Draft schemas and editorial guidance remain non-public.
- Join: a permanent branded page with division information and recruitment status. While recruiting with a configured application, two native Apply to SPS links open the approved respondent form only after activation. No automatic redirect or meta refresh. Paused/closed recruitment or an unconfigured application keeps the local information and contact fallback without application links.
- Support: ways to contribute resources, expertise or funding, the pending school-approval/constitution/advisor steps and planned SSAF application, with the public club email. No invented packages, awarded funding, sponsor logos or tax claims.

## Validation

Validate unique IDs, cross-record references, safe URLs, leadership ordering, no duplicate memberships, one current roster, sequential academic-year IDs for confirmed archives, publication gates and approved avatars. Exercise missing-link states, native keyboard disclosures, mobile menu focus/Escape, no-JavaScript navigation, reduced motion, responsive overflow and automated WCAG accessibility checks.