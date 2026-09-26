import { setup, programs, icon, tone, openProgram, animate } from '../common.js';

let stage;
let selected = 0;
const crossbar = document.querySelector('.crossbar');
crossbar.innerHTML = programs.map((program, index) => `<button class="crossbar-item" data-index="${index}" aria-pressed="${index === 0}" ${index === 0 ? 'data-initial-focus' : ''}>${icon(program.icon, 32)}<span>${program.short}</span></button>`).join('');
const selections = [
  { title: 'The handheld.', status: 'SPS / Hardware', description: 'Two working prototypes.<br>A Game Boy-inspired build next.', commands: [['handheld', 'Explore the model'], ['journal', 'The story so far']] },
  { title: 'Meet the team.', status: 'SPS / Crew', description: 'Students building hardware,<br>software and games together.', commands: [['crew', 'Meet the team'], ['join', 'Join the team']] },
  { title: 'Every part matters.', status: 'SPS / Divisions', description: 'From the first circuit<br>to the final enclosure.', commands: [['work', 'Choose a division'], ['join', 'Join the build']] },
  { title: 'Brick Break', status: 'Browser demo', description: 'Take a break with a quick game.', commands: [['arcade', 'Play Brick Break'], ['handheld', 'Back to the handheld']] },
  { title: 'On the workbench.', status: 'SPS / Project', description: 'A handheld by June is the goal.<br>Student-designed chips are a future step.', commands: [['journal', 'View project updates'], ['work', 'Explore our divisions']] },
  { title: 'Your turn.', status: 'SPS / Recruiting', description: 'Help us build the next SPS handheld.', commands: [['join', 'Join Schulich Press Start'], ['crew', 'Meet the team']] },
];
function select(index, focus = false) {
  selected = (index + programs.length) % programs.length;
  crossbar.querySelectorAll('button').forEach((button, position) => {
    button.setAttribute('aria-pressed', String(selected === position));
    if (focus && selected === position) { button.focus(); button.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); }
  });
  const content = selections[selected];
  document.querySelector('#selection-title').textContent = content.title;
  document.querySelector('.selection-copy .program-status').textContent = content.status;
  document.querySelector('#selection-description').innerHTML = content.description.replaceAll('<br>', '<br> ');
  document.querySelector('.signal-commands').innerHTML = content.commands.map(([id, label], position) => `<button type="button" data-program="${id}" class="signal-command ${position === 0 ? 'selected-command' : ''}">${icon(position === 0 ? 'Play' : 'ChevronRight', 18)}<span>${label}</span></button>`).join('');
  stage?.label(programs[selected].short);
  animate(document.querySelector('.selection-copy'), [{ transform: 'translateY(12px)', opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 400 });
}
crossbar.addEventListener('click', event => { const target = event.target.closest('[data-index]'); if (target) { select(Number(target.dataset.index)); tone(); } });
crossbar.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); select(selected + (event.key === 'ArrowRight' ? 1 : -1), true); tone(); }
  if (event.key === 'ArrowDown') { event.preventDefault(); document.querySelector('.signal-command').focus(); }
});
document.querySelector('.signal-commands').addEventListener('click', event => { const target = event.target.closest('[data-program]'); if (target) { target.focus({ preventScroll: true }); openProgram(target.dataset.program); } });
document.querySelector('.signal-commands').addEventListener('keydown', event => {
  const buttons = [...document.querySelectorAll('.signal-command')];
  const index = buttons.indexOf(document.activeElement);
  if (event.key === 'ArrowDown') { event.preventDefault(); buttons[(index + 1) % buttons.length].focus(); }
  if (event.key === 'ArrowUp') { event.preventDefault(); if (index === 0) crossbar.querySelector('[aria-pressed=true]').focus(); else buttons[index - 1].focus(); }
});
const colours = ['#784ac3', '#b8d4c4', '#ef916a', '#e8e5da'];
document.querySelector('.signal-colours').innerHTML = colours.map((colour, index) => `<button type="button" style="--swatch:${colour}" aria-label="${['Purple', 'Mint', 'Coral', 'Porcelain'][index]} shell" title="${['Purple', 'Mint', 'Coral', 'Porcelain'][index]} shell" aria-pressed="${index === 0}" data-colour="${colour}"></button>`).join('');
document.querySelector('.signal-colours').addEventListener('click', event => {
  const target = event.target.closest('[data-colour]');
  if (!target) return;
  stage?.colour(target.dataset.colour);
  document.querySelectorAll('[data-colour]').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
  tone();
});
document.querySelector('.orbit-button').innerHTML = icon('RotateCcw', 20);
document.querySelector('.orbit-button').onclick = () => stage?.rotate(Math.PI * 2);
setup('signal', async () => {
  if (!stage) {
    try {
      const { createModelStage } = await import('../stage.js');
      stage = await createModelStage(document.querySelector('#stage'), 'signal');
      document.querySelector('#stage-fallback').hidden = true;
    } catch { document.querySelector('#stage').hidden = true; }
  }
  select(0);
  stage?.intro();
}, () => stage?.reset());
select(0);