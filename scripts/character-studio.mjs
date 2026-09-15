import * as THREE from 'three';

const sphere = new THREE.SphereGeometry(1, 40, 32);
const ink = new THREE.MeshStandardMaterial({ color: '#181619', roughness: 0.45 });
const white = new THREE.MeshStandardMaterial({ color: '#fffdf5', roughness: 0.75 });
const surface = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

function oval(parent, material, position, scale) {
  const mesh = new THREE.Mesh(sphere, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function stroke(parent, points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), closed);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 8, closed), material);
  parent.add(mesh);
  return mesh;
}

function addHair(head, hair, style) {
  const geometry = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, 1.75);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    const horizontal = positions.getX(index);
    const vertical = positions.getY(index);
    const depth = positions.getZ(index);
    positions.setXYZ(index, horizontal * 0.71, 2.42 + vertical * 0.86 + Math.max(depth, 0) * 0.57, depth * 0.58 - 0.04);
  }
  geometry.computeVertexNormals();
  const cap = new THREE.Mesh(geometry, hair);
  cap.material.side = THREE.DoubleSide;
  head.add(cap);
  if (style === 'curly') {
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 9; column++) {
        const horizontal = (column - 4) * 0.14;
        oval(head, hair, [horizontal, 2.94 + row * 0.085 - Math.abs(horizontal) * 0.18, 0.26 + (3 - row) * 0.073], [0.105, 0.091, 0.10]);
      }
    }
  } else {
    for (let index = 0; index < 8; index++) {
      const tuft = oval(head, hair, [(index - 3.5) * 0.143, 3.07 - Math.abs(index - 4) * 0.035, 0.34 + Math.sin(index * 0.44) * 0.10], [0.205, 0.27, 0.16]);
      tuft.rotation.z = style === 'curtains' ? (index < 4 ? -0.45 : 0.45) : 0.45;
    }
    if (style === 'curtains') {
      for (const side of [-1, 1]) {
        const fringe = oval(head, hair, [side * 0.57, 2.80, 0.38], [0.155, 0.33, 0.16]);
        fringe.rotation.z = side * -0.28;
      }
    }
  }
}

function addGlasses(head, style) {
  const frame = surface(style === 'wire' ? '#8c8783' : '#15161b');
  const radius = style === 'wire' ? 0.012 : 0.023;
  for (const side of [-1, 1]) {
    const centre = side * 0.258;
    const points = style === 'square' ? [
      [centre - 0.218, 2.58, 0.57], [centre + 0.218, 2.58, 0.57],
      [centre + 0.204, 2.31, 0.60], [centre - 0.204, 2.31, 0.60],
    ] : Array.from({ length: 40 }, (_, index) => {
      const angle = index / 40 * Math.PI * 2;
      return [centre + Math.cos(angle) * 0.235, 2.455 + Math.sin(angle) * 0.197, 0.603];
    });
    stroke(head, points, radius, frame, true);
    stroke(head, [[side * 0.48, 2.49, 0.59], [side * 0.62, 2.52, 0.34], [side * 0.67, 2.50, 0.16]], radius, frame);
  }
  stroke(head, [[-0.05, 2.50, 0.61], [0, 2.52, 0.645], [0.05, 2.50, 0.61]], radius, frame);
}

