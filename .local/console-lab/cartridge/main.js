import { setup, icon, tone, openProgram, animate, data } from '../common.js';

let finish = 'purple';
if (import.meta.env.DEV) {
  const requestedFinish = new URLSearchParams(location.search).get('finish');
  if (['pink', 'purple', 'white-grid'].includes(requestedFinish)) finish = requestedFinish;
}
let workbenchFrame;
if (finish === 'pink') delete document.body.dataset.cartridgeFinish;
document.querySelector('.console-wordmark img').src = finish === 'purple' ? '/media/logo-white.png' : '/media/logo-dark.png';
if (finish === 'purple' || finish === 'white-grid') {
  document.body.dataset.cartridgeFinish = finish;
  workbenchFrame = document.createElement('div');
  workbenchFrame.className = 'workbench-frame';
  workbenchFrame.setAttribute('aria-hidden', 'true');
  document.querySelector('.cartridge-scene').after(workbenchFrame);
  if (import.meta.env.DEV) {
    await import('./local-finishes.css');
    const switcher = document.createElement('nav');
    switcher.className = 'workbench-switch';
    switcher.setAttribute('aria-label', 'Workbench background');
    switcher.innerHTML = [
      { id: 'pink', title: 'Original pink background', colour: '#e6b4c6', href: '/cartridge/?finish=pink' },
      { id: 'purple', title: 'SPS purple background', colour: '#784ac3', href: '/cartridge/?finish=purple' },
      { id: 'white-grid', title: 'White grid background', colour: '#ffffff', href: '/cartridge/?finish=white-grid' },
    ].map(item => `<a href="${item.href}" title="${item.title}" aria-label="${item.title}" data-finish-pick="${item.id}" style="--finish-swatch:${item.colour}" ${item.id === finish ? 'aria-current="page"' : ''}><span aria-hidden="true"></span></a>`).join('');
    document.querySelector('.system-footer').insertBefore(switcher, document.querySelector('.footer-links'));
  }
}

