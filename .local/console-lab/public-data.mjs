// what the public website gets to know about the club. only teams that have people on them are listed, and there
// are no application or recruiting fields because the club isn't recruiting. the shared club data still keeps every
// division for the classic astro site, which production doesn't serve
export function publicClub(club, site, yearPlan) {
  const divisions = club.divisions.filter(division => club.memberships.some(membership => membership.divisionId === division.id));
  const memberships = club.memberships.filter(membership => !membership.divisionId || divisions.some(division => division.id === membership.divisionId));
  return {
    site: { name: site.name, description: site.description, publicContact: site.publicContact, instagramUrl: site.instagramUrl, linkedinUrl: site.linkedinUrl },
    members: club.members.filter(member => memberships.some(membership => membership.memberId === member.id)).map(({ id, name, coFounder, linkedin }) => ({ id, name, coFounder, linkedin })),
    memberships,
    divisions,
    yearPlan,
  };
}
