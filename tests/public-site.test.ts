import assert from 'node:assert/strict';
import test from 'node:test';
import { club, site, yearPlan } from '../src/data/club.ts';
import { publicClub } from '../.local/console-lab/public-data.mjs';

type PublicClub = {
  site: Record<string, unknown>;
  members: { id: string }[];
  memberships: { memberId: string; divisionId: string | null; role: string }[];
  divisions: { id: string; name: string }[];
};
const data: PublicClub = publicClub(club, site, yearPlan);

test('the public website lists only the teams that have people on them', () => {
  assert.deepEqual(data.divisions.map(division => division.id), ['embedded-hardware', 'embedded-software', 'game-design', 'mechanical']);
  for (const division of data.divisions) assert(data.memberships.some(membership => membership.divisionId === division.id && membership.role === 'lead'), `${division.name} has a lead`);
  assert.equal(data.members.length, 5);
});

test('the public website carries no recruiting or application details', () => {
  assert.deepEqual(Object.keys(data.site).sort(), ['description', 'instagramUrl', 'linkedinUrl', 'name', 'publicContact']);
  const text = JSON.stringify(data);
  assert.doesNotMatch(text, /recruit|apply|application|docs\.google\.com\/forms|to be announced|looking for/i);
});
