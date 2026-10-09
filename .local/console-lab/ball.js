export const minVerticalShare = 0.3;
export const topWallEdge = 5;
export const minPaddleSide = 1.2;

// a dead centre hit would send the ball straight up, and a paddle that isn't moving would catch it forever
export function paddleBounce(offset) {
  const side = offset * 6;
  return { vx: Math.abs(side) < minPaddleSide ? (side < 0 ? -minPaddleSide : minPaddleSide) : side, vy: -6.5 };
}

// rescales the ball to the target speed and keeps it from flattening out.
// a shallow hit on the top wall gets treated as resting contact by matter, so a flat ball
// near the top always heads down, otherwise it slides along the wall forever
export function steerBall({ y, vx, vy }, speed, radius = 9) {
  const current = Math.hypot(vx, vy);
  if (!current) return { vx, vy };
  let x = vx / current * speed;
  let next = vy / current * speed;
  const minVertical = speed * minVerticalShare;
  if (Math.abs(next) < minVertical) {
    const down = next >= 0 || y - radius <= topWallEdge + 4;
    next = down ? minVertical : -minVertical;
    x = (x < 0 ? -1 : 1) * Math.sqrt(speed * speed - next * next);
  }
  return { vx: x, vy: next };
}
