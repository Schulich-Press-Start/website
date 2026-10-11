import { createElement, Power, Volume2, VolumeX, Settings2, ArrowLeft, ArrowRight, ArrowUpRight, X, Users, Gamepad2, CircuitBoard, Box, BookOpen, Send, Maximize, RotateCcw, Play, Pause, Grid2X2, Check, Mail, SlidersHorizontal, Monitor, ChevronRight, Pipette, Sparkles, Plus, Layers } from 'lucide';
import { createSoundscape } from './audio.js';

const glyphs = { Power, Volume2, VolumeX, Settings2, ArrowLeft, ArrowRight, ArrowUpRight, X, Users, Gamepad2, CircuitBoard, Box, BookOpen, Send, Maximize, RotateCcw, Play, Pause, Grid2X2, Check, Mail, SlidersHorizontal, Monitor, ChevronRight, Pipette, Sparkles, Plus, Layers };
export const media = '/media/';
export const siteMode = import.meta.env.VITE_SPS_SITE === 'true';
export const currentSite = import.meta.env.VITE_SPS_CLASSIC_URL ?? 'http://127.0.0.1:4322';
export const data = await fetch('/club.json').then(response => {
  if (!response.ok) throw new Error('Club data is unavailable.');
  return response.json();
});
const countWords = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
export const countWord = count => countWords[count] ?? String(count);
export const concepts = [{ id: 'signal', title: 'Signal' }, { id: 'playroom', title: 'Playroom' }, { id: 'cartridge', title: 'Cartridge Club' }, { id: 'pocket', title: 'Pocket OS' }];
export const programs = [
  { id: 'handheld', title: 'The handheld', short: 'Hardware', icon: 'Gamepad2', colour: '#784ac3', description: 'Explore the handheld we are building.' },
  { id: 'crew', title: 'The team', short: 'Crew', icon: 'Users', colour: '#d99d73', description: 'Meet the SPS team.' },
  { id: 'work', title: 'Our divisions', short: 'Divisions', icon: 'CircuitBoard', colour: '#5a9f8a', description: `${countWord(data.divisions.length)} divisions working on one handheld.` },
  { id: 'arcade', title: 'Brick Break', short: 'Arcade', icon: 'Sparkles', colour: '#d66875', description: 'Take a break with a quick game.' },
  { id: 'journal', title: 'Project updates', short: 'Journal', icon: 'BookOpen', colour: '#5886a8', description: 'See what we are working on next.' },
  // the public website isn't recruiting, so the join program only exists in the prototype comparison builds
  ...(siteMode ? [] : [{ id: 'join', title: 'Join the team', short: 'Join', icon: 'Send', colour: '#efb844', description: 'Find your place on the team.' }]),
];

export function icon(name, size = 20) {
  return createElement(glyphs[name] ?? glyphs.Box, { width: size, height: size, 'stroke-width': 1.6, 'aria-hidden': 'true' }).outerHTML;
}
export function button(name, action, title, extra = '') {
  return `<button type="button" class="icon-button" data-action="${action}" aria-label="${title}" title="${title}" ${extra}>${icon(name)}</button>`;
}
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
export const preferences = { sound: true, motion: !preference.matches, volume: 0.15 };
let soundscape;
export function tone(kind = 'select') {
  if (preferences.sound) soundscape?.cue(kind);
}
export function audioStatus() { return soundscape?.snapshot(); }

