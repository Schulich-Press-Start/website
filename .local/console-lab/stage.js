import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function groupPlasticSurfaces(geometry) {
  const positions = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index ? index.count : positions.count;
  let start = 0;
  let materialIndex = -1;
  let pillTriangles = 0;
  geometry.clearGroups();
  for (let offset = 0; offset < count; offset += 3) {
    const pill = [offset, offset + 1, offset + 2].every(vertex => positions.getZ(index ? index.getX(vertex) : vertex) < 0);
    const next = pill ? 1 : 0;
    if (pill) pillTriangles++;
    if (materialIndex !== next) {
      if (offset > start) geometry.addGroup(start, offset - start, materialIndex);
      start = offset;
      materialIndex = next;
    }
  }
  geometry.addGroup(start, count - start, materialIndex);
  return pillTriangles;
}

export async function createModelStage(canvas, mode = 'signal', options = {}) {
  const horizonGrid = mode === 'cartridge' && (options.workbench === 'purple' || import.meta.env?.DEV === true && options.workbench === 'white-grid');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  // render at the screen's real resolution up to 2x. weaker machines start at 1.5x and anything that
  // stutters during an animation steps down, see trackFrame
  const lowEnd = (navigator.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  let pixelRatio = Math.min(devicePixelRatio || 1, lowEnd ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  canvas.dataset.pixelRatio = String(pixelRatio);
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = mode === 'cartridge' || mode === 'pocket';
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  // nothing gets closer than a unit, a near plane of 0.1 keeps the thin silkscreen and copper from z-fighting
  const camera = new THREE.PerspectiveCamera(mode === 'cartridge' ? 36 : 32, 1, 0.1, 100);
  const environment = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environmentMap = environment.fromScene(room, 0.04);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = mode === 'pocket' ? 0.5 : 0.65;
  room.dispose();
  environment.dispose();
  scene.add(new THREE.HemisphereLight('#ffffff', mode === 'cartridge' ? '#9e5472' : '#46554b', mode === 'pocket' ? 0.8 : 1.1));
  const key = new THREE.DirectionalLight('#fff5e4', mode === 'pocket' ? 1.6 : 2.0);
  key.position.set(-3, 7, 5);
  key.castShadow = mode === 'cartridge' || mode === 'pocket';
  key.shadow.mapSize.setScalar(lowEnd ? 1024 : 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -8;
  key.shadow.camera.right = key.shadow.camera.top = 8;
  key.shadow.bias = -0.0002;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#b5eedd', 1.5);
  rim.position.set(5, 2, -3);
  scene.add(rim);
  const lightFill = new THREE.DirectionalLight('#ddc9ff', 0.5);
  lightFill.position.set(-3, 1, -4);
  scene.add(lightFill);

  // the concept model is the blender build in design/concept-handheld, the default is the cad export
  const concept = options.model === 'concept';
  let gltf;
  try { gltf = await new GLTFLoader().loadAsync(concept ? '/models/sps-handheld-concept.glb' : '/models/sps-handheld.glb'); }
  catch (error) { renderer.dispose(); environmentMap.dispose(); throw error; }
  const source = gltf.scene;
  for (const child of [...source.children]) if (child instanceof THREE.Camera) source.remove(child);
  if (!concept) source.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  source.position.sub(bounds.getCenter(new THREE.Vector3()));
  const normalised = new THREE.Group();
  normalised.scale.setScalar(3.4 / size.y);
  normalised.add(source);
  const model = new THREE.Group();
  model.add(normalised);
  scene.add(model);
  const shell = [];
  let screen;
  let screenPanel;
  // where cartridges seat, in model space. the cad model has no slot so it uses its top edge
  let slot = new THREE.Vector3(0, 1.7, 0.05);
  const anchor = source.getObjectByName('sps_slot_anchor');
  if (anchor) { model.updateMatrixWorld(true); slot = model.worldToLocal(anchor.getWorldPosition(new THREE.Vector3())); }
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (concept) {
      // the front shell and the clear back cover share the same treatment
      if (object.material.name.startsWith('sps_shell')) {
        // the shadow map treats transmission as opaque, so the clear shell would shade its own insides
        object.castShadow = false;
        object.material.attenuationDistance = 0.9;
        object.material.envMapIntensity = 1.2;
        // three picks the blur level of what's behind a transmissive surface from its roughness, even the 0.05
        // from blender blurs the board and lcd by about half a mip, so the clear plastic is perfectly smooth here
        object.material.roughness = 0;
        if (!shell.includes(object.material)) shell.push(object.material);
      }
      if (['sps_silk', 'sps_trace'].includes(object.material.name)) {
        // printed and etched layers sit a hair above the board, nudge them so they never flicker
        object.material.polygonOffset = true;
        object.material.polygonOffsetFactor = -1;
        object.material.polygonOffsetUnits = -1;
      }
      if (object.name === 'sps_screen') screen = object;
      return;
    }
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const materials = originals.map(original => {
      const material = original.clone();
      if (['mattealuminum', 'defaultplastic'].includes(original.name)) {
        material.color.set('#784ac3'); material.metalness = 0.12; material.roughness = 0.32; shell.push(material);
      } else if (original.name === 'glossyrubber') {
        material.color.set('#ffa053'); material.metalness = 0.12; material.roughness = 0.4;
      } else if (original.name === 'green_backlit_lcd') {
        material.color.set('#151d22'); material.roughness = 0.2; material.metalness = 0.2; screen = object;
      }
      original.dispose();
      return material;
    });
    if (originals.length === 1 && originals[0].name === 'defaultplastic') {
      groupPlasticSurfaces(object.geometry);
      const buttons = originals[0].clone();
      buttons.name = 'sps-pill-buttons';
      buttons.color.set('#050506');
      buttons.metalness = 0;
      buttons.roughness = 0.65;
      buttons.envMapIntensity = 0.25;
      materials.push(buttons);
      object.material = materials;
    } else object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = concept ? LCD.width * LCD.cell : 512;
  screenCanvas.height = concept ? LCD.height * LCD.cell : 400;
  const screenContext = screenCanvas.getContext('2d');
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = maxAnisotropy;
  // gltf uvs already run top to bottom
  if (concept) screenTexture.flipY = false;
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  screenMaterial.name = 'sps-screen-concept';
  if (concept && screen) {
    screen.material.dispose();
    screen.material = screenMaterial;
    screenPanel = screen;
  } else if (screen) {
    const geometry = screen.geometry.clone();
    geometry.computeBoundingBox();
    const positions = geometry.getAttribute('position');
    const box = geometry.boundingBox;
    const uv = new Float32Array(positions.count * 2);
    for (let index = 0; index < positions.count; index++) {
      uv[index * 2] = (positions.getY(index) - box.min.y) / (box.max.y - box.min.y);
      uv[index * 2 + 1] = (positions.getZ(index) - box.min.z) / (box.max.z - box.min.z);
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const panel = new THREE.Mesh(geometry, screenMaterial);
    panel.position.x = 0.00008;
    screen.add(panel);
    screenPanel = panel;
  }
  const surfaceMaterials = new Map();
  source.traverse(object => { if (object instanceof THREE.Mesh && object !== screenPanel) surfaceMaterials.set(object, object.material); });
  const wireMaterial = new THREE.MeshBasicMaterial({ color: '#294e5d', wireframe: true, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  function display(title = 'PRESS START', progress = 0) {
    if (concept) { paintLcd(screenContext, title, progress); screenTexture.needsUpdate = true; return; }
    screenContext.fillStyle = '#171f22'; screenContext.fillRect(0, 0, 512, 400);
    screenContext.fillStyle = '#233235';
    for (let row = 0; row < 400; row += 8) screenContext.fillRect(0, row, 512, 1);
    screenContext.textAlign = 'center';
    screenContext.fillStyle = '#badfca'; screenContext.font = '18px sans-serif'; screenContext.fillText('SCHULICH', 256, 87);
    screenContext.fillStyle = '#f6f4ed'; screenContext.font = 'bold 35px sans-serif'; screenContext.fillText(title.toUpperCase(), 256, 192, 440);
    screenContext.fillStyle = '#e8ae74'; screenContext.fillRect(145, 257, 222, 5);
    screenContext.font = '16px sans-serif'; screenContext.fillText('MADE TO PLAY', 256, 318);
    screenTexture.needsUpdate = true;
  }
  display();

  const cartridges = [];
  const board = new THREE.Group();
  if (mode === 'pocket') {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ color: '#29434a', opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.74;
    floor.receiveShadow = true;
    scene.add(floor);
  }
  if (mode === 'signal') {
    for (let band = 0; band < 4; band++) {
      const points = [];
      for (let index = 0; index < 70; index++) {
        const horizontal = index / 69 * 22 - 11;
        points.push(new THREE.Vector3(horizontal, Math.sin(horizontal * 0.23 + band * 0.12) * 1.6 - 1 + band * 0.17, -2.5 + Math.cos(horizontal * 0.23) * 0.5));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 90, band === 0 ? 0.016 : 0.004, 4, false), new THREE.MeshBasicMaterial({ color: band === 0 ? '#9ccebb' : '#b7c3be', transparent: true, opacity: band === 0 ? 0.35 : 0.2 }));
      scene.add(tube);
    }
  }
  if (mode === 'cartridge') {
    const whiteGrid = import.meta.env?.DEV === true && options.workbench === 'white-grid';
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: whiteGrid ? '#414750' : '#5a3b52', opacity: 0.18 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.29; floor.receiveShadow = true; scene.add(floor);
    if (horizonGrid) {
      const material = new THREE.ShaderMaterial({
        name: 'sps-horizon-grid',
        uniforms: {
          gridColor: { value: new THREE.Color(whiteGrid ? '#69737e' : '#ffffff') },
          gridOpacity: { value: whiteGrid ? 0.3 : 0.11 },
          fadeNear: { value: 11 },
          fadeFar: { value: 32 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec3 gridWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            gridWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 gridColor;
          uniform float gridOpacity;
          uniform float fadeNear;
          uniform float fadeFar;
          varying vec3 gridWorldPosition;
          float gridLine(float spacing) {
            vec2 coordinate = gridWorldPosition.xz / spacing;
            vec2 pixelWidth = max(fwidth(coordinate), vec2(0.0001));
            vec2 edge = abs(fract(coordinate - 0.5) - 0.5) / pixelWidth;
            return 1.0 - clamp(min(edge.x, edge.y), 0.0, 1.0);
          }
          void main() {
            float distanceToCamera = length(cameraPosition.xz - gridWorldPosition.xz);
            float fade = 1.0 - smoothstep(fadeNear, fadeFar, distanceToCamera);
            float lines = max(gridLine(0.25) * 0.45, gridLine(1.25));
            gl_FragColor = vec4(gridColor, lines * gridOpacity * fade);
            #include <colorspace_fragment>
          }
        `,
      });
      const grid = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material);
      grid.name = 'sps-horizon-grid';
      grid.rotation.x = -Math.PI / 2;
      grid.position.y = -0.288;
      grid.renderOrder = -1;
      scene.add(grid);
    }
    if (!horizonGrid || !whiteGrid) {
      const mat = new THREE.Mesh(new RoundedBoxGeometry(6.3, 0.07, 5.1, 3, 0.18), new THREE.MeshStandardMaterial({ color: horizonGrid ? '#ffffff' : '#dadbdd', roughness: 0.8 }));
      mat.position.set(0.4, -0.24, 0.25); mat.receiveShadow = true; scene.add(mat);
      const grid = new THREE.GridHelper(5.8, 29, '#9595a0', '#b8b8c1'); grid.position.set(0.4, -0.199, 0.25); grid.scale.z = 0.8; scene.add(grid);
    }
    canvas.dataset.workbench = horizonGrid ? 'horizon-grid' : 'mat';
    model.rotation.set(-Math.PI / 2, 0, -0.22);
    model.position.set(0.9, 0.22, 0.65);
    const cartridgeData = [
      { id: 'handheld', title: 'THE BUILD', sub: 'SPS / HARDWARE', colour: '#784ac3', x: -2.4, z: -1.9 },
      { id: 'crew', title: 'THE TEAMS', sub: 'SPS / TEAMS', colour: '#578b7a', x: -0.6, z: -2.6 },
      { id: 'arcade', title: 'BRICK BREAK', sub: 'BROWSER DEMO', colour: '#d95340', x: 1.2, z: -2.9 },
      { id: 'join', title: 'YOUR TURN', sub: 'SPS / JOIN', colour: '#e0ad37', x: 3.1, z: -2.6 },
    ];
    const parts = cartridgeParts();
    for (const item of cartridgeData) {
      const group = new THREE.Group();
      for (const [geometry, material] of parts) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
      }
      const texture = new THREE.CanvasTexture(cartridgeLabel(item)); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = maxAnisotropy;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.1), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 }));
      face.rotation.x = -Math.PI / 2; face.position.set(-0.02, CART.top + 0.004, -0.06); face.receiveShadow = true; group.add(face);
      group.position.set(item.x, 0.08, item.z); group.rotation.y = -0.14;
      group.userData = { ...item, base: group.position.clone() };
      group.traverse(mesh => { mesh.userData.program = item.id; });
      cartridges.push(group); board.add(group);
    }
    scene.add(board);
    const cordPoints = [new THREE.Vector3(4.9, -.15, 3), new THREE.Vector3(4.1, -.15, 2), new THREE.Vector3(4.8, -.15, .9), new THREE.Vector3(5.1, -.15, -.4), new THREE.Vector3(4.3, -.15, -1.1)];
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPoints), 64, .075, 8, false), new THREE.MeshStandardMaterial({ color: '#f5e9e5', roughness: .5 }));
    cord.castShadow = true; scene.add(cord);
  }

  let frame = 0;
  let disposed = false;
  let finishMotion;
  let insertedCartridge;
  let cartridgeOperation = 0;
  let dragStart;
  let lastRotation = 0;
  let pocketFocused = false;
  const cameraTarget = new THREE.Vector3();
  const reduced = () => document.body.dataset.motion === 'false' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const render = () => { if (!disposed && !document.hidden) renderer.render(scene, camera); };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    finishMotion?.(false);
    finishMotion = undefined;
  };
  const setCartridgeState = state => { canvas.dataset.cartridgeState = state; };
  const restoreCartridges = () => {
    cartridgeOperation++;
    stop();
    insertedCartridge = undefined;
    cartridges.forEach(group => {
      group.position.copy(group.userData.base);
      group.rotation.set(0, -0.14, 0);
      group.scale.setScalar(1);
    });
    if (mode === 'cartridge') { setCartridgeState('idle'); display(); }
    render();
  };
  // frame times from real animations decide whether this machine can afford the current resolution
  const frameTimes = [];
  function trackFrame(delta) {
    if (pixelRatio <= 1 || delta <= 0 || delta > 250) return;
    frameTimes.push(delta);
    if (frameTimes.length < 40) return;
    const median = frameTimes.sort((a, b) => a - b)[20];
    frameTimes.length = 0;
    // a median over 28 ms is under about 35 fps, so drop half a step and keep going
    if (median > 28) {
      pixelRatio = Math.max(1, pixelRatio - 0.5);
      renderer.setPixelRatio(pixelRatio);
      canvas.dataset.pixelRatio = String(pixelRatio);
      resize();
    }
  }
  function move(action, duration = 950, easing = progress => 1 - (1 - progress) ** 3) {
    stop();
    if (reduced()) { action(1); render(); return Promise.resolve(true); }
    return new Promise(resolve => {
      finishMotion = resolve;
      const start = performance.now();
      let previous;
      const step = now => {
        if (previous !== undefined) trackFrame(now - previous);
        previous = now;
        const progress = Math.min((now - start) / duration, 1);
        action(easing(progress));
        render();
        if (progress < 1 && !disposed && !document.hidden) frame = requestAnimationFrame(step);
        else { frame = 0; finishMotion = undefined; resolve(progress === 1); }
      };
      frame = requestAnimationFrame(step);
    });
  }
  const phase = (progress, from, to) => {
    const value = THREE.MathUtils.clamp((progress - from) / (to - from), 0, 1);
    return value * value * (3 - 2 * value);
  };
  const cartridgePose = () => ({
    aligned: model.localToWorld(new THREE.Vector3(slot.x, slot.y + 0.9, slot.z)),
    // the slot sits behind the board, so leave a good chunk of cart sticking out like a real game boy
    seated: model.localToWorld(new THREE.Vector3(slot.x, slot.y + (concept ? 0.32 : -0.45), slot.z)),
    rotation: model.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)),
  });
  async function insertCartridge(id) {
    const group = cartridges.find(item => item.userData.id === id);
    if (!group || disposed) return false;
    restoreCartridges();
    const operation = cartridgeOperation;
    const start = group.position.clone();
    const lift = start.clone().add(new THREE.Vector3(0, 1.5, 0));
    const rotation = group.quaternion.clone();
    const pose = cartridgePose();
    setCartridgeState('lifting');
    display('LOADING');
    let shown = 0;
    const completed = await move(progress => {
      // the loading bar only repaints when it moves a whole step
      const step = Math.floor(phase(progress, 0.3, 0.92) * 12) / 12;
      if (concept && step !== shown) { shown = step; display('LOADING', step); }
      const liftProgress = phase(progress, 0, 0.24);
      const alignProgress = phase(progress, 0.24, 0.6);
      const insertProgress = phase(progress, 0.6, 0.92);
      if (progress < 0.24) group.position.lerpVectors(start, lift, liftProgress);
      else if (progress < 0.6) {
        setCartridgeState('aligning');
        group.position.lerpVectors(lift, pose.aligned, alignProgress);
        group.position.y += Math.sin(alignProgress * Math.PI) * 0.45;
      } else {
        setCartridgeState(progress < 0.92 ? 'inserting' : 'seated');
        group.position.lerpVectors(pose.aligned, pose.seated, insertProgress);
      }
      group.quaternion.slerpQuaternions(rotation, pose.rotation, phase(progress, 0.12, 0.6));
      group.scale.setScalar(THREE.MathUtils.lerp(1, 0.78, phase(progress, 0, 0.6)));
    }, 2200, progress => progress);
    if (operation !== cartridgeOperation || disposed) return false;
    if (!completed) { restoreCartridges(); return false; }
    insertedCartridge = group;
    setCartridgeState('inserted');
    display(group.userData.title);
    render();
    return true;
  }
  async function ejectCartridge() {
    if (!insertedCartridge || disposed) return false;
    const group = insertedCartridge;
    const operation = ++cartridgeOperation;
    const pose = cartridgePose();
    const start = group.position.clone();
    const rotation = group.quaternion.clone();
    const shelfRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.14, 0));
    const target = group.userData.base.clone();
    setCartridgeState('ejecting');
    const completed = await move(progress => {
      const exitProgress = phase(progress, 0, 0.32);
      const returnProgress = phase(progress, 0.32, 1);
      if (progress < 0.32) group.position.lerpVectors(start, pose.aligned, exitProgress);
      else {
        group.position.lerpVectors(pose.aligned, target, returnProgress);
        group.position.y += Math.sin(returnProgress * Math.PI) * 1.4;
      }
      group.quaternion.slerpQuaternions(rotation, shelfRotation, returnProgress);
      group.scale.setScalar(THREE.MathUtils.lerp(0.78, 1, returnProgress));
    }, 1400, progress => progress);
    if (operation !== cartridgeOperation || disposed) return false;
    restoreCartridges();
    return completed;
  }
  function pocketPose() {
    const box = canvas.getBoundingClientRect();
    if (!pocketFocused || !screen) return { position: new THREE.Vector3(0, 0, 7.1 * Math.max(1, 0.65 / camera.aspect)), target: new THREE.Vector3() };
    const screenBounds = new THREE.Box3().setFromObject(screen);
    const target = screenBounds.getCenter(new THREE.Vector3());
    const width = screenBounds.getSize(new THREE.Vector3()).x;
    const pixels = Math.min(box.width * 0.86, box.height * 1.02, 630);
    const distance = width / (pixels / box.width) / (2 * camera.aspect * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    return { position: target.clone().add(new THREE.Vector3(0, 0, distance)), target };
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    renderer.setSize(box.width, box.height, false);
    camera.aspect = box.width / box.height;
    if (mode === 'cartridge') {
      camera.clearViewOffset();
      const frame = horizonGrid ? options.frame?.getBoundingClientRect() : undefined;
      if (frame?.width > 0 && frame.height > 0) {
        camera.setViewOffset(frame.width, frame.height, box.left - frame.left, box.top - frame.top, box.width, box.height);
      } else if (options.model === 'concept' && box.width >= 1000) {
        // slide the workbench right on wide screens so the hero copy has clear space on the left
        camera.setViewOffset(box.width, box.height, -box.width * 0.1, 0, box.width, box.height);
      }
      camera.position.set(6.6, 8.5, 10.2);
      if (camera.aspect < 1) camera.position.multiplyScalar(1.15);
      camera.lookAt(0.5, 0, -0.15);
    } else if (mode === 'pocket') {
      model.position.set(0, 0, 0);
      model.rotation.set(0, -0.19, 0);
      const pose = pocketPose();
      camera.position.copy(pose.position);
      cameraTarget.copy(pose.target);
      camera.lookAt(cameraTarget);
    } else {
      const compact = mode === 'inspector' || box.width < 1000;
      camera.position.set(0, 0.6, compact ? 8.9 : 11.2);
      camera.lookAt(0, 0, 0);
      model.position.set(compact ? 0 : 3.0, 0.15, 0);
      model.rotation.set(0.035, -0.42, 0.05);
    }
    camera.updateProjectionMatrix();
    render();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  if (horizonGrid && options.frame) observer.observe(options.frame);
  const raycaster = new THREE.Raycaster();
  function pointerDown(event) { dragStart = { x: event.clientX, y: event.clientY }; lastRotation = model.rotation.y; }
  function pointerMove(event) {
    if (!dragStart || mode === 'cartridge' || mode === 'pocket') return;
    stop(); model.rotation.y = lastRotation + (event.clientX - dragStart.x) * 0.009; render();
  }
  function pointerUp(event) {
    if (mode === 'cartridge' && dragStart && ['idle', undefined].includes(canvas.dataset.cartridgeState) && Math.abs(event.clientX - dragStart.x) < 8) {
      const box = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1), camera);
      const hit = raycaster.intersectObjects(cartridges, true)[0];
      if (hit) options.onSelect?.(hit.object.userData.program);
    }
    if (mode === 'pocket' && dragStart && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) < 8) {
      const box = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1), camera);
      const hit = raycaster.intersectObject(source, true)[0];
      if (hit) {
        const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face.materialIndex] : hit.object.material;
        canvas.focus({ preventScroll: true });
        options.onSurface?.({ material: material.name, point: hit.object.worldToLocal(hit.point.clone()), uv: hit.uv });
      }
    }
    dragStart = undefined;
  }
  function keyboard(event) {
    if (mode === 'pocket') { if (options.onKey?.(event.key)) event.preventDefault(); return; }
    if (mode !== 'cartridge' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); model.rotation.y += event.key === 'ArrowLeft' ? -.3 : .3; render(); }
  }
  function visibility() { if (document.hidden) { if (mode === 'cartridge' && !['idle', 'inserted'].includes(canvas.dataset.cartridgeState)) restoreCartridges(); else stop(); } else render(); }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('keydown', keyboard);
  document.addEventListener('visibilitychange', visibility);
  const onPreferences = () => { if (mode === 'cartridge' && !['idle', 'inserted'].includes(canvas.dataset.cartridgeState)) restoreCartridges(); else stop(); render(); };
  window.addEventListener('lab-preferences', onPreferences);
  resize();
  canvas.dataset.ready = 'true';
  return {
    render,
    screen(paint) { paint(screenContext, screenCanvas.width, screenCanvas.height); screenTexture.needsUpdate = true; render(); },
    inspection(enabled) {
      surfaceMaterials.forEach((material, object) => { object.material = enabled ? wireMaterial : material; });
      if (screenPanel) screenPanel.visible = !enabled;
      canvas.dataset.presentation = enabled ? 'cad' : 'concept';
      render();
    },
    focusScreen(enabled) {
      if (mode !== 'pocket') return;
      pocketFocused = Boolean(enabled);
      const from = camera.position.clone();
      const previousTarget = cameraTarget.clone();
      const pose = pocketPose();
      return move(progress => {
        camera.position.lerpVectors(from, pose.position, progress);
        cameraTarget.lerpVectors(previousTarget, pose.target, progress);
        camera.lookAt(cameraTarget);
      }, 520);
    },
    colour(value) { if (!/^#[\da-f]{6}$/i.test(value)) return; shell.forEach(material => material.color.set(value)); render(); },
    rotate(delta) { const from = model.rotation.y; move(progress => { model.rotation.y = from + delta * progress; }); },
    reset() { pocketFocused = false; restoreCartridges(); resize(); },
    insert: insertCartridge,
    eject: ejectCartridge,
    intro() { const from = model.rotation.y; move(progress => { model.rotation.y = from + (1 - progress) * 0.7; }, 1500); },
    label(title) { display(title); render(); },
    select(id) {
      if (insertedCartridge || !['idle', undefined].includes(canvas.dataset.cartridgeState)) return;
      const positions = cartridges.map(group => group.position.clone());
      move(progress => {
        cartridges.forEach((group, index) => {
          const target = group.userData.base.clone();
          if (group.userData.id === id) { target.y += 0.48; target.z += 0.3; }
          group.position.lerpVectors(positions[index], target, progress);
        });
      }, 520);
      display(id === 'handheld' ? 'THE BUILD' : id === 'crew' ? 'THE TEAMS' : id === 'join' ? 'YOUR TURN' : 'BRICK BREAK');
      render();
    },
    dispose() {
      restoreCartridges(); disposed = true; observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('keydown', keyboard);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('lab-preferences', onPreferences);
      const materials = new Set();
      scene.traverse(object => { object.geometry?.dispose(); if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); });
      surfaceMaterials.forEach(value => { for (const material of Array.isArray(value) ? value : [value]) materials.add(material); });
      materials.forEach(material => { material.map?.dispose(); material.dispose(); });
      wireMaterial.dispose(); environmentMap.dispose(); screenTexture.dispose(); screenMaterial.dispose(); renderer.dispose();
    },
  };
}
// dot matrix lcd for the concept model: 160 x 120 logical pixels drawn as cells with a dark gap.
// 8 px cells make a 1280 x 960 texture, sharp at 2x even when the handheld fills the viewer
const LCD = { width: 160, height: 120, cell: 8 };
const FONT = {
  A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,10001,11110,10001,10001,11110', C: '01110,10001,10000,10000,10000,10001,01110',
  D: '11100,10010,10001,10001,10001,10010,11100', E: '11111,10000,10000,11110,10000,10000,11111', F: '11111,10000,10000,11110,10000,10000,10000',
  G: '01110,10001,10000,10111,10001,10001,01111', H: '10001,10001,10001,11111,10001,10001,10001', I: '01110,00100,00100,00100,00100,00100,01110',
  J: '00111,00010,00010,00010,00010,10010,01100', K: '10001,10010,10100,11000,10100,10010,10001', L: '10000,10000,10000,10000,10000,10000,11111',
  M: '10001,11011,10101,10101,10001,10001,10001', N: '10001,10001,11001,10101,10011,10001,10001', O: '01110,10001,10001,10001,10001,10001,01110',
  P: '11110,10001,10001,11110,10000,10000,10000', Q: '01110,10001,10001,10001,10101,10010,01101', R: '11110,10001,10001,11110,10100,10010,10001',
  S: '01111,10000,10000,01110,00001,00001,11110', T: '11111,00100,00100,00100,00100,00100,00100', U: '10001,10001,10001,10001,10001,10001,01110',
  V: '10001,10001,10001,10001,10001,01010,00100', W: '10001,10001,10001,10101,10101,10101,01010', X: '10001,10001,01010,00100,01010,10001,10001',
  Y: '10001,10001,10001,01010,00100,00100,00100', Z: '11111,00001,00010,00100,01000,10000,11111',
  0: '01110,10001,10011,10101,11001,10001,01110', 1: '00100,01100,00100,00100,00100,00100,01110', 2: '01110,10001,00001,00010,00100,01000,11111',
  3: '11111,00010,00100,00010,00001,10001,01110', 4: '00010,00110,01010,10010,11111,00010,00010', 5: '11111,10000,11110,00001,00001,10001,01110',
  6: '00110,01000,10000,11110,10001,10001,01110', 7: '11111,00001,00010,00100,01000,01000,01000', 8: '01110,10001,10001,01110,10001,10001,01110',
  9: '01110,10001,10001,01111,00001,00010,01100', '.': '00000,00000,00000,00000,00000,01100,01100', '/': '00000,00001,00010,00100,01000,10000,00000',
  '-': '00000,00000,00000,11111,00000,00000,00000', "'": '00100,00100,01000,00000,00000,00000,00000', ' ': '00000,00000,00000,00000,00000,00000,00000',
  l: '01100,00100,00100,00100,00100,00100,01110', o: '00000,00000,01110,10001,10001,10001,01110', a: '00000,00000,01110,00001,01111,10001,01111',
  d: '00001,00001,01111,10001,10001,10001,01111', i: '00100,00000,01100,00100,00100,00100,01110', n: '00000,00000,11110,10001,10001,10001,10001',
  g: '00000,01111,10001,10001,01111,00001,01110',
};
const glyph = character => (FONT[character] ?? FONT[character.toUpperCase()] ?? FONT[' ']).split(',');
const textWidth = (text, scale) => text.length * 6 * scale - scale;

function paintLcd(context, title, progress) {
  const { width, height, cell } = LCD;
  const lit = new Uint8Array(width * height);
  const rect = (x0, y0, x1, y1) => {
    for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) lit.fill(1, y * width + Math.max(0, x0), y * width + Math.min(width, x1));
  };
  const write = (text, y, scale) => {
    let x = Math.round((width - textWidth(text, scale)) / 2);
    for (const character of text) {
      glyph(character).forEach((row, rowIndex) => [...row].forEach((bit, column) => {
        if (bit === '1') rect(x + column * scale, y + rowIndex * scale, x + (column + 1) * scale, y + (rowIndex + 1) * scale);
      }));
      x += 6 * scale;
    }
  };
  if (title === 'LOADING') {
    // same layout as the reference render: outlined bar with a segmented fill and loading... underneath
    const [x0, y0, x1, y1] = [22, 36, 138, 49];
    rect(x0, y0, x1, y0 + 1); rect(x0, y1 - 1, x1, y1); rect(x0, y0, x0 + 1, y1); rect(x1 - 1, y0, x1, y1);
    const end = x0 + 3 + Math.round((x1 - x0 - 6) * Math.min(1, Math.max(0.08, progress)));
    for (let x = x0 + 3; x < end - 1; x += 3) rect(x, y0 + 3, x + 2, y1 - 3);
    write('loading...', 62, 2);
  } else {
    write('SCHULICH PRESS START', 20, 1);
    const words = title.toUpperCase();
    const scale = textWidth(words, 2) <= width - 12 ? 2 : 1;
    write(words, scale === 2 ? 50 : 56, scale);
    rect(56, 80, 104, 81);
    write('MADE TO PLAY', 92, 1);
  }
  // keep the gap a quarter of a cell whatever the cell size
  const unit = cell - Math.max(1, Math.round(cell / 4));
  context.fillStyle = '#050407';
  context.fillRect(0, 0, width * cell, height * cell);
  context.fillStyle = '#16131c';
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (!lit[y * width + x]) context.fillRect(x * cell, y * cell, unit, unit);
  context.fillStyle = '#efeaf7';
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (lit[y * width + x]) context.fillRect(x * cell, y * cell, unit, unit);
}

// game boy style cartridge: notched top corner, grip ridges, recessed label, embossed arrow, gold contact window
const CART = { width: 1.4, length: 1.85, thickness: 0.27, top: 0.135 };
function cartridgeParts() {
  const { width, length, thickness } = CART;
  const halfWidth = width / 2, halfLength = length / 2, radius = 0.07, notch = 0.22, bevel = 0.028;
  const outline = new THREE.Shape();
  outline.moveTo(-halfWidth + radius, -halfLength);
  outline.lineTo(halfWidth - radius, -halfLength);
  outline.quadraticCurveTo(halfWidth, -halfLength, halfWidth, -halfLength + radius);
  outline.lineTo(halfWidth, halfLength - notch);
  outline.lineTo(halfWidth - notch, halfLength);
  outline.lineTo(-halfWidth + radius, halfLength);
  outline.quadraticCurveTo(-halfWidth, halfLength, -halfWidth, halfLength - radius);
  outline.lineTo(-halfWidth, -halfLength + radius);
  outline.quadraticCurveTo(-halfWidth, -halfLength, -halfWidth + radius, -halfLength);
  const body = new THREE.ExtrudeGeometry(outline, { depth: thickness - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 5 });
  // the extrusion runs along z, turn it so thickness is y and the notched top end points to -z
  body.rotateX(-Math.PI / 2);
  body.translate(0, -thickness / 2 + bevel, 0);
  const plastic = new THREE.MeshStandardMaterial({ color: '#e9e5ee', roughness: 0.46 });
  const recessed = new THREE.MeshStandardMaterial({ color: '#cfc8d8', roughness: 0.62 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2433', roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: '#dcb466', metalness: 0.75, roughness: 0.32 });
  const merge = (geometries) => {
    const merged = new THREE.BufferGeometry();
    const positions = [], normals = [], indices = [];
    for (const geometry of geometries) {
      const flat = geometry.index ? geometry.toNonIndexed() : geometry;
      const offset = positions.length / 3;
      positions.push(...flat.attributes.position.array); normals.push(...flat.attributes.normal.array);
      for (let index = 0; index < flat.attributes.position.count; index++) indices.push(offset + index);
    }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setIndex(indices);
    return merged;
  };
  const place = (geometry, x, y, z) => geometry.translate(x, y, z);
  const top = CART.top;
  // recess frame around the label
  const recess = place(new RoundedBoxGeometry(1.2, 0.02, 1.24, 2, 0.008), -0.02, top - 0.008, -0.06);
  // grip ridges across the notched end
  const ridges = merge([0, 1, 2, 3].map(index => place(new RoundedBoxGeometry(0.92, 0.024, 0.026, 1, 0.01), -0.1, top + 0.004, -0.86 + index * 0.05)));
  // embossed arrow that points into the slot
  const arrowShape = new THREE.Shape([new THREE.Vector2(0, 0.075), new THREE.Vector2(-0.075, -0.035), new THREE.Vector2(0.075, -0.035)]);
  const arrow = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
  arrow.rotateX(-Math.PI / 2); arrow.rotateY(Math.PI); place(arrow, 0.46, top - 0.004, 0.66);
  // contact window on the end that goes in first, with the gold fingers sitting in it
  const window = place(new RoundedBoxGeometry(1.02, 0.03, 0.2, 2, 0.012), 0, top - 0.013, 0.8);
  const contacts = merge(Array.from({ length: 10 }, (_, index) => place(new THREE.BoxGeometry(0.06, 0.02, 0.17), -0.405 + index * 0.09, top - 0.006, 0.81)));
  return [[body, plastic], [recess, recessed], [ridges, plastic], [arrow, plastic], [window, dark], [contacts, gold]];
}

function cartridgeLabel(item) {
  const label = document.createElement('canvas'); label.width = 512; label.height = 522;
  const context = label.getContext('2d');
  context.fillStyle = item.colour; context.fillRect(0, 0, 512, 522);
  // printed sps mark: the start box from the logo
  context.fillStyle = '#ffffff'; context.beginPath(); context.roundRect(34, 32, 104, 40, 6); context.fill();
  context.fillStyle = item.colour; context.font = '600 24px Kufam, sans-serif'; context.textBaseline = 'middle'; context.fillText('SPS', 46, 53);
  context.beginPath(); context.moveTo(108, 41); context.lineTo(126, 52); context.lineTo(108, 63); context.fill();
  context.fillStyle = '#ffffffcc'; context.font = '500 20px Commissioner, sans-serif'; context.textAlign = 'right'; context.fillText(item.sub, 478, 53);
  context.textAlign = 'left'; context.textBaseline = 'alphabetic';
  context.fillStyle = '#ffffff'; context.font = '700 70px Kufam, sans-serif';
  item.title.split(' ').forEach((word, index) => context.fillText(word, 34, 196 + index * 78));
  // halftone dots for a printed feel
  context.fillStyle = '#ffffff22';
  for (let y = 0; y < 6; y++) for (let x = 0; x < 14; x++) { context.beginPath(); context.arc(300 + x * 14, 330 + y * 14, 3.2 - y * 0.4, 0, Math.PI * 2); context.fill(); }
  context.fillStyle = '#fbf8f2'; context.fillRect(0, 436, 512, 86);
  context.fillStyle = '#2b2236'; context.font = '600 21px Commissioner, sans-serif'; context.fillText('SCHULICH PRESS START', 34, 488);
  context.fillStyle = item.colour; context.fillRect(420, 466, 58, 30);
  return label;
}
