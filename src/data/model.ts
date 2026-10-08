import { z as schema } from 'zod';

const text = schema.string().trim().min(1);
const identifier = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const httpsUrl = schema.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use a public HTTPS URL without credentials.');

export const academicYearSchema = text.regex(/^\d{4}-\d{4}$/).refine((value) => {
  const [start, end] = value.split('-').map(Number);
  return end === start + 1;
}, 'An academic year must contain consecutive years.');

export const memberSchema = schema.object({
  id: identifier,
  name: text,
  coFounder: schema.boolean().default(false),
  linkedin: httpsUrl,
  biography: text.optional(),
  interests: schema.array(text).default([]),
  profileApproved: schema.boolean().default(false),
  avatar: schema.object({
    src: text.regex(/^\/images\/team\/[a-z0-9-]+\.(?:png|webp|avif)$/),
    alt: text,
    width: schema.number().int().positive(),
    height: schema.number().int().positive(),
    approved: schema.literal(true),
    credit: text,
    crop: schema.object({
      left: schema.number().int().nonnegative(),
      top: schema.number().int().nonnegative(),
      width: schema.number().int().positive(),
      height: schema.number().int().positive(),
    }).optional(),
  }).refine((avatar) => !avatar.crop || (
    avatar.crop.width === avatar.crop.height
    && avatar.crop.left + avatar.crop.width <= avatar.width
    && avatar.crop.top + avatar.crop.height <= avatar.height
  ), 'Headshot crops must be square and inside the original image.').optional(),
}).refine((member) => member.profileApproved || (!member.biography && !member.interests.length), {
  message: 'Optional profile details require member approval.',
});

export const divisionSchema = schema.object({
  id: identifier,
  name: text,
  description: text,
  work: schema.array(text).min(1),
});

export const rosterSchema = schema.object({
  id: identifier,
  academicYear: academicYearSchema.nullable(),
  state: schema.enum(['current', 'archived']),
}).refine((roster) => roster.state !== 'archived' || roster.academicYear !== null, {
  message: 'An archive needs a confirmed academic year.',
});

export const membershipSchema = schema.object({
  memberId: identifier,
  rosterId: identifier,
  divisionId: identifier.nullable(),
  role: schema.enum(['president', 'lead', 'member']),
}).refine((membership) => (membership.role === 'president') === (membership.divisionId === null), {
  message: 'President is separate from divisions; division roles require a division.',
});

export const journalEntrySchema = schema.object({
  slug: identifier,
  title: text,
  summary: text,
  status: schema.enum(['draft', 'published']),
  approvedForPublication: schema.boolean().default(false),
  publishedAt: schema.iso.date().optional(),
  authorIds: schema.array(identifier),
  divisionIds: schema.array(identifier),
  sources: schema.array(text),
  sections: schema.array(schema.object({
    heading: text,
    paragraphs: schema.array(text).min(1),
  })).min(1),
}).superRefine((entry, context) => {
  if (entry.status === 'published' && (!entry.approvedForPublication || !entry.publishedAt || !entry.sources.length || !entry.authorIds.length)) {
    context.addIssue({ code: 'custom', message: 'Published logs require approval, a real date, authors and sources.' });
  }
});

export const gameSchema = schema.object({
  id: identifier,
  name: text,
  summary: text,
  status: schema.enum(['in-development', 'playable']),
  approvedForPublication: schema.literal(true),
  credits: schema.array(text).min(1),
  playableUrl: httpsUrl.optional(),
  image: schema.object({
    src: text.regex(/^\/images\/games\/[a-z0-9-]+\.(?:png|webp|avif)$/),
    alt: text,
    width: schema.number().int().positive(),
    height: schema.number().int().positive(),
  }).optional(),
}).refine((game) => game.status !== 'playable' || Boolean(game.playableUrl), {
  message: 'Playable games require an approved working destination.',
});

export const siteSettingsSchema = schema.object({
  name: text,
  description: text,
  repositoryUrl: httpsUrl,
  instagramUrl: httpsUrl.nullable().default(null),
  linktreeUrl: httpsUrl.nullable().default(null),
  linkedinUrl: httpsUrl.nullable().default(null),
  recruitmentStatus: schema.enum(['recruiting', 'paused', 'closed']),
  applicationUrl: httpsUrl.nullable(),
  publicContact: schema.object({
    approved: schema.literal(true),
    email: schema.email().optional(),
    url: httpsUrl.optional(),
  }).refine((contact) => Boolean(contact.email || contact.url), 'A contact needs an email or URL.').nullable(),
  sponsorProspectusUrl: httpsUrl.nullable(),
  productionOrigin: httpsUrl.refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.pathname === '/' && !url.search && !url.hash;
  }, 'Use an origin without a path, query or fragment.').nullable(),
  indexable: schema.boolean(),
}).refine((settings) => !settings.indexable || settings.productionOrigin !== null, {
  message: 'Indexing requires an approved production origin.',
});