export function animate(element, keyframes, options = {}) {
  if (!preferences.motion) return Promise.resolve();
  return element.animate(keyframes, { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', ...options }).finished.catch(() => {});
}

let panelCleanup;
let returnFocus;
let settingsOpen = false;
let activeTheme;
let booted = false;
let startup;
let resetTheme;

export function setup(theme, start, reset = () => {}) {
  activeTheme = theme;
  startup = start;
  resetTheme = reset;
  soundscape = createSoundscape(theme, state => { document.body.dataset.audioState = state; });
  document.body.dataset.audioState = 'waiting';
  document.body.dataset.theme = theme;
  document.body.dataset.motion = String(preferences.motion);
  document.querySelector('#system-tools').innerHTML = `
    ${siteMode ? '' : `<a class="icon-button lab-link" href="/" aria-label="All prototypes" title="All prototypes">${icon('Grid2X2')}</a>`}
    <button class="icon-button" data-action="sound" aria-label="Mute sound" title="Mute sound" aria-pressed="true">${icon('Volume2')}</button>
    ${button('Settings2', 'settings', 'System settings')}
    ${button('Power', 'reboot', 'Return to boot screen')}`;
  document.querySelector('#boot').innerHTML = `
    <div class="boot-top">${siteMode ? '<span>Student design club</span>' : `<a href="/">${icon('ArrowLeft', 18)} Console lab</a>`}<span>${concepts.find(item => item.id === theme).title}</span></div>
    <div class="boot-art" aria-hidden="true"><div class="boot-disc"><img src="/media/signature.png" alt="" /></div>${theme === 'cartridge' ? '' : '<div class="boot-stripe"></div>'}</div>
    <div class="boot-copy"><p class="boot-brand">Schulich Press Start</p><h1>${theme === 'signal' ? 'Something<br> starts here.' : theme === 'playroom' ? 'Good to<br> see you.' : 'Make room<br> for play.'}</h1>
      <div class="boot-progress" hidden><progress max="100" value="0" aria-label="Preparing console"></progress><span role="status">Loading artwork</span></div>
      <button class="boot-start" type="button" data-action="boot">${icon('Power', 22)}<span>Press start</span></button>
    </div>
    <div class="boot-bottom"><span>University of Calgary</span><label class="sound-choice"><input type="checkbox" data-boot-sound checked /> Sound</label>${siteMode ? `<a href="${data.site.instagramUrl}" target="_blank" rel="noopener noreferrer">Instagram ${icon('ArrowUpRight', 15)}</a>` : `<a href="${currentSite}">Original website ${icon('ArrowUpRight', 15)}</a>`}</div>`;
  document.querySelector('#boot').hidden = false;
  document.querySelector('#shell').inert = true;
  document.addEventListener('click', onAction);
  document.querySelector('[data-boot-sound]').addEventListener('change', event => { setSound(event.target.checked); });
  document.querySelector('#panel').addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
  document.querySelector('#panel').addEventListener('click', event => { if (event.target === event.currentTarget) closePanel(); });
  const motionChange = () => { preferences.motion = !preference.matches; applyPreferences(); };
  preference.addEventListener('change', motionChange);
  window.addEventListener('pagehide', () => soundscape.dispose(), { once: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('#panel').open && booted) document.querySelector('[data-action="settings"]')?.focus();
  });
  const clock = () => {
    const now = new Date();
    document.querySelectorAll('[data-clock]').forEach(element => { element.textContent = now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }); });
    document.querySelectorAll('[data-date]').forEach(element => { element.textContent = now.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }); });
  };
  clock();
  setInterval(clock, 30000);
  document.querySelector('.boot-start').focus({ preventScroll: true });
}

async function onAction(event) {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action === 'boot') await boot();
  if (action === 'sound') setSound(!preferences.sound);
  if (action === 'settings') { control.focus({ preventScroll: true }); openSettings(); }
  if (action === 'close') closePanel();
  if (action === 'reboot') {
    closePanel();
    soundscape.pause();
    booted = false;
    resetTheme();
    document.body.dataset.booted = 'false';
    document.querySelector('#boot').hidden = false;
    document.querySelector('#shell').inert = true;
    document.querySelector('.boot-progress').hidden = true;
    document.querySelector('.boot-start').hidden = false;
    document.querySelector('.boot-start').disabled = false;
    document.querySelector('.boot-start').focus();
  }
  if (action === 'fullscreen') {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { control.title = 'Fullscreen is unavailable in this browser'; }
  }
  if (control.dataset.program) openProgram(control.dataset.program);
}

