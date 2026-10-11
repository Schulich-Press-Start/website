import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  CARTRIDGES, MODEL_POSE, SHELF_ROTATION, asideProgress, cartridgeBox, ejectPose, insertPose, normaliseSource, planAside, shelfPosition, slotPose,
} from '../.local/console-lab/cartridge-motion.js';

// the workbench exactly as the home page builds it, using the real concept model's slot marker
async function workbench() {
  const file = await readFile(new URL('../public/models/sps-handheld-concept.glb', import.meta.url));
  const gltf: any = await new Promise((resolve, reject) => new GLTFLoader().parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '', resolve, reject));
  const { model } = normaliseSource(gltf.scene, true);
  model.position.copy(MODEL_POSE.position);
  model.rotation.copy(MODEL_POSE.rotation);
  model.updateMatrixWorld(true);
  const anchor = gltf.scene.getObjectByName('sps_slot_anchor');
  assert(anchor, 'the concept model marks its cartridge slot');
  return slotPose(model, model.worldToLocal(anchor.getWorldPosition(new THREE.Vector3())), true);
}

const pose = await workbench();
const plan = planAside(CARTRIDGES, pose);
const steps = 800;

test('every program cartridge has a spot on the shelf, Inside replaces Join', () => {
  assert.deepEqual(CARTRIDGES.map(item => item.id), ['handheld', 'crew', 'arcade', 'inside']);
  for (const [index, a] of CARTRIDGES.entries()) {
    for (const b of CARTRIDGES.slice(index + 1)) assert(!cartridgeBox(shelfPosition(a), SHELF_ROTATION).intersectsOBB(cartridgeBox(shelfPosition(b), SHELF_ROTATION)), `${a.id} and ${b.id} overlap on the shelf`);
  }
});

test('without stepping aside, the slot lane would run through Brick Break', () => {
  // this is the bug from the screenshots: the seated cart and its approach both overlap the arcade cartridge
  const brickBreak = cartridgeBox(shelfPosition(CARTRIDGES.find(item => item.id === 'arcade')), SHELF_ROTATION);
  const state = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: 1 };
  insertPose(1, shelfPosition(CARTRIDGES[0]), SHELF_ROTATION, pose, state);
  assert(cartridgeBox(state.position, state.quaternion, state.scale).intersectsOBB(brickBreak));
  // so the plan moves exactly that one neighbour, for every other cartridge, and only a short way back
  for (const mover of CARTRIDGES) {
    const moved = [...plan.get(mover.id).entries()];
    if (mover.id === 'arcade') assert.deepEqual(moved, []);
    else {
      assert.deepEqual(moved.map(([id]) => id), ['arcade']);
      assert(moved[0][1].length() <= 1.0, `${mover.id} pushes Brick Break back ${moved[0][1].length().toFixed(2)}`);
    }
  }
});

test('no cartridge ever passes through another while it loads or ejects', () => {
  const state = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: 1 };
  for (const mover of CARTRIDGES) {
    const home = shelfPosition(mover);
    const asides = plan.get(mover.id);
    const runs: [string, (progress: number) => void, (progress: number) => number][] = [
      ['loading', progress => insertPose(progress, home, SHELF_ROTATION, pose, state), asideProgress.insert],
      ['ejecting', progress => ejectPose(progress, pose.seated, pose.rotation, pose, home, state), asideProgress.eject],
    ];
    for (const [action, place, aside] of runs) {
      for (let index = 0; index <= steps; index++) {
        const progress = index / steps;
        place(progress);
        const moving = cartridgeBox(state.position, state.quaternion, state.scale);
        const others = CARTRIDGES.filter(item => item !== mover).map(item => {
          const offset = asides.get(item.id) ?? new THREE.Vector3();
          return { id: item.id, box: cartridgeBox(shelfPosition(item).addScaledVector(offset, aside(progress)), SHELF_ROTATION) };
        });
        for (const other of others) assert(!moving.intersectsOBB(other.box), `${mover.id} hits ${other.id} while ${action} at ${(progress * 100).toFixed(1)}%`);
        for (const [i, a] of others.entries()) for (const b of others.slice(i + 1)) assert(!a.box.intersectsOBB(b.box), `${a.id} and ${b.id} touch while ${mover.id} is ${action}`);
      }
    }
  }
});

test('a picked cartridge can hop forward without touching its neighbours', () => {
  // select() lifts the picked cart 0.48 and nudges it 0.3 toward the viewer
  for (const mover of CARTRIDGES) {
    const lifted = cartridgeBox(shelfPosition(mover).add(new THREE.Vector3(0, 0.48, 0.3)), SHELF_ROTATION);
    for (const other of CARTRIDGES.filter(item => item !== mover)) assert(!lifted.intersectsOBB(cartridgeBox(shelfPosition(other), SHELF_ROTATION)), `${mover.id} hops into ${other.id}`);
  }
});