export const clubSchema = schema.object({
  members: schema.array(memberSchema),
  divisions: schema.array(divisionSchema),
  rosters: schema.array(rosterSchema),
  memberships: schema.array(membershipSchema),
  journal: schema.array(journalEntrySchema),
  games: schema.array(gameSchema),
}).superRefine((club, context) => {
  const report = (message: string) => context.addIssue({ code: 'custom', message });
  for (const collection of [club.members, club.divisions, club.rosters, club.games]) {
    if (new Set(collection.map((record) => record.id)).size !== collection.length) report('Record IDs must be unique.');
  }
  if (new Set(club.journal.map((entry) => entry.slug)).size !== club.journal.length) report('Journal slugs must be unique.');
  if (club.rosters.filter((roster) => roster.state === 'current').length !== 1) report('Exactly one current roster is required.');
  const years = club.rosters.flatMap((roster) => roster.academicYear ? [roster.academicYear] : []);
  if (new Set(years).size !== years.length) report('Academic years must not be duplicated.');
  const memberIds = new Set(club.members.map((member) => member.id));
  const divisionIds = new Set(club.divisions.map((division) => division.id));
  const rosterIds = new Set(club.rosters.map((roster) => roster.id));
  const membershipKeys = new Set<string>();

  for (const membership of club.memberships) {
    if (!memberIds.has(membership.memberId)) report(`Unknown member: ${membership.memberId}`);
    if (!rosterIds.has(membership.rosterId)) report(`Unknown roster: ${membership.rosterId}`);
    if (membership.divisionId && !divisionIds.has(membership.divisionId)) report(`Unknown division: ${membership.divisionId}`);
    const key = `${membership.rosterId}:${membership.memberId}:${membership.divisionId}`;
    if (membershipKeys.has(key)) report('Duplicate membership.');
    membershipKeys.add(key);
  }
  for (const roster of club.rosters) {
    if (club.memberships.filter((membership) => membership.rosterId === roster.id && membership.role === 'president').length !== 1) {
      report(`Roster ${roster.id} needs exactly one President.`);
    }
  }
  for (const entry of club.journal) {
    if (entry.authorIds.some((author) => !memberIds.has(author))) report(`Unknown journal author in ${entry.slug}.`);
    if (entry.divisionIds.some((division) => !divisionIds.has(division))) report(`Unknown journal division in ${entry.slug}.`);
  }
});

export type Club = schema.infer<typeof clubSchema>;
export type Member = schema.infer<typeof memberSchema>;
export type Membership = schema.infer<typeof membershipSchema>;
export type Division = schema.infer<typeof divisionSchema>;
export type JournalEntry = schema.infer<typeof journalEntrySchema>;

export function getRosterEntries(club: Club, rosterId: string, divisionId: string | null) {
  const priority = { president: 0, lead: 1, member: 2 };
  return club.memberships
    .filter((membership) => membership.rosterId === rosterId && membership.divisionId === divisionId)
    .map((membership) => ({
      member: club.members.find((member) => member.id === membership.memberId)!,
      membership,
    }))
    .sort((first, second) => priority[first.membership.role] - priority[second.membership.role] || first.member.name.localeCompare(second.member.name, 'en-CA'));
}

export function getPublishedEntries(entries: JournalEntry[], now = new Date()) {
  return entries
    .filter((entry) => entry.status === 'published' && entry.approvedForPublication && entry.publishedAt && new Date(`${entry.publishedAt}T00:00:00Z`) <= now)
    .sort((first, second) => second.publishedAt!.localeCompare(first.publishedAt!));
}

export function getRoleLabel(membership: Membership, division?: Division) {
  if (membership.role === 'president') return 'President';
  return `${division?.name ?? ''} ${membership.role === 'lead' ? 'Lead' : 'Member'}`.trim();
}

export function getInitials(name: string) {
  const names = name.trim().split(/\s+/);
  return `${names[0][0]}${names.length > 1 ? names.at(-1)![0] : ''}`;
}