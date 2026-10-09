import assert from 'node:assert/strict';
import { test } from 'node:test';
import { minPaddleSide, minVerticalShare, paddleBounce, steerBall } from '../.local/console-lab/ball.js';

const speedOf = (velocity: { vx: number; vy: number }) => Math.hypot(velocity.vx, velocity.vy);

test('a flat ball pressed against the top wall is sent back down instead of sliding along it', () => {
  // the exact state brick break got stuck in: hugging the top wall, nudged upward every frame
  const steered = steerBall({ y: 13.9, vx: 9.29, vy: -1.97 }, 9.5);
  assert.ok(steered.vy > 0);
  assert.ok(steered.vy >= 9.5 * minVerticalShare - 1e-9);
  assert.ok(steered.vx > 0);
  assert.ok(Math.abs(speedOf(steered) - 9.5) < 1e-9);
});

test('a flat ball in open space keeps its vertical direction but gets a usable angle', () => {
  const rising = steerBall({ y: 300, vx: -9, vy: -0.4 }, 9);
  assert.ok(rising.vy <= -9 * minVerticalShare + 1e-9);
  assert.ok(rising.vx < 0);
  const falling = steerBall({ y: 300, vx: 7, vy: 0 }, 7.2);
  assert.ok(falling.vy >= 7.2 * minVerticalShare - 1e-9);
  assert.ok(Math.abs(speedOf(falling) - 7.2) < 1e-9);
});

test('normal shots only get rescaled to the target speed', () => {
  const steered = steerBall({ y: 300, vx: 3, vy: -4 }, 10);
  assert.ok(Math.abs(steered.vx - 6) < 1e-9);
  assert.ok(Math.abs(steered.vy + 8) < 1e-9);
  assert.deepEqual(steerBall({ y: 300, vx: 0, vy: 0 }, 8), { vx: 0, vy: 0 });
});

test('paddle hits always leave with some sideways speed so a still paddle cannot catch a vertical loop', () => {
  assert.equal(paddleBounce(0).vx, minPaddleSide);
  assert.equal(paddleBounce(-0.05).vx, -minPaddleSide);
  assert.equal(paddleBounce(0.5).vx, 3);
  assert.equal(paddleBounce(-1).vx, -6);
  assert.equal(paddleBounce(0.2).vy, -6.5);
});
