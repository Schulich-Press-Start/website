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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = mode === 'cartridge' || mode === 'pocket';
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mode === 'cartridge' ? 36 : 32, 1, 0.01, 100);
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
  key.shadow.mapSize.set(1024, 1024);
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

  let gltf;
  try { gltf = await new GLTFLoader().loadAsync('/models/sps-handheld.glb'); }
  catch (error) { renderer.dispose(); environmentMap.dispose(); throw error; }
  const source = gltf.scene;
  for (const child of [...source.children]) if (child instanceof THREE.Camera) source.remove(child);
  source.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
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
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
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
  screenCanvas.width = 512;
  screenCanvas.height = 400;
  const screenContext = screenCanvas.getContext('2d');
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  screenMaterial.name = 'sps-screen-concept';
  if (screen) {
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
  function display(title = 'PRESS START') {
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
      { id: 'crew', title: 'THE PEOPLE', sub: 'SPS / CREW', colour: '#578b7a', x: -0.6, z: -2.6 },
      { id: 'arcade', title: 'BRICK BREAK', sub: 'BROWSER DEMO', colour: '#d95340', x: 1.2, z: -2.9 },
      { id: 'join', title: 'YOUR TURN', sub: 'SPS / JOIN', colour: '#e0ad37', x: 3.1, z: -2.6 },
    ];
    for (const item of cartridgeData) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.27, 1.85, 3, 0.08), new THREE.MeshStandardMaterial({ color: '#eee9e4', roughness: 0.42 }));
      body.castShadow = true; body.receiveShadow = true; group.add(body);
      const label = document.createElement('canvas'); label.width = 512; label.height = 640;
      const context = label.getContext('2d');
      context.fillStyle = item.colour; context.fillRect(0, 0, 512, 640);
      context.fillStyle = '#f4f0e8'; context.font = '20px sans-serif'; context.fillText(item.sub, 38, 54);
      context.font = 'bold 65px sans-serif';
      item.title.split(' ').forEach((word, index) => context.fillText(word, 38, 170 + index * 76));
      context.lineWidth = 3; context.strokeStyle = '#f4f0e866';
      for (let index = 0; index < 5; index++) context.strokeRect(35 + index * 14, 390 + index * 15, 335 - index * 15, 125 - index * 9);
      context.fillStyle = '#f4f0e8'; context.fillRect(38, 587, 436, 3);
      const texture = new THREE.CanvasTexture(label); texture.colorSpace = THREE.SRGBColorSpace;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
      face.rotation.x = -Math.PI / 2; face.position.set(0, 0.139, -0.02); group.add(face);
      for (let index = 0; index < 9; index++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.018, 0.17), new THREE.MeshStandardMaterial({ color: '#d7b06c', metalness: 0.6, roughness: 0.4 }));
        pin.position.set(-0.4 + index * 0.1, 0.146, 0.82); group.add(pin);
      }
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
  function move(action, duration = 950, easing = progress => 1 - (1 - progress) ** 3) {
    stop();
    if (reduced()) { action(1); render(); return Promise.resolve(true); }
    return new Promise(resolve => {
      finishMotion = resolve;
      const start = performance.now();
      const step = now => {
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
    aligned: model.localToWorld(new THREE.Vector3(0, 2.6, 0.05)),
    seated: model.localToWorld(new THREE.Vector3(0, 1.25, 0.05)),
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
    const completed = await move(progress => {
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
      display(id === 'handheld' ? 'THE BUILD' : id === 'crew' ? 'THE PEOPLE' : id === 'join' ? 'YOUR TURN' : 'BRICK BREAK');
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