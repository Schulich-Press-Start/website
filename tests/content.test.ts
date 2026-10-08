import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { packageGlb } from '../scripts/model-assets.mjs';
import { club, currentRoster, site } from '../src/data/club.ts';
import { academicYearSchema, clubSchema, getInitials, getPublishedEntries, getRoleLabel, getRosterEntries, journalEntrySchema, memberSchema, siteSettingsSchema } from '../src/data/model.ts';

test('the supplied roster contains only the five real members and six divisions', () => {
  assert.equal(club.members.length, 5);
  assert.deepEqual(club.members.map((member) => member.name), [
    'Abdul Waase Qureshi', 'Jonart Bajraktari', 'Yassin Soliman', 'Mujtaba Zia', 'Saifullah Asad',
  ]);
  assert.equal(club.divisions.length, 6);
  assert.equal(currentRoster.academicYear, null);
  assert.equal(getRosterEntries(club, currentRoster.id, null)[0].member.name, 'Abdul Waase Qureshi');
  assert.equal(getRosterEntries(club, currentRoster.id, 'business').length, 0);
  assert.equal(getRosterEntries(club, currentRoster.id, 'communications').length, 0);
});

test('division leads sort ahead of members independently of input order', () => {
  const fixture = structuredClone(club);
  fixture.members.push(memberSchema.parse({ id: 'test-member', name: 'A Test Fixture', linkedin: 'https://example.org/fixture' }));
  fixture.memberships.unshift({ memberId: 'test-member', rosterId: 'current', divisionId: 'embedded-software', role: 'member' });
  const entries = getRosterEntries(clubSchema.parse(fixture), 'current', 'embedded-software');
  assert.equal(entries[0].member.name, 'Yassin Soliman');
  assert.equal(getRoleLabel(entries[0].membership, club.divisions[1]), 'Embedded Software Lead');
});

test('duplicate records and broken membership references fail validation', () => {
  for (const key of ['memberId', 'divisionId', 'rosterId'] as const) {
    const fixture = structuredClone(club);
    fixture.memberships[1][key] = 'does-not-exist';
    assert.equal(clubSchema.safeParse(fixture).success, false);
  }
  assert.equal(clubSchema.safeParse({ ...club, memberships: [...club.memberships, club.memberships[0]] }).success, false);
  assert.equal(clubSchema.safeParse({ ...club, members: [...club.members, club.members[0]] }).success, false);
  assert.equal(clubSchema.safeParse({ ...club, memberships: club.memberships.slice(1) }).success, false);
});

test('archives require a confirmed year and preserve current memberships', () => {
  assert.equal(academicYearSchema.safeParse('2025-2027').success, false);
  assert.equal(academicYearSchema.safeParse('2025-2026').success, true);
  const fixture = structuredClone(club);
  fixture.rosters.push({ id: 'archive-fixture', academicYear: '2025-2026', state: 'archived' });
  fixture.memberships.push({ ...club.memberships[0], rosterId: 'archive-fixture' });
  assert.equal(clubSchema.safeParse(fixture).success, true);
  assert.equal(getRosterEntries(fixture, 'current', null)[0].member.name, 'Abdul Waase Qureshi');
  fixture.rosters[1].academicYear = null;
  assert.equal(clubSchema.safeParse(fixture).success, false);
});

test('portraits and optional profile details need approval', () => {
  const member = club.members[0];
  assert.equal(memberSchema.safeParse({ ...member, biography: 'Unapproved fixture biography.' }).success, false);
  assert.equal(memberSchema.safeParse({ ...member, biography: 'Approved fixture biography.', profileApproved: true }).success, true);
  assert.equal(memberSchema.safeParse({ ...member, avatar: { src: '/images/team/test.png', alt: 'Test', width: 256, height: 256, approved: false, credit: 'Test' } }).success, false);
  assert.equal(memberSchema.safeParse({ ...member, linkedin: 'javascript:alert(1)' }).success, false);
  assert.equal(memberSchema.safeParse({ ...member, avatar: undefined }).success, true);
  assert.equal(getInitials('Abdul Waase Qureshi'), 'AQ');
});

test('each approved member portrait has its own valid public image', async () => {
  const paths = new Set<string>();
  const revisedPortraits: Record<string, string> = {
    'jonart-bajraktari': 'jonart-bajraktari-goatee-headshot-ai.webp',
    'saifullah-asad': 'saifullah-asad-front-headshot-ai.webp',
  };
  for (const member of club.members) {
    assert(member.avatar, `${member.name} needs the approved portrait.`);
    assert.equal(member.avatar.approved, true);
    const filename = revisedPortraits[member.id] ?? `${member.id}-ai.webp`;
    assert.equal(member.avatar.src, `/images/team/${filename}`);
    assert(member.avatar.alt.includes(member.name));
    assert.equal(member.avatar.credit, 'AI-generated, member-approved.');
    const image = sharp(`public${member.avatar.src}`);
    const metadata = await image.metadata();
    const statistics = await image.stats();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, member.avatar.width);
    assert.equal(metadata.height, member.avatar.height);
    assert.equal(metadata.hasAlpha, true);
    assert.equal(statistics.channels[3].min, 0);
    assert.equal(statistics.channels[3].max, 255);
    paths.add(member.avatar.src);
  }
  assert.equal(paths.size, club.members.length);
});

