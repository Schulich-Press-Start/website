import { clubSchema, siteSettingsSchema } from './model.ts';

export const site = siteSettingsSchema.parse({
  name: 'Schulich Press Start',
  description: 'A University of Calgary engineering design club building gaming handhelds from the ground up through custom PCB design, embedded firmware, original games and mechanical enclosures.',
  repositoryUrl: 'https://github.com/Schulich-Press-Start/website',
  instagramUrl: 'https://www.instagram.com/sps_ucalgary',
  linktreeUrl: 'https://linktr.ee/sps_ucalgary',
  linkedinUrl: 'https://www.linkedin.com/company/schulich-press-start/',
  recruitmentStatus: 'recruiting',
  applicationUrl: 'https://docs.google.com/forms/d/1ivE8y-b9iFOp2NKrjTDpZ3uFLKTWS5FnDwUbDX5yA6g/viewform',
  publicContact: { approved: true, email: 'schulichpressstart@gmail.com' },
  sponsorProspectusUrl: null,
  productionOrigin: 'https://schulichpressstart.ca',
  // flip to true once the content checklist in docs/deployment.md is cleared
  indexable: false,
});

export const yearPlan = [
  { title: 'Gen 1 handheld', detail: 'Our goal: a Game Boy-class handheld, built, manufactured and on sale by June 2027.' },
  { title: 'Build a community', detail: 'Bring together students who want to make hardware, software and games.' },
  { title: 'Get the name out', detail: 'Share the build in public and grow Schulich Press Start on campus.' },
];

export const club = clubSchema.parse({
  members: [
    {
      id: 'abdul-waase-qureshi', name: 'Abdul Waase Qureshi', coFounder: true, linkedin: 'https://www.linkedin.com/in/abdulwq/',
      avatar: {
        src: '/images/team/abdul-waase-qureshi-ai.webp', alt: 'Mii-style portrait of Abdul Waase Qureshi.',
        width: 640, height: 768, approved: true, credit: 'AI-generated, member-approved.',
        crop: { left: 160, top: 32, width: 320, height: 320 },
      },
    },
    {
      id: 'jonart-bajraktari', name: 'Jonart Bajraktari', coFounder: true, linkedin: 'https://www.linkedin.com/in/jonartb/',
      avatar: {
        src: '/images/team/jonart-bajraktari-goatee-headshot-ai.webp', alt: 'Mii-style portrait of Jonart Bajraktari with a goatee.',
        width: 640, height: 640, approved: true, credit: 'AI-generated, member-approved.',
        crop: { left: 0, top: 0, width: 640, height: 640 },
      },
    },
    {
      id: 'yassin-soliman', name: 'Yassin Soliman', linkedin: 'https://www.linkedin.com/in/yassinsoliman/',
      avatar: {
        src: '/images/team/yassin-soliman-ai.webp', alt: 'Mii-style portrait of Yassin Soliman.',
        width: 640, height: 768, approved: true, credit: 'AI-generated, member-approved.',
        crop: { left: 160, top: 32, width: 320, height: 320 },
      },
    },
    {
      id: 'mujtaba-zia', name: 'Mujtaba Zia', linkedin: 'https://www.linkedin.com/in/mujtaba-zia/',
      avatar: {
        src: '/images/team/mujtaba-zia-ai.webp', alt: 'Mii-style portrait of Mujtaba Zia.',
        width: 640, height: 768, approved: true, credit: 'AI-generated, member-approved.',
        crop: { left: 160, top: 32, width: 320, height: 320 },
      },
    },
    {
      id: 'saifullah-asad', name: 'Saifullah Asad', linkedin: 'https://www.linkedin.com/in/saifasad/',
      avatar: {
        src: '/images/team/saifullah-asad-front-headshot-ai.webp', alt: 'Mii-style portrait of Saifullah Asad.',
        width: 640, height: 640, approved: true, credit: 'AI-generated, member-approved.',
        crop: { left: 0, top: 0, width: 640, height: 640 },
      },
    },
  ],
  divisions: [
    {
      id: 'embedded-hardware', name: 'Embedded Hardware',
      description: 'The electronics that bring a handheld to life.',
      work: ['Schematic capture and PCB design', 'Choosing the chip, screen and battery with Embedded Software', 'Power, charging and battery safety', 'Bringing up each board revision with Embedded Software'],
    },
    {
      id: 'embedded-software', name: 'Embedded Software',
      description: 'The connection between the hardware and the games.',
      work: ['Zephyr RTOS firmware', 'Drivers for the screen, buttons, audio and storage', 'The launcher and system menu', 'An SDK and PC simulator for Game Design', 'Bluetooth multiplayer and emulator testing'],
    },
    {
      id: 'game-design', name: 'Game Design',
      description: 'Original games made for something you can hold.',
      work: ['Game ideas and design', 'Art, animation, sound and music', 'Building games with the SPS SDK', 'Playtesting and polish'],
    },
    {
      id: 'mechanical', name: 'Mechanical',
      description: 'How it fits together. How it feels in your hands.',
      work: ['CAD case design', 'Button layout and feel', 'Fitting the board, screen and battery', '3D printing and iteration'],
    },
    {
      id: 'business', name: 'Business',
      description: 'The planning and partnerships behind the project.',
      work: ['Budget and spending', 'Sponsorship and outreach', 'Purchasing and tracking part costs', 'Partnerships'],
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