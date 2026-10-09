import Matter from 'matter-js';
import { paddleBounce, steerBall } from './ball.js';
import { icon } from './common.js';

export function startArcade(dialog, tone) {
  const { Engine, Bodies, Body, Composite, Events } = Matter;
  const canvas = dialog.querySelector('canvas');
  const context = canvas.getContext('2d');
  const gameTitle = dialog.querySelector('#panel-title').textContent;
  const width = 800;
  const height = innerWidth < 600 ? 840 : 480;
  canvas.width = width;
  canvas.height = height;
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  let ball;
  let paddle;
  let targets = [];
  let score = 0;
  let playing = false;
  let started = false;
  let ended = false;
  let frame = 0;
  let previous = 0;
  let accumulated = 0;
  let direction = 0;
  const colours = ['#b8dbc9', '#c7b9e8', '#f4b077', '#e991a1'];
  const playButton = dialog.querySelector('[data-action="game-play"]');
  const state = dialog.querySelector('[data-game-state]');
  const scoreLabel = dialog.querySelector('[data-score]');

  function draw() {
    context.fillStyle = '#1c1c25'; context.fillRect(0, 0, width, height);
    context.strokeStyle = '#ffffff08'; context.lineWidth = 1;
    for (let column = 0; column < width; column += 40) { context.beginPath(); context.moveTo(column, 0); context.lineTo(column, height); context.stroke(); }
    for (let row = 0; row < height; row += 40) { context.beginPath(); context.moveTo(0, row); context.lineTo(width, row); context.stroke(); }
    for (const target of targets) {
      context.fillStyle = target.plugin.colour;
      context.beginPath(); context.roundRect(target.position.x - 42, target.position.y - 13, 84, 26, 5); context.fill();
      context.fillStyle = '#ffffff40'; context.fillRect(target.position.x - 36, target.position.y - 9, 72, 2);
    }
    context.fillStyle = '#f7f6ef';
    context.beginPath(); context.roundRect(paddle.position.x - 67, paddle.position.y - 8, 134, 16, 8); context.fill();
    context.fillStyle = '#eea870'; context.beginPath(); context.arc(ball.position.x, ball.position.y, 9, 0, Math.PI * 2); context.fill();
    if (!playing) {
      context.fillStyle = '#eeeeee'; context.font = '32px Commissioner, sans-serif'; context.textAlign = 'center';
      context.fillText(ended ? targets.length ? 'Try again' : 'All bricks cleared' : started ? 'Paused' : gameTitle, width / 2, height * .61);
    }
  }
  function setPlaying(value) {
    playing = value;
    if (value) started = true;
    canvas.dataset.playing = String(value);
    playButton.innerHTML = icon(value ? 'Pause' : 'Play');
    playButton.setAttribute('aria-label', value ? 'Pause game' : ended ? 'Play again' : 'Start game');
    playButton.title = value ? 'Pause game' : ended ? 'Play again' : 'Start game';
    state.textContent = value ? 'Playing' : ended ? targets.length ? 'Ball lost' : 'Round complete' : started ? 'Paused' : 'Ready';
    cancelAnimationFrame(frame);
    if (value) { previous = performance.now(); accumulated = 0; frame = requestAnimationFrame(tick); }
    else draw();
  }
  function reset() {
    setPlaying(false);
    Composite.clear(engine.world, false);
    Engine.clear(engine);
    targets = [];
    score = 0; ended = false; direction = 0; started = false;
    scoreLabel.textContent = '0';
    const walls = [Bodies.rectangle(-10, height / 2, 30, height * 2, { isStatic: true, restitution: 1 }), Bodies.rectangle(width + 10, height / 2, 30, height * 2, { isStatic: true, restitution: 1 }), Bodies.rectangle(width / 2, -10, width, 30, { isStatic: true, restitution: 1 })];
    paddle = Bodies.rectangle(width / 2, height - 45, 134, 16, { isStatic: true, restitution: 1, label: 'paddle', friction: 0 });
    ball = Bodies.circle(width / 2, height - 65, 9, { restitution: 1, friction: 0, frictionAir: 0, inertia: Infinity, label: 'ball' });
    for (let row = 0; row < 4; row++) for (let column = 0; column < 8; column++) {
      const target = Bodies.rectangle(78 + column * 92, 70 + row * 37, 84, 26, { isStatic: true, restitution: 1, friction: 0, label: 'target', plugin: { colour: colours[row] } });
      targets.push(target);
    }
    Composite.add(engine.world, [...walls, paddle, ball, ...targets]);
    Body.setVelocity(ball, { x: 4, y: -6 });
    setPlaying(false);
  }
  function tick(now) {
    if (!playing) return;
    accumulated += Math.min(now - previous, 50); previous = now;
    while (accumulated >= 1000 / 60) {
      if (direction) Body.setPosition(paddle, { x: Math.max(70, Math.min(width - 70, paddle.position.x + direction * 9)), y: paddle.position.y });
      Engine.update(engine, 1000 / 60);
      const steered = steerBall({ y: ball.position.y, vx: ball.velocity.x, vy: ball.velocity.y }, Math.min(9.5, 7.2 + score * 0.045));
      Body.setVelocity(ball, { x: steered.vx, y: steered.vy });
      accumulated -= 1000 / 60;
    }
    if (ball.position.y > height + 30 || !targets.length) { ended = true; setPlaying(false); return; }
    draw();
    frame = requestAnimationFrame(tick);
  }
  Events.on(engine, 'collisionStart', event => {
    for (const pair of event.pairs) {
      const target = pair.bodyA.label === 'target' ? pair.bodyA : pair.bodyB.label === 'target' ? pair.bodyB : undefined;
      if (target && targets.includes(target)) {
        targets = targets.filter(item => item !== target);
        Composite.remove(engine.world, target);
        score += 10; scoreLabel.textContent = String(score); tone();
      }
      if ([pair.bodyA.label, pair.bodyB.label].includes('paddle')) {
        const bounce = paddleBounce((ball.position.x - paddle.position.x) / 67);
        Body.setVelocity(ball, { x: bounce.vx, y: bounce.vy });
      }
    }
  });
  const toggle = () => { if (ended) reset(); setPlaying(!playing); canvas.focus({ preventScroll: true }); };
  playButton.addEventListener('click', toggle);
  dialog.querySelector('[data-action="game-reset"]').onclick = () => { reset(); setPlaying(true); };
  function pointer(event) {
    const bounds = canvas.getBoundingClientRect();
    Body.setPosition(paddle, { x: Math.max(70, Math.min(width - 70, (event.clientX - bounds.left) / bounds.width * width)), y: paddle.position.y });
    if (!playing) draw();
  }
  canvas.addEventListener('pointermove', pointer);
  function keyDown(event) {
    if (!dialog.open) return;
    if (event.target === canvas && event.code === 'Space') { event.preventDefault(); toggle(); }
    if (event.target === canvas && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { direction = event.key === 'ArrowLeft' ? -1 : 1; event.preventDefault(); }
  }
  function release() { direction = 0; }
  const left = dialog.querySelector('[data-action="paddle-left"]');
  const right = dialog.querySelector('[data-action="paddle-right"]');
  left.onpointerdown = () => { direction = -1; }; right.onpointerdown = () => { direction = 1; };
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', release); window.addEventListener('pointerup', release);
  const visibility = () => { if (document.hidden) setPlaying(false); };
  document.addEventListener('visibilitychange', visibility);
  paddle = { position: { x: width / 2, y: height - 45 } }; ball = { position: { x: width / 2, y: height - 65 } };
  reset();
  return () => {
    cancelAnimationFrame(frame); playing = false;
    window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', release); window.removeEventListener('pointerup', release);
    canvas.removeEventListener('pointermove', pointer); document.removeEventListener('visibilitychange', visibility);
    Events.off(engine); Composite.clear(engine.world, false); Engine.clear(engine);
  };
}