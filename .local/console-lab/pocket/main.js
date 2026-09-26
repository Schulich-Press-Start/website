import { setup, programs, data, icon, tone, openProgram } from '../common.js';

const canvas = document.querySelector('#stage');
const programList = document.querySelector('.pocket-programs');
const status = document.querySelector('#screen-status');
const detail = document.querySelector('#screen-detail');
const confirm = document.querySelector('[data-pocket-action="confirm"]');
const frameButton = document.querySelector('[data-pocket-action="frame"]');
const assets = new Map();
const portraits = ['#b9dce0', '#f0c7b1', '#c8dbbe', '#eab7c6', '#cbd0e8'];
let stage;
let selected = 0;
let view = 'home';
let person = 0;
let division = 0;
let focused = false;
let inspecting = false;

const wrap = (value, count) => (value % count + count) % count;
const memberRole = member => {
  const membership = data.memberships.find(item => item.memberId === member.id);
  const team = data.divisions.find(item => item.id === membership.divisionId);
  return membership.role === 'president' ? 'President / Co-Founder' : `${team.name} Lead${member.coFounder ? ' / Co-Founder' : ''}`;
};

programList.innerHTML = programs.map((program, index) => `<button type="button" data-pocket-program="${index}" aria-pressed="${index === 0}" ${index === 0 ? 'data-initial-focus' : ''}>${icon(program.icon, 22)}<span>${program.short}</span></button>`).join('');
const actionIcons = { home: 'Grid2X2', previous: 'ArrowLeft', next: 'ArrowRight', frame: 'Maximize', rotate: 'RotateCcw', scan: 'Box' };
for (const [action, glyph] of Object.entries(actionIcons)) document.querySelector(`[data-pocket-action="${action}"]`).innerHTML = icon(glyph);

async function loadImage(key, url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  assets.set(key, image);
}

