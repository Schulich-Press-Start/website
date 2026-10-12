import { setup, data, icon, animate, tone, openProgram } from '../common.js';

let channelPage = 0;
const channelGrid = document.querySelector('.channel-grid');
const tiles = [
  { id: 'handheld', label: 'The handheld', className: 'channel-hardware', content: `<span class="channel-tag">Hardware</span><span class="channel-hardware-title">Made by<br>students.</span><img class="channel-handheld" src="/media/handheld.webp" alt="SPS enclosure colour concept" /><span class="channel-ticker">A student-built way to play</span>` },
  { id: 'crew', label: 'The team', className: 'channel-crew', content: `<span class="channel-tag">Crew</span><div class="channel-faces">${data.members.slice(0,3).map(member => `<img src="/media/${member.id}.png" alt="${member.name}" />`).join('')}</div><span class="channel-crew-title">Meet the team.</span>` },
  { id: 'arcade', label: 'Brick Break', className: 'channel-arcade', content: `<span class="channel-tag">Browser demo</span><span class="channel-game-title">Brick<br>Break</span><div class="brick-art" aria-hidden="true">${Array.from({length:12}, (_, index) => `<i style="--brick:${index}"></i>`).join('')}</div><span class="art-ball" aria-hidden="true"></span><span class="art-paddle" aria-hidden="true"></span>` },
  { id: 'work', label: 'Our divisions', className: 'channel-work', content: `<span class="channel-tag">Six divisions</span><div class="work-icons" aria-hidden="true">${icon('CircuitBoard',44)}${icon('Box',40)}${icon('Gamepad2',42)}</div><span class="channel-work-title">Different parts.<br>One team.</span>` },
  { id: 'journal', label: 'Project updates', className: 'channel-journal', content: `<span class="channel-tag">The project</span><div class="journal-art" aria-hidden="true"><span>Next<br>steps.</span><div class="journal-fold"></div></div><span class="channel-journal-note">On the workbench</span>` },
  { id: 'join', label: 'Your turn', className: 'channel-join', content: `<span class="channel-tag">Recruiting</span><div class="join-symbol" aria-hidden="true">${icon('Plus',72)}</div><span class="channel-join-title">A place<br>for you.</span>` },
];
const secondPage = [
  { id: 'work', label: 'Embedded hardware', className: 'channel-chip', content: `<span class="channel-tag">On the inside</span>${icon('CircuitBoard',70)}<strong>Small board.<br>Big ideas.</strong>` },
  { id: 'handheld', label: 'Colour studio', className: 'channel-colour', content: `<span class="channel-tag">Enclosure concepts</span><div class="colour-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div><strong>Your colour.<br>Your console.</strong>` },
  { id: 'join', label: 'Join the team', className: 'channel-letter', content: `<span class="channel-tag">An open invitation</span>${icon('Mail',65)}<strong>Press start<br>with us.</strong>` },
  ...tiles.slice(1,4),
];
function renderPage(next, focus = false) {
  channelPage = (next + 2) % 2;
  channelGrid.innerHTML = (channelPage ? secondPage : tiles).map((tile, index) => `<button class="channel ${tile.className}" type="button" data-program="${tile.id}" aria-label="Open ${tile.label}" ${index === 0 ? 'data-initial-focus' : ''}><span class="channel-screen">${tile.content}</span><span class="channel-label">${tile.label}<span>${icon('Play',13)}</span></span></button>`).join('');
  document.querySelector('.channel-dots').innerHTML = [0,1].map(index => `<button type="button" class="page-dot" aria-label="Channel page ${index+1}" aria-pressed="${index===channelPage}" data-page-index="${index}"></button>`).join('');
  if (document.body.dataset.booted === 'true') animate(channelGrid, [{opacity:.1,transform:`translateX(${channelPage ? 40 : -40}px)`},{opacity:1,transform:'none'}],{duration:400});
  if (focus) channelGrid.querySelector('button').focus();
}
channelGrid.addEventListener('click', async event => {
  const target = event.target.closest('[data-program]');
  if (!target) return;
  target.focus({ preventScroll: true });
  tone();
  await animate(target, [{transform:'scale(1)'},{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:220});
  openProgram(target.dataset.program);
});
channelGrid.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  const buttons = [...channelGrid.querySelectorAll('button')];
  const index = buttons.indexOf(document.activeElement);
  if (index < 0) return;
  const columns = innerWidth <= 600 ? 2 : 3;
  const delta = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-columns, ArrowDown:columns }[event.key];
  buttons[(index + delta + buttons.length) % buttons.length].focus();
  tone(); event.preventDefault();
});
document.querySelector('[data-page="previous"]').innerHTML = icon('ArrowLeft');
document.querySelector('[data-page="next"]').innerHTML = icon('ArrowRight');
document.querySelector('.dock-home').innerHTML = icon('Grid2X2',26);
document.querySelector('.dock-arrow').innerHTML = icon('ArrowUpRight',17);
document.querySelector('[data-page="previous"]').onclick = () => { renderPage(channelPage-1); tone(); };
document.querySelector('[data-page="next"]').onclick = () => { renderPage(channelPage+1); tone(); };
document.querySelector('.dock-home').onclick = () => { renderPage(0,true); tone(); };
document.querySelector('.channel-dots').onclick = event => { const button=event.target.closest('[data-page-index]');if(button){renderPage(Number(button.dataset.pageIndex));tone();} };
setup('playroom', async () => renderPage(0), () => renderPage(0));
renderPage(0);