export function createCharacter(options, pose = 'idle') {
  const character = new THREE.Group();
  const head = new THREE.Group();
  const body = new THREE.Group();
  character.add(body, head);
  const skin = surface(options.skin);
  const hair = surface(options.hairColor);
  const clothing = surface(options.shirt);
  const trousers = surface('#292433');
  const shoes = surface('#191820');
  oval(body, clothing, [0, 1.06, 0], [0.41, 0.53, 0.28]);
  oval(body, skin, [0, 1.59, 0], [0.16, 0.20, 0.17]);
  for (const side of [-1, 1]) {
    oval(body, trousers, [side * 0.18, 0.43, 0], [0.155, 0.35, 0.17]);
    oval(body, shoes, [side * 0.19, 0.13, 0.08], [0.185, 0.115, 0.265]);
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.35, 0);
    arm.rotation.z = pose === 'wave' && side === 1 ? 2.15 : side * 0.18;
    if (pose === 'wave' && side === 1) arm.position.set(0.48, 1.65, 0.20);
    oval(arm, clothing, [side * 0.075, -0.21, 0], [0.16, 0.30, 0.17]);
    oval(arm, skin, [side * 0.09, -0.49, 0.015], [0.14, 0.16, 0.14]);
    body.add(arm);
  }

  oval(head, skin, [0, 2.39, 0], [0.68 * (options.faceWidth ?? 1), 0.83 * (options.faceHeight ?? 1), 0.55]);
  for (const side of [-1, 1]) {
    oval(head, skin, [side * 0.66, 2.36, 0], [0.14, 0.20, 0.125]);
    oval(head, surface('#c18a6b'), [side * 0.708, 2.37, 0.078], [0.052, 0.105, 0.03]);
  }
  if (options.beard === 'full') {
    oval(head, hair, [0, 1.98, 0.035], [0.54, 0.51, 0.44]);
    oval(head, skin, [0, 2.17, 0.425], [0.33, 0.24, 0.13]);
    for (const side of [-1, 1]) stroke(head, [[side * 0.58, 2.42, 0.14], [side * 0.54, 2.16, 0.36], [side * 0.37, 1.96, 0.44]], 0.09, hair);
  }
  for (const side of [-1, 1]) {
    const horizontal = side * 0.255;
    oval(head, white, [horizontal, 2.455, 0.501], [0.14, 0.103, 0.055]);
    oval(head, ink, [horizontal + 0.009, 2.455, 0.552], [0.060, 0.080, 0.025]);
    oval(head, white, [horizontal + 0.028, 2.483, 0.575], [0.016, 0.019, 0.009]);
    stroke(head, [[side * 0.12, 2.69, 0.495], [side * 0.26, 2.71, 0.46], [side * 0.40, 2.66, 0.42]], 0.031, hair);
  }
  oval(head, skin, [0, 2.28, 0.55], [0.102, 0.115, 0.12]);
  if (options.smile === 'open') {
    oval(head, surface('#743e34'), [0, 2.085, 0.49], [0.25, 0.105, 0.045]);
    oval(head, white, [0, 2.119, 0.52], [0.222, 0.05, 0.024]);
  } else {
    stroke(head, [[-0.14, 2.09, 0.485], [0, 2.058, 0.525], [0.14, 2.09, 0.485]], 0.014, surface('#8e4c42'));
  }
  if (options.beard === 'full' || options.beard === 'moustache') {
    for (const side of [-1, 1]) {
      const moustache = oval(head, hair, [side * 0.076, 2.158, 0.558], [0.102, 0.029, 0.023]);
      moustache.rotation.z = side * -0.22;
    }
  }
  if (options.beard === 'stubble') {
    for (let index = 0; index < 15; index++) {
      const angle = index / 14 * Math.PI;
      oval(head, surface('#725c4e'), [Math.cos(angle) * 0.38, 1.995 - Math.sin(angle) * 0.06, 0.39 + Math.sin(angle) * 0.035], [0.009, 0.017, 0.007]);
    }
  }
  addHair(head, hair, options.hair);
  if (options.glasses) addGlasses(head, options.glasses);
  if (options.collar !== 'none') {
    const collarMaterial = surface(options.collarColor ?? options.shirt);
    for (const side of [-1, 1]) {
      const collar = oval(body, collarMaterial, [side * 0.12, 1.47, 0.218], [0.145, 0.088, 0.032]);
      collar.rotation.z = side * 0.6;
    }
  }
  if (options.tie) {
    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.40, 4), surface('#393442'));
    tie.position.set(0, 1.18, 0.287);
    tie.rotation.z = Math.PI;
    body.add(tie);
    oval(body, tie.material, [0, 1.43, 0.27], [0.061, 0.061, 0.03]);
  } else {
    for (const height of [1.3, 1.14]) oval(body, surface('#d4c7dd'), [0, height, 0.278], [0.016, 0.016, 0.01]);
  }
  character.rotation.y = options.turn ?? -0.10;
  head.rotation.z = pose === 'wave' ? -0.045 : 0;
  return character;
}

export function createPortraitStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(640, 768);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.65, 1.65, 3.65, -0.31, 0.1, 30);
  camera.position.set(0, 0, 8);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b6a1cd', 2.1));
  const key = new THREE.DirectionalLight('#fff5e6', 3.2);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#e1d2ff', 0.9);
  fill.position.set(4, 2, 3);
  scene.add(fill);
  return { renderer, scene, camera };
}