test('headshot crops preserve the approved face pixels and stay in bounds', async () => {
  for (const member of club.members) {
    const avatar = member.avatar!;
    assert(avatar.crop);
    const cropped = sharp(`src/assets/generated/team/${member.id}-headshot.png`);
    const metadata = await cropped.metadata();
    assert.equal(metadata.width, avatar.crop.width);
    assert.equal(metadata.height, avatar.crop.height);
    assert.equal(metadata.width, metadata.height);
    const expected = await sharp(`public${avatar.src}`).extract(avatar.crop).ensureAlpha().raw().toBuffer();
    assert.deepEqual(await cropped.ensureAlpha().raw().toBuffer(), expected);
    assert.equal(memberSchema.safeParse({ ...member, avatar: { ...avatar, crop: { ...avatar.crop, left: avatar.width } } }).success, false);
    assert.equal(memberSchema.safeParse({ ...member, avatar: { ...avatar, crop: { ...avatar.crop, height: 200 } } }).success, false);
  }
});

test('published journal entries require approval, date, authors and evidence', () => {
  const fixture = {
    slug: 'test-fixture', title: 'Test fixture, not a real update', summary: 'Test only.', status: 'draft',
    authorIds: [], divisionIds: [], sources: [], sections: [{ heading: 'Question', paragraphs: ['A test fixture.'] }],
  };
  const draft = journalEntrySchema.parse(fixture);
  assert.deepEqual(getPublishedEntries([draft]), []);
  assert.equal(journalEntrySchema.safeParse({ ...fixture, status: 'published' }).success, false);
  const published = journalEntrySchema.parse({ ...fixture, status: 'published', publishedAt: '2026-01-01', approvedForPublication: true, authorIds: ['yassin-soliman'], sources: ['Test evidence, not club content.'] });
  assert.equal(getPublishedEntries([published], new Date('2026-01-02')).length, 1);
  assert.equal(getPublishedEntries([published], new Date('2025-12-31')).length, 0);
  assert.deepEqual(getPublishedEntries(club.journal), []);
  assert.deepEqual(club.games, []);
});

test('approved destinations are configured and unsafe or unapproved ones are rejected', () => {
  assert.equal(site.applicationUrl, 'https://docs.google.com/forms/d/1ivE8y-b9iFOp2NKrjTDpZ3uFLKTWS5FnDwUbDX5yA6g/viewform');
  assert.equal(site.instagramUrl, 'https://www.instagram.com/sps_ucalgary');
  assert.equal(site.linktreeUrl, 'https://linktr.ee/sps_ucalgary');
  assert.equal(site.linkedinUrl, 'https://www.linkedin.com/company/schulich-press-start/');
  assert.deepEqual(site.publicContact, { approved: true, email: 'schulichpressstart@gmail.com' });
  assert.equal(site.repositoryUrl, 'https://github.com/Schulich-Press-Start/website');
  assert.equal(siteSettingsSchema.safeParse({ ...site, applicationUrl: null, instagramUrl: null, linktreeUrl: null, publicContact: null }).success, true);
  for (const field of ['applicationUrl', 'instagramUrl', 'linktreeUrl', 'linkedinUrl']) {
    for (const url of ['javascript:alert(1)', 'http://example.org', 'https://user:secret@example.org']) {
      assert.equal(siteSettingsSchema.safeParse({ ...site, [field]: url }).success, false);
    }
  }
  assert.equal(siteSettingsSchema.safeParse({ ...site, applicationUrl: '' }).success, false);
  assert.equal(siteSettingsSchema.safeParse({ ...site, applicationUrl: 'http://example.org' }).success, false);
  assert.equal(siteSettingsSchema.safeParse({ ...site, applicationUrl: 'https://user:secret@example.org' }).success, false);
  assert.equal(siteSettingsSchema.safeParse({ ...site, applicationUrl: 'https://example.org/apply' }).success, true);
  assert.equal(site.productionOrigin, 'https://schulichpressstart.ca');
  assert.equal(siteSettingsSchema.safeParse({ ...site, productionOrigin: null, indexable: true }).success, false);
  assert.equal(siteSettingsSchema.safeParse({ ...site, productionOrigin: 'https://schulichpressstart.ca/team/' }).success, false);
  assert.equal(siteSettingsSchema.safeParse({ ...site, productionOrigin: '' }).success, false);
  assert.equal(siteSettingsSchema.safeParse({ ...site, publicContact: { approved: false, email: 'test@example.org' } }).success, false);
});

