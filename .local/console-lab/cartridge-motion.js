import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';

// the workbench layout and every cartridge move live here so the stage and the clipping test run the same code

export const CART = { width: 1.4, length: 1.85, thickness: 0.27, top: 0.135 };
// the extrude bevel pokes 0.028 past the outline on every side
const CART_HALF = new THREE.Vector3(CART.width / 2 + 0.028, CART.thickness / 2, CART.length / 2 + 0.028);
export const SHELF_Y = 0.08;
export const SHELF_ROTATION = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.14, 0));
export const SEATED_SCALE = 0.78;
export const MODEL_POSE = { position: new THREE.Vector3(0.9, 0.22, 0.65), rotation: new THREE.Euler(-Math.PI / 2, 0, -0.22) };
export const CARTRIDGES = [
  { id: 'handheld', title: 'THE BUILD', sub: 'SPS / HARDWARE', colour: '#784ac3', x: -2.4, z: -1.9 },
  { id: 'crew', title: 'THE TEAMS', sub: 'SPS / TEAMS', colour: '#578b7a', x: -0.6, z: -2.6 },
  { id: 'arcade', title: 'BRICK BREAK', sub: 'BROWSER DEMO', colour: '#d95340', x: 1.2, z: -2.9 },
  { id: 'inside', title: 'INSIDE', sub: 'SPS / LAYERS', colour: '#e0ad37', x: 3.1, z: -2.6 },
];

export const phase = (progress, from, to) => {
  const value = THREE.MathUtils.clamp((progress - from) / (to - from), 0, 1);
  return value * value * (3 - 2 * value);
};

// centre the gltf scene and scale it to 3.4 units tall, the cad export also needs turning upright
export function normaliseSource(source, concept) {
  if (!concept) source.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  source.position.sub(bounds.getCenter(new THREE.Vector3()));
  const normalised = new THREE.Group();
  normalised.scale.setScalar(3.4 / size.y);
  normalised.add(source);
  const model = new THREE.Group();
  model.add(normalised);
  return { model, normalised };
}

// where a cartridge lines up behind the slot, where it ends up seated and how it is turned there
export function slotPose(model, slot, concept) {
  model.updateMatrixWorld(true);
  return {
    aligned: model.localToWorld(new THREE.Vector3(slot.x, slot.y + 0.9, slot.z)),
    // the slot sits behind the board, so leave a good chunk of cart sticking out like a real game boy
    seated: model.localToWorld(new THREE.Vector3(slot.x, slot.y + (concept ? 0.32 : -0.45), slot.z)),
    rotation: model.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)),
  };
}

// insert: lift off the shelf, swing over to line up with the slot, then slide in
export function insertPose(progress, start, startRotation, pose, out) {
  const lift = start.clone().add(new THREE.Vector3(0, 1.5, 0));
  if (progress < 0.24) out.position.lerpVectors(start, lift, phase(progress, 0, 0.24));
  else if (progress < 0.6) {
    const align = phase(progress, 0.24, 0.6);
    out.position.lerpVectors(lift, pose.aligned, align);
    out.position.y += Math.sin(align * Math.PI) * 0.45;
  } else out.position.lerpVectors(pose.aligned, pose.seated, phase(progress, 0.6, 0.92));
  out.quaternion.slerpQuaternions(startRotation, pose.rotation, phase(progress, 0.12, 0.6));
  out.scale = THREE.MathUtils.lerp(1, SEATED_SCALE, phase(progress, 0, 0.6));
  return out;
}

// eject: back out along the slot, rise straight up, glide home well above the shelf, then drop onto its own spot.
// a single arc used to come down early and skim the corner of the neighbour next to home
export function ejectPose(progress, start, startRotation, pose, home, out) {
  if (progress < 0.32) out.position.lerpVectors(start, pose.aligned, phase(progress, 0, 0.32));
  else {
    const travel = phase(progress, 0.36, 0.84);
    out.position.lerpVectors(pose.aligned, home, travel);
    out.position.y += 1.4 * phase(progress, 0.32, 0.52) * (1 - phase(progress, 0.84, 1));
  }
  out.quaternion.slerpQuaternions(startRotation, SHELF_ROTATION, phase(progress, 0.36, 0.84));
  out.scale = THREE.MathUtils.lerp(SEATED_SCALE, 1, phase(progress, 0.36, 0.84));
  return out;
}

// a neighbour steps back while it is in the way, and only comes home once the ejecting cart is up and clear
export const asideProgress = { insert: progress => phase(progress, 0, 0.22), eject: progress => 1 - phase(progress, 0.62, 0.95) };

export function cartridgeBox(position, quaternion, scale = 1, margin = 0) {
  const box = new OBB(new THREE.Vector3(), CART_HALF.clone().multiplyScalar(scale).addScalar(margin));
  return box.applyMatrix4(new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1)));
}

export function shelfPosition(item) { return new THREE.Vector3(item.x, SHELF_Y, item.z); }

// for every cartridge, work out which neighbours sit in its path and how far back they have to step.
// the whole insert and eject sweep is sampled with a little margin, then each neighbour backs off in 5 cm steps until clear
export function planAside(items, pose, margin = 0.06) {
  const plan = new Map();
  const state = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: 1 };
  for (const mover of items) {
    const home = shelfPosition(mover);
    const sweep = [];
    for (let index = 0; index <= 160; index++) sweep.push(cartridgeBox(insertPose(index / 160, home, SHELF_ROTATION, pose, state).position, state.quaternion, state.scale, margin));
    for (let index = 0; index <= 160; index++) sweep.push(cartridgeBox(ejectPose(index / 160, pose.seated, pose.rotation, pose, home, state).position, state.quaternion, state.scale, margin));
    const steps = new Map();
    for (const other of items) {
      if (other === mover) continue;
      let back = 0;
      const clear = () => !sweep.some(box => box.intersectsOBB(cartridgeBox(shelfPosition(other).add(new THREE.Vector3(0, 0, -back)), SHELF_ROTATION)));
      while (!clear() && back < 3) back += 0.05;
      if (back > 0) steps.set(other.id, new THREE.Vector3(0, 0, -back));
    }
    plan.set(mover.id, steps);
  }
  return plan;
}