const cartridges = [
  { id:'handheld', title:'The build.', label:'Hardware', colour:'#784ac3', icon:'Gamepad2', description:'Explore the handheld we are building.' },
  { id:'crew', title:'The teams.', label:'Teams', colour:'#578b7a', icon:'Users', description:'Six teams building one handheld. Meet the leads and see what each team does.' },
  { id:'arcade', title:'Brick Break', label:'Arcade', colour:'#d95340', icon:'Sparkles', description:'Take a break with a quick game.' },
  { id:'join', title:'Your turn.', label:'Join SPS', colour:'#dfab36', icon:'Send', description:'Find your place on the team.' },
];
let stage;
let selected = 0;
let loading = false;
let loaded = false;
let loadOperation = 0;
const lede = document.querySelector('#cartridge-lede');
if (data.site.description) { lede.textContent = data.site.description; lede.hidden = false; }
const rail = document.querySelector('.cartridge-rail');
const loadButton = document.querySelector('.load-cartridge');
const loadLabel = loadButton.querySelector('span:last-child');
const resetButton = document.querySelector('.view-toggle');
// invisible copies of every blurb reserve the height of the longest one, so the page doesn't jump between tabs
document.querySelector('.cartridge-copy-stack').insertAdjacentHTML('beforeend', cartridges.map(item => `<div class="cartridge-copy" aria-hidden="true" inert><span>SPS / ${item.label}</span><h2>${item.title}</h2><p>${item.description}</p></div>`).join(''));
rail.innerHTML = cartridges.map((item,index)=>`<button class="cartridge-tab" type="button" data-cartridge="${item.id}" aria-pressed="${index===0}" style="--cart:${item.colour}"><span class="mini-cartridge" aria-hidden="true">${icon(item.icon,16)}</span><span class="cartridge-tab-text"><span class="cartridge-tab-index" aria-hidden="true">0${index+1}</span><span>${item.label}</span></span><span class="cartridge-tab-arrow">${icon('ArrowUpRight',16)}</span></button>`).join('');
function select(index, focus = false) {
  if (loading || loaded) return;
  selected=(index+cartridges.length)%cartridges.length;
  const item=cartridges[selected];
  document.querySelector('#cartridge-category').textContent = `SPS / ${item.label}`;
  document.querySelector('#cartridge-title').textContent=item.title;
  document.querySelector('#cartridge-description').textContent=item.description;
  document.querySelector('.cartridge-selection').style.setProperty('--cart',item.colour);
  rail.querySelectorAll('button').forEach((button,index)=>{button.setAttribute('aria-pressed',String(index===selected));if(focus&&index===selected)button.focus();});
  stage?.select(item.id);
  tone();
  animate(document.querySelector('.cartridge-selection>div'),[{transform:'translateY(7px)',opacity:.4},{transform:'none',opacity:1}],{duration:300});
}
rail.addEventListener('click',event=>{const target=event.target.closest('[data-cartridge]');if(target)select(cartridges.findIndex(item=>item.id===target.dataset.cartridge));});
rail.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();select(selected+(event.key==='ArrowRight'?1:-1),true);}
  if(event.key==='ArrowUp'){event.preventDefault();document.querySelector('.load-cartridge').focus();}
});
document.querySelector('.load-glyph').innerHTML=icon('Play',20);
function setLoading(value, label = 'Inserting cartridge') {
  loading = value;
  loadButton.disabled = value;
  loadButton.setAttribute('aria-busy', String(value));
  loadLabel.textContent = value ? label : 'Load cartridge';
  rail.querySelectorAll('button').forEach(button => { button.disabled = value; });
  resetButton.title = value ? 'Cancel cartridge movement' : 'Reset workbench view';
  resetButton.setAttribute('aria-label', resetButton.title);
}
function cancelLoading() {
  loadOperation++;
  loaded = false;
  stage?.reset();
  setLoading(false);
}
loadButton.onclick=async()=>{
  if (loading || loaded) return;
  loadButton.focus({preventScroll:true});
  const operation = ++loadOperation;
  const program = cartridges[selected].id;
  setLoading(true);
  if (innerWidth <= 900) (workbenchFrame ?? document.querySelector('.cartridge-scene')).scrollIntoView({ block: 'center', behavior: 'instant' });
  const completed = stage ? await stage.insert(program) : true;
  if (operation !== loadOperation) return;
  setLoading(false);
  if (!completed) { loadButton.focus({preventScroll:true}); return; }
  loaded = Boolean(stage);
  loadButton.focus({preventScroll:true});
  openProgram(program === 'crew' ? 'teams' : program);
};
document.querySelector('.view-toggle').innerHTML=icon('RotateCcw',19);
resetButton.onclick=()=>{cancelLoading();stage?.select(cartridges[selected].id);};
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !loading) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  cancelLoading();
  loadButton.focus({preventScroll:true});
}, true);
window.addEventListener('lab-panel-close', async () => {
  if (!loaded || loading) return;
  const operation = ++loadOperation;
  loaded = false;
  setLoading(true, 'Ejecting cartridge');
  await stage.eject();
  if (operation !== loadOperation) return;
  setLoading(false);
  stage.select(cartridges[selected].id);
  loadButton.focus({preventScroll:true});
});
setup('cartridge',async()=>{
  if(!stage){
    try{
      const {createModelStage}=await import('../stage.js');
      stage=await createModelStage(document.querySelector('#stage'),'cartridge',{onSelect:id=>select(cartridges.findIndex(item=>item.id===id)),workbench:finish,frame:workbenchFrame,model:'concept'});
      document.querySelector('#stage-fallback').hidden=true;
    }catch{document.querySelector('#stage').hidden=true;document.body.dataset.stageFallback='true';}
  }
  select(0);
},cancelLoading);