test('Vercel keeps static delivery, security headers and private upload exclusions', () => {
  const configuration = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(configuration.framework, 'astro');
  assert.equal(configuration.installCommand, 'npm ci');
  assert.equal(configuration.buildCommand, 'npm run check && npm run test:unit && npm run build');
  assert.equal(configuration.outputDirectory, 'dist');
  assert.equal(configuration.trailingSlash, true);
  assert.equal(configuration.public, false);
  const headers = configuration.headers.find((rule: { source: string }) => rule.source === '/(.*)').headers;
  const cloudflare = readFileSync('public/_headers', 'utf8');
  for (const key of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy', 'Content-Security-Policy']) {
    const expected = cloudflare.split('\n').find((line) => line.trimStart().startsWith(`${key}: `))!.trim().slice(key.length + 2);
    assert.equal(headers.find((header: { key: string }) => header.key === key).value, expected);
  }
  assert.equal(headers.find((header: { key: string }) => header.key === 'X-Robots-Tag').value, 'noindex, nofollow');
  const exclusions = readFileSync('.vercelignore', 'utf8').split('\n');
  for (const path of ['.local', '.vscode', '.env', '.env.*', '.vercel', '.playwright-mcp', 'test-results', 'docs']) {
    assert(exclusions.includes(path), `Private upload exclusion missing: ${path}`);
  }
});

test('Cloudflare serves the public website as plain static assets', () => {
  const configuration = JSON.parse(readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(configuration.name, 'sps-website');
  assert.equal(configuration.main, undefined);
  assert.deepEqual(configuration.assets, { directory: './dist-site', not_found_handling: '404-page', html_handling: 'auto-trailing-slash' });
  assert.equal(configuration.routes, undefined);
});

test('generated CAD derivatives preserve source pixels and product geometry', async () => {
  for (const [source, destination] of [['prototype1.png', 'prototype-front.png'], ['prototype1-2.png', 'prototype-angle.png']]) {
    const original = await sharp(`design/reference/${source}`).removeAlpha().raw().toBuffer();
    const derived = await sharp(`src/assets/generated/${destination}`).removeAlpha().raw().toBuffer();
    assert.deepEqual(derived, original);
  }
  const original = await sharp('design/reference/prototype1-2.png').extract({ left: 115, top: 24, width: 260, height: 472 }).removeAlpha().raw().toBuffer();
  const hero = await sharp('src/assets/generated/prototype-hero.png').removeAlpha().raw().toBuffer();
  assert.deepEqual(hero, original);
});

test('distributed font and icon licences remain unmodified', () => {
  for (const [packageName, filename] of [
    ['@fontsource-variable/kufam', 'kufam'],
    ['@fontsource-variable/commissioner', 'commissioner'],
    ['@lucide/astro', 'lucide'],
  ]) {
    assert.deepEqual(readFileSync(`public/licenses/${filename}.txt`), readFileSync(`node_modules/${packageName}/LICENSE`));
  }
});

test('vendored skills match the inspected upstream Git blobs', () => {
  for (const [filename, expected] of [
    ['frontend-design/SKILL.md', 'a5333457c414d20d625f307df945842c0952ecc3'],
    ['frontend-design/LICENSE.txt', 'f433b1a53f5b830a205fd2df78e2b34974656c7b'],
    ['web-design-guidelines/SKILL.md', 'ceae92ab319216a68274168fba9b63b998b65997'],
    ['web-design-guidelines/UPSTREAM-README.md', '04a1a5a46a22cfd430e2877b7c145e34fc2653ab'],
  ]) {
    const bytes = readFileSync(`.github/skills/${filename}`);
    const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(actual, expected, filename);
  }
});

test('the real handheld GLB retains every source geometry byte', async () => {
  const document = JSON.parse(readFileSync('design/reference/handheld/SPS_V1_07.20.gltf', 'utf8'));
  const binary = readFileSync('design/reference/handheld/SPS V1 07.20.bin');
  const packed = packageGlb(document, binary);
  assert.deepEqual(packed.subarray(28 + packed.readUInt32LE(12)), binary);
  assert.deepEqual(readFileSync('public/models/sps-handheld.glb'), packed);
  assert.throws(() => packageGlb(document, Buffer.alloc(0)), /geometry is incomplete/);
  const gltf = await new GLTFLoader().parseAsync(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength), '');
  let vertices = 0;
  gltf.scene.traverse((object) => {
    if ('isMesh' in object && object.isMesh && 'geometry' in object) {
      const geometry = object.geometry as import('three').BufferGeometry;
      vertices += geometry.attributes.position.count;
    }
  });
  assert.equal(vertices, 5850);
});