async function boot() {
  const start = document.querySelector('.boot-start');
  if (start.disabled) return;
  start.disabled = true;
  await soundscape.start();
  tone('boot');
  const progress = document.querySelector('.boot-progress');
  progress.hidden = false;
  const urls = [...(activeTheme === 'cartridge' ? ['/media/handheld-concept-front.webp'] : ['/media/handheld.webp']), '/media/logo-white.png', '/media/logo-dark.png', ...data.members.map(member => `/media/${member.id}.png`)];
  let completed = 0;
  const update = label => {
    progress.querySelector('progress').value = Math.round(completed / (urls.length + 1) * 100);
    progress.querySelector('span').textContent = label;
  };
  try {
    await Promise.all(urls.map(url => new Promise(resolve => {
      const image = new Image();
      image.onload = image.onerror = () => { completed++; update('Artwork loaded'); resolve(); };
      image.src = url;
    })));
    update('Starting system');
    await startup();
    completed++;
    update('Ready');
    document.querySelector('#shell').inert = false;
    document.body.dataset.booted = 'true';
    await animate(document.querySelector('#boot'), [{ opacity: 1, clipPath: 'inset(0)' }, { opacity: 0, clipPath: activeTheme === 'cartridge' ? 'inset(50% 0)' : 'inset(0)' }], { duration: 800 });
    document.querySelector('#boot').hidden = true;
    booted = true;
    document.querySelector('[data-initial-focus]')?.focus({ preventScroll: true });
  } catch (error) {
    progress.querySelector('span').textContent = siteMode ? 'Unable to start. Refresh the page to try again.' : 'Unable to start. Try again, or open the original website.';
    start.disabled = false;
    console.error(error);
  }
}

function setSound(enabled) {
  preferences.sound = enabled;
  const control = document.querySelector('[data-action="sound"]');
  control.innerHTML = icon(enabled ? 'Volume2' : 'VolumeX');
  control.setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
  control.setAttribute('aria-pressed', String(enabled));
  control.title = enabled ? 'Mute sound' : 'Enable sound';
  document.querySelector('[data-boot-sound]').checked = enabled;
  soundscape.setEnabled(enabled).then(() => { if (enabled) tone('open'); });
}

function applyPreferences() {
  document.body.dataset.motion = String(preferences.motion);
  if (!preferences.motion) document.getAnimations().forEach(animation => animation.finish());
  window.dispatchEvent(new CustomEvent('lab-preferences', { detail: preferences }));
}

