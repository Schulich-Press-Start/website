import { clubSchema, siteSettingsSchema } from './model.ts';

export const site = siteSettingsSchema.parse({
  name: 'Schulich Press Start',
  description: 'A University of Calgary engineering design club developing custom gaming handhelds, from electronics and enclosures to embedded software and original games.',
  repositoryUrl: 'https://github.com/Schulich-Press-Start/website',
  recruitmentStatus: 'recruiting',
  applicationUrl: null,
  publicContact: null,
  sponsorProspectusUrl: null,
  productionOrigin: null,
  indexable: false,
});

export const club = clubSchema.parse({
  members: [
    { id: 'abdul-waase-qureshi', name: 'Abdul Waase Qureshi', coFounder: true, linkedin: 'https://www.linkedin.com/in/abdulwq/' },
    { id: 'jonart-bajraktari', name: 'Jonart Bajraktari', coFounder: true, linkedin: 'https://www.linkedin.com/in/jonartb/' },
    { id: 'yassin-soliman', name: 'Yassin Soliman', linkedin: 'https://www.linkedin.com/in/yassinsoliman/' },
    { id: 'mujtaba-zia', name: 'Mujtaba Zia', linkedin: 'https://www.linkedin.com/in/mujtaba-zia/' },
    { id: 'saifullah-asad', name: 'Saifullah Asad', linkedin: 'https://www.linkedin.com/in/saifasad/' },
  ],
  divisions: [
    {
      id: 'embedded-hardware', name: 'Embedded Hardware',
      description: 'The electronics that bring a handheld to life.',
      work: ['Circuit design and component selection', 'Board bring-up and electrical testing', 'Working with software and mechanical design'],
    },
    {
      id: 'embedded-software', name: 'Embedded Software',
      description: 'The connection between the hardware and the games.',
      work: ['Firmware and hardware interfaces', 'Exploring Zephyr, subject to hardware selection', 'Input, display and system integration'],
    },
    {
      id: 'game-design', name: 'Game Design',
      description: 'Original games made for something you can hold.',
      work: ['Game mechanics and playable experiments', 'Original art, sound and interaction', 'Playtesting alongside the handheld team'],
    },
    {
      id: 'mechanical', name: 'Mechanical',
      description: 'How it fits together. How it feels in your hands.',
      work: ['Enclosure CAD and control layout', 'Physical prototyping and fit', 'Integrating the electronics into the shell'],
    },
    {
      id: 'business', name: 'Business',
      description: 'The planning and partnerships behind the project.',
      work: ['Sponsorship and partnerships', 'Project resources and budgeting', 'Supporting the team\'s long-term direction'],
    },
    {
      id: 'communications', name: 'Communications',
      description: 'Sharing the people, process and progress of SPS.',
      work: ['Build stories and club updates', 'Visual identity and outreach', 'Connecting the club with its community'],
    },
  ],
  rosters: [{ id: 'current', academicYear: null, state: 'current' }],
  memberships: [
    { memberId: 'abdul-waase-qureshi', rosterId: 'current', divisionId: null, role: 'president' },
    { memberId: 'jonart-bajraktari', rosterId: 'current', divisionId: 'embedded-hardware', role: 'lead' },
    { memberId: 'yassin-soliman', rosterId: 'current', divisionId: 'embedded-software', role: 'lead' },
    { memberId: 'mujtaba-zia', rosterId: 'current', divisionId: 'game-design', role: 'lead' },
    { memberId: 'saifullah-asad', rosterId: 'current', divisionId: 'mechanical', role: 'lead' },
  ],
  journal: [],
  games: [],
});

export const currentRoster = club.rosters.find((roster) => roster.state === 'current')!;
export const archivedRosters = club.rosters.filter((roster) => roster.state === 'archived');
export const president = club.members.find((member) => member.id === club.memberships.find((membership) => membership.rosterId === currentRoster.id && membership.role === 'president')?.memberId)!;

export const navigation = [
  { label: 'Handheld', href: '/handheld/' },
  { label: 'Team', href: '/team/' },
  { label: 'Journal', href: '/journal/' },
  { label: 'Support', href: '/support/' },
  { label: 'Join the team', href: '/join/' },
];