async function prepareScreen() {
  await document.fonts.load('600 24px Commissioner');
  const images = [loadImage('logo', '/media/logo-dark.png'), loadImage('handheld', '/media/handheld.webp'), ...data.members.map(member => loadImage(member.id, `/media/${member.id}.png`))];
  for (const program of programs) {
    for (const colour of ['#29434a', '#ffffff']) {
      const svg = new DOMParser().parseFromString(icon(program.icon, 48), 'image/svg+xml');
      svg.documentElement.setAttribute('stroke', colour);
      images.push(loadImage(`${program.id}${colour}`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`));
    }
  }
  await Promise.all(images);
}

function text(context, value, horizontal, vertical, width, size = 24, colour = '#29434a', weight = 550) {
  context.fillStyle = colour;
  context.font = `${weight} ${size}px Commissioner, sans-serif`;
  context.textAlign = 'left';
  const lines = [];
  let line = '';
  for (const word of value.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > width) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  lines.forEach((content, index) => context.fillText(content, horizontal, vertical + index * size * 1.3, width));
  return vertical + lines.length * size * 1.3;
}

function imageContained(context, image, horizontal, vertical, width, height) {
  if (!image) return;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  context.drawImage(image, horizontal + (width - imageWidth) / 2, vertical + (height - imageHeight) / 2, imageWidth, imageHeight);
}

function paint(context) {
  context.fillStyle = '#dcece7';
  context.fillRect(0, 0, 512, 400);
  imageContained(context, assets.get('logo'), 20, 13, 98, 28);
  text(context, view === 'home' ? 'Home' : programs[selected].short, 338, 33, 156, 19);
  context.fillStyle = '#29434a28';
  context.fillRect(20, 51, 472, 1);

  if (view === 'home') {
    programs.forEach((program, index) => {
      const horizontal = 20 + index % 2 * 244;
      const vertical = 66 + Math.floor(index / 2) * 98;
      const active = selected === index;
      context.fillStyle = active ? '#29434a' : '#eff6f0';
      context.fillRect(horizontal, vertical, 228, 86);
      imageContained(context, assets.get(`${program.id}${active ? '#ffffff' : '#29434a'}`), horizontal + 16, vertical + 13, 26, 26);
      text(context, program.short, horizontal + 16, vertical + 68, 188, 23, active ? '#ffffff' : '#29434a');
      if (active) { context.fillStyle = '#f18d83'; context.fillRect(horizontal + 196, vertical + 16, 12, 12); }
    });
    text(context, `${String(selected + 1).padStart(2, '0')} / 06`, 23, 385, 150, 15);
    text(context, 'Schulich Press Start', 324, 385, 168, 15);
  } else if (view === 'crew') {
    const member = data.members[person];
    context.fillStyle = portraits[person];
    context.fillRect(24, 72, 166, 166);
    imageContained(context, assets.get(member.id), 24, 72, 166, 166);
    text(context, memberRole(member), 215, 111, 269, 23);
    text(context, member.name, 24, 290, 464, 30, '#29434a', 650);
    text(context, `${person + 1} / ${data.members.length}`, 24, 376, 120, 18);
    text(context, 'Full profile', 359, 376, 133, 18);
  } else if (view === 'work') {
    const team = data.divisions[division];
    const end = text(context, team.name, 24, 102, 454, 29, '#29434a', 650);
    text(context, team.description, 24, end + 26, 454, 22, '#3c585d', 450);
    text(context, `${division + 1} / ${data.divisions.length}`, 24, 376, 120, 18);
    text(context, 'Division details', 334, 376, 158, 18);
  } else if (view === 'handheld') {
    imageContained(context, assets.get('handheld'), 22, 70, 155, 270);
    text(context, 'Two working prototypes.', 201, 106, 279, 29, '#29434a', 650);
    text(context, 'A Game Boy-inspired handheld is next.', 201, 225, 279, 22, '#3c585d', 450);
    text(context, 'Explore the model', 302, 376, 190, 18);
  } else if (view === 'journal') {
    text(context, 'Next on the workbench', 24, 94, 464, 29, '#29434a', 650);
    text(context, 'A completed handheld by June is the goal.', 24, 159, 464, 24);
    text(context, 'Student-designed chips with Schulich on a Chip: a future 2027-2028 iteration.', 24, 250, 464, 21, '#3c585d', 450);
    text(context, 'No published build logs yet.', 24, 376, 464, 18);
  } else if (view === 'join') {
    text(context, 'Your turn.', 24, 121, 464, 51, '#29434a', 650);
    text(context, 'Six divisions. One handheld.', 24, 191, 464, 25);
    text(context, 'Electronics, firmware, enclosures, games, business and communications.', 24, 247, 464, 22, '#3c585d', 450);
    context.fillStyle = '#b53045';
    context.fillRect(24, 337, 464, 42);
    text(context, 'Apply to SPS', 181, 365, 288, 22, '#ffffff');
  } else if (view === 'arcade') {
    text(context, programs[selected].title, 24, 102, 464, 37, '#29434a', 650);
    for (let brick = 0; brick < 12; brick++) {
      context.fillStyle = ['#669d96', '#b53045', '#b8ab69'][Math.floor(brick / 4)];
      context.fillRect(26 + brick % 4 * 119, 140 + Math.floor(brick / 4) * 31, 105, 22);
    }
    context.fillStyle = '#29434a';
    context.fillRect(199, 295, 110, 9);
    context.beginPath(); context.arc(292, 267, 8, 0, Math.PI * 2); context.fill();
    text(context, 'Browser demo, not an SPS release', 24, 376, 464, 18);
  }
  context.fillStyle = '#29434a05';
  for (let row = 0; row < 400; row += 4) context.fillRect(0, row, 512, 1);
}

function update() {
  const program = programs[selected];
  const title = view === 'crew' ? data.members[person].name : view === 'work' ? data.divisions[division].name : `${program.short}${view === 'home' ? ' selected' : ''}`;
  const descriptions = { home: program.description, crew: memberRole(data.members[person]), work: data.divisions[division].description, handheld: 'Two working prototypes. A Game Boy-inspired handheld is next.', journal: 'A June completion goal. No published build logs.', join: 'Recruiting across six divisions.', arcade: 'Browser demo, not an SPS release.' };
  status.textContent = title;
  detail.textContent = descriptions[view];
  const command = view === 'home' ? 'Open' : view === 'crew' ? 'Full profile' : view === 'join' ? 'Join SPS' : view === 'arcade' ? 'Play' : 'Details';
  confirm.innerHTML = `${icon(view === 'home' || view === 'arcade' ? 'Play' : 'ArrowUpRight', 18)}<span>${command}</span>`;
  confirm.setAttribute('aria-label', `${command}: ${view === 'crew' ? title : program.short}`);
  confirm.title = confirm.getAttribute('aria-label');
  programList.querySelectorAll('button').forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
  canvas.dataset.view = view;
  canvas.dataset.selection = String(selected);
  canvas.dataset.person = String(person);
  canvas.setAttribute('aria-label', `SPS handheld controls. ${title}.`);
  stage?.screen(paint);
}

function focusScreen(enabled) {
  if (enabled && inspecting) inspection(false);
  focused = Boolean(enabled);
  frameButton.setAttribute('aria-pressed', String(focused));
  frameButton.setAttribute('aria-label', focused ? 'Show the full handheld' : 'Focus on the screen');
  frameButton.title = frameButton.getAttribute('aria-label');
  frameButton.innerHTML = icon(focused ? 'Gamepad2' : 'Maximize');
  return stage?.focusScreen(focused);
}

function inspection(enabled) {
  inspecting = Boolean(enabled);
  const control = document.querySelector('[data-pocket-action="scan"]');
  control.setAttribute('aria-pressed', String(inspecting));
  control.setAttribute('aria-label', inspecting ? 'Show colour concept' : 'Show CAD surface');
  control.title = control.getAttribute('aria-label');
  document.querySelector('.pocket-footer p').textContent = inspecting ? 'Supplied CAD surfaces. No internal assembly.' : 'Colour and website concept. Illustrative screen.';
  stage?.inspection(inspecting);
}

function home() { view = 'home'; inspection(false); focusScreen(false); update(); }

function move(direction) {
  if (view === 'crew') person = wrap(person + direction, data.members.length);
  else if (view === 'work') division = wrap(division + direction, data.divisions.length);
  else { selected = wrap(selected + direction, programs.length); if (view !== 'home') view = programs[selected].id; }
  update(); tone();
}

async function activate() {
  if (view === 'home') { view = programs[selected].id; focusScreen(true); update(); tone('open'); return; }
  const program = view;
  await openProgram(program);
  if (program === 'crew') document.querySelector(`#panel [data-person="${person}"]`)?.click();
  if (program === 'work') {
    const disclosure = document.querySelectorAll('.division-list details')[division];
    if (disclosure) disclosure.open = true;
  }
}

function input(action) {
  if (document.querySelector('#panel').open) return;
  canvas.dataset.lastInput = action;
  if (action === 'previous' || action === 'left') move(-1);
  if (action === 'next' || action === 'right') move(1);
  if (action === 'up' || action === 'down') move((action === 'up' ? -1 : 1) * (view === 'home' ? 2 : 1));
  if (action === 'home' || action === 'back') { home(); tone('close'); }
  if (action === 'confirm') activate();
}

function onSurface(hit) {
  if (hit.material === 'sps-screen-concept') {
    if (view !== 'home') { activate(); return; }
    const horizontal = hit.uv.x * 512 - 20;
    const vertical = (1 - hit.uv.y) * 400 - 66;
    const column = Math.floor(horizontal / 244);
    const row = Math.floor(vertical / 98);
    if (column < 0 || column > 1 || row < 0 || row > 2 || horizontal % 244 > 228 || vertical % 98 > 86) return;
    selected = row * 2 + column;
    canvas.dataset.lastInput = 'screen';
    activate();
  } else if (hit.material === 'sps-pill-buttons') input(hit.point.y < 0 ? 'home' : 'confirm');
  else if (hit.material === 'glossyrubber') {
    if (hit.point.y < 0) {
      const horizontal = hit.point.y + 0.0245;
      const vertical = hit.point.z + 0.0145;
      input(Math.max(Math.abs(horizontal), Math.abs(vertical)) < 0.002 ? 'confirm' : Math.abs(horizontal) > Math.abs(vertical) ? (horizontal > 0 ? 'right' : 'left') : (vertical > 0 ? 'up' : 'down'));
    } else {
      const horizontal = hit.point.y - 0.022873097;
      const vertical = hit.point.z + 0.016851156;
      input(Math.abs(horizontal) > Math.abs(vertical) ? (horizontal > 0 ? 'confirm' : 'previous') : (vertical > 0 ? 'next' : 'back'));
    }
  }
}

programList.addEventListener('click', event => {
  const control = event.target.closest('[data-pocket-program]');
  if (!control) return;
  control.focus({ preventScroll: true });
  selected = Number(control.dataset.pocketProgram);
  view = programs[selected].id;
  focusScreen(true); update(); tone();
});

document.querySelector('.pocket-dock').addEventListener('click', event => {
  const control = event.target.closest('[data-pocket-action]');
  if (control) { control.focus({ preventScroll: true }); input(control.dataset.pocketAction); }
});

document.querySelector('.pocket-finishes').addEventListener('click', event => {
  const control = event.target.closest('[data-colour]');
  if (!control) return;
  stage?.colour(control.dataset.colour);
  document.querySelectorAll('[data-colour]').forEach(button => button.setAttribute('aria-pressed', String(button === control)));
  tone();
});

frameButton.addEventListener('click', () => focusScreen(!focused));
document.querySelector('[data-pocket-action="scan"]').addEventListener('click', () => inspection(!inspecting));
document.querySelector('[data-pocket-action="rotate"]').addEventListener('click', async () => { if (await focusScreen(false) !== false) stage?.rotate(Math.PI * 2); });
window.addEventListener('pagehide', () => stage?.dispose(), { once: true });

setup('pocket', async () => {
  if (!stage) {
    await prepareScreen();
    try {
      const { createModelStage } = await import('../stage.js');
      stage = await createModelStage(canvas, 'pocket', {
        onSurface,
        onKey: key => {
          const action = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'confirm', ' ': 'confirm', Escape: 'home', Backspace: 'back' }[key];
          if (action) input(action);
          return Boolean(action);
        },
      });
      document.querySelector('#stage-fallback').hidden = true;
    } catch { canvas.hidden = true; }
  }
  home();
}, () => { stage?.reset(); selected = 0; person = 0; division = 0; home(); });

document.querySelector('#boot h1').textContent = 'Schulich Press Start';
document.querySelector('.boot-brand').textContent = 'Pocket OS';
const poster = new Image();
poster.src = '/media/handheld.webp';
poster.className = 'pocket-boot-model';
poster.alt = '';
document.querySelector('.boot-art').replaceChildren(poster);
update();