function showPanel(title, subtitle, body, className = '') {
  const dialog = document.querySelector('#panel');
  returnFocus = document.activeElement;
  panelCleanup?.();
  panelCleanup = undefined;
  dialog.className = `system-panel ${className}`;
  dialog.innerHTML = `<div class="panel-window"><header class="panel-header"><div><span>${subtitle}</span><h2 id="panel-title">${title}</h2></div>${button('X', 'close', 'Close program')}</header><div class="panel-body">${body}</div></div>`;
  if (!dialog.open) dialog.showModal();
  dialog.setAttribute('aria-labelledby', 'panel-title');
  tone('open');
  animate(dialog.querySelector('.panel-window'), [{ opacity: 0, transform: 'translateY(24px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 380 });
  dialog.querySelector('[data-action="close"]').focus();
  return dialog;
}

export function closePanel() {
  const dialog = document.querySelector('#panel');
  if (!dialog.open) return;
  panelCleanup?.();
  panelCleanup = undefined;
  settingsOpen = false;
  dialog.close();
  tone('close');
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  window.dispatchEvent(new Event('lab-panel-close'));
}

function openSettings() {
  settingsOpen = true;
  const dialog = showPanel('System settings', concepts.find(item => item.id === activeTheme).title, `
    <div class="settings-list"><label><span>Interface sound</span><input type="checkbox" data-setting="sound" ${preferences.sound ? 'checked' : ''} /></label>
    <label><span>Sound level</span><input aria-label="Sound level" type="range" min="0" max="30" value="${Math.round(preferences.volume * 100)}" data-setting="volume" /></label>
    <label><span>Animation</span><input type="checkbox" data-setting="motion" ${preferences.motion ? 'checked' : ''} /></label>
    <button type="button" class="command" data-action="fullscreen">${icon('Maximize')} Fullscreen</button></div>
    ${siteMode ? `<nav class="concept-switch" aria-label="Find SPS">${socialLinks().map(link => `<a href="${link.href}" ${link.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>${link.label}${icon('ArrowUpRight', 18)}</a>`).join('')}</nav>` : `<nav class="concept-switch" aria-label="Switch prototype">${concepts.map(item => `<a href="/${item.id}/" ${activeTheme === item.id ? 'aria-current="page"' : ''}>${item.title}${icon('ArrowRight', 18)}</a>`).join('')}</nav>
    <a class="panel-link" href="${currentSite}">Original SPS website ${icon('ArrowUpRight', 18)}</a>`}`, 'settings-panel');
  dialog.querySelector('[data-setting="sound"]').addEventListener('change', event => setSound(event.target.checked));
  dialog.querySelector('[data-setting="volume"]').addEventListener('input', event => { preferences.volume = Number(event.target.value) / 100; soundscape.setVolume(preferences.volume); });
  dialog.querySelector('[data-setting="motion"]').addEventListener('change', event => { preferences.motion = event.target.checked; applyPreferences(); });
}

function socialLinks() {
  return [
    data.site.instagramUrl && { label: 'Instagram @sps_ucalgary', href: data.site.instagramUrl, external: true },
    data.site.linkedinUrl && { label: 'LinkedIn', href: data.site.linkedinUrl, external: true },
    data.site.publicContact?.email && { label: data.site.publicContact.email, href: `mailto:${data.site.publicContact.email}` },
  ].filter(Boolean);
}

// shared cartridge pieces, the grip ridges and the embossed start arrow from the logo
const cartridgeGrip = '<span class="team-cart-grip" aria-hidden="true"></span>';
const cartridgeMark = '<span class="team-cart-mark" aria-hidden="true"><svg viewBox="0 0 10 10" width="8" height="8"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg>SPS</span>';

// official team colours (see the sps team colours rule), ink is the text colour that stays readable on top
// colours and codes are presentation only, team facts come from club.json
const teamLooks = {
  'embedded-hardware': { colour: '#30c758', ink: '#17171b', code: 'SPS-01', icon: 'CircuitBoard' },
  'embedded-software': { colour: '#2289e3', ink: '#ffffff', code: 'SPS-02', icon: 'SlidersHorizontal' },
  'game-design': { colour: '#e3410b', ink: '#ffffff', code: 'SPS-03', icon: 'Gamepad2' },
  mechanical: { colour: '#e8204c', ink: '#ffffff', code: 'SPS-04', icon: 'Box' },
  business: { colour: '#f7f016', ink: '#17171b', code: 'SPS-05', icon: 'BookOpen' },
  communications: { colour: '#c716f7', ink: '#ffffff', code: 'SPS-06', icon: 'Send' },
};

function teamLead(divisionId) {
  const membership = data.memberships.find(item => item.divisionId === divisionId && item.role === 'lead');
  return membership && data.members.find(member => member.id === membership.memberId);
}

function openTeams() {
  const president = data.members.find(member => member.id === data.memberships.find(item => item.role === 'president')?.memberId);
  const rack = data.divisions.map((division, index) => {
    const look = teamLooks[division.id] ?? { colour: '#784ac3', ink: '#ffffff', code: `SPS-0${index + 1}`, icon: 'Box' };
    const lead = teamLead(division.id);
    return `<button type="button" class="team-cart" data-team="${index}" aria-pressed="${index === 0}" style="--cart:${look.colour};--cart-ink:${look.ink}"><span class="team-cart-body">${cartridgeGrip}<span class="team-cart-label"><span class="team-cart-band" aria-hidden="true">${icon(look.icon, 16)}<span>${look.code}</span></span><strong>${escapeHtml(division.name)}</strong><span class="team-cart-meta">${lead ? `Lead: ${escapeHtml(lead.name.split(' ')[0])}` : siteMode ? '' : 'Recruiting'}</span></span>${cartridgeMark}<span class="team-cart-pins" aria-hidden="true"></span></span></button>`;
  }).join('');
  const handheld = `<div class="team-console" aria-hidden="true"><span class="team-console-cart"><span></span></span><img src="/media/handheld-concept-front.webp" alt="" width="300" height="440" /><span class="team-console-screen"><span data-console-code></span><strong data-console-name></strong></span></div>`;
  const plan = (data.yearPlan ?? []).map(item => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></li>`).join('');
  const dialog = showPanel('Meet the teams.', 'SPS / Teams', `
    <p class="teams-intro">${countWord(data.divisions.length)} teams, one handheld. Pick a cartridge to see what each team works on.</p>
    <div class="team-rack" role="group" aria-label="Teams" style="--rack-columns:${data.divisions.length};--rack-columns-tablet:${data.divisions.length <= 4 ? data.divisions.length : 3}">${rack}</div>
    <section class="team-detail" aria-label="Selected team">${handheld}<div class="team-detail-body" aria-live="polite"></div></section>
    <div class="team-footer">
      ${president ? `<div class="team-president"><img src="/media/${president.id}.png" alt="" width="64" height="64" /><div><span>President${president.coFounder ? ' / Co-Founder' : ''}</span><strong>${escapeHtml(president.name)}</strong></div><a class="icon-button" href="${president.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(president.name)} on LinkedIn" title="LinkedIn">${icon('ArrowUpRight', 18)}</a></div>` : ''}
      ${plan ? `<div class="team-plan"><h3>This year</h3><ol>${plan}</ol></div>` : ''}
    </div>`, 'teams-panel');
  const detail = dialog.querySelector('.team-detail');
  const detailBody = detail.querySelector('.team-detail-body');
  const select = (index, fromUser = false) => {
    const division = data.divisions[index];
    const look = teamLooks[division.id] ?? { colour: '#784ac3', ink: '#ffffff', code: `SPS-0${index + 1}` };
    const lead = teamLead(division.id);
    dialog.querySelectorAll('[data-team]').forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.team) === index)));
    detail.style.setProperty('--cart', look.colour);
    detail.style.setProperty('--cart-ink', look.ink);
    detail.dataset.division = division.id;
    detail.querySelector('[data-console-code]').textContent = look.code;
    detail.querySelector('[data-console-name]').textContent = division.name;
    // slide the picked cartridge into the handheld, skipped when animation is off
    animate(detail.querySelector('.team-console-cart'), [{ transform: 'translateY(-46%)' }, { transform: 'translateY(-46%)', offset: 0.15 }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.3,.7,.3,1)' });
    animate(detail.querySelector('.team-console-screen'), [{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: 700 });
    detailBody.innerHTML = `<div class="team-detail-copy"><span>${look.code} / Team</span><h3>${escapeHtml(division.name)}</h3><p>${escapeHtml(division.description)}</p><h4>What we work on</h4><ul>${division.work.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
      <div class="team-lead">${lead
        ? `<img src="/media/${lead.id}.png" alt="" width="96" height="96" /><span>Team lead${lead.coFounder ? ' / Co-Founder' : ''}</span><strong>${escapeHtml(lead.name)}</strong><a class="command" href="${lead.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn ${icon('ArrowUpRight', 18)}</a>`
        : siteMode ? '' : `<span class="program-status">Recruiting now</span><strong>Lead to be announced</strong><p>We are looking for ${escapeHtml(division.name)} members this year.</p>${data.site.applicationUrl ? `<a class="command primary" href="${data.site.applicationUrl}" target="_blank" rel="noopener noreferrer">Apply to SPS ${icon('ArrowUpRight', 18)}</a>` : ''}`}</div>`;
    if (fromUser && innerWidth <= 900) detail.scrollIntoView({ block: 'nearest', behavior: preferences.motion ? 'smooth' : 'instant' });
  };
  const rackElement = dialog.querySelector('.team-rack');
  rackElement.addEventListener('click', event => {
    const control = event.target.closest('[data-team]');
    if (!control) return;
    select(Number(control.dataset.team), true);
    tone();
  });
  rackElement.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !event.target.matches('[data-team]')) return;
    const controls = [...rackElement.querySelectorAll('[data-team]')];
    const next = controls[(controls.indexOf(event.target) + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + controls.length) % controls.length];
    next.focus();
    event.preventDefault();
  });
  select(0);
}

// inside the handheld: what each layer is and which team builds it, the ownership comes from the kickoff slide
const insideLayers = [
  { id: 'front', name: 'Front shell', teams: ['mechanical'], detail: 'Smoky acrylic front with the screen window, the button holes and the screw posts.' },
  { id: 'buttons', name: 'Buttons', teams: ['mechanical'], detail: 'D-pad, ABXY, start and select, and every cap presses its own tactile switch.' },
  { id: 'screen', name: 'Screen', teams: ['embedded-hardware', 'embedded-software', 'game-design'], detail: 'The display module, with a flex cable that clips into a connector on the board.' },
  { id: 'board', name: 'Circuit board', teams: ['embedded-hardware', 'embedded-software', 'game-design'], detail: 'An STM32H743 at the centre, with audio, a headphone jack, microSD and Bluetooth around it.' },
  { id: 'battery', name: 'Battery', teams: ['embedded-hardware'], detail: 'A 1600 mAh LiPo pouch with its own protection circuit, plugged into the board.' },
  { id: 'back', name: 'Back shell', teams: ['mechanical'], detail: 'A clear back cover that screws into the posts and keeps everything sealed in.' },
];
const teamShort = { 'embedded-hardware': 'Hardware', 'embedded-software': 'Software', 'game-design': 'Game Design', mechanical: 'Mechanical' };
const teamChips = teams => `<span class="team-chips">${teams.map(id => `<span class="team-chip" style="--chip:${teamLooks[id].colour}">${teamShort[id]}</span>`).join('')}</span>`;

async function openInside() {
  const prompt = 'Pick a layer to see what it does and which team builds it.';
  const dialog = showPanel('Inside the handheld.', 'SPS / Inside', `
    <div class="inside-layout">
      <div class="inside-scene"><canvas aria-label="Exploded view of the SPS handheld. Drag to turn it, or pick a layer from the list." tabindex="0"></canvas><img class="model-fallback" src="/media/handheld-concept.webp" alt="SPS handheld concept render" /><div class="inside-tag" aria-hidden="true" hidden></div></div>
      <div class="inside-side">
        <button type="button" class="command inside-explode" data-action="inside-explode" aria-pressed="true">${icon('Layers', 18)}<span>Exploded view</span></button>
        <ol class="inside-layers" aria-label="Layers, front to back">${insideLayers.map((layer, index) => `<li><button type="button" data-layer="${layer.id}" aria-pressed="false" aria-describedby="inside-detail"><span class="inside-layer-index" aria-hidden="true">0${index + 1}</span><span class="inside-layer-name">${layer.name}</span>${teamChips(layer.teams)}</button></li>`).join('')}</ol>
        <p class="inside-detail" id="inside-detail" aria-live="polite">${prompt}</p>
      </div>
    </div>`, 'inside-panel');
  const scene = dialog.querySelector('.inside-scene');
  const detail = dialog.querySelector('.inside-detail');
  const tag = dialog.querySelector('.inside-tag');
  const toggle = dialog.querySelector('[data-action="inside-explode"]');
  const buttons = [...dialog.querySelectorAll('[data-layer]')];
  let stage;
  let picked = null;
  let shown = null;
  const placeTag = () => {
    const layer = insideLayers.find(item => item.id === shown);
    const anchor = layer && stage?.anchor(layer.id);
    tag.hidden = !anchor;
    if (!anchor) return;
    if (tag.dataset.shows !== layer.id) { tag.innerHTML = `<strong>${layer.name}</strong>${teamChips(layer.teams)}`; tag.dataset.shows = layer.id; }
    // keep the tag inside the scene even when the layer sits near an edge
    const half = tag.offsetWidth / 2 + 8;
    tag.style.left = `${Math.min(Math.max(anchor.x, half), scene.clientWidth - half)}px`;
    tag.style.top = `${Math.max(anchor.y, tag.offsetHeight + 14)}px`;
  };
  const show = id => {
    shown = id ?? picked;
    const layer = insideLayers.find(item => item.id === shown);
    detail.textContent = layer ? `${layer.name}. ${layer.detail}` : prompt;
    stage?.highlight(shown);
    placeTag();
  };
  const pick = id => {
    picked = picked === id ? null : id;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layer === picked)));
    show(picked);
    tone();
  };
  buttons.forEach(button => {
    button.addEventListener('click', () => pick(button.dataset.layer));
    button.addEventListener('pointerenter', () => show(button.dataset.layer));
    button.addEventListener('pointerleave', () => show(null));
    button.addEventListener('focus', () => show(button.dataset.layer));
    button.addEventListener('blur', () => show(null));
  });
  dialog.querySelector('.inside-layers').addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || !event.target.matches('[data-layer]')) return;
    buttons[(buttons.indexOf(event.target) + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
    event.preventDefault();
  });
  try {
    const { createModelStage } = await import('./stage.js');
    if (!dialog.open || !dialog.classList.contains('inside-panel')) return;
    stage = await createModelStage(dialog.querySelector('canvas'), 'inside', { model: 'concept', onHover: id => show(id), onPick: id => { if (id) pick(id); }, onFrame: placeTag });
    if (!dialog.open || !dialog.classList.contains('inside-panel')) { stage.dispose(); return; }
    dialog.querySelector('.model-fallback').hidden = true;
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(open));
      stage.explode(open);
      tone();
    });
    // it opens taken apart, with reduced motion that is just the still exploded view
    stage.explode(true);
    show(shown);
    panelCleanup = () => stage.dispose();
  } catch {
    dialog.querySelector('canvas').hidden = true;
    toggle.disabled = true;
  }
}

export async function openProgram(id) {
  if (id === 'teams') return openTeams();
  if (id === 'inside') return openInside();
  const program = programs.find(item => item.id === id);
  if (!program) return;
  if (id === 'crew') {
    const dialog = showPanel('Meet the team.', 'SPS / Crew', `<div class="crew-grid">${data.members.map((member, index) => `<button class="crew-person" data-person="${index}" aria-pressed="${index === 0}"><img src="/media/${member.id}.png" alt="" /><strong>${escapeHtml(member.name)}</strong></button>`).join('')}</div><div class="crew-profile" aria-live="polite"></div>`, 'crew-panel');
    const select = index => {
      const member = data.members[index];
      const membership = data.memberships.find(item => item.memberId === member.id);
      const division = data.divisions.find(item => item.id === membership.divisionId);
      dialog.querySelectorAll('[data-person]').forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.person) === index)));
      dialog.querySelector('.crew-profile').innerHTML = `<div><span>${membership.role === 'president' ? 'President' : `${escapeHtml(division.name)} Lead`}${member.coFounder ? ' / Co-Founder' : ''}</span><h3>${escapeHtml(member.name)}</h3></div><a class="command" href="${member.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn ${icon('ArrowUpRight', 18)}</a>`;
    };
    dialog.querySelectorAll('[data-person]').forEach(control => control.addEventListener('click', () => { select(Number(control.dataset.person)); tone(); }));
    select(0);
  }
  if (id === 'work') showPanel('Our divisions.', 'SPS / Divisions', `<div class="division-list">${data.divisions.map(division => `<details><summary>${escapeHtml(division.name)}${icon('ChevronRight', 18)}</summary><p>${escapeHtml(division.description)}</p><ul>${division.work.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details>`).join('')}</div>${siteMode ? '' : `<a class="command" href="${currentSite}/join/">Join the team ${icon('ArrowUpRight', 18)}</a>`}`);
  if (id === 'journal') showPanel('Project updates.', 'SPS / Project', `<div class="story"><p class="large-copy">Two working prototypes.<br>A Game Boy-inspired handheld is next.</p><p>Our goal is to complete the handheld by June, bringing together custom PCB design, embedded firmware and mechanical enclosure design.</p><div class="milestone"><span>Future iteration</span><strong>2027-2028</strong><p>Schulich on a Chip is working on student-designed chips for a future SPS handheld.</p></div><p>No build logs have been published yet.</p>${siteMode ? '' : `<a class="panel-link" href="${currentSite}/handheld/">Explore the project ${icon('ArrowUpRight', 18)}</a>`}</div>`);
  if (id === 'join' && !siteMode) showPanel('Join the team.', 'SPS / Recruiting', `<div class="join-program"><img src="${activeTheme === 'cartridge' ? '/media/handheld-concept.webp' : '/media/handheld.webp'}" alt="SPS handheld ${activeTheme === 'cartridge' ? 'concept render' : 'colour concept'}" /><div><span class="program-status">Recruiting now</span><p class="large-copy">Build with us.</p><p>Help build the next handheld through electronics, embedded software, mechanical design, games, business or communications.</p><a class="command primary" href="${data.site.applicationUrl}" target="_blank" rel="noopener noreferrer">Apply to SPS ${icon('ArrowUpRight', 18)}</a><a class="panel-link" href="mailto:${data.site.publicContact.email}">${icon('Mail', 18)} Email SPS</a></div></div>`);
  if (id === 'handheld') {
    const dialog = showPanel('Make it yours.', 'SPS / Colour concept', `<div class="inspector-scene"><canvas aria-label="SPS handheld model" tabindex="0"></canvas><img class="model-fallback" src="${activeTheme === 'cartridge' ? '/media/handheld-concept-front.webp' : '/media/handheld.webp'}" alt="SPS handheld enclosure concept" /></div><div class="inspector-tools"><div class="rotation-buttons">${button('ArrowLeft', 'model-left', 'Rotate handheld left')}${button('RotateCcw', 'model-reset', 'Reset handheld')}${button('ArrowRight', 'model-right', 'Rotate handheld right')}</div><label class="colour-input">${icon('Pipette', 18)} Shell <input type="color" value="#784ac3" aria-label="Shell colour" /></label><span>${activeTheme === 'cartridge' ? 'Concept model / illustrative screen' : 'Actual geometry / illustrative screen'}</span></div>`, 'hardware-panel');
    try {
      const { createModelStage } = await import('./stage.js');
      if (!dialog.open || !dialog.classList.contains('hardware-panel')) return;
      const stage = await createModelStage(dialog.querySelector('canvas'), 'inspector', { model: activeTheme === 'cartridge' ? 'concept' : undefined });
      if (!dialog.open || !dialog.classList.contains('hardware-panel')) { stage.dispose(); return; }
      dialog.querySelector('.model-fallback').hidden = true;
      dialog.querySelector('input[type="color"]').addEventListener('input', event => stage.colour(event.target.value));
      dialog.querySelector('[data-action="model-left"]').onclick = () => stage.rotate(-0.4);
      dialog.querySelector('[data-action="model-right"]').onclick = () => stage.rotate(0.4);
      dialog.querySelector('[data-action="model-reset"]').onclick = () => stage.reset();
      panelCleanup = () => stage.dispose();
    } catch { dialog.querySelector('canvas').hidden = true; }
  }
  if (id === 'arcade') {
    const dialog = showPanel(program.title, 'Browser demo, not an SPS release', `<div class="arcade-hud"><span>Score <strong data-score>0</strong></span><span data-game-state>Loading</span><div>${button('Play', 'game-play', 'Start game', 'disabled')}${button('RotateCcw', 'game-reset', 'Restart game', 'disabled')}</div></div><div class="arcade-surface"><canvas aria-label="${program.title} playfield" tabindex="0"></canvas></div><div class="game-touch">${button('ArrowLeft', 'paddle-left', 'Move paddle left')}${button('ArrowRight', 'paddle-right', 'Move paddle right')}</div>`, 'arcade-panel');
    try {
      const { startArcade } = await import('./arcade.js');
      if (!dialog.open || !dialog.classList.contains('arcade-panel')) return;
      panelCleanup = startArcade(dialog, tone);
      dialog.querySelector('[data-action="game-play"]').disabled = false;
      dialog.querySelector('[data-action="game-reset"]').disabled = false;
    } catch { if (dialog.open) dialog.querySelector('[data-game-state]').textContent = 'Arcade unavailable'; }
  }
}

export function wireMenu(container, selector = '[data-program]') {
  container.addEventListener('click', event => {
    const target = event.target.closest(selector);
    if (!target || target.dataset.action) return;
    tone();
    openProgram(target.dataset.program);
  });
  container.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !event.target.matches(selector)) return;
    const controls = [...container.querySelectorAll(selector)];
    const index = controls.indexOf(event.target);
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    controls[(index + direction + controls.length) % controls.length].focus();
    tone();
    event.preventDefault();
  });
}